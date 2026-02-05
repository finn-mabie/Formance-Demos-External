import { describe, it, expect, beforeEach } from 'vitest';
import { MockLedger } from './ledger';
import { LedgerError, LedgerErrorCode } from './types';

describe('MockLedger', () => {
  let ledger: MockLedger;

  beforeEach(() => {
    ledger = new MockLedger();
  });

  describe('createTransaction', () => {
    it('should create a transaction with postings', () => {
      const tx = ledger.createTransaction([
        {
          source: '@world',
          destination: '@users:alice:wallet',
          asset: 'USD/2',
          amount: 10000n, // $100.00
        },
      ]);

      expect(tx.id).toBe(1);
      expect(tx.postings).toHaveLength(1);
      expect(ledger.getBalance('@users:alice:wallet', 'USD/2')).toBe(10000n);
    });

    it('should auto-create accounts', () => {
      ledger.createTransaction([
        {
          source: '@world',
          destination: '@customers:123:available',
          asset: 'USD/2',
          amount: 5000n,
        },
      ]);

      const account = ledger.getAccount('@customers:123:available');
      expect(account).toBeDefined();
      expect(account?.address).toBe('@customers:123:available');
    });

    it('should track multiple assets', () => {
      ledger.createTransaction([
        {
          source: '@world',
          destination: '@treasury:hot',
          asset: 'USDT/6',
          amount: 10000000000n, // 10,000 USDT
        },
      ]);

      ledger.createTransaction([
        {
          source: '@world',
          destination: '@treasury:hot',
          asset: 'BTC/8',
          amount: 100000000n, // 1 BTC
        },
      ]);

      expect(ledger.getBalance('@treasury:hot', 'USDT/6')).toBe(10000000000n);
      expect(ledger.getBalance('@treasury:hot', 'BTC/8')).toBe(100000000n);
    });

    it('should throw on insufficient funds', () => {
      // Fund account with 100 USD
      ledger.createTransaction([
        {
          source: '@world',
          destination: '@users:alice:wallet',
          asset: 'USD/2',
          amount: 10000n,
        },
      ]);

      // Try to send 200 USD
      expect(() =>
        ledger.createTransaction([
          {
            source: '@users:alice:wallet',
            destination: '@users:bob:wallet',
            asset: 'USD/2',
            amount: 20000n,
          },
        ])
      ).toThrow(LedgerError);
    });

    it('should allow overdraft when specified', () => {
      const tx = ledger.createTransaction(
        [
          {
            source: '@psp:stripe',
            destination: '@users:alice:wallet',
            asset: 'USD/2',
            amount: 10000n,
          },
        ],
        {},
        { allowOverdraft: new Map([['@psp:stripe', true]]) }
      );

      expect(tx).toBeDefined();
      expect(ledger.getBalance('@psp:stripe', 'USD/2')).toBe(-10000n);
      expect(ledger.getBalance('@users:alice:wallet', 'USD/2')).toBe(10000n);
    });

    it('should store transaction metadata', () => {
      const tx = ledger.createTransaction(
        [
          {
            source: '@world',
            destination: '@users:alice:wallet',
            asset: 'USD/2',
            amount: 10000n,
          },
        ],
        {
          type: 'DEPOSIT',
          customer_id: 'alice-123',
        }
      );

      expect(tx.metadata.type).toBe('DEPOSIT');
      expect(tx.metadata.customer_id).toBe('alice-123');
    });
  });

  describe('pattern matching', () => {
    beforeEach(() => {
      // Set up test accounts
      ledger.createTransaction([
        { source: '@world', destination: '@customers:111:available', asset: 'USD/2', amount: 1000n },
      ]);
      ledger.createTransaction([
        { source: '@world', destination: '@customers:111:pending', asset: 'USD/2', amount: 2000n },
      ]);
      ledger.createTransaction([
        { source: '@world', destination: '@customers:222:available', asset: 'USD/2', amount: 3000n },
      ]);
      ledger.createTransaction([
        { source: '@world', destination: '@platform:fees', asset: 'USD/2', amount: 500n },
      ]);
    });

    it('should match prefix patterns (trailing colon)', () => {
      const results = ledger.getBalances('customers:');
      expect(results).toHaveLength(3);
    });

    it('should match wildcard segment patterns (::)', () => {
      const results = ledger.getBalances('customers::available');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.address).sort()).toEqual([
        '@customers:111:available',
        '@customers:222:available',
      ]);
    });

    it('should match exact addresses', () => {
      const results = ledger.getBalances('customers:111:available');
      expect(results).toHaveLength(1);
      expect(results[0]?.address).toBe('@customers:111:available');
    });

    it('should aggregate balances across patterns', () => {
      const aggregated = ledger.getAggregatedBalances([
        'customers:111:available',
        'customers:111:pending',
      ]);

      expect(aggregated).toHaveLength(1);
      expect(aggregated[0]?.balance).toBe(3000n); // 1000 + 2000
      expect(aggregated[0]?.accounts).toContain('@customers:111:available');
      expect(aggregated[0]?.accounts).toContain('@customers:111:pending');
    });
  });

  describe('listTransactions', () => {
    beforeEach(() => {
      ledger.createTransaction(
        [{ source: '@world', destination: '@users:alice', asset: 'USD/2', amount: 1000n }],
        { type: 'DEPOSIT', customer_id: 'alice' }
      );
      ledger.createTransaction(
        [{ source: '@users:alice', destination: '@users:bob', asset: 'USD/2', amount: 500n }],
        { type: 'TRANSFER', customer_id: 'alice' }
      );
      ledger.createTransaction(
        [{ source: '@world', destination: '@users:bob', asset: 'USD/2', amount: 2000n }],
        { type: 'DEPOSIT', customer_id: 'bob' }
      );
    });

    it('should list all transactions', () => {
      const txs = ledger.listTransactions();
      expect(txs).toHaveLength(3);
    });

    it('should filter by account', () => {
      const txs = ledger.listTransactions({ account: '@users:alice' });
      expect(txs).toHaveLength(2);
    });

    it('should filter by metadata', () => {
      const txs = ledger.listTransactions({ metadata: { type: 'DEPOSIT' } });
      expect(txs).toHaveLength(2);
    });

    it('should filter by multiple metadata fields', () => {
      const txs = ledger.listTransactions({
        metadata: { type: 'DEPOSIT', customer_id: 'alice' },
      });
      expect(txs).toHaveLength(1);
    });
  });

  describe('listAccounts', () => {
    beforeEach(() => {
      ledger.createTransaction([
        { source: '@world', destination: '@customers:111:wallet', asset: 'USD/2', amount: 1000n },
      ]);
      ledger.createTransaction([
        { source: '@world', destination: '@customers:222:wallet', asset: 'USD/2', amount: 2000n },
      ]);
      ledger.setAccountMetadata('@customers:111:wallet', 'tier', 'gold');
      ledger.setAccountMetadata('@customers:222:wallet', 'tier', 'silver');
    });

    it('should list accounts by pattern', () => {
      const accounts = ledger.listAccounts({ address: 'customers:' });
      expect(accounts).toHaveLength(2);
    });

    it('should filter by metadata', () => {
      const accounts = ledger.listAccounts({ metadata: { tier: 'gold' } });
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe('@customers:111:wallet');
    });
  });

  describe('account metadata', () => {
    it('should set and get account metadata', () => {
      ledger.setAccountMetadata('@exchanges:001', 'rate', '5.45');
      ledger.setAccountMetadata('@exchanges:001', 'type', 'USDT_BRL');

      expect(ledger.getAccountMetadata('@exchanges:001', 'rate')).toBe('5.45');
      expect(ledger.getAccountMetadata('@exchanges:001', 'type')).toBe('USDT_BRL');
    });
  });

  describe('reset', () => {
    it('should clear all data', () => {
      ledger.createTransaction([
        { source: '@world', destination: '@users:alice', asset: 'USD/2', amount: 1000n },
      ]);

      ledger.reset();

      expect(ledger.getTransactionCount()).toBe(0);
      expect(ledger.getAccountCount()).toBe(0);
      expect(ledger.getBalance('@users:alice', 'USD/2')).toBe(0n);
    });
  });
});
