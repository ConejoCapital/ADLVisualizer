"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { TimelineEvent } from "../types/events";

interface TimelineReplayProps {
  events: TimelineEvent[];
}

export const TimelineReplay: React.FC<TimelineReplayProps> = ({ events }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(5); // events per second

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.timestamp - b.timestamp),
    [events]
  );

  const current = sorted[index] ?? sorted[sorted.length - 1];

  useEffect(() => {
    if (!isPlaying || sorted.length === 0) return;
    if (index >= sorted.length - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = 1000 / speed;
    const id = window.setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, sorted.length - 1));
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [isPlaying, index, sorted, speed]);

  useEffect(() => {
    // reset when new data comes in
    setIndex(0);
    setIsPlaying(false);
  }, [events]);

  if (!sorted.length) {
    return (
      <div className="border border-slate-700/70 rounded-2xl p-6 bg-slate-900/60 text-sm text-slate-400">
        Upload a CSV and configure columns to see the timeline replay.
      </div>
    );
  }

  const tMin = sorted[0].timestamp;
  const tMax = sorted[sorted.length - 1].timestamp;
  const spanMs = Math.max(1, tMax - tMin);

  const cumulativeNotional = useMemo(() => {
    let acc = 0;
    return sorted.map((ev) => {
      acc += Math.abs(ev.notionalUsd);
      return acc;
    });
  }, [sorted]);

  const currentCumulative = cumulativeNotional[index];

  return (
    <div className="border border-slate-700/70 rounded-2xl p-4 sm:p-6 bg-slate-900/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ADL / Liquidation Timeline Replay</h2>
          <p className="text-sm text-slate-400">
            Replays the event chronologically. Think of it as a "reconstruction reel" of each
            forced unwind.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? "Pause" : index >= sorted.length - 1 ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            onClick={() => setIndex(0)}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Event{" "}
            <span className="font-mono text-emerald-400">
              {index + 1} / {sorted.length}
            </span>
          </span>
          <span className="font-mono">
            {new Date(current.timestamp).toISOString().replace("T", " ").slice(0, 19)} UTC
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={sorted.length - 1}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Playback speed */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Speed</span>
        <input
          type="range"
          min={1}
          max={60}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-mono">{speed} ev/s</span>
      </div>

      {/* SVG "sparkline" + bubbles */}
      <div className="mt-2">
        <TimelineSvg
          events={sorted}
          index={index}
          cumulative={cumulativeNotional}
          tMin={tMin}
          tMax={tMax}
        />
      </div>

      {/* Current event details */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <StatCard
          label="Current asset"
          value={current.asset || "—"}
          hint="Ticker / perps market for this ADL or liquidation."
        />
        <StatCard
          label="Current notional"
          value={`$${Math.abs(current.notionalUsd).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
          hint="Absolute notional of the current event."
        />
        <StatCard
          label="Cumulative notional"
          value={`$${currentCumulative.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
          hint="Total notional processed up to this point."
        />
      </div>

      <p className="text-[11px] text-slate-500">
        Tip: once this feels good, we can reuse the same parsed events to build a flow map:
        accounts / assets as nodes, ADL transfers as edges.
      </p>
    </div>
  );
};

interface TimelineSvgProps {
  events: TimelineEvent[];
  index: number;
  cumulative: number[];
  tMin: number;
  tMax: number;
}

const TimelineSvg: React.FC<TimelineSvgProps> = ({
  events,
  index,
  cumulative,
  tMin,
  tMax,
}) => {
  const width = 1000;
  const height = 260;
  const padding = 40;
  const spanMs = Math.max(1, tMax - tMin);
  const maxCum = cumulative[cumulative.length - 1] || 1;

  const xScale = (t: number) =>
    padding + ((t - tMin) / spanMs) * (width - 2 * padding);
  const yScale = (val: number) =>
    height - padding - (val / maxCum) * (height - 2 * padding);

  const currentX = xScale(events[index].timestamp);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-64 rounded-2xl bg-slate-950 border border-slate-800"
    >
      {/* cumulative line */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={1.2}
        points={events
          .map((ev, i) => `${xScale(ev.timestamp)},${yScale(cumulative[i])}`)
          .join(" ")}
      />

      {/* past events as faint bubbles */}
      {events.slice(0, index + 1).map((ev, i) => {
        const x = xScale(ev.timestamp);
        const y = yScale(cumulative[i]);
        const r = 2 + Math.min(10, Math.sqrt(Math.abs(ev.notionalUsd)) / 3_000);
        const isCurrent = i === index;

        return (
          <circle
            key={ev.id}
            cx={x}
            cy={y}
            r={isCurrent ? r * 1.3 : r}
            fill="currentColor"
            opacity={isCurrent ? 0.9 : 0.25}
          />
        );
      })}

      {/* vertical cursor */}
      <line
        x1={currentX}
        y1={padding / 2}
        x2={currentX}
        y2={height - padding / 2}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />

      {/* axes labels (minimal) */}
      <text
        x={padding}
        y={padding - 10}
        className="text-[9px]"
        fill="currentColor"
        opacity={0.5}
      >
        Cumulative notional
      </text>
      <text
        x={width - padding}
        y={height - 8}
        textAnchor="end"
        className="text-[9px]"
        fill="currentColor"
        opacity={0.5}
      >
        Time →
      </text>
    </svg>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, hint }) => (
  <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3">
    <div className="text-xs text-slate-400">{label}</div>
    <div className="text-base font-semibold mt-1">{value}</div>
    {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
  </div>
);
