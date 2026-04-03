from fastapi import FastAPI
from pydantic import BaseModel

from app.predict import predict_full

app = FastAPI(
    title="AirSafeNet AI Server",
    description="PM2.5 Prediction + AQI + Risk + Recommendation",
    version="1.0.0"
)


# ===== INPUT MODEL =====
class PredictRequest(BaseModel):
    data: dict
    user_group: str = "normal"


# ===== ROOT =====
@app.get("/")
def root():
    return {"message": "AirSafeNet AI Server running"}


# ===== HEALTH =====
@app.get("/health")
def health():
    return {"status": "OK"}


# ===== PREDICT =====
@app.post("/predict")
def predict(req: PredictRequest):
    result = predict_full(req.data, req.user_group)
    return result