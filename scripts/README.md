# ADLVisualizer Data Generation Scripts

These scripts generate visualization data from the canonical CSV in the HyperMultiAssetedADL repository.

## Setup

1. **Install dependencies**:
   ```bash
   pip install pandas
   ```

2. **Run the export scripts**:
   ```bash
   # Generate adl_events.json (for timeline replay)
   python scripts/data/export_adl_events_json.py
   
   # Generate adl_flow_data.json (for flow visualizations)
   python scripts/data/export_flow_data.py
   ```

## Data Sources

The scripts automatically fetch data from:
- **Primary**: GitHub raw URL from HyperMultiAssetedADL repository
- **Fallback (local)**: If you have HyperMultiAssetedADL cloned locally at `../HyperMultiAssetedADL`, it will use that instead

## Output

Generated JSON files are saved to `public/data/`:
- `adl_events.json` - Timeline replay data
- `adl_flow_data.json` - Flow visualization data (chord diagram, stream graph)

These files are then served statically by Next.js and loaded by the visualization components.

## Note

The scripts read from the canonical CSV in HyperMultiAssetedADL but do not modify that repository. All visualization-specific data processing is contained within ADLVisualizer.

