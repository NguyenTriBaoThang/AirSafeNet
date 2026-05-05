import joblib
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = Path("models/airsafenet_best_model.pkl")

if MODEL_PATH.exists():
    print(f"✅ Model already exists at {MODEL_PATH}")
else:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    dummy = RandomForestRegressor(n_estimators=2, max_depth=2, random_state=42)
    dummy.fit(np.zeros((10, 5)), np.zeros(10))
    joblib.dump(dummy, MODEL_PATH)
    print(f"✅ Dummy model created at {MODEL_PATH}")