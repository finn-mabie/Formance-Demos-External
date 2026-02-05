/**
 * Core types for the mock Formance ledger engine
 */

/**
 * Represents a posting in a transaction - a single movement of funds
 */
export interface Posting {
  source: string;
  destination: string;
  asset: string;
  amount: bigint;
}

/**
 * Represents a committed transaction
 */
export interface Transaction {
  id: number;
  postings: Posting[];
  metadata: Record<string, string>;
  timestamp: Date;
  reference?: string;
}

/**
 * Represents an account in the ledger
 */
export interface Account {
  address: string;
  balances: Map<string, bigint>; // asset -> amount
  metadata: Record<string, string>;
  firstUsage: Date;
}

/**
 * Asset with precision info
 * e.g., "USD/2" means USD with 2 decimal places (cents)
 */
export interface Asset {
  code: string;
  precision: number;
}

/**
 * Parsed monetary value from Numscript
 * e.g., [USD/2 1000] = $10.00
 */
export interface MonetaryValue {
  asset: Asset;
  amount: bigint;
}

/**
 * Filter for querying transactions
 */
export interface TransactionFilter {
  account?: string; // Account pattern (source or destination)
  metadata?: Record<string, string>; // Metadata key-value pairs
  startDate?: Date;
  endDate?: Date;
}

/**
 * Filter for querying accounts
 */
export interface AccountFilter {
  address?: string; // Address pattern with wildcard support
  metadata?: Record<string, string>;
}

/**
 * Balance query result
 */
export interface BalanceResult {
  address: string;
  asset: string;
  balance: bigint;
}

/**
 * Aggregated balance across multiple accounts
 */
export interface AggregatedBalance {
  asset: string;
  balance: bigint;
  accounts: string[];
}

/**
 * Result of executing a Numscript
 */
export interface ExecutionResult {
  transaction: Transaction;
  affectedAccounts: Account[];
}

/**
 * Error thrown when a transaction cannot be executed
 */
export class LedgerError extends Error {
  constructor(
    message: string,
    public code: LedgerErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

export enum LedgerErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ASSET = 'INVALID_ASSET',
  PARSE_ERROR = 'PARSE_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
}
