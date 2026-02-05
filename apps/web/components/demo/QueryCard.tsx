'use client';

import { useState } from 'react';
import { useDemoStore } from '@/lib/store';
import { Query, BalanceQuery, TransactionQuery, AccountQuery } from '@formance-demo/demo-configs';
import { BalanceResult, Transaction, Account } from '@formance-demo/ledger-engine';
import { formatAmount } from '@formance-demo/numscript-parser';
import {
  ChevronDown,
  Play,
  Loader2,
  Terminal,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface QueryCardProps {
  query: Query;
}

export function QueryCard({ query }: QueryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const { runQuery, substituteVariables } = useDemoStore();

  const handleRun = async () => {
    setIsLoading(true);
    // Simulate slight delay for UX
    await new Promise((resolve) => setTimeout(resolve, 100));
    const queryResult = runQuery(query);
    setResult(queryResult.data);
    setIsLoading(false);
  };

  const getQueryDetails = (): { method: string; endpoint: string; body?: Record<string, unknown> } => {
    switch (query.queryType) {
      case 'balance': {
        const bq = query as BalanceQuery;
        if (bq.addressFilters && bq.addressFilters.length > 0) {
          return {
            method: 'POST',
            endpoint: '/v2/{ledger}/aggregate/balances',
            body: {
              $or: bq.addressFilters.map((f) => ({
                $match: { address: substituteVariables(f) },
              })),
            },
          };
        }
        return {
          method: 'POST',
          endpoint: '/v2/{ledger}/aggregate/balances',
          body: {
            $match: { address: substituteVariables(bq.addressFilter ?? '') },
          },
        };
      }
      case 'transactions': {
        const tq = query as TransactionQuery;
        const conditions: Record<string, unknown>[] = [];

        if (tq.transactionFilter.account) {
          conditions.push({
            $match: { account: substituteVariables(tq.transactionFilter.account) },
          });
        }

        if (tq.transactionFilter.metadata) {
          for (const [key, value] of Object.entries(tq.transactionFilter.metadata)) {
            conditions.push({
              $match: { [`metadata[${key}]`]: substituteVariables(value) },
            });
          }
        }

        return {
          method: 'POST',
          endpoint: '/v2/{ledger}/transactions',
          body: conditions.length === 1 ? conditions[0] : { $and: conditions },
        };
      }
      case 'accounts': {
        const aq = query as AccountQuery;
        return {
          method: 'POST',
          endpoint: '/v2/{ledger}/accounts',
          body: {
            $match: { address: substituteVariables(aq.accountAddress) },
          },
        };
      }
      default:
        return {
          method: 'GET',
          endpoint: '/v2/{ledger}',
        };
    }
  };

  const queryDetails = getQueryDetails();

  return (
    <div className={`border rounded-lg transition-all ${isExpanded ? 'border-primary/50 bg-card' : 'border-border bg-card/50 hover:bg-card hover:border-primary/30'}`}>
      {/* Clickable question header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className={`h-4 w-4 flex-shrink-0 ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`font-medium ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
            {query.title}?
          </span>
        </div>
        <div className="flex items-center gap-2">
          {result !== null && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* API Call */}
          <div className="mt-3 bg-slate-900 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Terminal className="h-3 w-3" />
              <span>API Request</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-violet-400 font-semibold">{queryDetails.method}</span>
              <code className="text-blue-400 break-all">{queryDetails.endpoint}</code>
            </div>
            {queryDetails?.body && (
              <pre className="text-slate-300 text-xs whitespace-pre-wrap mt-2 pl-2 border-l-2 border-slate-700">
                {JSON.stringify(queryDetails.body, null, 2)}
              </pre>
            )}
          </div>

          {/* Run Query button */}
          <button
            onClick={handleRun}
            disabled={isLoading}
            className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              result !== null
                ? 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {result !== null ? 'Run Again' : 'Run Query'}
              </>
            )}
          </button>

          {/* Results */}
          {result !== null && (
            <div className="mt-3">
              <QueryResult type={query.queryType} data={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface QueryResultProps {
  type: 'balance' | 'transactions' | 'accounts';
  data: unknown;
}

function QueryResult({ type, data }: QueryResultProps) {
  if (type === 'balance') {
    const balances = data as BalanceResult[] | Array<{ asset: string; balance: bigint; accounts: string[] }>;

    if (!balances || balances.length === 0) {
      return <div className="text-sm text-muted-foreground py-2">No balance</div>;
    }

    // Check if aggregated or individual
    const isAggregated = 'accounts' in (balances[0] ?? {});

    const renderBalanceCard = (asset: string, balance: bigint, idx: number) => {
      const [currency] = asset.split('/');
      return (
        <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          <div className="text-xs text-emerald-600">{currency}</div>
          <div className="text-lg font-bold text-emerald-700">
            {formatAmount(balance, asset)}
          </div>
        </div>
      );
    };

    if (isAggregated) {
      const agg = balances as Array<{ asset: string; balance: bigint; accounts: string[] }>;
      return (
        <div className="flex flex-wrap gap-3">
          {agg.map((b, idx) => renderBalanceCard(b.asset, b.balance, idx))}
        </div>
      );
    }

    const individual = balances as BalanceResult[];
    return (
      <div className="flex flex-wrap gap-3">
        {individual.map((b, idx) => renderBalanceCard(b.asset, b.balance, idx))}
      </div>
    );
  }

  if (type === 'transactions') {
    const transactions = data as Transaction[];

    if (!transactions || transactions.length === 0) {
      return <div className="text-sm text-muted-foreground py-2">No transactions found</div>;
    }

    return (
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {transactions.slice(0, 8).map((tx) => {
          const txType = tx.metadata.type as string | undefined;
          return (
            <div key={tx.id} className="bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    #{tx.id}
                  </span>
                  {txType && (
                    <span className="text-xs font-medium text-primary">{txType}</span>
                  )}
                </div>
              </div>
              {tx.postings.map((p, pIdx) => (
                <div key={pIdx} className="flex items-center gap-2 text-xs mt-2 p-2 bg-card rounded">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-red-500 text-[10px] uppercase flex-shrink-0">From</span>
                    <span className="font-mono text-foreground break-all">{p.source}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-emerald-500 text-[10px] uppercase flex-shrink-0">To</span>
                    <span className="font-mono text-foreground break-all">{p.destination}</span>
                  </div>
                  <span className="font-semibold text-primary flex-shrink-0">
                    {formatAmount(p.amount, p.asset)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
        {transactions.length > 8 && (
          <p className="text-xs text-muted-foreground text-center py-1">
            +{transactions.length - 8} more transactions
          </p>
        )}
      </div>
    );
  }

  if (type === 'accounts') {
    const accounts = data as Account[];

    if (!accounts || accounts.length === 0) {
      return <div className="text-sm text-muted-foreground py-2">No accounts found</div>;
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {accounts.slice(0, 6).map((acc) => (
          <div key={acc.address} className="bg-muted/30 rounded-lg px-3 py-2 border border-border">
            <div className="font-mono text-sm text-primary break-all">{acc.address}</div>
            {acc.balances.size > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground font-medium mb-1">Balances</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(acc.balances.entries()).map(([asset, balance]) => {
                    const [currency] = asset.split('/');
                    return (
                      <span
                        key={asset}
                        className="text-xs font-mono bg-card px-2 py-0.5 rounded"
                      >
                        {formatAmount(balance, asset)} {currency}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {Object.keys(acc.metadata).length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground font-medium mb-1">Metadata</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(acc.metadata).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span className="font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {accounts.length > 6 && (
          <div className="text-xs text-muted-foreground text-center py-1">+{accounts.length - 6} more</div>
        )}
      </div>
    );
  }

  return null;
}
