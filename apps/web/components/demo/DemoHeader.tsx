'use client';

import Link from 'next/link';
import { useDemoStore } from '@/lib/store';
import { Play, Trash2, X, Layers } from 'lucide-react';

export function DemoHeader() {
  const { config, reset, goToStep } = useDemoStore();

  if (!config) return null;

  const handleRestart = () => {
    goToStep(-1);
  };

  const handleClear = () => {
    if (confirm('Clear all data and restart the demo?')) {
      reset();
    }
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
    </header>
  );
}
