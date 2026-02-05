/**
 * Types for Numscript parsing and execution
 */

/**
 * Parsed monetary value: [ASSET/PRECISION AMOUNT]
 */
export interface ParsedMonetary {
  asset: string; // e.g., "USD/2"
  amount: bigint;
}

/**
 * A single source in a send statement
 */
export interface ParsedSource {
  account: string;
  maxAmount?: ParsedMonetary;
  allowOverdraft?: boolean;
  unboundedOverdraft?: boolean;
}

/**
 * A single destination in a send statement
 */
export interface ParsedDestination {
  account: string;
  portion?: string; // e.g., "2.5%", "1/10", "remaining"
  maxAmount?: ParsedMonetary;
  kept?: boolean;
}

/**
 * A parsed send statement
 */
export interface ParsedSend {
  monetary: ParsedMonetary | 'remaining';
  sources: ParsedSource[];
  destinations: ParsedDestination[];
}

/**
 * A parsed metadata statement
 */
export interface ParsedMetadata {
  type: 'tx' | 'account';
  account?: string; // Only for account metadata
  key: string;
  value: string;
}

/**
 * Variable declaration
 */
export interface ParsedVariable {
  type: 'monetary' | 'account' | 'asset' | 'portion' | 'number' | 'string';
  name: string;
}

/**
 * Complete parsed Numscript
 */
export interface ParsedNumscript {
  variables: ParsedVariable[];
  sends: ParsedSend[];
  metadata: ParsedMetadata[];
}

/**
 * Variables passed at execution time
 */
export interface ExecutionVariables {
  [key: string]: string | number | { asset: string; amount: number | bigint };
}

/**
 * Result of parsing postings from Numscript (for flow diagram)
 */
export interface ExtractedPosting {
  amount: string; // e.g., "USD/2 10000" or "$100.00"
  source: string;
  destination: string;
}
