"use client";

import { useState } from "react";
import { CsvUploader } from "../components/CsvUploader";
import { ColumnConfigurator } from "../components/ColumnConfigurator";
import { TimelineReplay } from "../components/TimelineReplay";
import type { RawRow, TimelineEvent } from "../types/events";

export default function HomePage() {
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-10 bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Hyperliquid ADL Visualizer
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Interactive replay of the October 10, 2025 ADL cascade (or any compatible
            dataset). Upload canonical CSVs from{" "}
            <a
              href="https://github.com/ConejoCapital/HyperMultiAssetedADL"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              HyperMultiAssetedADL
            </a>{" "}
            and scrub through every forced unwind.
          </p>
        </header>
        <div className="space-y-4">
          <CsvUploader
            onData={(newRows, newHeaders) => {
              setRows(newRows);
              setHeaders(newHeaders);
              setEvents([]);
            }}
          />
          {rows && (
            <ColumnConfigurator
              rows={rows}
              headers={headers}
              onEventsReady={(evs) => setEvents(evs)}
            />
          )}
          {events.length > 0 && <TimelineReplay events={events} />}
        </div>
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

