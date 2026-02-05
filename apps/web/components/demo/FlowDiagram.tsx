'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Save, RotateCcw, Plus, Trash2, X } from 'lucide-react';

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
  return `flow-diagram-v2-${demoName}-${txType}`;
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

  const worldSidecars = new Set<string>();
  for (const p of postings) {
    if (p.source === 'world' || p.destination === 'world') {
      const other = p.source === 'world' ? p.destination : p.source;
      const hasBothDirections =
        postings.some((r) => r.source === other && r.destination === 'world') &&
        postings.some((r) => r.source === 'world' && r.destination === other);
      if (hasBothDirections) {
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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedArrow, setSelectedArrow] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingArrow, setEditingArrow] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const [creatingArrow, setCreatingArrow] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if ((editingNode || editingArrow) && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNode, editingArrow]);

  const nodeHeight = 44;

  const getNodeById = useCallback(
    (id: string) => state.nodes.find((n) => n.id === id),
    [state.nodes]
  );

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      if (editingNode) return;
      e.stopPropagation();

      if (creatingArrow) {
        if (creatingArrow !== nodeId) {
          setState((prev) => ({
            ...prev,
            arrows: [
              ...prev.arrows,
              {
                id: generateId(),
                from: creatingArrow,
                to: nodeId,
                label: '$0',
              },
            ],
          }));
          setHasChanges(true);
        }
        setCreatingArrow(null);
        return;
      }

      const node = getNodeById(nodeId);
      if (!node) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      setDragging(nodeId);
      setSelectedNode(nodeId);
      setSelectedArrow(null);
      setDragOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      });
    },
    [creatingArrow, editingNode, getNodeById]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
      const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);

      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === dragging ? { ...n, x: newX, y: newY } : n)),
      }));
      setHasChanges(true);
    },
    [dragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setSelectedNode(null);
      setSelectedArrow(null);
      setCreatingArrow(null);
    }
  }, []);

  const handleArrowClick = useCallback((arrowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedArrow(arrowId);
    setSelectedNode(null);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setEditingNode(nodeId);
  }, []);

  const handleArrowDoubleClick = useCallback((arrowId: string) => {
    setEditingArrow(arrowId);
  }, []);

  const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, label: newLabel } : n)),
    }));
    setHasChanges(true);
  }, []);

  const handleArrowLabelChange = useCallback((arrowId: string, newLabel: string) => {
    setState((prev) => ({
      ...prev,
      arrows: prev.arrows.map((a) => (a.id === arrowId ? { ...a, label: newLabel } : a)),
    }));
    setHasChanges(true);
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingNode(null);
      setEditingArrow(null);
    }
  }, []);

  const addNode = useCallback(() => {
    const newNode: NodeData = {
      id: generateId(),
      label: '@new:account',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 100,
    };
    setState((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedNode(newNode.id);
    setHasChanges(true);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setState((prev) => ({
        nodes: prev.nodes.filter((n) => n.id !== selectedNode),
        arrows: prev.arrows.filter((a) => a.from !== selectedNode && a.to !== selectedNode),
      }));
      setSelectedNode(null);
      setHasChanges(true);
    } else if (selectedArrow) {
      setState((prev) => ({
        ...prev,
        arrows: prev.arrows.filter((a) => a.id !== selectedArrow),
      }));
      setSelectedArrow(null);
      setHasChanges(true);
    }
  }, [selectedNode, selectedArrow]);

  const startArrowCreation = useCallback(() => {
    if (selectedNode) {
      setCreatingArrow(selectedNode);
    }
  }, [selectedNode]);

  const handleSave = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
    setHasChanges(false);
  }, [state, storageKey]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState(initialState);
    setHasChanges(false);
    setSelectedNode(null);
    setSelectedArrow(null);
  }, [storageKey, initialState]);

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
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={addNode} className="btn-secondary btn-sm flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Add Box
            </button>
            {selectedNode && (
              <button
                onClick={startArrowCreation}
                disabled={!!creatingArrow}
                className="btn-secondary btn-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Add Arrow From
              </button>
            )}
            {(selectedNode || selectedArrow) && (
              <button
                onClick={deleteSelected}
                className="btn-sm flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
            {creatingArrow && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Click target node to create arrow
                <button onClick={() => setCreatingArrow(null)} className="hover:text-blue-800">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Double-click to edit text</span>
            <button onClick={handleReset} className="btn-secondary btn-sm flex items-center gap-1">
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
              Save
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="p-4 overflow-auto" style={{ maxHeight: '500px' }}>
          <svg
            ref={svgRef}
            width={maxX}
            height={maxY}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleSvgClick}
            style={{ cursor: dragging ? 'grabbing' : creatingArrow ? 'crosshair' : 'default' }}
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
              <marker
                id="arrowhead-selected"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
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

              const isSelected = selectedArrow === arrow.id;
              const isEditing = editingArrow === arrow.id;

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
                <g
                  key={arrow.id}
                  onClick={(e) => handleArrowClick(arrow.id, e)}
                  style={{ cursor: 'pointer' }}
                >
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX - (isHorizontal ? 8 : 0)}
                    y2={toY - (isHorizontal ? 0 : 4)}
                    stroke={isSelected ? '#3b82f6' : '#9ca3af'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                  />
                  {isEditing ? (
                    <foreignObject
                      x={labelX - labelWidth / 2}
                      y={labelY - labelHeight / 2}
                      width={labelWidth + 4}
                      height={labelHeight + 4}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={arrow.label}
                        onChange={(e) => handleArrowLabelChange(arrow.id, e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={() => setEditingArrow(null)}
                        className="w-full h-full text-center text-xs font-semibold bg-white border border-emerald-300 rounded outline-none"
                        style={{ color: '#166534', fontSize: '10px' }}
                      />
                    </foreignObject>
                  ) : (
                    <g
                      onDoubleClick={() => handleArrowDoubleClick(arrow.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={labelX - labelWidth / 2}
                        y={labelY - labelHeight / 2}
                        width={labelWidth}
                        height={labelHeight}
                        rx="3"
                        fill="white"
                        stroke={isSelected ? '#3b82f6' : '#d1fae5'}
                        strokeWidth="1"
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                        fontWeight="600"
                        fill={isSelected ? '#3b82f6' : '#059669'}
                      >
                        {arrow.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Draw nodes */}
            {state.nodes.map((node) => {
              const isWorld = node.label === '@world';
              const isSelected = selectedNode === node.id;
              const isEditing = editingNode === node.id;
              const width = calcNodeWidth(node.label);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  onDoubleClick={() => handleNodeDoubleClick(node.id)}
                  style={{ cursor: dragging === node.id ? 'grabbing' : 'grab' }}
                >
                  <rect
                    width={width}
                    height={nodeHeight}
                    rx="8"
                    fill={isWorld ? '#f8fafc' : isSelected ? '#dbeafe' : '#eff6ff'}
                    stroke={isSelected ? '#3b82f6' : isWorld ? '#94a3b8' : '#3b82f6'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {isEditing ? (
                    <foreignObject x="4" y="8" width={width - 8} height={nodeHeight - 16}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={node.label}
                        onChange={(e) => handleNodeLabelChange(node.id, e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={() => setEditingNode(null)}
                        className="w-full h-full text-center text-sm bg-transparent border-none outline-none font-mono"
                        style={{ color: isWorld ? '#475569' : '#1e40af' }}
                      />
                    </foreignObject>
                  ) : (
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
                  )}
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
