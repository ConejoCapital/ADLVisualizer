"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import type { AdlEvent } from "../types/events";

interface FlowMapProps {
  events: AdlEvent[];
  currentTimeMs: number;
  timeRange: { start: number; end: number };
}

type ViewMode = "sankey" | "network";

interface SankeyNode {
  id: string;
  label: string;
  type: "source" | "target";
  category: string; // asset or account
  totalNotional: number;
  x: number;
  y: number;
  height: number;
}

interface SankeyLink {
  id: string;
  source: string;
  target: string;
  notional: number;
  sourceIndex: number;
  targetIndex: number;
  asset?: string;
}

export const FlowMap: React.FC<FlowMapProps> = ({ events, currentTimeMs, timeRange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>("sankey");
  const [groupBy, setGroupBy] = useState<"asset" | "account">("asset");
  const [topN, setTopN] = useState(20);
  const [minNotional, setMinNotional] = useState(0);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particleTimeRef = useRef(0);

  // Get events visible at current time
  const visibleEvents = useMemo(() => {
    const currentVirtualTime = timeRange.start + currentTimeMs;
    return events.filter((e) => e.timestamp <= currentVirtualTime);
  }, [events, currentTimeMs, timeRange.start]);

  // Build Sankey diagram data
  const sankeyData = useMemo(() => {
    return buildSankeyData(visibleEvents, groupBy, topN, minNotional);
  }, [visibleEvents, groupBy, topN, minNotional]);

  // Animate particles along links
  useEffect(() => {
    if (viewMode !== "sankey") return;

    const animate = () => {
      particleTimeRef.current = (particleTimeRef.current + 0.02) % (Math.PI * 2);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [viewMode]);

  const totalNotional = sankeyData.links.reduce((sum, l) => sum + l.notional, 0);

  return (
    <div className="border border-slate-700/70 rounded-2xl p-4 sm:p-6 bg-slate-900/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ADL Flow Visualization</h2>
          <p className="text-sm text-slate-400">
            {groupBy === "asset"
              ? "Top assets being ADL'd (size = total notional)"
              : "Notional transfers from liquidated accounts (left) to ADL counterparties (right)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === "sankey"
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            onClick={() => setViewMode("sankey")}
          >
            Sankey
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Group by:</label>
          <select
            className="bg-slate-950 border border-slate-700/70 rounded-lg px-2 py-1 text-xs"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "asset" | "account")}
          >
            <option value="asset">Asset</option>
            <option value="account">Account</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Top N:</label>
          <input
            type="number"
            min={5}
            max={50}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700/70 rounded-lg px-2 py-1 text-xs w-20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-400">Min notional:</label>
          <input
            type="number"
            min={0}
            step={10000}
            value={minNotional}
            onChange={(e) => setMinNotional(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700/70 rounded-lg px-2 py-1 text-xs w-24"
          />
        </div>
      </div>

      {/* Sankey visualization */}
      <div className="mt-4">
        <SankeyDiagram
          nodes={sankeyData.nodes}
          links={sankeyData.links}
          particleTime={particleTimeRef.current}
          hoveredLink={hoveredLink}
          hoveredNode={hoveredNode}
          onLinkHover={setHoveredLink}
          onNodeHover={setHoveredNode}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <StatCard label="Sources" value={sankeyData.nodes.filter((n) => n.type === "source").length.toString()} />
        <StatCard label="Targets" value={sankeyData.nodes.filter((n) => n.type === "target").length.toString()} />
        <StatCard
          label="Total notional"
          value={`$${totalNotional.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
        />
        <StatCard label="Flows" value={sankeyData.links.length.toString()} />
      </div>

      {/* Tooltip */}
      {hoveredLink && (
        <div className="absolute pointer-events-none z-50 bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
          {(() => {
            const link = sankeyData.links.find((l) => l.id === hoveredLink);
            if (!link) return null;
            const source = sankeyData.nodes.find((n) => n.id === link.source);
            const target = sankeyData.nodes.find((n) => n.id === link.target);
            return (
              <>
                <div className="font-semibold mb-1">
                  {source?.label} → {target?.label}
                </div>
                <div className="text-slate-300">
                  Notional: ${link.notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                {link.asset && <div className="text-slate-400">Asset: {link.asset}</div>}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

function buildSankeyData(
  events: AdlEvent[],
  groupBy: "asset" | "account",
  topN: number,
  minNotional: number
) {
  const sourceMap = new Map<string, number>();
  const targetMap = new Map<string, number>();
  const linkMap = new Map<string, { notional: number; asset?: string }>();

  for (const event of events) {
    let sourceKey: string;
    let targetKey: string;

    if (groupBy === "asset") {
      // Group by asset: show which assets are being liquidated
      // For asset mode, we show liquidated assets as sources
      sourceKey = event.asset;
      targetKey = event.asset; // ADL happens within same asset
    } else {
      // Group by account: liquidated user -> target user
      sourceKey = event.liquidatedUserId || "unknown";
      targetKey = event.targetUserId || "unknown";
      
      // Skip if same account (shouldn't happen but safety check)
      if (sourceKey === targetKey) continue;
    }

    if (!sourceKey || !targetKey || sourceKey === "unknown" || targetKey === "unknown") {
      continue;
    }

    sourceMap.set(sourceKey, (sourceMap.get(sourceKey) || 0) + event.notionalUsd);
    targetMap.set(targetKey, (targetMap.get(targetKey) || 0) + event.notionalUsd);

    const linkKey = `${sourceKey}->${targetKey}`;
    const existing = linkMap.get(linkKey) || { notional: 0, asset: event.asset };
    existing.notional += event.notionalUsd;
    if (!existing.asset) existing.asset = event.asset;
    linkMap.set(linkKey, existing);
  }

  // Get top sources and targets
  const topSources = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, notional]) => ({ id, notional }));

  const topTargets = Array.from(targetMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, notional]) => ({ id, notional }));

  const sourceSet = new Set(topSources.map((s) => s.id));
  const targetSet = new Set(topTargets.map((t) => t.id));

  // Filter links
  const links: SankeyLink[] = [];
  for (const [linkKey, data] of Array.from(linkMap.entries())) {
    if (data.notional < minNotional) continue;

    const [source, target] = linkKey.split("->");
    if (!sourceSet.has(source) || !targetSet.has(target)) continue;

    links.push({
      id: linkKey,
      source,
      target,
      notional: data.notional,
      sourceIndex: topSources.findIndex((s) => s.id === source),
      targetIndex: topTargets.findIndex((t) => t.id === target),
      asset: data.asset,
    });
  }

  // Build nodes
  const totalSource = topSources.reduce((sum, s) => sum + s.notional, 0);
  const totalTarget = topTargets.reduce((sum, t) => sum + t.notional, 0);

  const width = 1000;
  const height = 600;
  const sourceX = width * 0.15;
  const targetX = width * 0.85;
  const padding = 40;

  const nodes: SankeyNode[] = [];

  // Source nodes (left side)
  let sourceY = padding;
  for (let i = 0; i < topSources.length; i++) {
    const source = topSources[i];
    const nodeHeight = (source.notional / totalSource) * (height - 2 * padding);
    nodes.push({
      id: source.id,
      label: source.id.length > 12 ? source.id.slice(0, 8) + "..." : source.id,
      type: "source",
      category: groupBy,
      totalNotional: source.notional,
      x: sourceX,
      y: sourceY,
      height: nodeHeight,
    });
    sourceY += nodeHeight + 2;
  }

  // Target nodes (right side)
  let targetY = padding;
  for (let i = 0; i < topTargets.length; i++) {
    const target = topTargets[i];
    const nodeHeight = (target.notional / totalTarget) * (height - 2 * padding);
    nodes.push({
      id: target.id,
      label: target.id.length > 12 ? target.id.slice(0, 8) + "..." : target.id,
      type: "target",
      category: groupBy,
      totalNotional: target.notional,
      x: targetX,
      y: targetY,
      height: nodeHeight,
    });
    targetY += nodeHeight + 2;
  }

  return { nodes, links };
}

interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  particleTime: number;
  hoveredLink: string | null;
  hoveredNode: string | null;
  onLinkHover: (id: string | null) => void;
  onNodeHover: (id: string | null) => void;
}

const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  nodes,
  links,
  particleTime,
  hoveredLink,
  hoveredNode,
  onLinkHover,
  onNodeHover,
}) => {
  const width = 1000;
  const height = 600;
  const maxNotional = Math.max(...links.map((l) => l.notional), 1);

  // Calculate link paths (curved)
  const linkPaths = useMemo(() => {
    return links.map((link) => {
      const sourceNode = nodes.find((n) => n.id === link.source);
      const targetNode = nodes.find((n) => n.id === link.target);
      if (!sourceNode || !targetNode) return null;

      const sourceY = sourceNode.y + sourceNode.height / 2;
      const targetY = targetNode.y + targetNode.height / 2;

      // Curved path
      const controlX1 = sourceNode.x + (targetNode.x - sourceNode.x) * 0.5;
      const controlX2 = sourceNode.x + (targetNode.x - sourceNode.x) * 0.5;

      return {
        link,
        path: `M ${sourceNode.x} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${targetY}, ${targetNode.x} ${targetY}`,
        sourceY,
        targetY,
        sourceX: sourceNode.x,
        targetX: targetNode.x,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [links, nodes]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-[600px] rounded-2xl bg-slate-950 border border-slate-800"
    >
      {/* Links (flows) */}
      {linkPaths.map(({ link, path, sourceY, targetY, sourceX, targetX }) => {
        const isHovered = hoveredLink === link.id;
        const width = Math.max(2, Math.min(20, (link.notional / maxNotional) * 20));

        return (
          <g key={link.id}>
            {/* Link path */}
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={width}
              strokeOpacity={isHovered ? 0.8 : 0.3}
              onMouseEnter={() => onLinkHover(link.id)}
              onMouseLeave={() => onLinkHover(null)}
              className="cursor-pointer"
            />
            {/* Animated particles */}
            {isHovered && (
              <circle
                cx={sourceX + (targetX - sourceX) * (0.5 + Math.sin(particleTime) * 0.1)}
                cy={sourceY + (targetY - sourceY) * (0.5 + Math.sin(particleTime) * 0.1)}
                r={4}
                fill="currentColor"
                opacity={0.9}
              />
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isHovered = hoveredNode === node.id;
        const isSource = node.type === "source";

        return (
          <g key={node.id}>
            {/* Node rectangle */}
            <rect
              x={isSource ? node.x - 60 : node.x}
              y={node.y}
              width={60}
              height={node.height}
              fill="currentColor"
              fillOpacity={isHovered ? 0.9 : 0.6}
              stroke="currentColor"
              strokeWidth={isHovered ? 2 : 1}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
              className="cursor-pointer"
            />
            {/* Node label */}
            <text
              x={isSource ? node.x - 65 : node.x + 65}
              y={node.y + node.height / 2}
              textAnchor={isSource ? "end" : "start"}
              dominantBaseline="middle"
              className="text-[10px] fill-current"
              fillOpacity={0.9}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
            >
              {node.label}
            </text>
            {/* Notional value */}
            {isHovered && (
              <text
                x={isSource ? node.x - 65 : node.x + 65}
                y={node.y + node.height / 2 + 12}
                textAnchor={isSource ? "end" : "start"}
                dominantBaseline="middle"
                className="text-[9px] fill-current"
                fillOpacity={0.7}
              >
                ${(node.totalNotional / 1e6).toFixed(1)}M
              </text>
            )}
          </g>
        );
      })}

      {/* Labels */}
      <text
        x={width * 0.15 - 60}
        y={20}
        textAnchor="middle"
        className="text-xs fill-current font-semibold"
        fillOpacity={0.8}
      >
        Liquidated {nodes[0]?.category === "asset" ? "Assets" : "Accounts"}
      </text>
      <text
        x={width * 0.85 + 60}
        y={20}
        textAnchor="middle"
        className="text-xs fill-current font-semibold"
        fillOpacity={0.8}
      >
        ADL Counterparties
      </text>
    </svg>
  );
};

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
