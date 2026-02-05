import {
  Account,
  Transaction,
  Posting,
  TransactionFilter,
  AccountFilter,
  BalanceResult,
  AggregatedBalance,
  LedgerError,
  LedgerErrorCode,
} from './types';

/**
 * Mock Formance Ledger implementation
 *
 * Simulates the core functionality of a Formance ledger:
 * - Account management with balances per asset
 * - Transaction creation with postings
 * - Balance queries with pattern matching
 * - Metadata on accounts and transactions
 */
export class MockLedger {
  private accounts: Map<string, Account> = new Map();
  private transactions: Transaction[] = [];
  private nextTransactionId = 1;

  constructor() {
    // @world is a special account that can go negative (unbounded overdraft)
    this.getOrCreateAccount('@world');
  }

  /**
   * Get or create an account by address
   */
  getOrCreateAccount(address: string): Account {
    // Normalize address - ensure it starts with @
    const normalizedAddress = address.startsWith('@') ? address : `@${address}`;

    let account = this.accounts.get(normalizedAddress);
    if (!account) {
      account = {
        address: normalizedAddress,
        balances: new Map(),
        metadata: {},
        firstUsage: new Date(),
      };
      this.accounts.set(normalizedAddress, account);
    }
    return account;
  }

  /**
   * Get account balance for a specific asset
   */
  getBalance(address: string, asset: string): bigint {
    const normalizedAddress = address.startsWith('@') ? address : `@${address}`;
    const account = this.accounts.get(normalizedAddress);
    if (!account) return 0n;
    return account.balances.get(asset) ?? 0n;
  }

  /**
   * Apply a posting to the ledger
   * This updates source and destination account balances
   */
  private applyPosting(posting: Posting, allowOverdraft: boolean = false): void {
    const source = this.getOrCreateAccount(posting.source);
    const destination = this.getOrCreateAccount(posting.destination);

    const currentSourceBalance = source.balances.get(posting.asset) ?? 0n;

    // @world always allows overdraft
    const isWorld = source.address === '@world';

    if (!isWorld && !allowOverdraft && currentSourceBalance < posting.amount) {
      throw new LedgerError(
        `Insufficient funds in ${source.address}: has ${currentSourceBalance}, needs ${posting.amount}`,
        LedgerErrorCode.INSUFFICIENT_FUNDS,
        {
          account: source.address,
          asset: posting.asset,
          available: currentSourceBalance.toString(),
          required: posting.amount.toString(),
        }
      );
    }

    // Debit source
    source.balances.set(
      posting.asset,
      currentSourceBalance - posting.amount
    );

    // Credit destination
    const currentDestBalance = destination.balances.get(posting.asset) ?? 0n;
    destination.balances.set(
      posting.asset,
      currentDestBalance + posting.amount
    );
  }

  /**
   * Create a transaction with the given postings and metadata
   */
  createTransaction(
    postings: Posting[],
    metadata: Record<string, string> = {},
    options: { allowOverdraft?: Map<string, boolean> } = {}
  ): Transaction {
    // Validate and apply each posting
    for (const posting of postings) {
      const allowOverdraft = options.allowOverdraft?.get(posting.source) ?? false;
      this.applyPosting(posting, allowOverdraft);
    }

    const transaction: Transaction = {
      id: this.nextTransactionId++,
      postings,
      metadata,
      timestamp: new Date(),
    };

    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Set metadata on an account
   */
  setAccountMetadata(address: string, key: string, value: string): void {
    const account = this.getOrCreateAccount(address);
    account.metadata[key] = value;
  }

  /**
   * Get metadata from an account
   */
  getAccountMetadata(address: string, key: string): string | undefined {
    const normalizedAddress = address.startsWith('@') ? address : `@${address}`;
    const account = this.accounts.get(normalizedAddress);
    return account?.metadata[key];
  }

  /**
   * Check if an address matches a pattern
   *
   * Patterns:
   * - Trailing colon: prefix match (e.g., "customers:" matches "customers:123:wallet")
   * - Empty segment (::): wildcard for one segment (e.g., "customers::pending" matches "customers:123:pending")
   * - Exact match otherwise
   */
  private matchesPattern(address: string, pattern: string): boolean {
    // Normalize - remove @ prefix for comparison
    const normalizedAddress = address.replace(/^@/, '');
    const normalizedPattern = pattern.replace(/^@/, '');

    // Trailing colon = prefix match
    if (normalizedPattern.endsWith(':')) {
      return normalizedAddress.startsWith(normalizedPattern.slice(0, -1));
    }

    // Check for empty segment (wildcard)
    if (normalizedPattern.includes('::')) {
      const patternParts = normalizedPattern.split(':');
      const addressParts = normalizedAddress.split(':');

      if (addressParts.length !== patternParts.length) {
        return false;
      }

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '') {
          // Empty segment matches anything
          continue;
        }
        if (patternParts[i] !== addressParts[i]) {
          return false;
        }
      }
      return true;
    }

    // Exact match
    return normalizedAddress === normalizedPattern;
  }

  /**
   * Query balances by pattern
   * Returns individual balance results for each matching account
   */
  getBalances(pattern: string): BalanceResult[] {
    const results: BalanceResult[] = [];

    for (const [address, account] of this.accounts) {
      if (this.matchesPattern(address, pattern)) {
        for (const [asset, balance] of account.balances) {
          if (balance !== 0n) {
            results.push({ address, asset, balance });
          }
        }
      }
    }

    return results;
  }

  /**
   * Get aggregated balance across multiple patterns (for $or queries)
   */
  getAggregatedBalances(patterns: string[]): AggregatedBalance[] {
    const aggregated = new Map<string, { balance: bigint; accounts: Set<string> }>();

    for (const pattern of patterns) {
      const results = this.getBalances(pattern);
      for (const result of results) {
        let agg = aggregated.get(result.asset);
        if (!agg) {
          agg = { balance: 0n, accounts: new Set() };
          aggregated.set(result.asset, agg);
        }
        agg.balance += result.balance;
        agg.accounts.add(result.address);
      }
    }

    return Array.from(aggregated.entries()).map(([asset, { balance, accounts }]) => ({
      asset,
      balance,
      accounts: Array.from(accounts),
    }));
  }

  /**
   * List transactions with optional filtering
   */
  listTransactions(filter?: TransactionFilter): Transaction[] {
    if (!filter) {
      return [...this.transactions];
    }

    return this.transactions.filter((tx) => {
      // Filter by account (source or destination)
      if (filter.account) {
        const matchesAccount = tx.postings.some(
          (p) =>
            this.matchesPattern(p.source, filter.account!) ||
            this.matchesPattern(p.destination, filter.account!)
        );
        if (!matchesAccount) return false;
      }

      // Filter by metadata
      if (filter.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (tx.metadata[key] !== value) {
            return false;
          }
        }
      }

      // Filter by date range
      if (filter.startDate && tx.timestamp < filter.startDate) {
        return false;
      }
      if (filter.endDate && tx.timestamp > filter.endDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * List accounts matching a pattern
   */
  listAccounts(filter?: AccountFilter): Account[] {
    const accounts = Array.from(this.accounts.values());

    if (!filter) {
      return accounts;
    }

    return accounts.filter((account) => {
      // Filter by address pattern
      if (filter.address && !this.matchesPattern(account.address, filter.address)) {
        return false;
      }

      // Filter by metadata
      if (filter.metadata) {
        for (const [key, value] of Object.entries(filter.metadata)) {
          if (account.metadata[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Get a specific account by address
   */
  getAccount(address: string): Account | undefined {
    const normalizedAddress = address.startsWith('@') ? address : `@${address}`;
    return this.accounts.get(normalizedAddress);
  }

  /**
   * Get all balances for a specific account
   */
  getAccountBalances(address: string): Map<string, bigint> {
    const account = this.getAccount(address);
    return account?.balances ?? new Map();
  }

  /**
   * Reset the ledger to initial state
   */
  reset(): void {
    this.accounts.clear();
    this.transactions = [];
    this.nextTransactionId = 1;
    // Re-create @world
    this.getOrCreateAccount('@world');
  }

  /**
   * Get transaction count
   */
  getTransactionCount(): number {
    return this.transactions.length;
  }

  /**
   * Get account count (excluding @world)
   */
  getAccountCount(): number {
    return this.accounts.size - 1; // Exclude @world
  }

  /**
   * Export current state (for debugging/persistence)
   */
  exportState(): {
    accounts: Array<{ address: string; balances: Record<string, string>; metadata: Record<string, string> }>;
    transactions: Array<{
      id: number;
      postings: Array<{ source: string; destination: string; asset: string; amount: string }>;
      metadata: Record<string, string>;
      timestamp: string;
    }>;
  } {
    return {
      accounts: Array.from(this.accounts.values()).map((account) => ({
        address: account.address,
        balances: Object.fromEntries(
          Array.from(account.balances.entries()).map(([k, v]) => [k, v.toString()])
        ),
        metadata: account.metadata,
      })),
      transactions: this.transactions.map((tx) => ({
        id: tx.id,
        postings: tx.postings.map((p) => ({
          ...p,
          amount: p.amount.toString(),
        })),
        metadata: tx.metadata,
        timestamp: tx.timestamp.toISOString(),
      })),
    };
  }
}
