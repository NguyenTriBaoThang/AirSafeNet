from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

MODEL_PATH = BASE_DIR / "models" / "airsafenet_best_model.pkl"
FEATURE_COLS_PATH = BASE_DIR / "models" / "feature_cols.json"