'use client';

import Link from 'next/link';
import { listDemoConfigs } from '@formance-demo/demo-configs';
import { ArrowRight, Layers } from 'lucide-react';

export default function HomePage() {
  const demos = listDemoConfigs();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center">
              <Layers className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-foreground">Formance Demos</span>
          </div>
          <Link
            href="/builder"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Build Custom Demo
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Interactive Demos</h1>
          <p className="text-muted-foreground">
            Step-by-step walkthroughs of Formance ledger capabilities. Each demo runs with a mocked
            backend.
          </p>
        </div>

        {/* Demo List */}
        <div className="space-y-3">
          {demos.map((demo) => (
            <Link
              key={demo.id}
              href={`/${demo.id}`}
              className="group flex items-center justify-between p-4 border border-border rounded-lg hover:border-foreground/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {demo.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{demo.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{demo.transactionSteps.length} steps</span>
                  <span>{demo.accounts.length} accounts</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-4" />
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground">
          Formance Demo Builder
        </div>
      </footer>
    </div>
  );
}
