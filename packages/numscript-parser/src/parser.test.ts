import { describe, it, expect } from 'vitest';
import {
  parseMonetary,
  parseAsset,
  formatAmount,
  parseNumscript,
  parsePostingsFromNumscript,
  parseMetadataFromNumscript,
} from './parser';

describe('parseAsset', () => {
  it('should parse asset with precision', () => {
    expect(parseAsset('USD/2')).toEqual({ code: 'USD', precision: 2 });
    expect(parseAsset('USDT/6')).toEqual({ code: 'USDT', precision: 6 });
    expect(parseAsset('BTC/8')).toEqual({ code: 'BTC', precision: 8 });
  });

  it('should handle assets without precision', () => {
    expect(parseAsset('COIN')).toEqual({ code: 'COIN', precision: 0 });
  });
});

describe('parseMonetary', () => {
  it('should parse monetary values', () => {
    expect(parseMonetary('[USD/2 1000]')).toEqual({
      asset: 'USD/2',
      amount: 1000n,
    });

    expect(parseMonetary('[USDT/6 10000000000]')).toEqual({
      asset: 'USDT/6',
      amount: 10000000000n,
    });
  });

  it('should parse star (all) notation', () => {
    expect(parseMonetary('[USD/2 *]')).toEqual({
      asset: 'USD/2',
      amount: -1n,
    });
  });
});

describe('formatAmount', () => {
  it('should format USD amounts', () => {
    expect(formatAmount(10000n, 'USD/2')).toBe('$100.00');
    expect(formatAmount(2550n, 'USD/2')).toBe('$25.50');
  });

  it('should format USDT amounts', () => {
    expect(formatAmount(10000000000n, 'USDT/6')).toBe('USDT 10000.000000');
  });

  it('should format BRL amounts', () => {
    expect(formatAmount(5450000n, 'BRL/2')).toBe('R$54500.00');
  });

  it('should handle assets without precision', () => {
    expect(formatAmount(100n, 'COIN')).toBe('100 COIN');
  });
});

describe('parseNumscript', () => {
  it('should parse simple send statement', () => {
    const script = `
      send [USD/2 1000] (
        source = @world
        destination = @users:alice:wallet
      )
    `;

    const result = parseNumscript(script);

    expect(result.sends).toHaveLength(1);
    expect(result.sends[0]?.sources[0]?.account).toBe('@world');
    expect(result.sends[0]?.destinations[0]?.account).toBe('@users:alice:wallet');
  });

  it('should parse send with overdraft', () => {
    const script = `
      send [USD/2 1000] (
        source = @psp:stripe allowing unbounded overdraft
        destination = @users:alice:wallet
      )
    `;

    const result = parseNumscript(script);

    expect(result.sends[0]?.sources[0]?.unboundedOverdraft).toBe(true);
  });

  it('should parse metadata statements', () => {
    const script = `
      send [USD/2 1000] (
        source = @world
        destination = @users:alice:wallet
      )

      set_tx_meta("type", "DEPOSIT")
      set_tx_meta("customer_id", "alice-123")
      set_account_meta(@users:alice:wallet, "tier", "gold")
    `;

    const result = parseNumscript(script);

    expect(result.metadata).toHaveLength(3);
    expect(result.metadata.find((m) => m.key === 'type')?.value).toBe('DEPOSIT');
    expect(result.metadata.find((m) => m.type === 'account')?.key).toBe('tier');
  });

  it('should parse variable declarations', () => {
    const script = `
      vars {
        monetary $amount
        account $user
        string $reference
      }

      send $amount (
        source = @world
        destination = $user
      )
    `;

    const result = parseNumscript(script);

    expect(result.variables).toHaveLength(3);
    expect(result.variables.find((v) => v.name === 'amount')?.type).toBe('monetary');
    expect(result.variables.find((v) => v.name === 'user')?.type).toBe('account');
  });
});

describe('parsePostingsFromNumscript', () => {
  it('should extract simple postings', () => {
    const script = `
      send [USD/2 1000] (
        source = @world
        destination = @users:alice:wallet
      )
    `;

    const postings = parsePostingsFromNumscript(script);

    expect(postings).toHaveLength(1);
    expect(postings[0]).toEqual({
      amount: 'USD/2 1000',
      source: 'world',
      destination: 'users:alice:wallet',
    });
  });

  it('should extract multiple postings', () => {
    const script = `
      send [USDT/6 10000000000] (
        source = @treasury:hot
        destination = @exchanges:001
      )

      send [BRL/2 5450000] (
        source = @exchanges:001 allowing unbounded overdraft
        destination = @banks:operating
      )
    `;

    const postings = parsePostingsFromNumscript(script);

    expect(postings).toHaveLength(2);
    expect(postings[0]?.source).toBe('treasury:hot');
    expect(postings[1]?.source).toBe('exchanges:001');
  });
});

describe('parseMetadataFromNumscript', () => {
  it('should extract metadata keys', () => {
    const script = `
      send [USD/2 1000] (
        source = @world
        destination = @users:alice:wallet
      )

      set_tx_meta("type", "DEPOSIT")
      set_tx_meta("customer_id", "alice-123")
      set_account_meta(@exchanges:001, "rate", "5.45")
      set_account_meta(@exchanges:001, "executed_at", "2024-01-15")
    `;

    const { txMeta, accountMeta } = parseMetadataFromNumscript(script);

    expect(txMeta).toEqual(['type', 'customer_id']);
    expect(accountMeta).toEqual(['rate', 'executed_at']);
  });
});
