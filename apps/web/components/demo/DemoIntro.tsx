'use client';

import { useDemoStore } from '@/lib/store';
import {
  ArrowRight,
  Layers,
  Code,
  Wallet,
  Building2,
  CreditCard,
  AlertCircle,
  Info,
} from 'lucide-react';

const getAccountGroupColor = (color?: string) => {
  switch (color) {
    case 'blue':
      return 'bg-muted/50 text-foreground border-blue-300/50';
    case 'green':
      return 'bg-muted/50 text-foreground border-emerald-300/50';
    case 'purple':
      return 'bg-muted/50 text-foreground border-purple-300/50';
    case 'orange':
      return 'bg-muted/50 text-foreground border-orange-300/50';
    case 'red':
      return 'bg-muted/50 text-foreground border-red-300/50';
    case 'slate':
      return 'bg-muted/50 text-foreground border-border';
    default:
      return 'bg-muted/50 text-foreground border-border';
  }
};

const getAccountIcon = (color?: string) => {
  switch (color) {
    case 'blue':
      return <Wallet className="h-5 w-5" />;
    case 'green':
      return <Building2 className="h-5 w-5" />;
    case 'purple':
      return <CreditCard className="h-5 w-5" />;
    case 'orange':
      return <Layers className="h-5 w-5" />;
    case 'red':
      return <AlertCircle className="h-5 w-5" />;
    case 'slate':
      return <Layers className="h-5 w-5" />;
    default:
      return <Wallet className="h-5 w-5" />;
  }
};

export function DemoIntro() {
  const { config, goToStep, substituteVariables } = useDemoStore();

  if (!config) return null;

  return (
    <div className="space-y-8">
      {/* Intro header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-2 text-foreground">{config.name}</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {config.description}
        </p>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-8">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">This is a simulation</p>
          <p className="text-sm text-blue-700 mt-0.5">
            This demo is not connected to a real Formance ledger. All transactions and balances shown are simulated locally for informational and educational purposes only.
          </p>
        </div>
      </div>

      {/* Account Structure */}
      {config.accounts && config.accounts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-semibold text-foreground">Account Structure</h3>
          </div>
          <p className="text-muted-foreground mb-6">
            This demo uses the following accounts to model the business flow:
          </p>
          <div className="space-y-3">
            {config.accounts
              .filter((a) => a.address !== '@world')
              .map((account) => (
                <div
                  key={account.address}
                  className={`p-4 rounded-xl border-2 transition-all ${getAccountGroupColor(
                    account.color
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">{getAccountIcon(account.color)}</div>
                    <div className="flex-1">
                      <code className="text-sm font-mono font-semibold">
                        {substituteVariables(account.address)}
                      </code>
                      <p className="text-sm opacity-80 mt-1">{account.description}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Variables */}
      {config.variables && Object.keys(config.variables).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Code className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-semibold text-foreground">Demo Variables</h3>
          </div>
          <p className="text-muted-foreground mb-6">
            These values will be used throughout the demo transactions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(config.variables).map(([key, value]) => (
              <div key={key} className="bg-muted/50 rounded-lg p-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {key}
                </span>
                <p className="font-mono font-medium mt-1 text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Flow Preview */}
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <ArrowRight className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-semibold text-foreground">Transaction Flow</h3>
        </div>
        <p className="text-muted-foreground mb-6">
          This demo will walk through {config.transactionSteps.length} transactions:
        </p>
        <div className="space-y-3">
          {config.transactionSteps.map((step, index) => (
            <div
              key={step.txType}
              className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {index + 1}
              </span>
              <div className="flex-1">
                <span className="font-medium text-foreground">{step.label}</span>
                {step.description && (
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                )}
              </div>
              <span className="chip chip-slate text-xs">{step.txType}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <div className="text-center pt-4">
        <button onClick={() => goToStep(0)} className="btn-primary btn-lg px-8">
          Start Demo
          <ArrowRight className="h-5 w-5 ml-2" />
        </button>
      </div>
    </div>
  );
}
