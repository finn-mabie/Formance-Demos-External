'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Play, RotateCcw, Copy, Check, Code, Wallet, ArrowRightLeft } from 'lucide-react';
import { DemoConfig } from '@formance-demo/demo-configs';
import { saveGeneratedDemo } from '@/lib/generated-demos';

export type GeneratedConfig = DemoConfig;

interface ConfigPreviewProps {
  config: GeneratedConfig;
  onReset: () => void;
}

export function ConfigPreview({ config, onReset }: ConfigPreviewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'steps' | 'json'>('overview');

  const typedConfig = config;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typedConfig.id}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunDemo = () => {
    // Save the generated config to localStorage so the demo page can load it
    saveGeneratedDemo(config);
    // Navigate to the demo
    router.push(`/${typedConfig.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">{typedConfig.name}</h2>
          <p className="text-muted-foreground mt-1">{typedConfig.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="btn-ghost flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRunDemo}
          className="btn-primary btn-lg flex items-center gap-2"
        >
          <Play className="w-5 h-5" />
          Run Demo
        </button>
        <button
          onClick={handleDownload}
          className="btn-outline flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Config
        </button>
        <button
          onClick={handleCopy}
          className="btn-outline flex items-center gap-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: Wallet },
              { id: 'accounts', label: 'Accounts', icon: Wallet },
              { id: 'steps', label: 'Transaction Steps', icon: ArrowRightLeft },
              { id: 'json', label: 'JSON Config', icon: Code },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-primary">
                    {typedConfig.accounts.length}
                  </div>
                  <div className="text-sm text-primary/80">Accounts</div>
                </div>
                <div className="bg-purple-100 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-700">
                    {typedConfig.transactionSteps.length}
                  </div>
                  <div className="text-sm text-purple-600">Transaction Steps</div>
                </div>
                <div className="bg-emerald-100 border border-emerald-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-700">
                    {typedConfig.usefulQueries.length}
                  </div>
                  <div className="text-sm text-emerald-600">Queries</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-3">Variables</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(typedConfig.variables).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-muted px-3 py-1.5 rounded-lg text-sm"
                    >
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span className="font-mono text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-3">
              {typedConfig.accounts.map((account) => (
                <div
                  key={account.address}
                  className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <div
                    className="w-3 h-3 rounded-full mt-1.5"
                    style={{ backgroundColor: `var(--${account.color}-500, #6366f1)` }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-sm text-primary">{account.address}</div>
                    <div className="font-medium text-foreground mt-1">{account.name}</div>
                    <div className="text-sm text-muted-foreground">{account.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Steps Tab */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              {typedConfig.transactionSteps.map((step, index) => (
                <div key={step.txType} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-4 p-4 bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{step.label}</div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    </div>
                    <span className="chip chip-mint">{step.txType}</span>
                  </div>
                  <pre className="p-4 text-xs bg-muted/50 overflow-x-auto text-foreground">
                    <code>{step.numscript}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* JSON Tab */}
          {activeTab === 'json' && (
            <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-[600px] text-xs">
              <code>{JSON.stringify(config, null, 2)}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
