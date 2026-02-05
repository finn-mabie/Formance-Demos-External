'use client';

import { Globe, FileText, Lightbulb, Sparkles } from 'lucide-react';

interface BuilderInput {
  companyUrl: string;
  transcript: string;
  useCase: string;
}

interface BuilderFormProps {
  input: BuilderInput;
  onChange: (input: BuilderInput) => void;
  onSubmit: () => void;
}

export function BuilderForm({ input, onChange, onSubmit }: BuilderFormProps) {
  const hasInput = input.companyUrl || input.transcript || input.useCase;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      {/* Company URL */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Globe className="w-4 h-4 text-primary" />
          Company Website
        </label>
        <input
          type="url"
          placeholder="https://example.com"
          value={input.companyUrl}
          onChange={(e) => onChange({ ...input, companyUrl: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          We'll analyze the company's website to understand their business model
        </p>
      </div>

      {/* Transcript */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <FileText className="w-4 h-4 text-primary" />
          Sales Call Transcript (Optional)
        </label>
        <textarea
          placeholder="Paste transcript from a sales call or discovery meeting..."
          value={input.transcript}
          onChange={(e) => onChange({ ...input, transcript: e.target.value })}
          rows={6}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Include any relevant discussions about their payment flows and requirements
        </p>
      </div>

      {/* Use Case Description */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Use Case Description (Optional)
        </label>
        <textarea
          placeholder="Describe the specific use case you want to demonstrate, e.g., 'Customer wallet with deposits, purchases, and withdrawals' or 'B2B payments with escrow'"
          value={input.useCase}
          onChange={(e) => onChange({ ...input, useCase: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Help focus the demo on specific payment flows
        </p>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          onClick={onSubmit}
          disabled={!hasInput}
          className="w-full btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          Generate Demo
        </button>
        {!hasInput && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Please provide at least one input to generate a demo
          </p>
        )}
      </div>
    </div>
  );
}
