"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import type { AdlEvent, FlowNode, FlowEdge, FlowMapData } from "../types/events";

interface FlowMapProps {
  events: AdlEvent[];
  currentTimeMs: number;
  timeRange: { start: number; end: number };
}

type NodeMode = "asset" | "account";

export const FlowMap: React.FC<FlowMapProps> = ({ events, currentTimeMs, timeRange }) => {
  const [nodeMode, setNodeMode] = useState<NodeMode>("asset");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [notionalThreshold, setNotionalThreshold] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Get events visible at current time
  const visibleEvents = useMemo(() => {
    const currentVirtualTime = timeRange.start + currentTimeMs;
    return events.filter((e) => e.timestamp <= currentVirtualTime);
  }, [events, currentTimeMs, timeRange.start]);

  // Build flow map data
  const flowData = useMemo<FlowMapData>(() => {
    if (nodeMode === "asset") {
      return buildAssetFlowMap(visibleEvents, notionalThreshold, selectedAsset);
    } else {
      return buildAccountFlowMap(visibleEvents, notionalThreshold);
    }
  }, [visibleEvents, nodeMode, notionalThreshold, selectedAsset]);

  return (
    <div className="border border-slate-700/70 rounded-2xl p-4 sm:p-6 bg-slate-900/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ADL Flow Map</h2>
          <p className="text-sm text-slate-400">
            Visualize notional transfers between {nodeMode === "asset" ? "assets" : "accounts"} during the cascade.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              nodeMode === "asset"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            onClick={() => setNodeMode("asset")}
          >
            Assets
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              nodeMode === "account"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            onClick={() => setNodeMode("account")}
          >
            Accounts
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {nodeMode === "asset" && (
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Asset:</label>
            <select
              className="bg-slate-950 border border-slate-700/70 rounded-lg px-2 py-1 text-xs"
              value={selectedAsset || ""}
              onChange={(e) => setSelectedAsset(e.target.value || null)}
            >
              <option value="">All assets</option>
              {Array.from(new Set(visibleEvents.map((e) => e.asset)))
                .sort()
                .map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Min notional:</label>
          <input
            type="number"
            min={0}
            step={10000}
            value={notionalThreshold}
            onChange={(e) => setNotionalThreshold(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700/70 rounded-lg px-2 py-1 text-xs w-24"
            placeholder="0"
          />
        </div>
      </div>

      {/* Flow visualization */}
      <div className="mt-4">
        <FlowMapSvg
          ref={svgRef}
          data={flowData}
          nodeMode={nodeMode}
          hoveredNode={hoveredNode}
          hoveredEdge={hoveredEdge}
          onNodeHover={setHoveredNode}
          onEdgeHover={setHoveredEdge}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <StatCard
          label="Nodes"
          value={flowData.nodes.length.toString()}
        />
        <StatCard
          label="Edges"
          value={flowData.edges.length.toString()}
        />
        <StatCard
          label="Total notional"
          value={`$${flowData.edges.reduce((sum, e) => sum + e.notional, 0).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
        />
        <StatCard
          label="Events"
          value={visibleEvents.length.toLocaleString()}
        />
      </div>
    </div>
  );
};

function buildAssetFlowMap(
  events: AdlEvent[],
  threshold: number,
  selectedAsset: string | null
): FlowMapData {
  const nodeMap = new Map<string, FlowNode>();
  const edgeMap = new Map<string, FlowEdge>();

  // Filter by selected asset if specified
  const filteredEvents = selectedAsset
    ? events.filter((e) => e.asset === selectedAsset)
    : events;

  for (const event of filteredEvents) {
    const asset = event.asset;
    const liquidatedAsset = asset; // For now, assume same asset (can be enhanced)

    // Update nodes
    if (!nodeMap.has(asset)) {
      nodeMap.set(asset, {
        id: asset,
        label: asset,
        type: "asset",
        totalInflow: 0,
        totalOutflow: 0,
        netFlow: 0,
      });
    }

    const node = nodeMap.get(asset)!;
    node.totalInflow += event.notionalUsd;
    node.totalOutflow += event.notionalUsd; // Simplified for now
    node.netFlow = node.totalInflow - node.totalOutflow;

    // Create edge (liquidated asset -> ADL asset)
    const edgeId = `${liquidatedAsset}->${asset}`;
    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: liquidatedAsset,
        target: asset,
        notional: 0,
        count: 0,
      });
    }

    const edge = edgeMap.get(edgeId)!;
    edge.notional += event.notionalUsd;
    edge.count += 1;
  }

  // Filter by threshold
  const filteredEdges = Array.from(edgeMap.values()).filter(
    (e) => e.notional >= threshold
  );

  // Only include nodes that have edges
  const nodeIds = new Set<string>();
  filteredEdges.forEach((e) => {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  });

  const filteredNodes = Array.from(nodeMap.values()).filter((n) =>
    nodeIds.has(n.id)
  );

  return {
    nodes: filteredNodes.sort((a, b) => b.totalInflow - a.totalInflow),
    edges: filteredEdges,
  };
}

function buildAccountFlowMap(
  events: AdlEvent[],
  threshold: number
): FlowMapData {
  const nodeMap = new Map<string, FlowNode>();
  const edgeMap = new Map<string, FlowEdge>();

  // Limit to top accounts by notional
  const accountNotional = new Map<string, number>();
  for (const event of events) {
    if (event.targetUserId) {
      accountNotional.set(
        event.targetUserId,
        (accountNotional.get(event.targetUserId) || 0) + event.notionalUsd
      );
    }
  }

  const topAccounts = Array.from(accountNotional.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([id]) => id);

  const topAccountSet = new Set(topAccounts);

  for (const event of events) {
    if (!event.liquidatedUserId || !event.targetUserId) continue;
    if (!topAccountSet.has(event.targetUserId)) continue;

    // Update nodes
    for (const userId of [event.liquidatedUserId, event.targetUserId]) {
      if (!nodeMap.has(userId)) {
        nodeMap.set(userId, {
          id: userId,
          label: userId.slice(0, 8) + "...",
          type: "account",
          totalInflow: 0,
          totalOutflow: 0,
          netFlow: 0,
        });
      }
    }

    const liquidatedNode = nodeMap.get(event.liquidatedUserId)!;
    const targetNode = nodeMap.get(event.targetUserId)!;

    liquidatedNode.totalOutflow += event.notionalUsd;
    targetNode.totalInflow += event.notionalUsd;

    // Create edge
    const edgeId = `${event.liquidatedUserId}->${event.targetUserId}`;
    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: event.liquidatedUserId,
        target: event.targetUserId,
        notional: 0,
        count: 0,
      });
    }

    const edge = edgeMap.get(edgeId)!;
    edge.notional += event.notionalUsd;
    edge.count += 1;
  }

  // Filter by threshold
  const filteredEdges = Array.from(edgeMap.values()).filter(
    (e) => e.notional >= threshold
  );

  const nodeIds = new Set<string>();
  filteredEdges.forEach((e) => {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  });

  const filteredNodes = Array.from(nodeMap.values()).filter((n) =>
    nodeIds.has(n.id)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

interface FlowMapSvgProps {
  data: FlowMapData;
  nodeMode: NodeMode;
  hoveredNode: string | null;
  hoveredEdge: string | null;
  onNodeHover: (id: string | null) => void;
  onEdgeHover: (id: string | null) => void;
}

const FlowMapSvg = React.forwardRef<SVGSVGElement, FlowMapSvgProps>(
  ({ data, nodeMode, hoveredNode, hoveredEdge, onNodeHover, onEdgeHover }, ref) => {
    const width = 1000;
    const height = 600;
    const padding = 60;

    // Simple force-directed-like layout (circular for now, can be enhanced)
    const nodePositions = useMemo(() => {
      const positions = new Map<string, { x: number; y: number }>();
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - padding;

      data.nodes.forEach((node, idx) => {
        const angle = (idx / data.nodes.length) * Math.PI * 2;
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });

      return positions;
    }, [data.nodes, width, height]);

    const maxNotional = Math.max(
      ...data.edges.map((e) => e.notional),
      1
    );

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[600px] rounded-2xl bg-slate-950 border border-slate-800"
      >
        {/* Edges */}
        {data.edges.map((edge) => {
          const sourcePos = nodePositions.get(edge.source);
          const targetPos = nodePositions.get(edge.target);
          if (!sourcePos || !targetPos) return null;

          const isHovered = hoveredEdge === edge.id || hoveredNode === edge.source || hoveredNode === edge.target;
          const width = Math.max(1, Math.min(10, (edge.notional / maxNotional) * 10));

          return (
            <line
              key={edge.id}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="currentColor"
              strokeWidth={width}
              strokeOpacity={isHovered ? 0.8 : 0.2}
              onMouseEnter={() => onEdgeHover(edge.id)}
              onMouseLeave={() => onEdgeHover(null)}
            />
          );
        })}

        {/* Nodes */}
        {data.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isHovered = hoveredNode === node.id;
          const size = Math.max(20, Math.min(60, Math.sqrt(node.totalInflow) / 1000));
          const totalFlow = node.totalInflow + node.totalOutflow;

          return (
            <g key={node.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill="currentColor"
                fillOpacity={isHovered ? 0.9 : 0.6}
                stroke="currentColor"
                strokeWidth={isHovered ? 2 : 1}
                onMouseEnter={() => onNodeHover(node.id)}
                onMouseLeave={() => onNodeHover(null)}
                className="cursor-pointer"
              />
              <text
                x={pos.x}
                y={pos.y + size + 12}
                textAnchor="middle"
                className="text-[10px] fill-current"
                fillOpacity={0.8}
              >
                {node.label}
              </text>
              {isHovered && (
                <text
                  x={pos.x}
                  y={pos.y - size - 8}
                  textAnchor="middle"
                  className="text-[9px] fill-current"
                  fillOpacity={0.9}
                >
                  ${totalFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }
);

FlowMapSvg.displayName = "FlowMapSvg";

interface StatCardProps {
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-2">
    <div className="text-xs text-slate-400">{label}</div>
    <div className="text-sm font-semibold mt-1">{value}</div>
  </div>
);

