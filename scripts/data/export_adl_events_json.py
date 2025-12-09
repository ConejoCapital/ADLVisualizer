#!/usr/bin/env python3
"""
Export ADL events to JSON format for ADLVisualizer

Converts adl_detailed_analysis_REALTIME.csv to a compact JSON format
optimized for frontend visualization.
"""
import pandas as pd
import json
from pathlib import Path
from datetime import datetime

# Point to the canonical CSV in HyperMultiAssetedADL repo
ROOT = Path(__file__).resolve().parents[2]
CANONICAL_CSV_URL = "https://raw.githubusercontent.com/ConejoCapital/HyperMultiAssetedADL/main/data/canonical/cash-only%20balances%20ADL%20event%20orderbook%202025-10-10/adl_detailed_analysis_REALTIME.csv"
OUTPUT_DIR = ROOT / "public" / "data"
OUTPUT_PATH = OUTPUT_DIR / "adl_events.json"

# Allow local override for development
LOCAL_CSV_PATH = ROOT.parent / "HyperMultiAssetedADL" / "data" / "canonical" / "cash-only balances ADL event orderbook 2025-10-10" / "adl_detailed_analysis_REALTIME.csv"

def parse_timestamp(ts):
    """Parse timestamp to epoch milliseconds"""
    if isinstance(ts, (int, float)):
        # Already a number
        if ts < 1e12:
            return int(ts * 1000)  # Assume seconds
        return int(ts)  # Assume milliseconds
    elif isinstance(ts, str):
        # Try parsing as ISO string
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return int(dt.timestamp() * 1000)
        except:
            # Try as number string
            try:
                num = float(ts)
                if num < 1e12:
                    return int(num * 1000)
                return int(num)
            except:
                return None
    return None

def determine_side(row):
    """Determine side from available fields"""
    # Check side column
    if 'side' in row and pd.notna(row['side']):
        side_str = str(row['side']).lower()
        if 'b' in side_str or 'buy' in side_str or 'long' in side_str:
            return "long"
        elif 'a' in side_str or 'sell' in side_str or 'short' in side_str:
            return "short"
    
    # Check direction
    if 'direction' in row and pd.notna(row['direction']):
        dir_str = str(row['direction']).lower()
        if 'long' in dir_str:
            return "long"
        elif 'short' in dir_str:
            return "short"
    
    # Default based on position size
    if 'position_size' in row and pd.notna(row['position_size']):
        if row['position_size'] > 0:
            return "long"
        elif row['position_size'] < 0:
            return "short"
    
    return "long"  # Default fallback

print("="*80)
print("Exporting ADL Events to JSON for ADLVisualizer")
print("="*80)

# Load canonical CSV - try local first, then GitHub
if LOCAL_CSV_PATH.exists():
    print(f"\nLoading from local: {LOCAL_CSV_PATH}")
    df = pd.read_csv(LOCAL_CSV_PATH)
else:
    print(f"\nDownloading from GitHub: {CANONICAL_CSV_URL}")
    import urllib.request
    df = pd.read_csv(CANONICAL_CSV_URL)
print(f"Loaded {len(df):,} ADL events")

# Extract required fields
events = []

for idx, row in df.iterrows():
    # Parse timestamp
    timestamp_ms = None
    if 'time' in row:
        timestamp_ms = parse_timestamp(row['time'])
    
    if timestamp_ms is None:
        continue  # Skip if we can't parse timestamp
    
    # Get asset
    asset = None
    for col in ['coin', 'asset', 'ticker', 'symbol']:
        if col in row and pd.notna(row[col]):
            asset = str(row[col])
            break
    
    # Get notional
    notional = None
    for col in ['adl_notional', 'notional', 'usd', 'value']:
        if col in row and pd.notna(row[col]):
            notional = float(row[col])
            break
    
    if notional is None or notional <= 0:
        continue
    
    # Get user IDs
    liquidated_user = None
    target_user = None
    
    if 'liquidated_user' in row and pd.notna(row['liquidated_user']):
        liquidated_user = str(row['liquidated_user'])
    
    if 'user' in row and pd.notna(row['user']):
        target_user = str(row['user'])
    
    # Determine side
    side = determine_side(row)
    
    # Create event
    event = {
        "timestamp": timestamp_ms,
        "timestampISO": datetime.fromtimestamp(timestamp_ms / 1000).isoformat() + "Z",
        "asset": asset or "UNKNOWN",
        "notionalUsd": notional,
        "side": side,
        "liquidatedUserId": liquidated_user or "",
        "targetUserId": target_user or "",
        "batchId": str(int(timestamp_ms / 1000)),  # Second-level batching
    }
    
    # Add optional fields if available
    if 'account_value_realtime' in row and pd.notna(row['account_value_realtime']):
        event["equityBefore"] = float(row['account_value_realtime'])
    
    if 'total_equity' in row and pd.notna(row['total_equity']):
        event["equityAfter"] = float(row['total_equity'])
    
    if 'leverage_realtime' in row and pd.notna(row['leverage_realtime']):
        event["leverage"] = float(row['leverage_realtime'])
    
    if 'closed_pnl' in row and pd.notna(row['closed_pnl']):
        event["realizedPnl"] = float(row['closed_pnl'])
    
    if 'position_unrealized_pnl' in row and pd.notna(row['position_unrealized_pnl']):
        event["unrealizedPnl"] = float(row['position_unrealized_pnl'])
    
    events.append(event)

# Sort by timestamp
events.sort(key=lambda x: x['timestamp'])

print(f"\nProcessed {len(events):,} valid events")

# Calculate statistics
if events:
    first_ts = events[0]['timestamp']
    last_ts = events[-1]['timestamp']
    duration_ms = last_ts - first_ts
    duration_min = duration_ms / 1000 / 60
    
    total_notional = sum(e['notionalUsd'] for e in events)
    unique_assets = len(set(e['asset'] for e in events))
    unique_accounts = len(set(e['targetUserId'] for e in events if e['targetUserId']))
    
    print(f"\nStatistics:")
    print(f"  Time range: {duration_min:.2f} minutes")
    print(f"  Total notional: ${total_notional:,.0f}")
    print(f"  Unique assets: {unique_assets}")
    print(f"  Unique accounts: {unique_accounts}")

# Save JSON
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
print(f"\nSaving to: {OUTPUT_PATH}")

with open(OUTPUT_PATH, 'w') as f:
    json.dump({
        "metadata": {
            "eventCount": len(events),
            "timeRange": {
                "start": events[0]['timestamp'] if events else 0,
                "end": events[-1]['timestamp'] if events else 0,
            },
            "totalNotionalUsd": total_notional if events else 0,
            "uniqueAssets": unique_assets if events else 0,
            "uniqueAccounts": unique_accounts if events else 0,
        },
        "events": events
    }, f, indent=2)

print(f"✅ Saved {len(events):,} events to {OUTPUT_PATH}")
print(f"   File size: {OUTPUT_PATH.stat().st_size / 1024 / 1024:.2f} MB")


