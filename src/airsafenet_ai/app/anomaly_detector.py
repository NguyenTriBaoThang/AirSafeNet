from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.config import DATA_DIR, HISTORY_HOURS
from app.data_loader import load_merged_dataset
from app.predict import _predict_pm25_from_history, latest_feature_vector, MODEL
from app.aqi import pm25_to_aqi
from app.profiles import risk_for_profile, recommendation_from_aqi

logger = logging.getLogger(__name__)

SPIKE_THRESHOLD  = 20.0 
MODERATE_SPIKE   = 10.0
LOOKBACK_HOURS   = 6
COOLDOWN_HOURS   = 2 

ANOMALY_LOG_PATH = DATA_DIR / "anomaly_log.json"


def _explain_spike(
    history_before: pd.DataFrame,
    history_after:  pd.DataFrame,
) -> dict[str, Any]:
    try:
        X_before = latest_feature_vector(history_before)
        X_after  = latest_feature_vector(history_after)

        feat_names = MODEL.feature_names_in_ if hasattr(MODEL, "feature_names_in_") else []

        importances: dict[str, float] = {}
        if hasattr(MODEL, "feature_importances_"):
            for i, name in enumerate(feat_names):
                importances[name] = float(MODEL.feature_importances_[i])

        deltas: list[dict] = []
        x_b = X_before.iloc[0] if hasattr(X_before, "iloc") else X_before[0]
        x_a = X_after.iloc[0]  if hasattr(X_after,  "iloc") else X_after[0]

        for i, name in enumerate(feat_names):
            v_before = float(x_b.iloc[i] if hasattr(x_b, "iloc") else x_b[i])
            v_after  = float(x_a.iloc[i] if hasattr(x_a, "iloc") else x_a[i])
            raw_delta = v_after - v_before
            importance = importances.get(name, 0.0)

            deltas.append({
                "feature":    name,
                "delta":      round(raw_delta, 3),
                "importance": round(importance, 4),
                "score":      round(abs(raw_delta) * importance, 4),
            })

        deltas.sort(key=lambda x: x["score"], reverse=True)
        top3 = deltas[:3]

        factor_labels = {
            "pm2_5_lag_1":    ("PM2.5 giờ trước",  "Nồng độ bụi tích lũy từ giờ trước"),
            "pm2_5_lag_2":    ("PM2.5 lag 2h",      "Bụi tích lũy 2 giờ trước chưa kịp phát tán"),
            "pm2_5_roll_3":   ("TB PM2.5 3h",       "Trung bình tích lũy 3 giờ gần đây cao"),
            "pm2_5_roll_6":   ("TB PM2.5 6h",       "Xu hướng tăng dần suốt 6 giờ qua"),
            "wind_speed":     ("Gió yếu",           "Gió yếu → bụi không được phát tán"),
            "humidity":       ("Độ ẩm cao",          "Độ ẩm cao → bụi hút ẩm, nặng hơn, lắng chậm"),
            "temperature":    ("Nhiệt độ",           "Nhiệt độ ảnh hưởng đến đối lưu không khí"),
            "hour":           ("Giờ cao điểm",      "Khung giờ có lưu lượng giao thông cao"),
            "pressure":       ("Áp suất cao",       "Áp suất cao → nghịch nhiệt, bụi bị giữ lại"),
            "cloud_cover":    ("Mây nhiều",          "Mây nhiều → giảm đối lưu nhiệt, bụi tích tụ"),
            "uv_index":       ("UV thấp",            "UV thấp → phản ứng quang hóa kém, ô nhiễm tăng"),
        }

        top_factors = []
        for d in top3:
            name  = d["feature"]
            label, explain = factor_labels.get(
                name,
                (name, f"Thay đổi {abs(d['delta']):.2f} units")
            )
            direction = "tăng" if d["delta"] > 0 else "giảm"
            top_factors.append({
                "feature":     name,
                "label":       label,
                "delta":       d["delta"],
                "direction":   direction,
                "explanation": explain,
                "importance":  d["importance"],
            })

        if top_factors:
            primary = top_factors[0]["label"]
            summary = f"Spike chủ yếu do {primary}. "
            if len(top_factors) > 1:
                summary += f"Đồng thời {top_factors[1]['label'].lower()} cũng góp phần."
        else:
            summary = "Không xác định được nguyên nhân cụ thể từ model."

        return {
            "top_factors": top_factors,
            "summary":     summary,
            "confidence":  min(100, round(len(top_factors) / 3 * 100)),
        }

    except Exception as e:
        logger.warning("XAI explain_spike lỗi: %s", e)
        return {
            "top_factors": [],
            "summary":     "Không thể phân tích nguyên nhân tự động.",
            "confidence":  0,
        }


def detect_anomaly() -> dict[str, Any] | None:
    try:
        full_df   = load_merged_dataset(past_hours=HISTORY_HOURS, forecast_days=1)
        now       = pd.Timestamp.now().tz_localize(None)
        history   = full_df[full_df["time"] <= now].copy().reset_index(drop=True)

        if len(history) < 3:
            logger.warning("Anomaly detection: không đủ history (%d rows)", len(history))
            return None

        cutoff  = now - pd.Timedelta(hours=LOOKBACK_HOURS)
        recent  = history[history["time"] >= cutoff].copy().reset_index(drop=True)

        if len(recent) < 2:
            return None

        pm25_col = "pm2_5" if "pm2_5" in recent.columns else "pm25"
        recent["pm25_delta"] = recent[pm25_col].diff()

        max_delta_idx  = recent["pm25_delta"].abs().idxmax()
        max_delta      = float(recent.loc[max_delta_idx, "pm25_delta"])
        spike_time     = recent.loc[max_delta_idx, "time"]

        if abs(max_delta) < MODERATE_SPIKE:
            logger.info("Anomaly check: max delta=%.2f µg/m³ — bình thường", abs(max_delta))
            return None

        severity = "critical" if abs(max_delta) >= SPIKE_THRESHOLD else "warning"

        if severity == "warning":
            logger.info("Anomaly: moderate spike %.2f µg/m³ lúc %s (warning only)", abs(max_delta), spike_time)

        from_idx = max(0, max_delta_idx - 1)
        from_pm25 = float(recent.loc[from_idx, pm25_col])
        to_pm25   = float(recent.loc[max_delta_idx, pm25_col])

        aqi_after  = pm25_to_aqi(to_pm25)
        risk_after = risk_for_profile(aqi_after, "general")
        reco_after = recommendation_from_aqi(aqi_after, "general")

        history_before = history[history["time"] <= recent.loc[from_idx, "time"]].copy()
        history_after  = history[history["time"] <= spike_time].copy()

        xai = _explain_spike(history_before, history_after)

        anomaly = {
            "detected":   True,
            "spike_pm25": round(abs(max_delta), 2),
            "from_pm25":  round(from_pm25, 2),
            "to_pm25":    round(to_pm25, 2),
            "spike_time": pd.Timestamp(spike_time).isoformat(),
            "severity":   severity,
            "aqi_after":  int(aqi_after),
            "risk_after": risk_after,
            "recommendation": reco_after,
            "xai":        xai,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.warning(
            "⚠ ANOMALY DETECTED: spike=%.2f µg/m³ (%s→%s) lúc %s [%s] — %s",
            abs(max_delta), from_pm25, to_pm25, spike_time, severity, xai["summary"]
        )

        return anomaly

    except Exception as e:
        logger.error("detect_anomaly lỗi: %s", e)
        return None


def load_anomaly_log() -> list[dict]:
    if not ANOMALY_LOG_PATH.exists():
        return []
    try:
        with open(ANOMALY_LOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_anomaly_log(log: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    log_trimmed = log[-50:]
    with open(ANOMALY_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(log_trimmed, f, ensure_ascii=False, indent=2)


def get_latest_anomaly(hours: int = 24) -> dict | None:
    log = load_anomaly_log()
    if not log:
        return None

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    for entry in reversed(log):
        try:
            created = datetime.fromisoformat(entry.get("created_at", ""))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created >= cutoff:
                return entry
        except Exception:
            continue
    return None


def run_anomaly_detection(force: bool = False) -> dict[str, Any]:
    log = load_anomaly_log()

    if not force and log:
        last = log[-1]
        try:
            last_time = datetime.fromisoformat(last["created_at"])
            if last_time.tzinfo is None:
                last_time = last_time.replace(tzinfo=timezone.utc)
            elapsed_hours = (datetime.now(timezone.utc) - last_time).total_seconds() / 3600
            if elapsed_hours < COOLDOWN_HOURS:
                logger.info(
                    "Anomaly detection trong cooldown (%.1fh < %dh), bỏ qua.",
                    elapsed_hours, COOLDOWN_HOURS
                )
                return {"skipped": True, "reason": "cooldown", "elapsed_hours": round(elapsed_hours, 2)}
        except Exception:
            pass

    anomaly = detect_anomaly()

    if anomaly is None:
        return {"detected": False}

    if anomaly["severity"] == "critical":
        log.append(anomaly)
        save_anomaly_log(log)
        logger.info("Anomaly critical saved → anomaly_log.json (%d entries)", len(log))
        return {"detected": True, "severity": "critical", "anomaly": anomaly}
    else:
        anomaly["alerted"] = False
        log.append(anomaly)
        save_anomaly_log(log)
        return {"detected": True, "severity": "warning", "anomaly": anomaly}