'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDemoStore } from '@/lib/store';
import { Play, Trash2, X, Layers, AlertTriangle } from 'lucide-react';

export function DemoHeader() {
  const { config, reset, goToStep } = useDemoStore();
  const [showClearModal, setShowClearModal] = useState(false);

  if (!config) return null;

  const handleRestart = () => {
    goToStep(-1);
  };

  const handleClear = () => {
    setShowClearModal(true);
  };

  const confirmClear = () => {
    reset();
    setShowClearModal(false);
  };

  return (
    <header className="bg-muted/30 border-b border-border px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-foreground">{config.name}</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRestart}
          className="btn-outline btn-sm flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Restart
        </button>
        <button
          onClick={handleClear}
          className="btn-outline btn-sm flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
        >
          <Trash2 className="h-4 w-4" />
          Clear Ledger
        </button>
        <Link
          href="/"
          className="btn-ghost btn-sm flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Exit Demo
        </Link>
      </div>

      {/* Clear Ledger Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowClearModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Clear the Ledger?
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  We know ledgers should be immutable, but this is just for demo purposes.
                </p>
                <p className="text-sm text-muted-foreground">
                  This will reset all balances and transactions so you can start fresh.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClearModal(false)}
                className="btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="btn-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Clear Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
