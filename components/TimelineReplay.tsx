"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import type { AdlEvent } from "../types/events";

interface TimelineReplayProps {
  events: AdlEvent[];
  onTimeUpdate?: (timeMs: number) => void;
  timeRange: { start: number; end: number };
}

const EVENT_WINDOW_MS = 12 * 60 * 1000; // 12 minutes in ms
const DEFAULT_PLAYBACK_DURATION_MS = 40 * 1000; // 40 seconds for full replay
const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

export const TimelineReplay: React.FC<TimelineReplayProps> = ({ events, onTimeUpdate, timeRange: propTimeRange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // Pre-sort events by timestamp once
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.timestamp - b.timestamp),
    [events]
  );

  const timeRange = useMemo(() => {
    if (propTimeRange.start && propTimeRange.end) {
      return propTimeRange;
    }
    if (sortedEvents.length === 0) return { start: 0, end: 0 };
    return {
      start: sortedEvents[0].timestamp,
      end: sortedEvents[sortedEvents.length - 1].timestamp,
    };
  }, [sortedEvents, propTimeRange]);

  // Calculate virtual time step per real frame
  const virtualTimeStepPerMs = useMemo(() => {
    const actualDuration = timeRange.end - timeRange.start;
    return actualDuration / DEFAULT_PLAYBACK_DURATION_MS; // virtual ms per real ms at 1x
  }, [timeRange]);

  // Get visible events at current virtual time
  const visibleEvents = useMemo(() => {
    const currentVirtualTime = timeRange.start + currentTimeMs;
    return sortedEvents.filter((e) => e.timestamp <= currentVirtualTime);
  }, [sortedEvents, currentTimeMs, timeRange.start]);

  const currentEvent = visibleEvents[visibleEvents.length - 1];

  // Animation loop - fixed to prevent freezing
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
      return;
    }

    let isActive = true;

    const animate = (currentRealTime: number) => {
      if (!isActive || !isPlaying) {
        return;
      }

      try {
        if (lastFrameTimeRef.current === null) {
          lastFrameTimeRef.current = currentRealTime;
          if (isActive && isPlaying) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }
          return;
        }

        const deltaRealMs = Math.min(currentRealTime - lastFrameTimeRef.current, 100); // Cap delta to prevent large jumps
        const deltaVirtualMs = deltaRealMs * virtualTimeStepPerMs * speed;
        
        const maxTime = timeRange.end - timeRange.start;
        
        setCurrentTimeMs((prev) => {
          const newTime = Math.min(prev + deltaVirtualMs, maxTime);
          
          if (newTime >= maxTime) {
            setIsPlaying(false);
            onTimeUpdate?.(maxTime);
            return maxTime;
          }
          
          onTimeUpdate?.(newTime);
          return newTime;
        });

        lastFrameTimeRef.current = currentRealTime;
        
        if (isActive && isPlaying) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      } catch (error) {
        console.error("Animation error:", error);
        setIsPlaying(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
    };
  }, [isPlaying, speed, virtualTimeStepPerMs, timeRange, onTimeUpdate]);

  // Reset when events change
  useEffect(() => {
    setCurrentTimeMs(0);
    setIsPlaying(false);
  }, [events]);

  if (!sortedEvents.length) {
    return (
      <div className="border border-slate-700/70 rounded-2xl p-6 bg-slate-900/60 text-sm text-slate-400">
        No events to display.
      </div>
    );
  }

  const currentVirtualTime = timeRange.start + currentTimeMs;
  const progress = currentTimeMs / (timeRange.end - timeRange.start);

  // Cumulative notional
  const cumulativeNotional = useMemo(() => {
    let acc = 0;
    return visibleEvents.map((ev) => {
      acc += Math.abs(ev.notionalUsd);
      return acc;
    });
  }, [visibleEvents]);

  const currentCumulative = cumulativeNotional[cumulativeNotional.length - 1] || 0;

  // Format time display
  const formatTime = (ms: number) => {
    const date = new Date(ms);
    return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border border-slate-700/70 rounded-2xl p-4 sm:p-6 bg-slate-900/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ADL / Liquidation Timeline Replay</h2>
          <p className="text-sm text-slate-400">
            Replays the 12-minute cascade compressed to ~40 seconds. Scrub to any point in time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? "Pause" : currentTimeMs >= timeRange.end - timeRange.start ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            onClick={() => {
              setCurrentTimeMs(0);
              setIsPlaying(false);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Event{" "}
            <span className="font-mono text-emerald-400">
              {visibleEvents.length} / {sortedEvents.length}
            </span>
          </span>
          <span className="font-mono">
            {formatTime(currentVirtualTime)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={timeRange.end - timeRange.start}
          value={currentTimeMs}
          onChange={(e) => {
            const newTime = Number(e.target.value);
            setCurrentTimeMs(newTime);
            setIsPlaying(false);
            onTimeUpdate?.(newTime);
          }}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{formatTime(timeRange.start)}</span>
          <span>{formatDuration(currentTimeMs)} / {formatDuration(timeRange.end - timeRange.start)}</span>
          <span>{formatTime(timeRange.end)}</span>
        </div>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Speed:</span>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`px-2 py-1 rounded text-xs transition ${
                speed === s
                  ? "bg-emerald-500 text-slate-950 font-semibold"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* SVG visualization */}
      <div className="mt-2">
        <TimelineSvg
          events={sortedEvents}
          visibleCount={visibleEvents.length}
          cumulative={cumulativeNotional}
          currentTime={currentVirtualTime}
          timeRange={timeRange}
        />
      </div>

      {/* Current event stats */}
      {currentEvent && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <StatCard
            label="Current asset"
            value={currentEvent.asset || "—"}
            hint="Asset being ADL'd"
          />
          <StatCard
            label="Current notional"
            value={`$${Math.abs(currentEvent.notionalUsd).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}`}
            hint="Notional of current event"
          />
          <StatCard
            label="Cumulative notional"
            value={`$${currentCumulative.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}`}
            hint="Total notional processed"
          />
        </div>
      )}
    </div>
  );
};

interface TimelineSvgProps {
  events: AdlEvent[];
  visibleCount: number;
  cumulative: number[];
  currentTime: number;
  timeRange: { start: number; end: number };
}

const TimelineSvg: React.FC<TimelineSvgProps> = ({
  events,
  visibleCount,
  cumulative,
  currentTime,
  timeRange,
}) => {
  const width = 1000;
  const height = 260;
  const padding = 40;
  const spanMs = Math.max(1, timeRange.end - timeRange.start);
  const maxCum = cumulative[cumulative.length - 1] || 1;

  const xScale = (t: number) =>
    padding + ((t - timeRange.start) / spanMs) * (width - 2 * padding);
  const yScale = (val: number) =>
    height - padding - (val / maxCum) * (height - 2 * padding);

  const currentX = xScale(currentTime);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-64 rounded-2xl bg-slate-950 border border-slate-800"
    >
      {/* Cumulative line */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={1.2}
        points={events
          .slice(0, visibleCount)
          .map((ev, i) => `${xScale(ev.timestamp)},${yScale(cumulative[i])}`)
          .join(" ")}
      />

      {/* Events as bubbles */}
      {events.slice(0, visibleCount).map((ev, i) => {
        const x = xScale(ev.timestamp);
        const y = yScale(cumulative[i]);
        const r = 2 + Math.min(8, Math.sqrt(Math.abs(ev.notionalUsd)) / 5_000);
        const isCurrent = i === visibleCount - 1;

        return (
          <circle
            key={`${ev.timestamp}-${i}`}
            cx={x}
            cy={y}
            r={isCurrent ? r * 1.5 : r}
            fill="currentColor"
            opacity={isCurrent ? 0.9 : 0.25}
          />
        );
      })}

      {/* Vertical cursor */}
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

      {/* Labels */}
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
