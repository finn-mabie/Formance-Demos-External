'use client';

import { useDemoStore } from '@/lib/store';
import { QueryCard } from './QueryCard';
import { ChevronLeft, Search } from 'lucide-react';

export function DemoExplore() {
  const { config, goToStep } = useDemoStore();

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Explore the Data</h2>
        </div>
        <p className="text-muted-foreground mt-1">
          Query the ledger to understand account balances, transaction history, and more.
        </p>
      </div>

      {/* Queries */}
      <div className="space-y-4">
        {config.usefulQueries.map((query, idx) => (
          <QueryCard key={idx} query={query} />
        ))}
      </div>

      {/* Back Button */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={() => goToStep(config.transactionSteps.length - 1)}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Last Step
        </button>
      </div>
    </div>
  );
}
