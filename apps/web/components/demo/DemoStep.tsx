'use client';

import { useDemoStore } from '@/lib/store';
import { FlowDiagram, parsePostingsFromNumscript } from './FlowDiagram';
import { QueryCard } from './QueryCard';
import { formatAmount } from '@formance-demo/numscript-parser';
import {
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Code,
  Terminal,
  ArrowRight,
  Clock,
  Wallet,
  FileText,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

function generateApiCode(txType: string, variables: Record<string, string>): string {
  const varsJson = JSON.stringify(variables, null, 2).split('\n').join('\n      ');
  return `// Read the script file
const script = fs.readFileSync('scripts/${txType.toLowerCase()}.num');

// Send to Formance with variables
await fetch('/api/ledger/v2/{ledger}/transactions', {
  method: 'POST',
  body: JSON.stringify({
    script: {
      plain: script,
      vars: ${varsJson}
    }
  })
});`;
}

interface DemoStepProps {
  stepIndex: number;
}

export function DemoStep({ stepIndex }: DemoStepProps) {
  const {
    config,
    executeStep,
    executedSteps,
    transactions,
    goToStep,
    error,
    substituteVariables,
  } = useDemoStore();

  const [showNumscript, setShowNumscript] = useState(false);
  const [showApiCall, setShowApiCall] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [justRan, setJustRan] = useState(false);

  if (!config) return null;

  const step = config.transactionSteps[stepIndex];
  if (!step) return null;

  const isExecuted = executedSteps.has(stepIndex);
  const transaction = transactions[stepIndex];
  const isLastStep = stepIndex === config.transactionSteps.length - 1;
  const isFirstStep = stepIndex === 0;

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await executeStep(stepIndex);
      // Show "just ran" feedback briefly
      setJustRan(true);
      setTimeout(() => setJustRan(false), 2000);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      goToStep(config.transactionSteps.length);
    } else {
      goToStep(stepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (isFirstStep) {
      goToStep(-1);
    } else {
      goToStep(stepIndex - 1);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const substitutedNumscript = substituteVariables(step.numscript);
  const postings = parsePostingsFromNumscript(substitutedNumscript);

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold text-primary">{stepIndex + 1}</span>
          <div>
            <h2 className="text-3xl font-bold text-foreground">{step.label}</h2>
            <p className="text-lg text-muted-foreground mt-1">{step.description}</p>
          </div>
        </div>

        {/* Run Step Button */}
        <div className="flex items-center gap-3">
          {isExecuted ? (
            <>
              <div className={`flex items-center gap-2 transition-all duration-300 ${justRan ? 'text-emerald-500 scale-110' : 'text-emerald-600'}`}>
                <CheckCircle2 className={`h-5 w-5 ${justRan ? 'animate-pulse' : ''}`} />
                <span className="font-medium text-sm">{justRan ? 'Updated!' : 'Executed'}</span>
              </div>
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className="btn-ghost btn-sm text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {isExecuting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {isExecuting ? 'Running...' : 'Run Again'}
              </button>
            </>
          ) : (
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="btn btn-lg flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Run Step
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Chip and toggle buttons */}
      <div className="flex items-center gap-2">
        <span className="chip chip-mint">{step.txType}</span>
        <button
          onClick={() => setShowNumscript(!showNumscript)}
          className="btn-ghost btn-sm text-xs flex items-center gap-1"
        >
          <Code className="h-3 w-3" />
          {showNumscript ? 'Hide' : 'Show'} Numscript
        </button>
        <button
          onClick={() => setShowApiCall(!showApiCall)}
          className="btn-ghost btn-sm text-xs flex items-center gap-1"
        >
          <Terminal className="h-3 w-3" />
          {showApiCall ? 'Hide' : 'Show'} API Call
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <div>
            <p className="font-medium text-red-800">Error executing transaction</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Numscript code display */}
      {showNumscript && (
        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Numscript</span>
            <button
              onClick={() => copyToClipboard(substitutedNumscript, 'numscript')}
              className="text-slate-400 hover:text-slate-200"
            >
              {copied === 'numscript' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <pre className="text-sm text-slate-100 font-mono whitespace-pre bg-transparent">
            {substitutedNumscript}
          </pre>
        </div>
      )}

      {/* API Call display */}
      {showApiCall && (
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">
                <span className="text-blue-400">TypeScript</span>
              </span>
              <button
                onClick={() => copyToClipboard(generateApiCode(step.txType, config.variables), 'api')}
                className="text-slate-400 hover:text-slate-200"
              >
                {copied === 'api' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <pre className="text-sm font-mono whitespace-pre bg-transparent">
              <span className="text-slate-400">{'// Read the script file\n'}</span>
              <span className="text-violet-400">const</span>
              <span className="text-slate-100"> script = </span>
              <span className="text-emerald-400">fs</span>
              <span className="text-slate-100">.</span>
              <span className="text-blue-400">readFileSync</span>
              <span className="text-slate-100">(</span>
              <span className="text-amber-300">{`'scripts/${step.txType.toLowerCase()}.num'`}</span>
              <span className="text-slate-100">);</span>
              {'\n\n'}
              <span className="text-slate-400">{'// Send to Formance with variables\n'}</span>
              <span className="text-violet-400">await</span>
              <span className="text-slate-100"> </span>
              <span className="text-blue-400">fetch</span>
              <span className="text-slate-100">(</span>
              <span className="text-amber-300">'/api/ledger/v2/&#123;ledger&#125;/transactions'</span>
              <span className="text-slate-100">, {'{\n'}</span>
              <span className="text-slate-100">{'  method: '}</span>
              <span className="text-amber-300">'POST'</span>
              <span className="text-slate-100">{',\n'}</span>
              <span className="text-slate-100">{'  body: '}</span>
              <span className="text-emerald-400">JSON</span>
              <span className="text-slate-100">.stringify({'{\n'}</span>
              <span className="text-slate-100">{'    script: {\n'}</span>
              <span className="text-slate-100">{'      plain: script,\n'}</span>
              <span className="text-slate-100">{'      vars: '}</span>
              <span className="text-slate-300">{JSON.stringify(config.variables, null, 6).split('\n').join('\n      ')}</span>
              <span className="text-slate-100">{'\n    }\n  })'}</span>
              <span className="text-slate-100">{'\n}'}</span>
              <span className="text-slate-100">);</span>
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            The script file stays static — just pass different variables for each transaction.
          </p>
        </div>
      )}

      {/* Flow Diagram - only show before execution */}
      {!isExecuted && postings.length > 0 && (
        <FlowDiagram
          postings={postings}
          txType={step.txType}
          demoName={config.name}
          description="Visual representation of the money flow"
        />
      )}

      {/* Transaction Result */}
      {isExecuted && transaction && (
        <div className={`bg-card border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${justRan ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-border'}`}>
          {/* Transaction header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                #{transaction.id}
              </span>
              {transaction.metadata?.type && (
                <span className="text-sm font-medium text-primary">
                  {String(transaction.metadata.type)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Just now
            </div>
          </div>

          {/* Postings as compact flow cards */}
          <div className="p-4 space-y-3">
            {transaction.postings.map((posting, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                {/* Source */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-red-600 uppercase font-medium">From</div>
                    <div className="font-mono text-xs truncate">{posting.source}</div>
                  </div>
                </div>

                {/* Amount + Arrow */}
                <div className="flex flex-col items-center flex-shrink-0 px-2">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold whitespace-nowrap">
                    {formatAmount(posting.amount, posting.asset)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary mt-1" />
                </div>

                {/* Destination */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-emerald-600 uppercase font-medium">To</div>
                    <div className="font-mono text-xs truncate">{posting.destination}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Balance Impact + Metadata in compact row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-4 border-t border-border">
            {/* Balance Impact */}
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <Wallet className="h-3 w-3" />
                Balance Impact
              </div>
              <div className="space-y-1">
                {(() => {
                  const impacts = new Map<string, Map<string, bigint>>();
                  for (const p of transaction.postings) {
                    if (!impacts.has(p.source)) impacts.set(p.source, new Map());
                    const srcBal = impacts.get(p.source)!.get(p.asset) ?? 0n;
                    impacts.get(p.source)!.set(p.asset, srcBal - p.amount);
                    if (!impacts.has(p.destination)) impacts.set(p.destination, new Map());
                    const dstBal = impacts.get(p.destination)!.get(p.asset) ?? 0n;
                    impacts.get(p.destination)!.set(p.asset, dstBal + p.amount);
                  }
                  const entries: Array<{ account: string; asset: string; amount: bigint }> = [];
                  for (const [account, assets] of impacts) {
                    for (const [asset, amount] of assets) {
                      if (amount !== 0n) entries.push({ account, asset, amount });
                    }
                  }
                  return entries.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 text-xs bg-muted/30 rounded px-2 py-1">
                      <span className="font-mono text-muted-foreground break-all">{entry.account}</span>
                      <span className={`font-semibold whitespace-nowrap ${entry.amount > 0n ? 'text-emerald-600' : 'text-red-500'}`}>
                        {entry.amount > 0n ? '+' : ''}{formatAmount(entry.amount, entry.asset)}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Metadata */}
            {Object.keys(transaction.metadata).length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <FileText className="h-3 w-3" />
                  Metadata
                </div>
                <div className="space-y-1">
                  {Object.entries(transaction.metadata).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium truncate max-w-[120px]">{String(value)}</span>
                    </div>
                  ))}
                  {Object.keys(transaction.metadata).length > 5 && (
                    <div className="text-xs text-muted-foreground">+{Object.keys(transaction.metadata).length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Queries */}
      {isExecuted && step.queries && step.queries.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <span className="text-muted-foreground">Explore the data</span>
          </h3>
          {step.queries.map((query, idx) => (
            <QueryCard key={idx} query={query} />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={handlePrevious}
          className="btn-ghost flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {isFirstStep ? 'Back to Overview' : 'Previous Step'}
        </button>

        <button
          onClick={handleNext}
          className="btn-primary flex items-center gap-2"
        >
          {isLastStep ? 'Explore Data' : 'Next Step'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
