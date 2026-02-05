import { describe, it, expect, beforeEach } from 'vitest';
import { MockLedger } from '@formance-demo/ledger-engine';
import { executeNumscript, validateNumscript } from './executor';

describe('executeNumscript', () => {
  let ledger: MockLedger;

  beforeEach(() => {
    ledger = new MockLedger();
  });

  it('should execute simple send from world', () => {
    const script = `
      send [USD/2 10000] (
        source = @world
        destination = @users:alice:wallet
      )
    `;

    const tx = executeNumscript(script, ledger);

    expect(tx.id).toBe(1);
    expect(tx.postings).toHaveLength(1);
    expect(ledger.getBalance('@users:alice:wallet', 'USD/2')).toBe(10000n);
  });

  it('should execute with variable substitution', () => {
    const script = `
      send [USD/2 {AMOUNT}] (
        source = @world
        destination = @customers:{CUSTOMER_ID}:available
      )
    `;

    const tx = executeNumscript(script, ledger, {
      AMOUNT: '5000',
      CUSTOMER_ID: 'cust-123',
    });

    expect(tx.postings).toHaveLength(1);
    expect(ledger.getBalance('@customers:cust-123:available', 'USD/2')).toBe(5000n);
  });

  it('should execute with overdraft', () => {
    const script = `
      send [USD/2 1000] (
        source = @psp:stripe allowing unbounded overdraft
        destination = @users:alice:wallet
      )
    `;

    const tx = executeNumscript(script, ledger);

    expect(tx).toBeDefined();
    expect(ledger.getBalance('@psp:stripe', 'USD/2')).toBe(-1000n);
    expect(ledger.getBalance('@users:alice:wallet', 'USD/2')).toBe(1000n);
  });

  it('should set transaction metadata', () => {
    const script = `
      send [USD/2 1000] (
        source = @world
        destination = @users:alice:wallet
      )

      set_tx_meta("type", "DEPOSIT")
      set_tx_meta("customer_id", "alice-123")
    `;

    const tx = executeNumscript(script, ledger);

    expect(tx.metadata.type).toBe('DEPOSIT');
    expect(tx.metadata.customer_id).toBe('alice-123');
  });

  it('should set account metadata', () => {
    const script = `
      send [USDT/6 10000000000] (
        source = @world
        destination = @exchanges:001
      )

      set_account_meta(@exchanges:001, "rate", "5.45")
      set_account_meta(@exchanges:001, "type", "USDT_BRL")
    `;

    executeNumscript(script, ledger);

    expect(ledger.getAccountMetadata('@exchanges:001', 'rate')).toBe('5.45');
    expect(ledger.getAccountMetadata('@exchanges:001', 'type')).toBe('USDT_BRL');
  });

  it('should execute multiple sends', () => {
    // First transaction: fund the account
    executeNumscript(
      `send [USD/2 10000] (
        source = @world
        destination = @users:alice:wallet
      )`,
      ledger
    );

    // Second transaction: transfer
    const tx = executeNumscript(
      `send [USD/2 5000] (
        source = @users:alice:wallet
        destination = @users:bob:wallet
      )`,
      ledger
    );

    expect(tx.id).toBe(2);
    expect(ledger.getBalance('@users:alice:wallet', 'USD/2')).toBe(5000n);
    expect(ledger.getBalance('@users:bob:wallet', 'USD/2')).toBe(5000n);
  });

  it('should handle coins-ph style FX conversion', () => {
    // Fund treasury
    executeNumscript(
      `send [USDT/6 10000000000] (
        source = @world
        destination = @treasury:binance:hot
      )`,
      ledger
    );

    // FX conversion step 1: USDT to exchange
    executeNumscript(
      `send [USDT/6 10000000000] (
        source = @treasury:binance:hot
        destination = @exchanges:usdt:brl:001
      )

      set_account_meta(@exchanges:usdt:brl:001, "rate", "5.45")`,
      ledger
    );

    // FX conversion step 2: BRL from exchange (with overdraft)
    executeNumscript(
      `send [BRL/2 5450000] (
        source = @exchanges:usdt:brl:001 allowing unbounded overdraft
        destination = @banks:bradesco:operating
      )`,
      ledger
    );

    // Exchange account should have USDT positive, BRL negative
    expect(ledger.getBalance('@exchanges:usdt:brl:001', 'USDT/6')).toBe(10000000000n);
    expect(ledger.getBalance('@exchanges:usdt:brl:001', 'BRL/2')).toBe(-5450000n);
    expect(ledger.getBalance('@banks:bradesco:operating', 'BRL/2')).toBe(5450000n);
    expect(ledger.getAccountMetadata('@exchanges:usdt:brl:001', 'rate')).toBe('5.45');
  });
});

describe('validateNumscript', () => {
  it('should validate correct script', () => {
    const script = `
      send [USD/2 1000] (
        source = @world
        destination = @users:alice
      )
    `;

    const result = validateNumscript(script);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing send statements', () => {
    const script = `set_tx_meta("type", "TEST")`;

    const result = validateNumscript(script);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No send statements found');
  });
});
