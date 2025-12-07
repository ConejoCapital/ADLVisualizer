"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { RawRow, TimelineEvent } from "../types/events";

interface ColumnConfiguratorProps {
  rows: RawRow[];
  headers: string[];
  onEventsReady: (events: TimelineEvent[]) => void;
}

interface ColumnSelection {
  timeCol: string;
  notionalCol: string;
  assetCol?: string;
  sideCol?: string;
}

const guessColumn = (headers: string[], patterns: string[]): string | undefined => {
  const lower = headers.map((h) => h.toLowerCase());
  for (const pattern of patterns) {
    const idx = lower.findIndex((h) => h.includes(pattern));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
};

export const ColumnConfigurator: React.FC<ColumnConfiguratorProps> = ({
  rows,
  headers,
  onEventsReady,
}) => {
  const [selection, setSelection] = useState<ColumnSelection>(() => {
    return {
      timeCol: guessColumn(headers, ["time", "timestamp", "ts"]) || headers[0],
      notionalCol:
        guessColumn(headers, ["notional", "usd", "value"]) || headers[1] || headers[0],
      assetCol: guessColumn(headers, ["asset", "ticker", "coin", "symbol"]),
      sideCol: guessColumn(headers, ["side", "direction", "long", "short"]),
    };
  });

  const events = useMemo<TimelineEvent[]>(() => {
    const { timeCol, notionalCol, assetCol, sideCol } = selection;
    return rows
      .map((row, idx) => {
        const rawTime = row[timeCol];
        const rawNotional = row[notionalCol];
        if (rawTime == null || rawNotional == null) return null;

        let timestamp: number | null = null;
        if (typeof rawTime === "number") {
          // assume ms or seconds; heuristic: if < 10^12 treat as seconds
          timestamp = rawTime < 1e12 ? rawTime * 1000 : rawTime;
        } else if (typeof rawTime === "string") {
          const maybeNum = Number(rawTime);
          if (!Number.isNaN(maybeNum) && maybeNum > 0) {
            timestamp = maybeNum < 1e12 ? maybeNum * 1000 : maybeNum;
          } else {
            const d = new Date(rawTime);
            if (!Number.isNaN(d.getTime())) timestamp = d.getTime();
          }
        }

        if (!timestamp) return null;

        const notional =
          typeof rawNotional === "number" ? rawNotional : Number(rawNotional);
        if (!Number.isFinite(notional)) return null;

        const asset =
          assetCol && row[assetCol] != null ? String(row[assetCol]) : undefined;

        let side: "LONG" | "SHORT" | "UNKNOWN" = "UNKNOWN";
        if (sideCol && row[sideCol] != null) {
          const s = String(row[sideCol]).toLowerCase();
          if (s.includes("long") || s === "buy") side = "LONG";
          else if (s.includes("short") || s === "sell") side = "SHORT";
        }

        return {
          id: idx,
          timestamp,
          notionalUsd: notional,
          asset,
          side,
        } satisfies TimelineEvent;
      })
      .filter((x): x is TimelineEvent => x !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rows, selection]);

  useEffect(() => {
    if (events.length) onEventsReady(events);
  }, [events, onEventsReady]);

  return (
    <div className="border border-slate-700/70 rounded-2xl p-4 bg-slate-900/60 space-y-4">
      <h2 className="text-lg font-semibold">Map CSV columns</h2>
      <p className="text-sm text-slate-400">
        Choose which columns represent time, notional (USD), and asset. The viewer will then
        construct a chronological ADL / liquidation timeline.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ConfigSelect
          label="Time column"
          value={selection.timeCol}
          onChange={(timeCol) => setSelection((s) => ({ ...s, timeCol }))}
          headers={headers}
        />
        <ConfigSelect
          label="Notional (USD) column"
          value={selection.notionalCol}
          onChange={(notionalCol) => setSelection((s) => ({ ...s, notionalCol }))}
          headers={headers}
        />
        <ConfigSelect
          label="Asset / ticker column (optional)"
          value={selection.assetCol || ""}
          allowEmpty
          onChange={(assetCol) =>
            setSelection((s) => ({ ...s, assetCol: assetCol || undefined }))
          }
          headers={headers}
        />
        <ConfigSelect
          label="Side column (optional)"
          value={selection.sideCol || ""}
          allowEmpty
          onChange={(sideCol) =>
            setSelection((s) => ({ ...s, sideCol: sideCol || undefined }))
          }
          headers={headers}
        />
      </div>
      <p className="text-xs text-slate-500">
        Parsed events:{" "}
        <span className="font-mono text-emerald-400">{events.length}</span> (after filtering
        invalid rows).
      </p>
    </div>
  );
};

interface ConfigSelectProps {
  label: string;
  value: string;
  headers: string[];
  allowEmpty?: boolean;
  onChange: (value: string) => void;
}

const ConfigSelect: React.FC<ConfigSelectProps> = ({
  label,
  value,
  headers,
  allowEmpty,
  onChange,
}) => {
  return (
    <label className="text-sm space-y-1">
      <div className="text-slate-200">{label}</div>
      <select
        className="w-full bg-slate-950 border border-slate-700/70 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">(none)</option>}
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
};

