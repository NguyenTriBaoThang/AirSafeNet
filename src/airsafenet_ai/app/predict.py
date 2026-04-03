import joblib
from app.config import MODEL_PATH
from app.aqi import pm25_to_aqi, get_risk_level, get_recommendation
from app.features import build_input_vector

# Load model khi start server
model = joblib.load(MODEL_PATH)


def predict_pm25(input_dict: dict):
    vector = build_input_vector(input_dict)
    pred = model.predict([vector])[0]
    return float(pred)


def predict_full(input_dict: dict, user_group="normal"):
    pm25 = predict_pm25(input_dict)

    aqi = pm25_to_aqi(pm25)
    risk = get_risk_level(aqi, user_group)
    reco = get_recommendation(risk)

    return {
        "pm25": round(pm25, 2),
        "aqi": aqi,
        "risk": risk,
        "recommendation": reco,
    }