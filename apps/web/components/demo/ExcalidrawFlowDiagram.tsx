'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, RotateCcw } from 'lucide-react';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = React.lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw }))
);

type Posting = {
  amount: string;
  source: string;
  destination: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElementAny = any;

type SavedDiagram = {
  elements: ExcalidrawElementAny[];
  appState?: Record<string, unknown>;
};

type Props = {
  postings: Posting[];
  txType: string;
  demoName: string;
  description?: string;
};

function formatAmount(amount: string): string {
  const match = amount.match(/([A-Z]+)\/(\d+)\s+(\d+)/);
  if (match && match[1] && match[2] && match[3]) {
    const currency = match[1];
    const decimals = parseInt(match[2], 10);
    const value = parseInt(match[3], 10);
    const actualValue = value / Math.pow(10, decimals);

    const symbols: Record<string, string> = {
      USD: '$',
      AUD: 'A$',
      BRL: 'R$',
      PHP: '\u20B1',
    };

    const suffixes: Record<string, string> = {
      USDT: ' USDT',
      USDC: ' USDC',
      AUSD: ' AUSD',
      TSLA: ' TSLA',
      BTC: ' BTC',
      ETH: ' ETH',
    };

    const symbol = symbols[currency] || '';
    const suffix = suffixes[currency] || (symbol ? '' : ` ${currency}`);

    return `${symbol}${actualValue.toLocaleString()}${suffix}`;
  }
  return amount;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function createAccountBox(
  id: string,
  x: number,
  y: number,
  label: string,
  isWorld: boolean = false
): ExcalidrawElementAny[] {
  const boxWidth = Math.max(200, label.length * 10 + 40);
  const boxHeight = 50;

  const boxId = `box-${id}`;

  const box: ExcalidrawElementAny = {
    id: boxId,
    type: 'rectangle',
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    angle: 0,
    strokeColor: isWorld ? '#868e96' : '#1971c2',
    backgroundColor: isWorld ? '#f1f3f5' : '#e7f5ff',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
  };

  const text: ExcalidrawElementAny = {
    id: `text-${id}`,
    type: 'text',
    x: x + boxWidth / 2 - label.length * 4,
    y: y + boxHeight / 2 - 10,
    width: label.length * 8 + 20,
    height: 20,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
    text: `@${label}`,
    fontSize: 14,
    fontFamily: 3,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: null,
    originalText: `@${label}`,
    autoResize: true,
    lineHeight: 1.25,
  };

  return [box, text];
}

function createArrow(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  amount: string
): ExcalidrawElementAny[] {
  const arrowId = `arrow-${generateId()}`;
  const labelId = `label-${generateId()}`;

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  const arrow: ExcalidrawElementAny = {
    id: arrowId,
    type: 'arrow',
    x: fromX,
    y: fromY,
    width: toX - fromX,
    height: toY - fromY,
    angle: 0,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow',
    points: [
      [0, 0],
      [toX - fromX, toY - fromY],
    ],
  };

  const formattedAmount = formatAmount(amount);
  const label: ExcalidrawElementAny = {
    id: labelId,
    type: 'text',
    x: midX - formattedAmount.length * 4,
    y: midY - 20,
    width: formattedAmount.length * 10,
    height: 20,
    angle: 0,
    strokeColor: '#2f9e44',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
    text: formattedAmount,
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: null,
    originalText: formattedAmount,
    autoResize: true,
    lineHeight: 1.25,
  };

  return [arrow, label];
}

function createHorizontalArrow(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  amount: string,
  labelAbove: boolean
): ExcalidrawElementAny[] {
  const arrowId = `arrow-${generateId()}`;
  const labelId = `label-${generateId()}`;

  const arrow: ExcalidrawElementAny = {
    id: arrowId,
    type: 'arrow',
    x: fromX,
    y: fromY,
    width: toX - fromX,
    height: toY - fromY,
    angle: 0,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'arrow',
    points: [
      [0, 0],
      [toX - fromX, toY - fromY],
    ],
  };

  const formattedAmount = formatAmount(amount);
  const midX = (fromX + toX) / 2;
  const label: ExcalidrawElementAny = {
    id: labelId,
    type: 'text',
    x: midX - formattedAmount.length * 4,
    y: labelAbove ? fromY - 22 : fromY + 8,
    width: formattedAmount.length * 10,
    height: 16,
    angle: 0,
    strokeColor: '#2f9e44',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    boundElements: null,
    link: null,
    locked: false,
    text: formattedAmount,
    fontSize: 12,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: null,
    originalText: formattedAmount,
    autoResize: true,
    lineHeight: 1.25,
  };

  return [arrow, label];
}

function postingsToElements(postings: Posting[]): ExcalidrawElementAny[] {
  if (postings.length === 0) return [];

  const elements: ExcalidrawElementAny[] = [];
  const accountPositions = new Map<string, { x: number; y: number; id: string; width: number }>();

  const boxWidth = 200;
  const boxHeight = 50;
  const horizontalGap = 120;
  const verticalGap = 100;
  const startX = 100;
  const startY = 50;
  const sidecarGap = 250;

  // Analyze flow patterns
  const outflows = new Map<string, { to: string; amount: string }[]>();
  const inflows = new Map<string, { from: string; amount: string }[]>();

  for (const p of postings) {
    if (!outflows.has(p.source)) outflows.set(p.source, []);
    outflows.get(p.source)!.push({ to: p.destination, amount: p.amount });

    if (!inflows.has(p.destination)) inflows.set(p.destination, []);
    inflows.get(p.destination)!.push({ from: p.source, amount: p.amount });
  }

  // Collect all accounts involved
  const allAccounts = new Set([...outflows.keys(), ...inflows.keys()]);

  // Detect exchange accounts - accounts that have "exchange" in name
  // and interact with @world
  const exchangeAccounts = new Set<string>();
  for (const account of allAccounts) {
    if (account === 'world') continue;
    const isExchangeByName = account.toLowerCase().includes('exchange');
    if (isExchangeByName) {
      const accountOutflows = outflows.get(account) || [];
      const accountInflows = inflows.get(account) || [];
      const hasWorldInteraction =
        accountOutflows.some(f => f.to === 'world') ||
        accountInflows.some(f => f.from === 'world');
      if (hasWorldInteraction) {
        exchangeAccounts.add(account);
      }
    }
  }

  const hasExchangePattern = exchangeAccounts.size > 0;

  // Debug logging
  console.log('All accounts:', [...allAccounts]);
  console.log('Exchange accounts detected:', [...exchangeAccounts]);
  console.log('Has exchange pattern:', hasExchangePattern);

  // For exchange patterns: build tree without @world, then add @world as sidecar
  // The exchange account should be central, with sources above and destinations below

  // Find the primary flow path (excluding @world when there are exchanges)
  const nonWorldAccounts = [...allAccounts].filter(a => a !== 'world');

  // Find root accounts (accounts that only receive from @world or have no inflows)
  const roots: string[] = [];
  for (const account of nonWorldAccounts) {
    const accountInflows = inflows.get(account) || [];
    const nonWorldInflows = accountInflows.filter(f => f.from !== 'world');
    if (nonWorldInflows.length === 0) {
      roots.push(account);
    }
  }

  // If no roots, use first non-world, non-exchange account
  if (roots.length === 0) {
    for (const account of nonWorldAccounts) {
      if (!exchangeAccounts.has(account)) {
        roots.push(account);
        break;
      }
    }
  }

  // BFS to assign levels (completely ignoring @world)
  const levels = new Map<string, number>();
  const queue = [...roots];
  for (const root of roots) {
    levels.set(root, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;

    for (const { to } of outflows.get(current) || []) {
      if (to === 'world') continue; // Always skip @world in tree building
      if (!levels.has(to)) {
        levels.set(to, currentLevel + 1);
        queue.push(to);
      }
    }
  }

  // Handle accounts that weren't reached by BFS (may only connect via @world)
  for (const account of nonWorldAccounts) {
    if (!levels.has(account)) {
      // Check if this account receives from @world
      const accountInflows = inflows.get(account) || [];
      const worldInflow = accountInflows.find(f => f.from === 'world');
      if (worldInflow && !exchangeAccounts.has(account)) {
        // This is a destination from @world (like circulating supply tracking)
        // Find the exchange account's level and put this at the same level or one below
        let maxExchangeLevel = 0;
        for (const exch of exchangeAccounts) {
          maxExchangeLevel = Math.max(maxExchangeLevel, levels.get(exch) || 0);
        }
        levels.set(account, maxExchangeLevel + 1);
      }
    }
  }

  // Group accounts by level
  const levelGroups = new Map<number, string[]>();
  for (const [account, level] of levels) {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(account);
  }

  // Position main tree accounts
  let maxX = 0;
  let exchangeY = startY;
  let exchangeRightEdge = startX;

  const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);
  for (const level of sortedLevels) {
    const accounts = levelGroups.get(level) || [];
    const totalWidth = accounts.length * boxWidth + (accounts.length - 1) * horizontalGap;
    const levelStartX = startX + 150 - totalWidth / 2 + boxWidth / 2;

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      if (!account) continue;
      const accountX = levelStartX + i * (boxWidth + horizontalGap);
      const accountY = startY + level * (boxHeight + verticalGap);

      const id = generateId();
      const labelWidth = Math.max(boxWidth, account.length * 10 + 40);
      accountPositions.set(account, { x: accountX, y: accountY, id, width: labelWidth });
      elements.push(...createAccountBox(id, accountX, accountY, account, false));

      maxX = Math.max(maxX, accountX + labelWidth);

      // Track exchange position for @world sidecar
      if (exchangeAccounts.has(account)) {
        exchangeY = accountY;
        exchangeRightEdge = Math.max(exchangeRightEdge, accountX + labelWidth);
      }
    }
  }

  // Position @world as sidecar to the right of the exchange
  if (hasExchangePattern) {
    const worldX = exchangeRightEdge + sidecarGap;
    const worldY = exchangeY;
    const id = generateId();
    const worldWidth = Math.max(boxWidth, 'world'.length * 10 + 40);
    accountPositions.set('world', { x: worldX, y: worldY, id, width: worldWidth });
    elements.push(...createAccountBox(id, worldX, worldY, 'world', true));
  }

  // Draw arrows
  for (const p of postings) {
    const fromPos = accountPositions.get(p.source);
    const toPos = accountPositions.get(p.destination);

    if (!fromPos || !toPos) continue;

    // Check if this is an exchange <-> @world flow
    const isExchangeToWorld = exchangeAccounts.has(p.source) && p.destination === 'world';
    const isWorldToExchange = p.source === 'world' && exchangeAccounts.has(p.destination);

    if (hasExchangePattern && (isExchangeToWorld || isWorldToExchange)) {
      // Draw horizontal arrows between exchange and @world
      const exchAccount = isExchangeToWorld ? p.source : p.destination;
      const exchPos = accountPositions.get(exchAccount)!;
      const worldPos = accountPositions.get('world')!;

      // Count arrows for vertical offset
      const exchangeWorldArrows = postings.filter(
        pp =>
          (pp.source === exchAccount && pp.destination === 'world') ||
          (pp.source === 'world' && pp.destination === exchAccount)
      );
      const arrowIndex = exchangeWorldArrows.findIndex(
        pp => pp.source === p.source && pp.destination === p.destination && pp.amount === p.amount
      );
      const totalArrows = exchangeWorldArrows.length;
      const yOffset = totalArrows > 1 ? (arrowIndex - (totalArrows - 1) / 2) * 18 : 0;

      if (isExchangeToWorld) {
        // Arrow going right: exchange → world
        const fromX = exchPos.x + (exchPos.width || boxWidth);
        const fromY = exchPos.y + boxHeight / 2 + yOffset;
        const toX = worldPos.x;
        const toY = worldPos.y + boxHeight / 2 + yOffset;
        elements.push(...createHorizontalArrow(fromX, fromY, toX, toY, p.amount, yOffset <= 0));
      } else {
        // Arrow going left: world → exchange
        const fromX = worldPos.x;
        const fromY = worldPos.y + boxHeight / 2 + yOffset;
        const toX = exchPos.x + (exchPos.width || boxWidth);
        const toY = exchPos.y + boxHeight / 2 + yOffset;
        elements.push(...createHorizontalArrow(fromX, fromY, toX, toY, p.amount, yOffset <= 0));
      }
    } else if (p.source === 'world' || p.destination === 'world') {
      // Non-exchange flows involving @world - skip these or draw diagonal
      // For now, skip them as they're usually just tracking entries
      continue;
    } else {
      // Regular vertical arrows between non-world accounts
      const fromX = fromPos.x + (fromPos.width || boxWidth) / 2;
      const fromY = fromPos.y + boxHeight;
      const toX = toPos.x + (toPos.width || boxWidth) / 2;
      const toY = toPos.y;

      elements.push(...createArrow(fromX, fromY, toX, toY, p.amount));
    }
  }

  return elements;
}

// Version 2: Updated exchange pattern detection
const DIAGRAM_VERSION = 'v2';

function getStorageKey(demoName: string, txType: string): string {
  return `excalidraw-diagram-${DIAGRAM_VERSION}-${demoName}-${txType}`;
}

export function ExcalidrawFlowDiagram({ postings, txType, demoName, description }: Props) {
  const [elements, setElements] = useState<ExcalidrawElementAny[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [key, setKey] = useState(0);

  const storageKey = getStorageKey(demoName, txType);

  const initialElements = useMemo(() => postingsToElements(postings), [postings]);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: SavedDiagram = JSON.parse(saved);
        setElements(parsed.elements);
      } catch {
        setElements(initialElements);
      }
    } else {
      setElements(initialElements);
    }
  }, [storageKey, initialElements]);

  const handleChange = useCallback(
    (newElements: readonly ExcalidrawElementAny[]) => {
      setElements([...newElements]);
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    const diagram: SavedDiagram = { elements };
    localStorage.setItem(storageKey, JSON.stringify(diagram));
    setHasChanges(false);
  }, [elements, storageKey]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setElements(initialElements);
    setHasChanges(false);
    setKey((k) => k + 1);
  }, [storageKey, initialElements]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialAppState = useMemo(
    () =>
      ({
        viewBackgroundColor: '#ffffff',
        zoom: { value: 1 as const },
        scrollX: 0,
        scrollY: 0,
      }) as any,
    []
  );

  if (!isClient || postings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Drag to reposition. Click Save to persist layout.
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="btn-secondary btn-sm flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`btn-sm flex items-center gap-1 ${
                hasChanges ? 'btn-primary' : 'btn-secondary opacity-50'
              }`}
            >
              <Save className="h-3 w-3" />
              Save Layout
            </button>
          </div>
        </div>

        <div style={{ height: '400px' }}>
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading diagram...
              </div>
            }
          >
            <Excalidraw
              key={key}
              initialData={{
                elements,
                appState: initialAppState,
              }}
              onChange={handleChange}
              UIOptions={{
                canvasActions: {
                  saveToActiveFile: false,
                  loadScene: false,
                  export: false,
                  saveAsImage: false,
                },
              }}
            />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
}

export function parsePostingsFromNumscript(script: string): Posting[] {
  const postings: Posting[] = [];

  // Split by 'send' keyword to handle multiple send statements
  const sendBlocks = script.split(/(?=\bsend\s+\[)/);

  for (const block of sendBlocks) {
    if (!block.trim().startsWith('send')) continue;

    // Extract amount: [ASSET/DECIMALS AMOUNT]
    const amountMatch = block.match(/send\s+\[([^\]]+)\]/);
    if (!amountMatch) continue;
    const amount = amountMatch[1].trim();

    // Extract source - handle various formats
    let source: string | null = null;

    // Try: source = @account
    const simpleSourceMatch = block.match(/source\s*=\s*(@[\w:{}\-]+)/);
    if (simpleSourceMatch) {
      source = simpleSourceMatch[1];
    }

    // Try: source = { @account1 @account2 } (waterfall) - take first
    if (!source) {
      const waterfallMatch = block.match(/source\s*=\s*\{([^}]+)\}/s);
      if (waterfallMatch) {
        const firstAccount = waterfallMatch[1].match(/@[\w:{}\-]+/);
        if (firstAccount) {
          source = firstAccount[0];
        }
      }
    }

    // Extract destination - handle various formats
    let destination: string | null = null;

    // Try: destination = @account
    const simpleDestMatch = block.match(/destination\s*=\s*(@[\w:{}\-]+)/);
    if (simpleDestMatch) {
      destination = simpleDestMatch[1];
    }

    // Try: destination = { percentage to @account ... remaining to @account }
    // For split destinations, we'll take the first destination for simplicity
    if (!destination) {
      const splitDestMatch = block.match(/destination\s*=\s*\{([^}]+)\}/s);
      if (splitDestMatch) {
        const firstDest = splitDestMatch[1].match(/to\s+(@[\w:{}\-]+)/);
        if (firstDest) {
          destination = firstDest[1];
        }
      }
    }

    if (amount && source && destination) {
      postings.push({
        amount: amount,
        source: source.replace('@', ''),
        destination: destination.replace('@', ''),
      });
    }
  }

  return postings;
}
