/**
 * Regex-based Numscript parser
 *
 * Handles the common patterns used in demo configurations:
 * - Simple sends: send [USD/2 1000] (source = @a destination = @b)
 * - Multi-source (waterfall): source = { @a @b }
 * - Metadata: set_tx_meta(), set_account_meta()
 * - Asset precision: USD/2, USDC/6
 */

import {
  ParsedNumscript,
  ParsedSend,
  ParsedSource,
  ParsedDestination,
  ParsedMonetary,
  ParsedMetadata,
  ParsedVariable,
  ExtractedPosting,
} from './types';

/**
 * Parse asset notation like "USD/2" into code and precision
 */
export function parseAsset(assetStr: string): { code: string; precision: number } {
  const parts = assetStr.split('/');
  if (parts.length === 2) {
    return {
      code: parts[0]!,
      precision: parseInt(parts[1]!, 10),
    };
  }
  return { code: assetStr, precision: 0 };
}

/**
 * Parse monetary notation like "[USD/2 1000]"
 */
export function parseMonetary(monetaryStr: string): ParsedMonetary {
  // Match [ASSET AMOUNT] or [ASSET *]
  const match = monetaryStr.match(/\[([^\s]+)\s+(\d+|\*)\]/);
  if (!match) {
    throw new Error(`Invalid monetary format: ${monetaryStr}`);
  }

  const asset = match[1]!;
  const amountStr = match[2]!;

  return {
    asset,
    amount: amountStr === '*' ? -1n : BigInt(amountStr), // -1 means "all"
  };
}

/**
 * Format amount with proper decimals based on asset precision
 */
export function formatAmount(amount: bigint, asset: string): string {
  const { code, precision } = parseAsset(asset);

  if (precision === 0) {
    return `${amount} ${code}`;
  }

  const divisor = BigInt(10 ** precision);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  // Pad fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(precision, '0');

  // Format with appropriate currency symbol
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BRL: 'R$',
    USDT: 'USDT ',
    USDC: 'USDC ',
  };

  const symbol = currencySymbols[code] ?? `${code} `;

  if (symbol.endsWith(' ')) {
    return `${symbol}${wholePart}.${fractionalStr}`;
  }
  return `${symbol}${wholePart}.${fractionalStr}`;
}

/**
 * Parse a Numscript send statement
 */
function parseSendStatement(sendStr: string): ParsedSend {
  // Extract monetary: [ASSET AMOUNT]
  const monetaryMatch = sendStr.match(/send\s+(\[[^\]]+\])/);
  if (!monetaryMatch) {
    throw new Error('Invalid send statement: missing monetary value');
  }

  const monetary = parseMonetary(monetaryMatch[1]!);

  // Extract source block
  const sourceMatch = sendStr.match(/source\s*=\s*(@[\w:{}]+(?:\s+allowing\s+(?:unbounded\s+)?overdraft(?:\s+up\s+to\s+\[[^\]]+\])?)?|\{[^}]+\})/s);
  if (!sourceMatch) {
    throw new Error('Invalid send statement: missing source');
  }

  const sources = parseSourceBlock(sourceMatch[1]!);

  // Extract destination block
  const destMatch = sendStr.match(/destination\s*=\s*(@[\w:{}]+|\{[^}]+\})/s);
  if (!destMatch) {
    throw new Error('Invalid send statement: missing destination');
  }

  const destinations = parseDestinationBlock(destMatch[1]!);

  return { monetary, sources, destinations };
}

/**
 * Parse source block which can be:
 * - Single account: @account
 * - Single account with overdraft: @account allowing unbounded overdraft
 * - Multiple accounts: { @a @b }
 */
function parseSourceBlock(sourceStr: string): ParsedSource[] {
  const sources: ParsedSource[] = [];

  // Check if it's a block { ... }
  if (sourceStr.startsWith('{')) {
    const blockContent = sourceStr.slice(1, -1).trim();
    const accountMatches = blockContent.matchAll(
      /(?:max\s+(\[[^\]]+\])\s+from\s+)?(@[\w:{}]+)(?:\s+allowing\s+(unbounded\s+)?overdraft(?:\s+up\s+to\s+(\[[^\]]+\]))?)?/g
    );

    for (const match of accountMatches) {
      const source: ParsedSource = {
        account: match[2]!,
      };

      if (match[1]) {
        source.maxAmount = parseMonetary(match[1]);
      }

      if (match[3]) {
        source.unboundedOverdraft = true;
        source.allowOverdraft = true;
      } else if (match[4]) {
        source.allowOverdraft = true;
        // bounded overdraft limit stored elsewhere
      }

      sources.push(source);
    }
  } else {
    // Single source
    const match = sourceStr.match(/(@[\w:{}]+)(?:\s+allowing\s+(unbounded\s+)?overdraft(?:\s+up\s+to\s+(\[[^\]]+\]))?)?/);
    if (match) {
      const source: ParsedSource = {
        account: match[1]!,
      };

      if (match[2]) {
        source.unboundedOverdraft = true;
        source.allowOverdraft = true;
      } else if (match[3]) {
        source.allowOverdraft = true;
      }

      sources.push(source);
    }
  }

  return sources;
}

/**
 * Parse destination block which can be:
 * - Single account: @account
 * - Multiple with portions: { 2.5% to @fees remaining to @merchant }
 */
function parseDestinationBlock(destStr: string): ParsedDestination[] {
  const destinations: ParsedDestination[] = [];

  if (destStr.startsWith('{')) {
    const blockContent = destStr.slice(1, -1).trim();

    // Match portions: 2.5% to @account, 1/10 to @account, remaining to @account, kept
    const portionMatches = blockContent.matchAll(
      /(?:([\d.]+%|[\d]+\/[\d]+|remaining)\s+(?:to\s+)?)?(@[\w:{}]+|kept)/g
    );

    for (const match of portionMatches) {
      if (match[2] === 'kept') {
        destinations.push({ account: 'kept', kept: true, portion: match[1] });
      } else {
        destinations.push({
          account: match[2]!,
          portion: match[1],
        });
      }
    }
  } else {
    // Single destination
    destinations.push({ account: destStr.trim() });
  }

  return destinations;
}

/**
 * Parse metadata statements
 */
function parseMetadataStatements(script: string): ParsedMetadata[] {
  const metadata: ParsedMetadata[] = [];

  // Match set_tx_meta("key", "value") or set_tx_meta("key", $var)
  const txMetaMatches = script.matchAll(/set_tx_meta\s*\(\s*"([^"]+)"\s*,\s*(?:"([^"]+)"|(\$\w+)|\[([^\]]+)\])\s*\)/g);
  for (const match of txMetaMatches) {
    metadata.push({
      type: 'tx',
      key: match[1]!,
      value: match[2] ?? match[3] ?? match[4] ?? '',
    });
  }

  // Match set_account_meta(@account, "key", "value")
  const accountMetaMatches = script.matchAll(
    /set_account_meta\s*\(\s*(@[\w:{}]+|\$\w+)\s*,\s*"([^"]+)"\s*,\s*(?:"([^"]+)"|(\$\w+)|\[([^\]]+)\])\s*\)/g
  );
  for (const match of accountMetaMatches) {
    metadata.push({
      type: 'account',
      account: match[1],
      key: match[2]!,
      value: match[3] ?? match[4] ?? match[5] ?? '',
    });
  }

  return metadata;
}

/**
 * Parse variable declarations
 */
function parseVariables(script: string): ParsedVariable[] {
  const variables: ParsedVariable[] = [];

  const varsMatch = script.match(/vars\s*\{([^}]+)\}/);
  if (!varsMatch) {
    return variables;
  }

  const varsContent = varsMatch[1]!;
  const varMatches = varsContent.matchAll(/(monetary|account|asset|portion|number|string)\s+\$(\w+)/g);

  for (const match of varMatches) {
    variables.push({
      type: match[1] as ParsedVariable['type'],
      name: match[2]!,
    });
  }

  return variables;
}

/**
 * Parse a complete Numscript
 */
export function parseNumscript(script: string): ParsedNumscript {
  const variables = parseVariables(script);
  const metadata = parseMetadataStatements(script);

  // Find all send statements
  const sends: ParsedSend[] = [];

  // Split by send statements (simplified - assumes each send is complete)
  const sendMatches = script.matchAll(/send\s+\[[^\]]+\]\s*\([^)]+\)/gs);

  for (const match of sendMatches) {
    try {
      sends.push(parseSendStatement(match[0]));
    } catch (e) {
      // Skip malformed sends
      console.warn('Failed to parse send statement:', e);
    }
  }

  return { variables, sends, metadata };
}

/**
 * Extract postings from Numscript for flow diagram visualization
 * This is a simpler extraction that doesn't require full parsing
 */
export function parsePostingsFromNumscript(script: string): ExtractedPosting[] {
  const postings: ExtractedPosting[] = [];

  // Match send statements with source and destination
  const sendPattern = /send\s+\[([^\]]+)\]\s*\(\s*source\s*=\s*(@[\w:{}]+)(?:\s+allowing[^)]+)?\s+destination\s*=\s*(@[\w:{}]+)\s*\)/gs;

  let match;
  while ((match = sendPattern.exec(script)) !== null) {
    postings.push({
      amount: match[1]!.trim(),
      source: match[2]!.replace('@', ''),
      destination: match[3]!.replace('@', ''),
    });
  }

  // Also handle multi-line formats
  const multiLinePattern = /send\s+\[([^\]]+)\]\s*\(\s*source\s*=\s*(@[\w:{}]+)(?:\s+allowing[^)]+)?\s+destination\s*=\s*\{\s*([^}]+)\s*\}\s*\)/gs;

  while ((match = multiLinePattern.exec(script)) !== null) {
    const amount = match[1]!.trim();
    const source = match[2]!.replace('@', '');
    const destBlock = match[3]!;

    // Parse destination block for portions
    const destMatches = destBlock.matchAll(/(?:([\d.]+%|remaining)\s+to\s+)?(@[\w:{}]+)/g);
    for (const destMatch of destMatches) {
      postings.push({
        amount: destMatch[1] ? `${destMatch[1]} of ${amount}` : amount,
        source,
        destination: destMatch[2]!.replace('@', ''),
      });
    }
  }

  return postings;
}

/**
 * Extract metadata keys from Numscript for display
 */
export function parseMetadataFromNumscript(script: string): {
  txMeta: string[];
  accountMeta: string[];
} {
  const txMeta: string[] = [];
  const accountMeta: string[] = [];

  // Extract tx metadata keys
  const txMetaMatches = script.matchAll(/set_tx_meta\s*\(\s*"([^"]+)"/g);
  for (const match of txMetaMatches) {
    txMeta.push(match[1]!);
  }

  // Extract account metadata keys
  const accountMetaMatches = script.matchAll(/set_account_meta\s*\([^,]+,\s*"([^"]+)"/g);
  for (const match of accountMetaMatches) {
    accountMeta.push(match[1]!);
  }

  return { txMeta, accountMeta };
}
