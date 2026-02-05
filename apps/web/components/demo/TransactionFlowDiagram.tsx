'use client';

import { useMemo } from 'react';
import { parsePostingsFromNumscript, parseMetadataFromNumscript, formatAmount, parseAsset } from '@formance-demo/numscript-parser';
import { ArrowDown, ArrowRight, FileText, Tag } from 'lucide-react';

interface TransactionFlowDiagramProps {
  numscript: string;
}

export function TransactionFlowDiagram({ numscript }: TransactionFlowDiagramProps) {
  const { postings, isIntermediaryFlow, txMeta, accountMeta } = useMemo(() => {
    const postings = parsePostingsFromNumscript(numscript);
    const { txMeta, accountMeta } = parseMetadataFromNumscript(numscript);

    // Detect intermediary flow: destination of posting 1 = source of posting 2
    let isIntermediaryFlow = false;
    if (postings.length === 2) {
      const firstDest = postings[0]?.destination;
      const secondSource = postings[1]?.source;
      if (firstDest && secondSource && firstDest === secondSource) {
        isIntermediaryFlow = true;
      }
    }

    return { postings, isIntermediaryFlow, txMeta, accountMeta };
  }, [numscript]);

  if (postings.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-8">
        No postings detected in this Numscript
      </div>
    );
  }

  const formatPostingAmount = (amountStr: string) => {
    // Parse "USD/2 10000" format
    const parts = amountStr.split(' ');
    if (parts.length !== 2) return amountStr;

    const [asset, amountPart] = parts;
    if (!asset || !amountPart) return amountStr;

    try {
      const amount = BigInt(amountPart);
      return formatAmount(amount, asset);
    } catch {
      return amountStr;
    }
  };

  // Vertical (intermediary) flow
  if (isIntermediaryFlow && postings.length === 2) {
    const first = postings[0]!;
    const second = postings[1]!;

    return (
      <div className="flex gap-8">
        {/* Main flow diagram */}
        <div className="flex-1 flex flex-col items-center py-4">
          {/* Source account */}
          <AccountBox address={first.source} />

          {/* First amount */}
          <div className="my-2 flex flex-col items-center">
            <div className="text-base font-semibold text-emerald-400">
              {formatPostingAmount(first.amount)}
            </div>
            <ArrowDown className="w-6 h-6 text-muted-foreground my-1" />
          </div>

          {/* Intermediary account */}
          <AccountBox address={first.destination} isIntermediary />

          {/* Second amount */}
          <div className="my-2 flex flex-col items-center">
            <div className="text-base font-semibold text-emerald-400">
              {formatPostingAmount(second.amount)}
            </div>
            <ArrowDown className="w-6 h-6 text-muted-foreground my-1" />
          </div>

          {/* Destination account */}
          <AccountBox address={second.destination} />
        </div>

        {/* Metadata hints */}
        {(txMeta.length > 0 || accountMeta.length > 0) && (
          <div className="w-64 space-y-4">
            {txMeta.length > 0 && (
              <MetadataHint type="transaction" keys={txMeta} />
            )}
            {accountMeta.length > 0 && (
              <MetadataHint type="account" keys={accountMeta} />
            )}
          </div>
        )}
      </div>
    );
  }

  // Horizontal flow (default)
  return (
    <div className="space-y-6">
      {postings.map((posting, idx) => (
        <div key={idx} className="flex items-center gap-4">
          {/* Source */}
          <AccountBox address={posting.source} />

          {/* Amount and arrow */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="h-px bg-border flex-1" />
            <div className="text-base font-semibold text-emerald-400 px-3">
              {formatPostingAmount(posting.amount)}
            </div>
            <div className="h-px bg-border flex-1" />
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Destination */}
          <AccountBox address={posting.destination} />
        </div>
      ))}

      {/* Metadata hints */}
      {(txMeta.length > 0 || accountMeta.length > 0) && (
        <div className="flex gap-4 pt-4 border-t border-border">
          {txMeta.length > 0 && <MetadataHint type="transaction" keys={txMeta} />}
          {accountMeta.length > 0 && <MetadataHint type="account" keys={accountMeta} />}
        </div>
      )}
    </div>
  );
}

interface AccountBoxProps {
  address: string;
  isIntermediary?: boolean;
}

function AccountBox({ address, isIntermediary }: AccountBoxProps) {
  const displayAddress = address.startsWith('@') ? address : `@${address}`;

  return (
    <div
      className={`px-5 py-4 rounded-lg border-2 text-base ${
        isIntermediary
          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
      }`}
    >
      <code className="font-mono break-all">{displayAddress}</code>
    </div>
  );
}

interface MetadataHintProps {
  type: 'transaction' | 'account';
  keys: string[];
}

function MetadataHint({ type, keys }: MetadataHintProps) {
  const Icon = type === 'transaction' ? FileText : Tag;
  const label = type === 'transaction' ? 'Transaction Metadata' : 'Account Metadata';

  return (
    <div className="bg-muted/50 rounded-lg p-3 flex-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {keys.map((key) => (
          <code
            key={key}
            className="text-xs bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground"
          >
            {key}
          </code>
        ))}
      </div>
    </div>
  );
}
