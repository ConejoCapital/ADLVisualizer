"use client";

import React, { useRef } from "react";
import Papa from "papaparse";
import type { RawRow } from "../types/events";

interface CsvUploaderProps {
  onData: (rows: RawRow[], headers: string[]) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onData }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<RawRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = (result.data || []) as RawRow[];
        if (!rows.length) return;
        const headers = Object.keys(rows[0] || {});
        onData(rows, headers);
      },
    });
  };

  return (
    <div className="border border-slate-700/70 rounded-2xl p-4 bg-slate-900/60">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Upload ADL / liquidation CSV</h2>
          <p className="text-sm text-slate-400">
            Drop any of the canonical CSVs (e.g.{" "}
            <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">
              adl_detailed_analysis_REALTIME.csv
            </code>
            ) and then map columns below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
        >
          Select CSV
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

