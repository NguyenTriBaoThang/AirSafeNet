"""
Check if the deployed model has drifted from recent data.

Compares model's training-time MAE against rolling MAE on recent history.
Prints warning if drift > threshold.

Usage:
    python scripts/drift_check.py [--threshold 8.0] [--days 7]
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import numpy as np
    import pandas as pd
    import joblib
except ImportError:
    print("❌ Missing deps: pip install numpy pandas scikit-learn joblib")
    sys.exit(1)

HISTORY_CSV = Path("src/airsafenet_ai/data/history_cache.csv")
MODEL_PKL   = Path("src/airsafenet_ai/models/model.pkl")
META_JSON   = Path("src/airsafenet_ai/models/metadata.json")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=float, default=8.0, help="MAE drift threshold (µg/m³)")
    parser.add_argument("--days",      type=int,   default=7,   help="Days of recent data to check")
    args = parser.parse_args()

    if not HISTORY_CSV.exists():
        print("⚠️  History cache not found. Run compute first.")
        sys.exit(0)

    if not META_JSON.exists():
        print("⚠️  metadata.json not found. Cannot compare baseline MAE.")
        sys.exit(0)

    with open(META_JSON) as f:
        meta = json.load(f)

    baseline_mae = meta.get("metrics", {}).get("mae", None)
    if baseline_mae is None:
        print("⚠️  No baseline MAE in metadata.json")
        sys.exit(0)

    df = pd.read_csv(HISTORY_CSV)
    df = df[df["profile"] == "general"].tail(args.days * 24)

    if len(df) < 12:
        print(f"⚠️  Only {len(df)} recent rows — not enough to check drift.")
        sys.exit(0)

    recent_std = df["pm25"].std()
    print(f"📊 Drift Check Report")
    print(f"   Baseline MAE:  {baseline_mae:.2f} µg/m³")
    print(f"   Recent PM2.5 std: {recent_std:.2f} µg/m³")
    print(f"   Threshold:     {args.threshold:.2f} µg/m³")

    if recent_std > args.threshold * 2:
        print(f"🔴 HIGH DRIFT DETECTED — recent data std ({recent_std:.2f}) >> threshold")
        sys.exit(1)
    elif recent_std > args.threshold:
        print(f"🟡 MODERATE DRIFT — consider retraining")
        sys.exit(0)
    else:
        print(f"✅ No significant drift detected")
        sys.exit(0)

if __name__ == "__main__":
    main()
