/**
 * Numscript executor - runs parsed Numscript against a MockLedger
 */

import {
  MockLedger,
  Transaction,
  Posting,
  LedgerError,
  LedgerErrorCode,
} from '@formance-demo/ledger-engine';
import { parseNumscript, parseAsset } from './parser';
import { ExecutionVariables, ParsedSend, ParsedSource } from './types';

/**
 * Substitute variables in a string
 * Variables can be:
 * - {VAR_NAME} - demo config style
 * - $var_name - Numscript style
 */
function substituteVariables(str: string, variables: ExecutionVariables): string {
  // Replace {VAR_NAME} style
  let result = str.replace(/\{(\w+)\}/g, (_, name) => {
    const value = variables[name];
    if (value === undefined) return `{${name}}`;
    if (typeof value === 'object' && 'asset' in value) {
      return `[${value.asset} ${value.amount}]`;
    }
    return String(value);
  });

  // Replace $var_name style
  result = result.replace(/\$(\w+)/g, (_, name) => {
    const value = variables[name];
    if (value === undefined) return `$${name}`;
    if (typeof value === 'object' && 'asset' in value) {
      return `[${value.asset} ${value.amount}]`;
    }
    return String(value);
  });

  return result;
}

/**
 * Pending balance tracker - tracks balance changes from earlier sends
 * that haven't been committed to the ledger yet
 */
class PendingBalances {
  private changes: Map<string, Map<string, bigint>> = new Map();

  /**
   * Get the effective balance (ledger balance + pending changes)
   */
  getEffectiveBalance(ledger: MockLedger, account: string, asset: string): bigint {
    const ledgerBalance = ledger.getBalance(account, asset);
    const accountChanges = this.changes.get(account);
    if (!accountChanges) return ledgerBalance;
    const pendingChange = accountChanges.get(asset) ?? 0n;
    return ledgerBalance + pendingChange;
  }

  /**
   * Record a pending debit (decrease)
   */
  debit(account: string, asset: string, amount: bigint): void {
    if (!this.changes.has(account)) {
      this.changes.set(account, new Map());
    }
    const accountChanges = this.changes.get(account)!;
    const current = accountChanges.get(asset) ?? 0n;
    accountChanges.set(asset, current - amount);
  }

  /**
   * Record a pending credit (increase)
   */
  credit(account: string, asset: string, amount: bigint): void {
    if (!this.changes.has(account)) {
      this.changes.set(account, new Map());
    }
    const accountChanges = this.changes.get(account)!;
    const current = accountChanges.get(asset) ?? 0n;
    accountChanges.set(asset, current + amount);
  }
}

/**
 * Resolve a source for the amount needed
 * Handles waterfall (ordered) sources
 */
function resolveSource(
  sources: ParsedSource[],
  asset: string,
  amountNeeded: bigint,
  ledger: MockLedger,
  variables: ExecutionVariables,
  pendingBalances: PendingBalances
): Array<{ source: string; amount: bigint; allowOverdraft: boolean }> {
  const result: Array<{ source: string; amount: bigint; allowOverdraft: boolean }> = [];
  let remaining = amountNeeded;

  for (const source of sources) {
    if (remaining <= 0n) break;

    const account = substituteVariables(source.account, variables);
    const isWorld = account === '@world';
    const hasOverdraft = source.unboundedOverdraft || source.allowOverdraft || isWorld;

    // Get effective balance (ledger + pending changes from earlier sends)
    const available = pendingBalances.getEffectiveBalance(ledger, account, asset);

    let amountFromSource: bigint;

    if (source.maxAmount) {
      // Limited by max
      const max = source.maxAmount.amount;
      amountFromSource = remaining < max ? remaining : max;
      if (!hasOverdraft && available < amountFromSource) {
        amountFromSource = available > 0n ? available : 0n;
      }
    } else if (hasOverdraft || isWorld) {
      // Can overdraft - take everything needed
      amountFromSource = remaining;
    } else {
      // Take what's available, up to what's needed
      amountFromSource = available < remaining ? available : remaining;
      if (available < 0n) amountFromSource = 0n;
    }

    if (amountFromSource > 0n) {
      result.push({
        source: account,
        amount: amountFromSource,
        allowOverdraft: hasOverdraft,
      });
      remaining -= amountFromSource;
    }
  }

  if (remaining > 0n && !sources.some((s) => s.unboundedOverdraft || s.account === '@world')) {
    throw new LedgerError(
      `Insufficient funds: need ${remaining} more ${asset}`,
      LedgerErrorCode.INSUFFICIENT_FUNDS,
      { remaining: remaining.toString(), asset }
    );
  }

  return result;
}

/**
 * Calculate portion amount
 */
function calculatePortion(portion: string, total: bigint): bigint {
  if (portion === 'remaining') {
    return total;
  }

  if (portion.includes('%')) {
    const pct = parseFloat(portion.replace('%', ''));
    return BigInt(Math.floor(Number(total) * (pct / 100)));
  }

  if (portion.includes('/')) {
    const [num, denom] = portion.split('/').map(Number);
    return BigInt(Math.floor((Number(total) * num!) / denom!));
  }

  return total;
}

/**
 * Execute a single send statement
 */
function executeSend(
  send: ParsedSend,
  ledger: MockLedger,
  variables: ExecutionVariables,
  pendingBalances: PendingBalances
): Posting[] {
  const postings: Posting[] = [];

  // Get total amount
  const monetary = send.monetary;
  if (monetary === 'remaining') {
    throw new LedgerError(
      'Remaining monetary not supported in executor',
      LedgerErrorCode.EXECUTION_ERROR
    );
  }

  let totalAmount = monetary.amount;
  const asset = monetary.asset;

  // Handle "send all" (*) - not currently supported
  if (totalAmount === -1n) {
    throw new LedgerError(
      'Send all (*) not supported in mock executor',
      LedgerErrorCode.EXECUTION_ERROR
    );
  }

  // Resolve sources (uses pending balances to see effects of earlier sends)
  const resolvedSources = resolveSource(
    send.sources,
    asset,
    totalAmount,
    ledger,
    variables,
    pendingBalances
  );

  // Calculate destination amounts
  const destinations = send.destinations.filter((d) => !d.kept);
  let remainingForDest = totalAmount;
  const destAmounts: Array<{ account: string; amount: bigint }> = [];

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i]!;
    const account = substituteVariables(dest.account, variables);

    let amount: bigint;
    if (dest.portion === 'remaining' || i === destinations.length - 1) {
      amount = remainingForDest;
    } else if (dest.portion) {
      amount = calculatePortion(dest.portion, totalAmount);
    } else {
      amount = remainingForDest;
    }

    destAmounts.push({ account, amount });
    remainingForDest -= amount;
  }

  // Create postings - distribute sources across destinations
  // For simplicity, we match sources to destinations proportionally
  for (const { source, amount: sourceAmount } of resolvedSources) {
    let sourceRemaining = sourceAmount;

    for (const { account: destAccount, amount: destAmount } of destAmounts) {
      if (sourceRemaining <= 0n) break;

      const postingAmount = sourceRemaining < destAmount ? sourceRemaining : destAmount;

      postings.push({
        source,
        destination: destAccount,
        asset,
        amount: postingAmount,
      });

      // Update pending balances so subsequent sends see the effect
      pendingBalances.debit(source, asset, postingAmount);
      pendingBalances.credit(destAccount, asset, postingAmount);

      sourceRemaining -= postingAmount;
    }
  }

  return postings;
}

/**
 * Execute a Numscript against a ledger
 */
export function executeNumscript(
  script: string,
  ledger: MockLedger,
  variables: ExecutionVariables = {}
): Transaction {
  // Substitute variables in the script first
  const substitutedScript = substituteVariables(script, variables);

  // Parse the substituted script
  const parsed = parseNumscript(substitutedScript);

  // Track pending balance changes across sends within this script
  const pendingBalances = new PendingBalances();

  // Execute all sends and collect postings
  const allPostings: Posting[] = [];

  for (const send of parsed.sends) {
    const postings = executeSend(send, ledger, variables, pendingBalances);
    allPostings.push(...postings);
  }

  // Extract metadata
  const metadata: Record<string, string> = {};
  for (const meta of parsed.metadata) {
    if (meta.type === 'tx') {
      metadata[meta.key] = substituteVariables(meta.value, variables);
    }
  }

  // Build overdraft map
  const allowOverdraft = new Map<string, boolean>();
  for (const posting of allPostings) {
    // @world always allows overdraft
    if (posting.source === '@world') {
      allowOverdraft.set('@world', true);
    }
  }

  // Check parsed sources for overdraft flags
  for (const send of parsed.sends) {
    for (const source of send.sources) {
      if (source.unboundedOverdraft || source.allowOverdraft) {
        const account = substituteVariables(source.account, variables);
        allowOverdraft.set(account, true);
      }
    }
  }

  // Create the transaction
  const transaction = ledger.createTransaction(allPostings, metadata, { allowOverdraft });

  // Apply account metadata
  for (const meta of parsed.metadata) {
    if (meta.type === 'account' && meta.account) {
      const account = substituteVariables(meta.account, variables);
      const value = substituteVariables(meta.value, variables);
      ledger.setAccountMetadata(account, meta.key, value);
    }
  }

  return transaction;
}

/**
 * Validate Numscript without executing
 */
export function validateNumscript(script: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const parsed = parseNumscript(script);

    if (parsed.sends.length === 0) {
      errors.push('No send statements found');
    }

    for (const send of parsed.sends) {
      if (send.sources.length === 0) {
        errors.push('Send statement has no source');
      }
      if (send.destinations.length === 0) {
        errors.push('Send statement has no destination');
      }
    }
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { valid: errors.length === 0, errors };
}
