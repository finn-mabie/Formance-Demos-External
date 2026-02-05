'use client';

import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';

interface AgentState {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: unknown;
  error?: string;
}

interface AgentProgressProps {
  agents: AgentState[];
}

export function AgentProgress({ agents }: AgentProgressProps) {
  const getStatusIcon = (status: AgentState['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'completed':
        return <Check className="w-5 h-5 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: AgentState['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-muted border-border';
      case 'running':
        return 'bg-primary/10 border-primary/30';
      case 'completed':
        return 'bg-emerald-50 border-emerald-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  const completedCount = agents.filter((a) => a.status === 'completed').length;
  const currentAgent = agents.find((a) => a.status === 'running');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Building Your Demo</h2>
        <p className="text-lg text-muted-foreground">
          {currentAgent
            ? `Running ${currentAgent.name} agent...`
            : completedCount === agents.length
            ? 'All agents completed!'
            : 'Starting agents...'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {agents.length} agents
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${(completedCount / agents.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Agent list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {agents.map((agent, index) => (
          <div
            key={agent.id}
            className={`flex items-center gap-4 p-4 ${
              index < agents.length - 1 ? 'border-b border-border' : ''
            } ${getStatusColor(agent.status)}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                agent.status === 'completed'
                  ? 'bg-emerald-100'
                  : agent.status === 'running'
                  ? 'bg-primary/20'
                  : agent.status === 'error'
                  ? 'bg-red-100'
                  : 'bg-muted'
              }`}
            >
              {getStatusIcon(agent.status)}
            </div>

            <div className="flex-1">
              <div className="font-medium text-foreground">{agent.name}</div>
              <div className="text-sm text-muted-foreground">
                {agent.status === 'pending' && 'Waiting to run...'}
                {agent.status === 'running' && 'Processing...'}
                {agent.status === 'completed' && 'Completed successfully'}
                {agent.status === 'error' && (agent.error ?? 'An error occurred')}
              </div>
            </div>

{/* Status indicator only - no action needed */}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <h3 className="font-medium text-emerald-800 mb-2">What's happening?</h3>
        <ul className="text-sm text-emerald-700 space-y-2">
          <li>
            <strong>Research:</strong> Analyzing company information to understand their
            business model and payment flows
          </li>
          <li>
            <strong>Chart of Accounts:</strong> Designing the account structure with proper
            naming conventions
          </li>
          <li>
            <strong>Flow Designer:</strong> Creating transaction step sequences that tell the
            story
          </li>
          <li>
            <strong>Numscript Writer:</strong> Converting flows into executable Numscript code
          </li>
          <li>
            <strong>Config Generator:</strong> Assembling everything into a complete demo
            configuration
          </li>
        </ul>
      </div>
    </div>
  );
}
