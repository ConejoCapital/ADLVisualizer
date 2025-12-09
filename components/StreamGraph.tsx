"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { FlowData } from "./FlowVisualization";

interface StreamGraphProps {
  data: FlowData;
  currentTimeMs?: number;
  animationProgress: number;
}

// Color palette for assets
const ASSET_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#14f195",
  HYPE: "#ff6b6b",
  ARB: "#28a0f0",
  AVAX: "#e84142",
  MATIC: "#8247e5",
  OP: "#ff0420",
  BASE: "#0052ff",
};

const generateColor = (asset: string, index: number): string => {
  if (ASSET_COLORS[asset]) return ASSET_COLORS[asset];
  const hue = (index * 137.508) % 360;
  return d3.hsl(hue, 0.7, 0.6).toString();
};

export const StreamGraph: React.FC<StreamGraphProps> = ({
  data,
  currentTimeMs = 0,
  animationProgress,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"liquidated" | "adld" | "both">("both");

  // Process time buckets for stream graph
  const streamData = useMemo(() => {
    const buckets = data.timeBuckets;
    if (!buckets.length) return null;

    // Get all assets
    const allAssets = new Set<string>();
    buckets.forEach(bucket => {
      if (bucket.liquidatedByAsset) {
        Object.keys(bucket.liquidatedByAsset).forEach(asset => allAssets.add(asset));
      }
      if (bucket.adldByAsset) {
        Object.keys(bucket.adldByAsset).forEach(asset => allAssets.add(asset));
      }
    });

    const assetList = Array.from(allAssets).sort();
    
    // Build cumulative data for each asset
    const series: Array<{ asset: string; values: Array<{ time: number; liquidated: number; adld: number; total: number }> }> = [];
    
    assetList.forEach(asset => {
      const values: Array<{ time: number; liquidated: number; adld: number; total: number }> = [];
      let cumulativeLiquidated = 0;
      let cumulativeAdld = 0;

      buckets.forEach(bucket => {
        const liquidated = bucket.liquidatedByAsset?.[asset] || 0;
        const adld = bucket.adldByAsset?.[asset] || 0;
        cumulativeLiquidated += liquidated;
        cumulativeAdld += adld;

        values.push({
          time: bucket.time,
          liquidated: cumulativeLiquidated,
          adld: cumulativeAdld,
          total: cumulativeLiquidated + cumulativeAdld,
        });
      });

      if (values.length > 0 && values[values.length - 1].total > 0) {
        series.push({ asset, values });
      }
    });

    // Sort by total notional (descending)
    series.sort((a, b) => {
      const aTotal = a.values[a.values.length - 1]?.total || 0;
      const bTotal = b.values[b.values.length - 1]?.total || 0;
      return bTotal - aTotal;
    });

    return { series, assetList: series.map(s => s.asset) };
  }, [data.timeBuckets]);

  // Render stream graph
  useEffect(() => {
    if (!svgRef.current || !streamData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 600;
    const margin = { top: 40, right: 200, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (!streamData.series.length) return;

    // Time scale
    const timeExtent = d3.extent(streamData.series[0].values, d => d.time) as [number, number];
    const xScale = d3.scaleTime().domain(timeExtent).range([0, chartWidth]);

    // Value scale
    const maxValue = d3.max(streamData.series, s =>
      d3.max(s.values, d => viewMode === "liquidated" ? d.liquidated : viewMode === "adld" ? d.adld : d.total)
    ) || 0;
    const yScale = d3.scaleLinear().domain([0, maxValue]).range([chartHeight, 0]).nice();

    // Area generator for liquidated (bottom layer)
    const areaLiquidated = d3
      .area<{ time: number; liquidated: number; adld: number; total: number }>()
      .x(d => xScale(d.time))
      .y0(chartHeight)
      .y1(d => yScale(d.liquidated))
      .curve(d3.curveMonotoneX);

    // Area generator for ADL'd (top layer, stacked on liquidated)
    const areaAdld = d3
      .area<{ time: number; liquidated: number; adld: number; total: number }>()
      .x(d => xScale(d.time))
      .y0(d => yScale(d.liquidated))
      .y1(d => yScale(d.liquidated + d.adld))
      .curve(d3.curveMonotoneX);

    // Area generator for combined (when viewMode is "both")
    const areaCombined = d3
      .area<{ time: number; liquidated: number; adld: number; total: number }>()
      .x(d => xScale(d.time))
      .y0(chartHeight)
      .y1(d => yScale(d.total))
      .curve(d3.curveMonotoneX);

    // Stack the data
    const stackedData = streamData.series.map((series, i) => {
      const color = generateColor(series.asset, i);
      return {
        asset: series.asset,
        color,
        values: series.values,
      };
    });

    // Draw areas
    stackedData.forEach((series, i) => {
      const opacity = hoveredAsset === null || hoveredAsset === series.asset ? 0.8 : 0.2;

      if (viewMode === "both") {
        // Draw combined area
        g.append("path")
          .datum(series.values)
          .attr("fill", series.color)
          .attr("fill-opacity", opacity * animationProgress)
          .attr("stroke", d3.rgb(series.color).darker(0.3).toString())
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", opacity)
          .attr("d", areaCombined)
          .style("cursor", "pointer")
          .on("mouseenter", () => setHoveredAsset(series.asset))
          .on("mouseleave", () => setHoveredAsset(null))
          .transition()
          .duration(1000)
          .delay(i * 50)
          .attrTween("d", function(d) {
            const interpolate = d3.interpolate(
              d.map(v => ({ ...v, total: 0 })),
              d
            );
            return (t: number) => {
              const interpolated = interpolate(t);
              return areaCombined(interpolated) || "";
            };
          });
      } else if (viewMode === "liquidated") {
        // Draw only liquidated
        g.append("path")
          .datum(series.values)
          .attr("fill", series.color)
          .attr("fill-opacity", opacity * animationProgress * 0.7)
          .attr("stroke", d3.rgb(series.color).darker(0.5).toString())
          .attr("stroke-width", 1.5)
          .attr("d", areaLiquidated)
          .style("cursor", "pointer")
          .on("mouseenter", () => setHoveredAsset(series.asset))
          .on("mouseleave", () => setHoveredAsset(null));
      } else {
        // Draw ADL'd stacked on liquidated
        g.append("path")
          .datum(series.values)
          .attr("fill", series.color)
          .attr("fill-opacity", opacity * animationProgress * 0.6)
          .attr("stroke", d3.rgb(series.color).darker(0.3).toString())
          .attr("stroke-width", 1)
          .attr("d", areaLiquidated)
          .style("cursor", "pointer")
          .on("mouseenter", () => setHoveredAsset(series.asset))
          .on("mouseleave", () => setHoveredAsset(null));

        g.append("path")
          .datum(series.values)
          .attr("fill", d3.rgb(series.color).brighter(0.3).toString())
          .attr("fill-opacity", opacity * animationProgress)
          .attr("stroke", d3.rgb(series.color).darker(0.2).toString())
          .attr("stroke-width", 1.5)
          .attr("d", areaAdld)
          .style("cursor", "pointer")
          .on("mouseenter", () => setHoveredAsset(series.asset))
          .on("mouseleave", () => setHoveredAsset(null));
      }
    });

    // Add axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M:%S") as any);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `$${(Number(d) / 1e6).toFixed(1)}M`);

    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "11px");

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "11px");

    // Axis labels
    g.append("text")
      .attr("transform", `translate(${chartWidth / 2},${chartHeight + 45})`)
      .style("text-anchor", "middle")
      .style("fill", "#cbd5e1")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text("Time (UTC)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -chartHeight / 2)
      .style("text-anchor", "middle")
      .style("fill", "#cbd5e1")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text("Cumulative Notional (USD)");

    // Legend
    const legend = g
      .append("g")
      .attr("transform", `translate(${chartWidth + 20}, 20)`);

    const topAssets = stackedData.slice(0, 15); // Top 15 assets
    topAssets.forEach((series, i) => {
      const legendItem = legend.append("g").attr("transform", `translate(0,${i * 20})`);

      legendItem
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", series.color)
        .attr("opacity", hoveredAsset === null || hoveredAsset === series.asset ? 0.8 : 0.3)
        .style("cursor", "pointer")
        .on("mouseenter", () => setHoveredAsset(series.asset))
        .on("mouseleave", () => setHoveredAsset(null));

      legendItem
        .append("text")
        .attr("x", 16)
        .attr("y", 9)
        .style("fill", hoveredAsset === null || hoveredAsset === series.asset ? "#e2e8f0" : "#64748b")
        .style("font-size", "11px")
        .style("cursor", "pointer")
        .text(series.asset)
        .on("mouseenter", () => setHoveredAsset(series.asset))
        .on("mouseleave", () => setHoveredAsset(null));
    });

    // Current time indicator
    if (currentTimeMs > 0) {
      const currentTime = data.metadata.timeRange.start + currentTimeMs;
      const xPos = xScale(currentTime);
      
      g.append("line")
        .attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", "#fbbf24")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0.8);
    }

  }, [streamData, viewMode, hoveredAsset, animationProgress, currentTimeMs, data]);

  if (!streamData || !streamData.series.length) {
    return (
      <div className="bg-slate-900/60 rounded-2xl p-12 text-center border border-slate-700/70">
        <div className="text-slate-400">No stream data available</div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl p-8 border border-purple-500/30 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent)]" />
      
      {/* View Mode Selector */}
      <div className="flex items-center gap-3 mb-6 z-10 relative">
        <span className="text-sm font-semibold text-purple-200">View:</span>
        {(["liquidated", "adld", "both"] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              viewMode === mode
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                : "bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
            }`}
          >
            {mode === "liquidated" ? "Liquidated (Losses)" : mode === "adld" ? "ADL'd (Long Positions)" : "Both"}
          </button>
        ))}
      </div>

      {/* Insight Text */}
      <div className="mb-4 z-10 relative">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
          <div className="text-sm text-slate-200 mb-2">
            <span className="font-semibold text-purple-300">Insight:</span>{" "}
            {viewMode === "liquidated" 
              ? "Accounts losing capital on large tickers trigger the cascade"
              : viewMode === "adld"
              ? "Long positions get ADL'd as a result of liquidations"
              : "Liquidations (bottom) trigger ADL events (top) - showing the cascade"}
          </div>
        </div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full h-[600px] z-10 relative" />

      {/* Hover Tooltip */}
      {hoveredAsset && streamData && (
        <div className="absolute top-20 right-8 bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-purple-500/50 shadow-xl z-20">
          <div className="text-sm font-semibold text-purple-300 mb-2">{hoveredAsset}</div>
          {streamData.series.find(s => s.asset === hoveredAsset) && (() => {
            const series = streamData.series.find(s => s.asset === hoveredAsset)!;
            const last = series.values[series.values.length - 1];
            return (
              <div className="text-xs text-slate-300 space-y-1">
                <div>Liquidated: ${(last.liquidated / 1e6).toFixed(2)}M</div>
                <div>ADL'd: ${(last.adld / 1e6).toFixed(2)}M</div>
                <div className="pt-1 border-t border-slate-700">
                  Total: ${(last.total / 1e6).toFixed(2)}M
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

