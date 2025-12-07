# Hyperliquid ADL Visualizer

Interactive timeline replay and visualization tool for Hyperliquid Auto-Deleveraging (ADL) events.

## Features

- **CSV Upload**: Upload any compatible CSV from the [HyperMultiAssetedADL](https://github.com/ConejoCapital/HyperMultiAssetedADL) repository
- **Column Mapping**: Flexible column mapping interface that adapts to different CSV schemas
- **Timeline Replay**: Chronological replay of ADL/liquidation events with playback controls
- **Cumulative Visualization**: Real-time cumulative notional tracking with interactive timeline

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Sources

This tool works with CSVs from the HyperMultiAssetedADL repository, including:
- `adl_detailed_analysis_REALTIME.csv`
- `liquidations_full_12min.csv`
- `adl_fills_full_12min_raw.csv`

## Next Steps

- Flow map visualization (Sankey diagrams, particle trails)
- Per-asset cascade visualization
- Account-level flow analysis

