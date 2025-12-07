"use client";

import { useState, useEffect } from "react";
import { ColumnConfigurator } from "../components/ColumnConfigurator";
import { TimelineReplay } from "../components/TimelineReplay";
import type { RawRow, TimelineEvent } from "../types/events";
import Papa from "papaparse";

const CANONICAL_CSV_URL = "https://raw.githubusercontent.com/ConejoCapital/HyperMultiAssetedADL/main/data/canonical/cash-only%20balances%20ADL%20event%20orderbook%202025-10-10/adl_detailed_analysis_REALTIME.csv";

export default function HomePage() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Automatically load the canonical CSV on mount
    setLoading(true);
    setError(null);

    Papa.parse<RawRow>(CANONICAL_CSV_URL, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const parsedRows = (result.data || []) as RawRow[];
          if (!parsedRows.length) {
            setError("No data found in CSV");
            setLoading(false);
            return;
          }
          const parsedHeaders = Object.keys(parsedRows[0] || {});
          setRows(parsedRows);
          setHeaders(parsedHeaders);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV");
          setLoading(false);
        }
      },
      error: (err) => {
        setError(err.message || "Failed to load CSV");
        setLoading(false);
      },
    });
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-10 bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Hyperliquid ADL Visualizer
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Interactive replay of the October 10, 2025 ADL cascade. Data loaded from{" "}
            <a
              href="https://github.com/ConejoCapital/HyperMultiAssetedADL"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              HyperMultiAssetedADL
            </a>{" "}
            canonical dataset.
          </p>
        </header>

        {loading && (
          <div className="border border-slate-700/70 rounded-2xl p-6 bg-slate-900/60 text-center">
            <div className="text-slate-400">Loading ADL data...</div>
          </div>
        )}

        {error && (
          <div className="border border-red-700/70 rounded-2xl p-6 bg-red-900/20 text-red-400">
            <div className="font-semibold">Error loading data</div>
            <div className="text-sm mt-2">{error}</div>
          </div>
        )}

        {rows && !loading && (
          <div className="space-y-4">
            <div className="border border-slate-700/70 rounded-2xl p-4 bg-slate-900/60">
              <h2 className="text-lg font-semibold mb-2">Data Loaded</h2>
              <p className="text-sm text-slate-400">
                Loaded <span className="font-mono text-emerald-400">{rows.length.toLocaleString()}</span> ADL events from canonical dataset.
              </p>
            </div>

            <ColumnConfigurator
              rows={rows}
              headers={headers}
              onEventsReady={(evs) => setEvents(evs)}
            />

            {events.length > 0 && <TimelineReplay events={events} />}
          </div>
        )}

        {/* Flowmap placeholder – next step */}
        <section className="mt-8 border border-dashed border-slate-700/70 rounded-2xl p-4 text-sm text-slate-400">
          <h2 className="text-base font-semibold text-slate-200 mb-1">
            Flow Map (Next Step)
          </h2>
          <p>
            Once we agree the timeline replay feels right, we'll reuse the same parsed events
            (plus source/target columns from the CSV) to build a{" "}
            <strong>flow map</strong>: nodes as accounts or assets, edges as ADL notional
            transfers, animated over time.
          </p>
          <p className="mt-1 text-[11px]">
            That's where we can do the really fun stuff — Sankey flows, particle trails,
            per-asset "cascades" — but the data plumbing will already be in place.
          </p>
        </section>
      </div>
    </main>
  );
}
