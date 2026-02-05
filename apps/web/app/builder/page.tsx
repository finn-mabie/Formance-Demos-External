'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Sparkles, FileText, Users, ArrowRight, Workflow, Code, Settings } from 'lucide-react';
import { DemoConfig } from '@formance-demo/demo-configs';
import { BuilderForm } from '@/components/builder/BuilderForm';
import { AgentProgress } from '@/components/builder/AgentProgress';
import { ConfigPreview } from '@/components/builder/ConfigPreview';

type BuilderStep = 'input' | 'processing' | 'preview';

interface AgentState {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: unknown;
  error?: string;
}

interface BuilderInput {
  companyUrl: string;
  description: string;
}

export default function BuilderPage() {
  const [step, setStep] = useState<BuilderStep>('input');
  const [input, setInput] = useState<BuilderInput>({
    companyUrl: '',
    description: '',
  });
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'research', name: 'Research', status: 'pending' },
    { id: 'chart-of-accounts', name: 'Chart of Accounts', status: 'pending' },
    { id: 'flow-designer', name: 'Flow Designer', status: 'pending' },
    { id: 'numscript-writer', name: 'Numscript Writer', status: 'pending' },
    { id: 'config-generator', name: 'Config Generator', status: 'pending' },
  ]);
  const [finalConfig, setFinalConfig] = useState<DemoConfig | null>(null);

  const handleStartBuild = async () => {
    setStep('processing');

    // Simulate agent pipeline execution
    // In production, this would call actual API routes
    const agentIds = ['research', 'chart-of-accounts', 'flow-designer', 'numscript-writer', 'config-generator'];

    let previousOutput: unknown = { input };

    for (const agentId of agentIds) {
      // Update status to running
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: 'running' as const } : a))
      );

      try {
        // Call API route
        const response = await fetch(`/api/agents/${agentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input,
            previousOutput,
          }),
        });

        if (!response.ok) {
          throw new Error(`Agent ${agentId} failed`);
        }

        const result = await response.json();

        // Update status to completed
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, status: 'completed' as const, output: result } : a))
        );

        previousOutput = result;
      } catch (error) {
        // Update status to error
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId
              ? { ...a, status: 'error' as const, error: error instanceof Error ? error.message : 'Unknown error' }
              : a
          )
        );
        return;
      }
    }

    setFinalConfig(previousOutput as DemoConfig);
    setStep('preview');
  };

  const handleReset = () => {
    setStep('input');
    setAgents([
      { id: 'research', name: 'Research', status: 'pending' },
      { id: 'chart-of-accounts', name: 'Chart of Accounts', status: 'pending' },
      { id: 'flow-designer', name: 'Flow Designer', status: 'pending' },
      { id: 'numscript-writer', name: 'Numscript Writer', status: 'pending' },
      { id: 'config-generator', name: 'Config Generator', status: 'pending' },
    ]);
    setFinalConfig(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-semibold text-foreground">Demo Builder</h1>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {['input', 'processing', 'preview'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s
                      ? 'bg-indigo-600 text-white'
                      : ['input', 'processing', 'preview'].indexOf(step) > i
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Input Step */}
        {step === 'input' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Build a Custom Demo
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Provide company information and our AI agents will design a complete
                Formance demo with accounts, transactions, and queries.
              </p>
            </div>

            <BuilderForm
              input={input}
              onChange={setInput}
              onSubmit={handleStartBuild}
            />

            {/* Agent Pipeline Preview */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-medium text-foreground mb-4">Agent Pipeline</h3>
              <div className="flex items-center justify-between">
                {[
                  { icon: FileText, label: 'Research', desc: 'Analyze company' },
                  { icon: Users, label: 'Accounts', desc: 'Design structure' },
                  { icon: Workflow, label: 'Flows', desc: 'Map transactions' },
                  { icon: Code, label: 'Numscript', desc: 'Write code' },
                  { icon: Settings, label: 'Config', desc: 'Assemble demo' },
                ].map((agent, i) => (
                  <div key={agent.label} className="flex items-center">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                        <agent.icon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium text-foreground">{agent.label}</div>
                      <div className="text-xs text-muted-foreground">{agent.desc}</div>
                    </div>
                    {i < 4 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground/50 mx-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <AgentProgress agents={agents} />
        )}

        {/* Preview Step */}
        {step === 'preview' && finalConfig && (
          <ConfigPreview config={finalConfig} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
