'use client';

import { Globe, Layers, Sparkles } from 'lucide-react';

interface BuilderInput {
  companyUrl: string;
  description: string;
}

interface BuilderFormProps {
  input: BuilderInput;
  onChange: (input: BuilderInput) => void;
  onSubmit: () => void;
}

export function BuilderForm({ input, onChange, onSubmit }: BuilderFormProps) {
  const hasInput = input.companyUrl || input.description;

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

      {/* What are you building */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Layers className="w-4 h-4 text-primary" />
          What are you building?
        </label>
        <textarea
          placeholder="Describe what you want to track in the ledger. For example:

• 'A digital wallet where customers can deposit funds, make purchases, and withdraw to their bank account'
• 'Cross-border remittances from US to Philippines with FX conversion'
• 'B2B marketplace with escrow payments and seller payouts'
• 'Crypto exchange with fiat on/off ramps and trading pairs'"
          value={input.description}
          onChange={(e) => onChange({ ...input, description: e.target.value })}
          rows={7}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Describe the money flows you want to model - accounts, transactions, and business logic
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
