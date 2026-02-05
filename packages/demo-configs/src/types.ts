/**
 * Types for demo configurations
 */

/**
 * Color options for account display
 */
export type AccountColor =
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

/**
 * Account definition in a demo config
 */
export interface AccountDefinition {
  address: string;
  name: string;
  description: string;
  color: AccountColor;
}

/**
 * Query types supported in demos
 */
export type QueryType = 'balance' | 'transactions' | 'accounts';

/**
 * Base query definition
 */
interface BaseQuery {
  title: string;
  description: string;
  queryType: QueryType;
}

/**
 * Balance query - single pattern or multiple patterns ($or)
 */
export interface BalanceQuery extends BaseQuery {
  queryType: 'balance';
  addressFilter?: string;
  addressFilters?: string[];
}

/**
 * Transaction filter options
 */
export interface TransactionFilterOptions {
  account?: string;
  metadata?: Record<string, string>;
}

/**
 * Transaction query
 */
export interface TransactionQuery extends BaseQuery {
  queryType: 'transactions';
  transactionFilter: TransactionFilterOptions;
}

/**
 * Account listing query
 */
export interface AccountQuery extends BaseQuery {
  queryType: 'accounts';
  accountAddress: string;
}

/**
 * Union type for all query types
 */
export type Query = BalanceQuery | TransactionQuery | AccountQuery;

/**
 * A single transaction step in a demo
 */
export interface TransactionStep {
  txType: string;
  label: string;
  description: string;
  numscript: string;
  queries?: Query[];
}

/**
 * Complete demo configuration
 */
export interface DemoConfig {
  id: string;
  name: string;
  description: string;
  accounts: AccountDefinition[];
  variables: Record<string, string>;
  transactionSteps: TransactionStep[];
  usefulQueries: Query[];
}
