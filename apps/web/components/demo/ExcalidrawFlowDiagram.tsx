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

function postingsToElements(postings: Posting[]): ExcalidrawElementAny[] {
  if (postings.length === 0) return [];

  const elements: ExcalidrawElementAny[] = [];
  const accountPositions = new Map<string, { x: number; y: number; id: string }>();

  const outflows = new Map<string, { to: string; amount: string }[]>();
  const inflows = new Map<string, string[]>();

  for (const p of postings) {
    if (!outflows.has(p.source)) outflows.set(p.source, []);
    outflows.get(p.source)!.push({ to: p.destination, amount: p.amount });

    if (!inflows.has(p.destination)) inflows.set(p.destination, []);
    inflows.get(p.destination)!.push(p.source);
  }

  const roots: string[] = [];
  const allAccounts = new Set([...outflows.keys(), ...inflows.keys()]);

  for (const account of allAccounts) {
    const accountInflows = inflows.get(account) || [];
    if (accountInflows.length === 0) {
      roots.push(account);
    }
  }

  if (roots.length === 0) {
    for (const account of allAccounts) {
      if (account === 'world') continue;
      const accountInflows = inflows.get(account) || [];
      if (accountInflows.every((src) => src === 'world')) {
        roots.push(account);
      }
    }
  }

  const levels = new Map<string, number>();
  const queue = [...roots];
  for (const root of roots) {
    levels.set(root, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;

    for (const { to } of outflows.get(current) || []) {
      if (!levels.has(to)) {
        levels.set(to, currentLevel + 1);
        queue.push(to);
      }
    }
  }

  const levelGroups = new Map<number, string[]>();
  for (const [account, level] of levels) {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(account);
  }

  const boxWidth = 200;
  const boxHeight = 50;
  const horizontalGap = 80;
  const verticalGap = 100;
  const startX = 100;
  const startY = 50;

  for (const [level, accounts] of levelGroups) {
    if (!accounts) continue;
    const totalWidth = accounts.length * boxWidth + (accounts.length - 1) * horizontalGap;
    const offsetX = (totalWidth - boxWidth) / 2;

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      if (!account) continue;
      const accountX = startX + i * (boxWidth + horizontalGap) - offsetX + 150;
      const accountY = startY + level * (boxHeight + verticalGap);

      const id = generateId();
      accountPositions.set(account, { x: accountX, y: accountY, id });

      const isWorld = account === 'world';
      elements.push(...createAccountBox(id, accountX, accountY, account, isWorld));
    }
  }

  for (const p of postings) {
    const fromPos = accountPositions.get(p.source);
    const toPos = accountPositions.get(p.destination);

    if (fromPos && toPos) {
      const fromX = fromPos.x + boxWidth / 2;
      const fromY = fromPos.y + boxHeight;
      const toX = toPos.x + boxWidth / 2;
      const toY = toPos.y;

      elements.push(...createArrow(fromX, fromY, toX, toY, p.amount));
    }
  }

  return elements;
}

function getStorageKey(demoName: string, txType: string): string {
  return `excalidraw-diagram-${demoName}-${txType}`;
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

  const sendPattern =
    /send\s+\[([^\]]+)\]\s*\(\s*source\s*=\s*\{?\s*(@[\w:{}]+(?:\s+@[\w:{}]+)*)\s*\}?\s*(allowing\s+(?:unbounded\s+)?overdraft)?\s*destination\s*=\s*(@[\w:{}]+)\s*\)/gs;

  let match;
  while ((match = sendPattern.exec(script)) !== null) {
    const amount = match[1];
    const sourceRaw = match[2];
    const destination = match[4];

    if (!amount || !sourceRaw || !destination) continue;

    const sources = sourceRaw.trim().split(/\s+/);
    const source = sources[0];

    if (amount && source && destination) {
      postings.push({
        amount: amount.trim(),
        source: source.replace('@', ''),
        destination: destination.replace('@', ''),
      });
    }
  }

  if (postings.length === 0) {
    const simplePattern = /send\s+\[([^\]]+)\][^@]*(@[^\s\)]+)[^@]*(@[^\s\)]+)/gs;
    while ((match = simplePattern.exec(script)) !== null) {
      const amount = match[1];
      const source = match[2];
      const destination = match[3];
      if (amount && source && destination) {
        postings.push({
          amount: amount.trim(),
          source: source.replace('@', ''),
          destination: destination.replace('@', ''),
        });
      }
    }
  }

  return postings;
}
