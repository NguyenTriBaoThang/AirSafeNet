from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

APP_DIR = BASE_DIR / "app"
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

MODEL_PATH = MODELS_DIR / "airsafenet_best_model.pkl"
FEATURE_COLS_PATH = MODELS_DIR / "feature_cols.json"
METADATA_PATH = MODELS_DIR / "model_metadata.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

LAT = 10.8231
LON = 106.6297
TIMEZONE = "Asia/Bangkok"

HISTORY_HOURS = 72
FORECAST_HOURS = 24