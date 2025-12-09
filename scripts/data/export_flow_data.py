#!/usr/bin/env python3
"""
Export flow visualization data for ADL events.
Creates optimized JSON for colorful, dynamic flow visualizations.
"""

import pandas as pd
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone

# Point to the canonical CSV in HyperMultiAssetedADL repo (via GitHub raw URL or local path)
# For local development, adjust this path to point to your HyperMultiAssetedADL clone
ROOT = Path(__file__).resolve().parents[2]
CANONICAL_CSV_URL = "https://raw.githubusercontent.com/ConejoCapital/HyperMultiAssetedADL/main/data/canonical/cash-only%20balances%20ADL%20event%20orderbook%202025-10-10/adl_detailed_analysis_REALTIME.csv"
OUTPUT_DIR = ROOT / "public" / "data"
OUTPUT_JSON_PATH = OUTPUT_DIR / "adl_flow_data.json"

# Allow local override for development
LOCAL_CSV_PATH = ROOT.parent / "HyperMultiAssetedADL" / "data" / "canonical" / "cash-only balances ADL event orderbook 2025-10-10" / "adl_detailed_analysis_REALTIME.csv"

def export_flow_data():
    print("="*80)
    print("Exporting ADL Flow Data for Visualization")
    print("="*80)

    # Try local path first, then download from GitHub
    if LOCAL_CSV_PATH.exists():
        print(f"\nLoading from local: {LOCAL_CSV_PATH}")
        df = pd.read_csv(LOCAL_CSV_PATH)
    else:
        print(f"\nDownloading from GitHub: {CANONICAL_CSV_URL}")
        import urllib.request
        df = pd.read_csv(CANONICAL_CSV_URL)
    print(f"Loaded {len(df):,} ADL events")

    # Aggregate asset-to-asset flows
    asset_flows = defaultdict(lambda: defaultdict(float))
    asset_totals = defaultdict(float)
    
    # Track liquidations vs ADL by asset
    # Liquidated = accounts losing capital (the trigger)
    # ADL'd = long positions being closed (the result)
    liquidated_by_asset = defaultdict(float)  # Notional lost by liquidated accounts per asset
    adld_by_asset = defaultdict(float)  # Notional ADL'd per asset (long positions closed)
    
    # Aggregate account flows
    account_flows = defaultdict(lambda: defaultdict(float))
    account_totals_in = defaultdict(float)  # ADL counterparties (receiving)
    account_totals_out = defaultdict(float)  # Liquidated accounts (sending)
    
    # Time buckets (1-second intervals) - track both liquidations and ADL
    time_buckets = defaultdict(lambda: {
        'assetFlows': defaultdict(lambda: defaultdict(float)),
        'accountFlows': defaultdict(lambda: defaultdict(float)),
        'liquidatedByAsset': defaultdict(float),  # New: liquidated notional per asset
        'adldByAsset': defaultdict(float),  # New: ADL'd notional per asset
        'cumulativeNotional': 0.0,
        'cumulativeLiquidated': 0.0,  # New: cumulative liquidated
        'cumulativeAdld': 0.0,  # New: cumulative ADL'd
        'eventCount': 0
    })
    
    min_timestamp = float('inf')
    max_timestamp = float('-inf')
    
    for _, row in df.iterrows():
        timestamp_ms = int(row['time'])
        min_timestamp = min(min_timestamp, timestamp_ms)
        max_timestamp = max(max_timestamp, timestamp_ms)
        
        liquidated_user = str(row['liquidated_user'])
        target_user = str(row['user'])
        asset = str(row['coin'])
        notional = abs(float(row['adl_notional']))
        
        if notional <= 0 or pd.isna(notional):
            continue
        
        # Key insight: liquidated_user lost capital, target_user's long position got ADL'd
        # Track both sides of the flow
        liquidated_by_asset[asset] += notional  # Liquidated account lost this notional
        adld_by_asset[asset] += notional  # ADL counterparty's position was closed
        
        # Asset-to-asset flows (we track which assets are liquidated vs which receive ADL)
        # For now, we'll track liquidated asset -> target asset (same asset in most cases)
        # But we can also track cross-asset patterns if they exist
        asset_flows[asset][asset] += notional
        asset_totals[asset] += notional
        
        # Account flows
        account_flows[liquidated_user][target_user] += notional
        account_totals_out[liquidated_user] += notional
        account_totals_in[target_user] += notional
        
        # Time buckets (1-second granularity)
        time_bucket = int(timestamp_ms / 1000) * 1000  # Round to nearest second
        bucket_data = time_buckets[time_bucket]
        bucket_data['assetFlows'][asset][asset] += notional
        bucket_data['accountFlows'][liquidated_user][target_user] += notional
        bucket_data['liquidatedByAsset'][asset] += notional  # Track liquidated notional
        bucket_data['adldByAsset'][asset] += notional  # Track ADL'd notional
        bucket_data['cumulativeNotional'] += notional
        bucket_data['eventCount'] += 1
    
    # Convert asset flows to list format
    asset_flows_list = []
    for source, targets in asset_flows.items():
        for target, notional in targets.items():
            if notional > 0:
                asset_flows_list.append({
                    'source': source,
                    'target': target,
                    'notional': notional,
                    'count': sum(1 for _, row in df.iterrows() 
                                if str(row['coin']) == source and abs(float(row.get('adl_notional', 0))) > 0)
                })
    
    # Get top accounts
    top_liquidated = sorted(account_totals_out.items(), key=lambda x: x[1], reverse=True)[:50]
    top_counterparties = sorted(account_totals_in.items(), key=lambda x: x[1], reverse=True)[:50]
    
    # Convert account flows to list format (top accounts only)
    top_accounts_set = set([acc[0] for acc in top_liquidated + top_counterparties])
    account_flows_list = []
    for source, targets in account_flows.items():
        if source not in top_accounts_set:
            continue
        for target, notional in targets.items():
            if target not in top_accounts_set:
                continue
            if notional > 0:
                account_flows_list.append({
                    'source': source,
                    'target': target,
                    'notional': notional
                })
    
    # Convert time buckets to sorted list
    time_buckets_list = []
    cumulative = 0.0
    cumulative_liquidated = 0.0
    cumulative_adld = 0.0
    for time_ms in sorted(time_buckets.keys()):
        bucket = time_buckets[time_ms]
        cumulative += bucket['cumulativeNotional']
        cumulative_liquidated += sum(bucket['liquidatedByAsset'].values())
        cumulative_adld += sum(bucket['adldByAsset'].values())
        bucket_data = {
            'time': time_ms,
            'timeISO': datetime.fromtimestamp(time_ms / 1000, tz=timezone.utc).isoformat().replace('+00:00', 'Z'),
            'cumulativeNotional': cumulative,
            'cumulativeLiquidated': cumulative_liquidated,
            'cumulativeAdld': cumulative_adld,
            'notionalInBucket': bucket['cumulativeNotional'],
            'eventCount': bucket['eventCount'],
            'liquidatedByAsset': dict(bucket['liquidatedByAsset']),  # Notional lost per asset
            'adldByAsset': dict(bucket['adldByAsset']),  # Notional ADL'd per asset
            'assetFlows': [
                {
                    'source': source,
                    'target': target,
                    'notional': notional
                }
                for source, targets in bucket['assetFlows'].items()
                for target, notional in targets.items()
                if notional > 0
            ]
        }
        time_buckets_list.append(bucket_data)
    
    # Calculate statistics
    total_notional = sum(asset_totals.values())
    unique_assets = len(asset_totals)
    unique_accounts = len(set(account_totals_in.keys()) | set(account_totals_out.keys()))
    
    # Asset statistics
    asset_stats = [
        {
            'asset': asset,
            'totalNotional': total,
            'eventCount': sum(1 for _, row in df.iterrows() if str(row['coin']) == asset)
        }
        for asset, total in sorted(asset_totals.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # Asset-level statistics for liquidations vs ADL
    asset_liquidation_stats = [
        {
            'asset': asset,
            'liquidatedNotional': liquidated_by_asset[asset],
            'adldNotional': adld_by_asset[asset],
            'totalNotional': liquidated_by_asset[asset] + adld_by_asset[asset]
        }
        for asset in set(list(liquidated_by_asset.keys()) + list(adld_by_asset.keys()))
    ]
    asset_liquidation_stats.sort(key=lambda x: x['totalNotional'], reverse=True)
    
    output_data = {
        'metadata': {
            'eventCount': len(df),
            'timeRange': {
                'start': int(min_timestamp),
                'end': int(max_timestamp),
                'durationMinutes': (max_timestamp - min_timestamp) / (60 * 1000)
            },
            'totalNotionalUsd': total_notional,
            'totalLiquidatedNotional': sum(liquidated_by_asset.values()),
            'totalAdldNotional': sum(adld_by_asset.values()),
            'uniqueAssets': unique_assets,
            'uniqueAccounts': unique_accounts
        },
        'assetFlows': asset_flows_list,
        'assetStats': asset_stats,
        'assetLiquidationStats': asset_liquidation_stats,  # New: liquidation vs ADL by asset
        'accountFlows': account_flows_list,
        'topAccounts': {
            'liquidated': [
                {'account': acc, 'totalNotional': total}
                for acc, total in top_liquidated
            ],
            'counterparties': [
                {'account': acc, 'totalNotional': total}
                for acc, total in top_counterparties
            ]
        },
        'timeBuckets': time_buckets_list
    }
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON_PATH, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\n✅ Saved flow data to: {OUTPUT_JSON_PATH}")
    print(f"   File size: {OUTPUT_JSON_PATH.stat().st_size / (1024*1024):.2f} MB")
    
    print("\nStatistics:")
    print(f"  Asset flows: {len(asset_flows_list)}")
    print(f"  Account flows (top 50): {len(account_flows_list)}")
    print(f"  Time buckets: {len(time_buckets_list)}")
    print(f"  Total notional: ${total_notional:,.0f}")
    print(f"  Unique assets: {unique_assets}")
    print(f"  Unique accounts: {unique_accounts}")

if __name__ == "__main__":
    export_flow_data()

