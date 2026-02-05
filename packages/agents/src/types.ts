/**
 * Types for the demo builder agent system
 */

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022';
  temperature: number;
  maxTokens: number;
}

/**
 * Input for the research agent
 */
export interface ResearchInput {
  companyUrl?: string;
  transcript?: string;
  useCase?: string;
  additionalContext?: string;
}

/**
 * Output from the research agent
 */
export interface ResearchOutput {
  companyName: string;
  businessModel: string;
  keyFlows: string[];
  painPoints: string[];
  stakeholders: string[];
  currencies: string[];
  suggestedDemoType: string;
}

/**
 * Output from the chart of accounts agent
 */
export interface ChartOfAccountsOutput {
  accounts: Array<{
    address: string;
    name: string;
    description: string;
    color: string;
    purpose: 'customer' | 'platform' | 'external' | 'omnibus' | 'exchange';
  }>;
  rationale: string;
}

/**
 * Output from the flow designer agent
 */
export interface FlowDesignOutput {
  steps: Array<{
    txType: string;
    label: string;
    description: string;
    postings: Array<{
      from: string;
      to: string;
      amount: string;
      asset: string;
    }>;
    metadata: Record<string, string>;
  }>;
  rationale: string;
}

/**
 * Output from the numscript writer agent
 */
export interface NumscriptOutput {
  steps: Array<{
    txType: string;
    numscript: string;
  }>;
}

/**
 * Final demo configuration output
 */
export interface ConfigGeneratorOutput {
  id: string;
  name: string;
  description: string;
  accounts: Array<{
    address: string;
    name: string;
    description: string;
    color: string;
  }>;
  variables: Record<string, string>;
  transactionSteps: Array<{
    txType: string;
    label: string;
    description: string;
    numscript: string;
    queries: Array<{
      title: string;
      description: string;
      queryType: 'balance' | 'transactions' | 'accounts';
      addressFilter?: string;
      addressFilters?: string[];
      transactionFilter?: {
        account?: string;
        metadata?: Record<string, string>;
      };
      accountAddress?: string;
    }>;
  }>;
  usefulQueries: Array<{
    title: string;
    description: string;
    queryType: 'balance' | 'transactions' | 'accounts';
    addressFilter?: string;
    addressFilters?: string[];
    transactionFilter?: {
      account?: string;
      metadata?: Record<string, string>;
    };
    accountAddress?: string;
  }>;
}

/**
 * Progress event for streaming updates
 */
export interface AgentProgress {
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  output?: unknown;
}
