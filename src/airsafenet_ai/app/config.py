from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

MODEL_PATH = MODELS_DIR / "airsafenet_best_model.pkl"
FEATURE_COLS_PATH = MODELS_DIR / "feature_cols.json"
METADATA_PATH = MODELS_DIR / "model_metadata.json"

LAT = 10.8231
LON = 106.6297
TIMEZONE = "Asia/Bangkok"

HISTORY_HOURS = 72
DEFAULT_FORECAST_DAYS = 1