'use client';

import { useDemoStore } from '@/lib/store';
import { formatAmount } from '@formance-demo/numscript-parser';
import { Wallet, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

export function BalanceSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  // Subscribe to balanceVersion to trigger re-render when balances change
  const { getAllBalances, config, substituteVariables, balanceVersion } = useDemoStore();

  // Re-compute balances whenever balanceVersion changes (increments on each transaction)
  const balances = useMemo(() => getAllBalances(), [balanceVersion, getAllBalances]);

  // Group balances by account address, then by category
  const groupedByAccount = useMemo(() => {
    // First, group all balances by account address
    const accountBalances = new Map<string, Array<{ asset: string; balance: bigint }>>();

    for (const balance of balances) {
      if (!accountBalances.has(balance.address)) {
        accountBalances.set(balance.address, []);
      }
      accountBalances.get(balance.address)!.push({
        asset: balance.asset,
        balance: balance.balance,
      });
    }

    // Then group accounts by category (first segment)
    const groups = new Map<string, Array<{ address: string; balances: Array<{ asset: string; balance: bigint }> }>>();

    for (const [address, assetBalances] of accountBalances) {
      const cleanAddress = address.replace('@', '');
      const firstSegment = cleanAddress.split(':')[0] ?? 'other';

      if (!groups.has(firstSegment)) {
        groups.set(firstSegment, []);
      }
      groups.get(firstSegment)!.push({ address, balances: assetBalances });
    }

    return groups;
  }, [balances]);

  // Get a friendly name for the account based on config
  const getAccountName = (address: string) => {
    if (!config) return null;

    // Try to find matching account definition
    for (const accountDef of config.accounts) {
      // Substitute variables in the account definition address
      const defAddress = substituteVariables(accountDef.address);
      if (address === defAddress) {
        return accountDef.name;
      }
    }
    return null;
  };

  if (!isExpanded) {
    return (
      <aside className="w-12 bg-card border-l border-border flex flex-col items-center py-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          title="Show balances"
        >
          <Wallet className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Account Balances</h2>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {balances.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No account balances yet.
            <br />
            Execute transactions to see balances.
          </div>
        ) : (
          Array.from(groupedByAccount.entries()).map(([category, accounts]) => (
            <div key={category}>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </div>
              <div className="space-y-2">
                {accounts.map((account) => {
                  const friendlyName = getAccountName(account.address);
                  return (
                    <div
                      key={account.address}
                      className="bg-muted/50 rounded-lg p-3"
                    >
                      <div className="flex-1 min-w-0">
                        {friendlyName && (
                          <div className="text-xs text-muted-foreground mb-0.5">
                            {friendlyName}
                          </div>
                        )}
                        <code className="text-xs text-foreground font-mono break-all block">
                          {account.address}
                        </code>
                      </div>
                      <div className="mt-2 space-y-1">
                        {account.balances.map((bal) => (
                          <div key={bal.asset} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {bal.asset}
                            </span>
                            <span
                              className={`font-semibold text-sm ${
                                bal.balance === 0n
                                  ? 'text-muted-foreground'
                                  : bal.balance > 0n
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {formatAmount(bal.balance, bal.asset)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {balances.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {groupedByAccount.size} categories &bull;{' '}
            {Array.from(groupedByAccount.values()).reduce((sum, accounts) => sum + accounts.length, 0)} accounts
          </div>
        </div>
      )}
    </aside>
  );
}
