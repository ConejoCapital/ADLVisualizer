export type RawRow = Record<string, string | number | null>;

export interface TimelineEvent {
  id: number;
  timestamp: number; // ms since epoch
  notionalUsd: number;
  asset?: string;
  side?: "LONG" | "SHORT" | "UNKNOWN";
}

