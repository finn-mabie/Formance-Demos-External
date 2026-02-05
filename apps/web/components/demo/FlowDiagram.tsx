'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

type NodeData = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type ArrowData = {
  id: string;
  from: string;
  to: string;
  label: string;
};

type DiagramState = {
  nodes: NodeData[];
  arrows: ArrowData[];
};

type Posting = {
  amount: string;
  source: string;
  destination: string;
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

function getStorageKey(demoName: string, txType: string): string {
  return `flow-diagram-v5-${demoName}-${txType}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function calcNodeWidth(label: string): number {
  return Math.max(140, label.length * 9 + 32);
}

function postingsToInitialState(postings: Posting[]): DiagramState {
  const nodes: NodeData[] = [];
  const arrows: ArrowData[] = [];
  const nodeMap = new Map<string, NodeData>();

  if (postings.length === 0) return { nodes, arrows };

  const outflows = new Map<string, string[]>();
  const inflows = new Map<string, string[]>();

  for (const p of postings) {
    if (!outflows.has(p.source)) outflows.set(p.source, []);
    outflows.get(p.source)!.push(p.destination);
    if (!inflows.has(p.destination)) inflows.set(p.destination, []);
    inflows.get(p.destination)!.push(p.source);
  }

  // Detect exchange accounts - accounts named "exchange" that interact with @world
  // These should have @world as a sidecar regardless of flow direction
  const worldSidecars = new Set<string>();
  for (const p of postings) {
    if (p.source === 'world' || p.destination === 'world') {
      const other = p.source === 'world' ? p.destination : p.source;

      // Check if account name contains "exchange" - these always get world as sidecar
      const isExchangeByName = other.toLowerCase().includes('exchange');

      // Also check for bidirectional flows (original logic)
      const hasBothDirections =
        postings.some((r) => r.source === other && r.destination === 'world') &&
        postings.some((r) => r.source === 'world' && r.destination === other);

      if (hasBothDirections || isExchangeByName) {
        worldSidecars.add(other);
      }
    }
  }

  const allAccounts = new Set([...outflows.keys(), ...inflows.keys()]);
  const worldInMainTree = allAccounts.has('world') && worldSidecars.size === 0;

  const roots: string[] = [];
  const worldInflows = inflows.get('world') || [];
  if (
    worldInMainTree &&
    outflows.has('world') &&
    (outflows.get('world')?.length || 0) > 0 &&
    worldInflows.length === 0
  ) {
    roots.push('world');
  }

  for (const account of allAccounts) {
    if (account === 'world') continue;
    const accountInflows = inflows.get(account) || [];
    if (
      accountInflows.length === 0 ||
      (worldInMainTree && accountInflows.every((src) => src === 'world'))
    ) {
      if (worldInMainTree && accountInflows.includes('world')) {
        continue;
      }
      roots.push(account);
    }
  }

  const levels = new Map<string, number>();
  const queue = [...roots];
  for (const root of roots) levels.set(root, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;
    for (const to of outflows.get(current) || []) {
      if (to === 'world' && !worldInMainTree) continue;
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

  const nodeHeight = 44;
  const horizontalGap = 50;
  const verticalGap = 80;
  const startY = 40;
  const mainTreeCenterX = 350;

  for (const [level, accounts] of levelGroups) {
    let totalWidth = 0;
    for (const account of accounts) {
      totalWidth += calcNodeWidth(`@${account}`);
    }
    totalWidth += (accounts.length - 1) * horizontalGap;

    const startX = Math.max(20, mainTreeCenterX - totalWidth / 2);
    let currentX = startX;

    for (const account of accounts) {
      const label = `@${account}`;
      const width = calcNodeWidth(label);
      const node: NodeData = {
        id: generateId(),
        label,
        x: currentX,
        y: startY + level * (nodeHeight + verticalGap),
      };
      nodes.push(node);
      nodeMap.set(account, node);
      currentX += width + horizontalGap;
    }
  }

  if (allAccounts.has('world') && !worldInMainTree) {
    let sidecarY = startY;
    let sidecarX = 650;

    for (const exchangeAccount of worldSidecars) {
      const exchangeNode = nodeMap.get(exchangeAccount);
      if (exchangeNode) {
        sidecarY = exchangeNode.y;
        sidecarX = exchangeNode.x + calcNodeWidth(exchangeNode.label) + 180;
        break;
      }
    }

    const worldNode: NodeData = {
      id: generateId(),
      label: '@world',
      x: sidecarX,
      y: sidecarY,
    };
    nodes.push(worldNode);
    nodeMap.set('world', worldNode);
  }

  for (const p of postings) {
    const fromNode = nodeMap.get(p.source);
    const toNode = nodeMap.get(p.destination);
    if (fromNode && toNode) {
      arrows.push({
        id: generateId(),
        from: fromNode.id,
        to: toNode.id,
        label: formatAmount(p.amount),
      });
    }
  }

  return { nodes, arrows };
}

export function FlowDiagram({ postings, txType, demoName, description }: Props) {
  const storageKey = getStorageKey(demoName, txType);
  const initialState = useMemo(() => postingsToInitialState(postings), [postings]);

  const [state, setState] = useState<DiagramState>(initialState);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: DiagramState = JSON.parse(saved);
        setState(parsed);
      } catch {
        setState(initialState);
      }
    } else {
      setState(initialState);
    }
  }, [storageKey, initialState]);

  const nodeHeight = 44;

  const getNodeById = (id: string) => state.nodes.find((n) => n.id === id);

  if (postings.length === 0 && state.nodes.length === 0) return null;

  let maxX = 800;
  let maxY = 400;
  for (const node of state.nodes) {
    const width = calcNodeWidth(node.label);
    maxX = Math.max(maxX, node.x + width + 40);
    maxY = Math.max(maxY, node.y + nodeHeight + 60);
  }

  return (
    <div className="space-y-3">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="border border-border rounded-lg overflow-hidden bg-white">
        {/* Canvas - read-only */}
        <div className="p-4 overflow-auto" style={{ maxHeight: '500px' }}>
          <svg
            ref={svgRef}
            width={maxX}
            height={maxY}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>

            {/* Draw arrows */}
            {state.arrows.map((arrow) => {
              const fromNode = getNodeById(arrow.from);
              const toNode = getNodeById(arrow.to);
              if (!fromNode || !toNode) return null;

              const fromWidth = calcNodeWidth(fromNode.label);
              const toWidth = calcNodeWidth(toNode.label);

              const hasReverseArrow = state.arrows.some(
                (a) => a.from === arrow.to && a.to === arrow.from
              );

              const sameLevel = Math.abs(fromNode.y - toNode.y) < 10;

              let fromX: number, fromY: number, toX: number, toY: number;

              if (hasReverseArrow && sameLevel) {
                // Bidirectional horizontal arrows - offset vertically
                const fromIsLeft = fromNode.x < toNode.x;
                const goingLeftToRight =
                  (fromIsLeft && fromNode.id === arrow.from) ||
                  (!fromIsLeft && toNode.id === arrow.from);
                const useTopPath = goingLeftToRight;

                const verticalOffset = 10;

                if (useTopPath) {
                  if (fromIsLeft) {
                    fromX = fromNode.x + fromWidth;
                    toX = toNode.x;
                  } else {
                    fromX = fromNode.x;
                    toX = toNode.x + toWidth;
                  }
                  fromY = fromNode.y + nodeHeight / 2 - verticalOffset;
                  toY = toNode.y + nodeHeight / 2 - verticalOffset;
                } else {
                  if (fromIsLeft) {
                    fromX = fromNode.x + fromWidth;
                    toX = toNode.x;
                  } else {
                    fromX = fromNode.x;
                    toX = toNode.x + toWidth;
                  }
                  fromY = fromNode.y + nodeHeight / 2 + verticalOffset;
                  toY = toNode.y + nodeHeight / 2 + verticalOffset;
                }
              } else if (sameLevel) {
                // Single horizontal arrow (sidecar pattern, one direction only)
                const fromIsLeft = fromNode.x < toNode.x;
                if (fromIsLeft) {
                  fromX = fromNode.x + fromWidth;
                  toX = toNode.x;
                } else {
                  fromX = fromNode.x;
                  toX = toNode.x + toWidth;
                }
                fromY = fromNode.y + nodeHeight / 2;
                toY = toNode.y + nodeHeight / 2;
              } else if (hasReverseArrow) {
                const isForwardArrow = arrow.from < arrow.to;
                const horizontalOffset = 20;

                fromX =
                  fromNode.x + fromWidth / 2 + (isForwardArrow ? -horizontalOffset : horizontalOffset);
                fromY = fromNode.y + nodeHeight;
                toX =
                  toNode.x + toWidth / 2 + (isForwardArrow ? -horizontalOffset : horizontalOffset);
                toY = toNode.y;
              } else {
                fromX = fromNode.x + fromWidth / 2;
                fromY = fromNode.y + nodeHeight;
                toX = toNode.x + toWidth / 2;
                toY = toNode.y;
              }

              const midX = (fromX + toX) / 2;
              const midY = (fromY + toY) / 2;

              const labelWidth = Math.max(45, arrow.label.length * 6.5 + 10);
              const labelHeight = 16;

              const isHorizontal = Math.abs(fromY - toY) < 20;
              const isTopPath = fromY < fromNode.y + nodeHeight / 2;

              let labelX: number;
              let labelY: number;

              if (hasReverseArrow && isHorizontal) {
                labelX = midX;
                if (isTopPath) {
                  labelY = fromY - 14;
                } else {
                  labelY = fromY + 14;
                }
              } else if (isHorizontal) {
                labelX = midX;
                labelY = midY - 14;
              } else {
                labelX = midX;
                labelY = midY - 12;
              }

              return (
                <g key={arrow.id}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX - (isHorizontal ? 8 : 0)}
                    y2={toY - (isHorizontal ? 0 : 4)}
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                  />
                  <g>
                    <rect
                      x={labelX - labelWidth / 2}
                      y={labelY - labelHeight / 2}
                      width={labelWidth}
                      height={labelHeight}
                      rx="3"
                      fill="white"
                      stroke="#d1fae5"
                      strokeWidth="1"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fontWeight="600"
                      fill="#059669"
                    >
                      {arrow.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Draw nodes */}
            {state.nodes.map((node) => {
              const isWorld = node.label === '@world';
              const width = calcNodeWidth(node.label);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  <rect
                    width={width}
                    height={nodeHeight}
                    rx="8"
                    fill={isWorld ? '#f8fafc' : '#eff6ff'}
                    stroke={isWorld ? '#94a3b8' : '#3b82f6'}
                    strokeWidth={2}
                  />
                  <text
                    x={width / 2}
                    y={nodeHeight / 2 + 5}
                    textAnchor="middle"
                    fontSize="13"
                    fontFamily="ui-monospace, monospace"
                    fill={isWorld ? '#475569' : '#1e40af'}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// Helper to parse postings from Numscript
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
