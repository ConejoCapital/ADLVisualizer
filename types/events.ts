export type RawRow = Record<string, string | number | null>;

export interface TimelineEvent {
  id: number;
  timestamp: number; // ms since epoch
  notionalUsd: number;
  asset?: string;
  side?: "LONG" | "SHORT" | "UNKNOWN";
}

// New: ADL Event format from preprocessed JSON
export interface AdlEvent {
  timestamp: number; // epoch ms
  timestampISO: string; // ISO format
  asset: string;
  notionalUsd: number;
  side: "long" | "short";
  liquidatedUserId: string;
  targetUserId: string;
  batchId: string;
  equityBefore?: number;
  equityAfter?: number;
  leverage?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
}

export interface AdlEventsData {
  metadata: {
    eventCount: number;
    timeRange: {
      start: number;
      end: number;
    };
    totalNotionalUsd: number;
    uniqueAssets: number;
    uniqueAccounts: number;
  };
  events: AdlEvent[];
}

// Flow map types
export interface FlowNode {
  id: string;
  label: string;
  type: "asset" | "account";
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  notional: number;
  count: number;
}

export interface FlowMapData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
