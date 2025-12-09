# Hyperliquid ADL Visualizer

Interactive, colorful flow visualizations for the October 10, 2025 Hyperliquid Auto-Deleveraging (ADL) event.

## Features

- **Chord Diagram**: Asset-to-asset flow visualization showing notional transfers
- **Stream Graph**: Time-based cascade visualization showing liquidations → ADL events
- **Timeline Replay**: Chronological replay with playback controls
- **Dynamic & Colorful**: Vibrant colors, smooth animations, interactive hover effects

## Getting Started

### Installation

```bash
npm install
```

### Generate Visualization Data

The visualization data is generated from the canonical CSV in [HyperMultiAssetedADL](https://github.com/ConejoCapital/HyperMultiAssetedADL):

```bash
# Install Python dependencies
pip install pandas

# Generate data files (saved to public/data/)
python scripts/data/export_adl_events_json.py
python scripts/data/export_flow_data.py
```

The scripts will automatically:
- Fetch data from HyperMultiAssetedADL GitHub repository, OR
- Use local path if you have HyperMultiAssetedADL cloned at `../HyperMultiAssetedADL`

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Sources

This tool reads from the canonical dataset in [HyperMultiAssetedADL](https://github.com/ConejoCapital/HyperMultiAssetedADL):

- `adl_detailed_analysis_REALTIME.csv` - 34,983 ADL events with real-time metrics

The visualization scripts process this data and generate optimized JSON files for the frontend.

## Visualization Insights

The visualizations answer key questions:

1. **Which assets are most connected?** (Chord diagram)
2. **How does the cascade propagate?** (Stream graph)
3. **Which assets lose capital vs get ADL'd?** (Stream graph view modes)
4. **What's the timeline of events?** (Timeline replay)

## Repository Structure

```
ADLVisualizer/
├── app/                    # Next.js app router
├── components/             # React visualization components
│   ├── FlowVisualization.tsx  # Chord diagram
│   ├── StreamGraph.tsx        # Cascade visualization
│   └── TimelineReplay.tsx      # Timeline replay
├── scripts/                # Data generation scripts
│   └── data/
│       ├── export_adl_events_json.py
│       └── export_flow_data.py
└── public/
    └── data/               # Generated JSON files (committed)
```

## Deployment

The visualization is deployed at [adl-visualizer.vercel.app](https://adl-visualizer.vercel.app).

Data files in `public/data/` are committed to the repository for static serving.
