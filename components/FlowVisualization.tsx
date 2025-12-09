"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import * as d3 from "d3";

interface FlowData {
  metadata: {
    eventCount: number;
    timeRange: { start: number; end: number; durationMinutes: number };
    totalNotionalUsd: number;
    uniqueAssets: number;
    uniqueAccounts: number;
  };
  assetFlows: Array<{
    source: string;
    target: string;
    notional: number;
    count: number;
  }>;
  assetStats: Array<{
    asset: string;
    totalNotional: number;
    eventCount: number;
  }>;
  timeBuckets: Array<{
    time: number;
    timeISO: string;
    cumulativeNotional: number;
    notionalInBucket: number;
    eventCount: number;
    assetFlows: Array<{ source: string; target: string; notional: number }>;
  }>;
}

interface FlowVisualizationProps {
  data: FlowData;
  currentTimeMs?: number;
}

// Vibrant color palette
const ASSET_COLORS: Record<string, string> = {
  BTC: "#f7931a", // Bitcoin orange
  ETH: "#627eea", // Ethereum blue
  SOL: "#14f195", // Solana green
  HYPE: "#ff6b6b", // Hyperliquid red
  ARB: "#28a0f0", // Arbitrum blue
  AVAX: "#e84142", // Avalanche red
  MATIC: "#8247e5", // Polygon purple
  OP: "#ff0420", // Optimism red
  BASE: "#0052ff", // Base blue
};

// Generate colors for assets not in the palette
const generateColor = (asset: string, index: number): string => {
  if (ASSET_COLORS[asset]) return ASSET_COLORS[asset];
  
  const hue = (index * 137.508) % 360; // Golden angle for good distribution
  return d3.hsl(hue, 0.7, 0.6).toString();
};

export const FlowVisualization: React.FC<FlowVisualizationProps> = ({
  data,
  currentTimeMs = 0,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"chord" | "stream" | "network">("chord");
  const [animationProgress, setAnimationProgress] = useState(0);

  // Get visible flows based on current time
  const visibleFlows = useMemo(() => {
    if (!currentTimeMs) return data.assetFlows;
    
    const currentTime = data.metadata.timeRange.start + currentTimeMs;
    const activeBuckets = data.timeBuckets.filter(b => b.time <= currentTime);
    
    // Aggregate flows from active buckets
    const flowMap = new Map<string, number>();
    activeBuckets.forEach(bucket => {
      bucket.assetFlows.forEach(flow => {
        const key = `${flow.source}->${flow.target}`;
        flowMap.set(key, (flowMap.get(key) || 0) + flow.notional);
      });
    });
    
    return Array.from(flowMap.entries()).map(([key, notional]) => {
      const [source, target] = key.split("->");
      return { source, target, notional, count: 0 };
    });
  }, [data, currentTimeMs]);

  // Build chord diagram data
  const chordData = useMemo(() => {
    const assets = new Set<string>();
    visibleFlows.forEach(f => {
      assets.add(f.source);
      assets.add(f.target);
    });
    
    const assetList = Array.from(assets).sort();
    const matrix: number[][] = assetList.map(() => new Array(assetList.length).fill(0));
    
    visibleFlows.forEach(flow => {
      const i = assetList.indexOf(flow.source);
      const j = assetList.indexOf(flow.target);
      if (i >= 0 && j >= 0) {
        matrix[i][j] += flow.notional;
      }
    });
    
    return { matrix, assets: assetList };
  }, [visibleFlows]);

  // Animate on mount and when data changes
  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [data, selectedView]);

  // Render chord diagram
  useEffect(() => {
    if (!svgRef.current || selectedView !== "chord") return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 1000;
    const height = 1000;
    const outerRadius = Math.min(width, height) * 0.4;
    const innerRadius = outerRadius - 80;
    
    const { matrix, assets } = chordData;
    
    // Create chord layout
    const chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending);
    
    const chords = chord(matrix);
    
    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(assets)
      .range(assets.map((asset, i) => generateColor(asset, i)));
    
    // Create arc generator
    const arc = d3.arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
    
    // Create ribbon generator
    const ribbon = d3.ribbon<any, d3.Chord, d3.ChordSubgroup>()
      .radius(innerRadius);
    
    // Add groups for each asset
    const group = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)
      .selectAll("g")
      .data(chords.groups)
      .join("g");
    
    // Draw arcs
    group.append("path")
      .attr("fill", d => colorScale(assets[d.index]))
      .attr("stroke", d => d3.rgb(colorScale(assets[d.index])).darker(0.5).toString())
      .attr("stroke-width", 2)
      .style("opacity", d => hoveredAsset === null || assets[d.index] === hoveredAsset ? 0.9 : 0.3)
      .attr("d", arc)
      .style("cursor", "pointer")
      .on("mouseenter", (_, d) => setHoveredAsset(assets[d.index]))
      .on("mouseleave", () => setHoveredAsset(null))
      .style("opacity", d => {
        const baseOpacity = hoveredAsset === null || assets[d.index] === hoveredAsset ? 0.9 : 0.3;
        return baseOpacity * animationProgress;
      })
      .transition()
      .duration(800)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t: number) => {
          const interpolated = interpolate(t);
          return arc(interpolated) || "";
        };
      });
    
    // Draw ribbons (flows)
    svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("fill", d => {
        const sourceAsset = assets[d.source.index];
        return d3.rgb(colorScale(sourceAsset)).toString();
      })
      .attr("stroke", d => {
        const sourceAsset = assets[d.source.index];
        return d3.rgb(colorScale(sourceAsset)).darker(0.3).toString();
      })
      .attr("stroke-width", 1)
      .style("opacity", d => {
        const sourceAsset = assets[d.source.index];
        const targetAsset = assets[d.target.index];
        if (hoveredAsset === null) return 0.6 * animationProgress;
        if (sourceAsset === hoveredAsset || targetAsset === hoveredAsset) {
          return 0.9 * animationProgress;
        }
        return 0.2 * animationProgress;
      })
      .attr("d", (d) => {
        // @ts-expect-error - D3 ribbon typing issue
        const result: string | null = ribbon(d);
        return result || "";
      })
      .style("mix-blend-mode", "multiply")
      .transition()
      .duration(1000)
      .delay((_, i) => i * 20)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate(
          { source: { startAngle: 0, endAngle: 0 }, target: { startAngle: 0, endAngle: 0 } },
          d
        );
        return (t: number) => {
          const interpolated = interpolate(t);
          // @ts-expect-error - D3 ribbon typing issue
          const result: string | null = ribbon(interpolated);
          return result || "";
        };
      });
    
    // Add labels
    group.append("text")
      .attr("dy", ".35em")
      .attr("transform", d => {
        const angle = (d.startAngle + d.endAngle) / 2;
        return `
          rotate(${(angle * 180 / Math.PI - 90)})
          translate(${outerRadius + 10})
          ${angle > Math.PI ? "rotate(180)" : ""}
        `;
      })
      .attr("text-anchor", d => {
        const angle = (d.startAngle + d.endAngle) / 2;
        return angle > Math.PI ? "end" : "start";
      })
      .text(d => assets[d.index])
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", d => colorScale(assets[d.index]))
      .style("opacity", d => hoveredAsset === null || assets[d.index] === hoveredAsset ? 1 : 0.5)
      .style("pointer-events", "none");
    
  }, [chordData, hoveredAsset, selectedView, animationProgress]);

  // Calculate total notional for display
  const totalNotional = useMemo(() => {
    return visibleFlows.reduce((sum, f) => sum + f.notional, 0);
  }, [visibleFlows]);

  return (
    <div className="w-full space-y-6">
      {/* View Selector */}
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl border border-purple-500/30">
        <span className="text-sm font-semibold text-purple-200">View:</span>
        {(["chord", "stream", "network"] as const).map(view => (
          <button
            key={view}
            type="button"
            onClick={() => setSelectedView(view)}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all transform ${
              selectedView === view
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 scale-105"
                : "bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:scale-102"
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Notional"
          value={`$${(totalNotional / 1e9).toFixed(2)}B`}
          color="from-emerald-500 to-teal-500"
          icon="💰"
        />
        <StatCard
          label="Assets"
          value={chordData.assets.length.toString()}
          color="from-blue-500 to-cyan-500"
          icon="📊"
        />
        <StatCard
          label="Flows"
          value={visibleFlows.length.toString()}
          color="from-purple-500 to-pink-500"
          icon="🌊"
        />
        <StatCard
          label="Events"
          value={data.metadata.eventCount.toLocaleString()}
          color="from-orange-500 to-red-500"
          icon="⚡"
        />
      </div>

      {/* Chord Diagram */}
      {selectedView === "chord" && (
        <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent)]" />
          <svg
            ref={svgRef}
            viewBox="0 0 1000 1000"
            className="w-full h-[600px]"
          />
          {hoveredAsset && (
            <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-purple-500/50 shadow-xl">
              <div className="text-sm font-semibold text-purple-300 mb-2">
                {hoveredAsset}
              </div>
              <div className="text-xs text-slate-400">
                Hover over other assets to see connections
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placeholder for other views */}
      {selectedView !== "chord" && (
        <div className="bg-slate-900/60 rounded-2xl p-12 text-center border border-slate-700/70">
          <div className="text-4xl mb-4">{selectedView === "stream" ? "📈" : "🕸️"}</div>
          <div className="text-slate-400">
            {selectedView === "stream" ? "Stream graph coming soon" : "Network graph coming soon"}
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon }) => (
  <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 border border-white/10 shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-white/70 mb-1">{label}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

