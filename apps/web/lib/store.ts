'use client';

import { create } from 'zustand';
import { MockLedger, Transaction, BalanceResult } from '@formance-demo/ledger-engine';
import { executeNumscript, formatAmount } from '@formance-demo/numscript-parser';
import { DemoConfig, Query } from '@formance-demo/demo-configs';

// Singleton ledger instance to ensure state persistence across React renders
let ledgerInstance: MockLedger | null = null;
let currentDemoId: string | null = null;

function getLedger(demoId: string): MockLedger {
  if (!ledgerInstance || currentDemoId !== demoId) {
    ledgerInstance = new MockLedger();
    currentDemoId = demoId;
  }
  return ledgerInstance;
}

function resetLedgerInstance(): void {
  if (ledgerInstance) {
    ledgerInstance.reset();
  }
}

interface QueryResult {
  type: 'balance' | 'transactions' | 'accounts';
  data: unknown;
  timestamp: Date;
}

interface DemoState {
  // Core state
  ledger: MockLedger | null;
  config: DemoConfig | null;
  currentStep: number;
  executedSteps: Set<number>;
  transactions: Transaction[];
  queryResults: Map<string, QueryResult>;
  error: string | null;
  // Counter to trigger re-renders when balances change
  balanceVersion: number;

  // Actions
  initDemo: (config: DemoConfig) => void;
  executeStep: (stepIndex: number) => Transaction | null;
  runQuery: (query: Query) => QueryResult;
  goToStep: (step: number) => void;
  reset: () => void;

  // Helpers
  getBalance: (pattern: string) => BalanceResult[];
  getFormattedBalance: (pattern: string) => string;
  getAllBalances: () => BalanceResult[];
  substituteVariables: (text: string) => string;
}

export const useDemoStore = create<DemoState>()((set, get) => ({
  ledger: null,
  config: null,
  currentStep: -1, // -1 = intro screen
  executedSteps: new Set(),
  transactions: [],
  queryResults: new Map(),
  error: null,
  balanceVersion: 0,

  initDemo: (config: DemoConfig) => {
    const ledger = getLedger(config.id);
    // Reset ledger state for fresh demo
    ledger.reset();
    set({
      ledger,
      config,
      currentStep: -1,
      executedSteps: new Set(),
      transactions: [],
      queryResults: new Map(),
      error: null,
    });
  },

  executeStep: (stepIndex: number) => {
    const { config, executedSteps, transactions } = get();
    // Always get ledger from singleton to ensure we have the right instance
    const ledger = config ? getLedger(config.id) : null;
    if (!ledger || !config) return null;

    const step = config.transactionSteps[stepIndex];
    if (!step) return null;

    try {
      // Substitute variables in the numscript
      const substitutedNumscript = get().substituteVariables(step.numscript);

      // Execute the numscript
      const tx = executeNumscript(substitutedNumscript, ledger);

      // Update state
      const newExecutedSteps = new Set(executedSteps);
      newExecutedSteps.add(stepIndex);

      const newTransactions = [...transactions];
      newTransactions[stepIndex] = tx;

      set((state) => ({
        ledger,
        executedSteps: newExecutedSteps,
        transactions: newTransactions,
        currentStep: stepIndex,
        error: null,
        balanceVersion: state.balanceVersion + 1,
      }));

      return tx;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      set({ error: errorMessage });
      return null;
    }
  },

  runQuery: (query: Query): QueryResult => {
    const { config, queryResults } = get();
    const ledger = config ? getLedger(config.id) : null;
    if (!ledger || !config) {
      return { type: 'balance', data: [], timestamp: new Date() };
    }

    const substituteVars = (text: string) => get().substituteVariables(text);

    let result: QueryResult;

    switch (query.queryType) {
      case 'balance': {
        if (query.addressFilters && query.addressFilters.length > 0) {
          // Aggregated balance query ($or)
          const patterns = query.addressFilters.map(substituteVars);
          const aggregated = ledger.getAggregatedBalances(patterns);
          result = { type: 'balance', data: aggregated, timestamp: new Date() };
        } else if (query.addressFilter) {
          // Single pattern balance query
          const pattern = substituteVars(query.addressFilter);
          // Use aggregated balances for prefix patterns (ending with :) or wildcard patterns (::)
          // This gives a single total rather than individual account balances
          if (pattern.endsWith(':') || pattern.includes('::')) {
            const aggregated = ledger.getAggregatedBalances([pattern]);
            result = { type: 'balance', data: aggregated, timestamp: new Date() };
          } else {
            const balances = ledger.getBalances(pattern);
            result = { type: 'balance', data: balances, timestamp: new Date() };
          }
        } else {
          result = { type: 'balance', data: [], timestamp: new Date() };
        }
        break;
      }
      case 'transactions': {
        const filter: { account?: string; metadata?: Record<string, string> } = {};

        if (query.transactionFilter.account) {
          filter.account = substituteVars(query.transactionFilter.account);
        }

        if (query.transactionFilter.metadata) {
          filter.metadata = {};
          for (const [key, value] of Object.entries(query.transactionFilter.metadata)) {
            filter.metadata[key] = substituteVars(value);
          }
        }

        const txs = ledger.listTransactions(filter);
        result = { type: 'transactions', data: txs, timestamp: new Date() };
        break;
      }
      case 'accounts': {
        const address = substituteVars(query.accountAddress);
        const accounts = ledger.listAccounts({ address });
        result = { type: 'accounts', data: accounts, timestamp: new Date() };
        break;
      }
      default:
        result = { type: 'balance', data: [], timestamp: new Date() };
    }

    // Cache the result
    const newQueryResults = new Map(queryResults);
    newQueryResults.set(query.title, result);
    set({ queryResults: newQueryResults });

    return result;
  },

  goToStep: (step: number) => {
    set({ currentStep: step });
  },

  reset: () => {
    const { config } = get();
    if (config) {
      resetLedgerInstance();
      const ledger = getLedger(config.id);
      set((state) => ({
        ledger,
        currentStep: -1,
        executedSteps: new Set(),
        transactions: [],
        queryResults: new Map(),
        error: null,
        balanceVersion: state.balanceVersion + 1,
      }));
    }
  },

  getBalance: (pattern: string) => {
    const { config } = get();
    const ledger = config ? getLedger(config.id) : null;
    if (!ledger) return [];
    const substituted = get().substituteVariables(pattern);
    return ledger.getBalances(substituted);
  },

  getFormattedBalance: (pattern: string) => {
    const balances = get().getBalance(pattern);
    if (balances.length === 0) return '0';

    return balances
      .map((b) => formatAmount(b.balance, b.asset))
      .join(', ');
  },

  getAllBalances: () => {
    const { config } = get();
    const ledger = config ? getLedger(config.id) : null;
    if (!ledger) return [];

    // Get all accounts except @world (include zero balances)
    const accounts = ledger.listAccounts();
    const allBalances: BalanceResult[] = [];

    for (const account of accounts) {
      if (account.address === '@world') continue;

      for (const [asset, balance] of account.balances) {
        allBalances.push({
          address: account.address,
          asset,
          balance,
        });
      }
    }

    return allBalances;
  },

  substituteVariables: (text: string) => {
    const { config } = get();
    if (!config) return text;

    let result = text;
    for (const [key, value] of Object.entries(config.variables)) {
      result = result.replaceAll(`{${key}}`, value);
    }
    return result;
  },
}));
