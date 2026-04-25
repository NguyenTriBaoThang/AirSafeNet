import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";

export type EnsembleMeta = {
  method:           "weighted_average" | "main_only";
  main_pm25:        number;
  arima_pm25:       number | null;
  xgb_pm25:         number | null;
  weights:          { main: number; arima: number; xgb: number };
  confidence:       number;          // 0-100
  uncertainty_band: number;          // ± µg/m³
  agreement:        "high" | "medium" | "low" | "unknown";
  model_std:        number;
  arima_available:  boolean;
  xgb_available:    boolean;
};

function confColor(c: number) {
  return c >= 85 ? "#16a34a" : c >= 65 ? "#ca8a04" : "#ea580c";
}

function agreeLabel(a: string) {
  return a === "high"   ? "3 model đồng thuận cao"
       : a === "medium" ? "Tương đối đồng thuận"
       : a === "low"    ? "Phân kỳ — dự báo có thể dao động"
       : "Chỉ dùng model chính";
}

function agreeIcon(a: string) {
  return a === "high" ? "✓" : a === "medium" ? "◑" : a === "low" ? "⚠" : "·";
}

function ModelPill({
  label, value, color, unavailable,
}: {
  label: string; value: number | null; color: string; unavailable?: boolean;
}) {
  return (
    <div className={`ens-pill ${unavailable ? "ens-pill--off" : ""}`}>
      <span className="ens-pill__label">{label}</span>
      <strong style={{ color: unavailable ? "#475569" : color }}>
        {value != null ? `${value.toFixed(1)}` : "—"}
      </strong>
      <span className="ens-pill__unit">µg/m³</span>
    </div>
  );
}

function WeightBar({
  name, weight, color,
}: {
  name: string; weight: number; color: string;
}) {
  return (
    <div className="ens-wbar">
      <span className="ens-wbar__name">{name}</span>
      <div className="ens-wbar__track">
        <div
          className="ens-wbar__fill"
          style={{ width: `${(weight * 100).toFixed(0)}%`, background: color }}
        />
      </div>
      <span className="ens-wbar__pct">{(weight * 100).toFixed(1)}%</span>
    </div>
  );
}

type Props = {
  ensemble?: EnsembleMeta;
};

export default function EnsembleBadge({ ensemble: prop }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [fetched,  setFetched]  = useState<EnsembleMeta | null>(null);

  const display = prop ?? fetched;

  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetchRef.current = function doFetch() {
      if (prop) return;
      const token = localStorage.getItem("airsafenet_token");
      if (!token) return;
      fetch(`${API_BASE}/api/air/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then((d: { ensemble?: EnsembleMeta } | null) => {
          if (d?.ensemble) setFetched(d.ensemble); 
        })
        .catch(() => {/* silent */});
    };

    fetchRef.current(); 
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!display) return null;

  if (display.method === "main_only") {
    return (
      <div className="ens-fallback-badge">
        <span>⚙</span>
        <span>Dự báo từ model chính · Ensemble chưa khởi tạo</span>
        <span className="ens-fallback-badge__hint">
          Cài statsmodels + xgboost để kích hoạt
        </span>
      </div>
    );
  }

  const color = confColor(display.confidence);

  return (
    <div className="ens-card">

      <div className="ens-card__header">
        <div className="ens-card__left">
          <span className="ens-card__icon">🤖</span>
          <div>
            <div className="ens-card__title">
              Ensemble Model
              <span className="ens-card__models-tag">
                {[
                  "Main",
                  display.arima_available && "ARIMA",
                  display.xgb_available   && "XGBoost",
                ].filter(Boolean).join(" + ")}
              </span>
            </div>
            <div className="ens-card__agree" style={{ color }}>
              {agreeIcon(display.agreement)}&ensp;{agreeLabel(display.agreement)}
            </div>
          </div>
        </div>

        <div className="ens-conf-wrap">
          <div className="ens-conf-ring">
            <svg viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22"
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
              <circle cx="28" cy="28" r="22"
                fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${(display.confidence / 100) * 138.2} 138.2`}
                transform="rotate(-90 28 28)"
              />
            </svg>
            <div className="ens-conf-ring__inner">
              <strong style={{ color }}>{Math.round(display.confidence)}</strong>
              <span>%</span>
            </div>
          </div>
          <span className="ens-conf-label" style={{ color }}>Tin cậy</span>
        </div>
      </div>

      <div className="ens-pills">
        <ModelPill label="Main"  value={display.main_pm25}  color="#3b82f6" />
        <ModelPill label="ARIMA" value={display.arima_pm25} color="#8b5cf6"
          unavailable={!display.arima_available} />
        <ModelPill label="XGB"   value={display.xgb_pm25}   color="#06b6d4"
          unavailable={!display.xgb_available} />
        <div className="ens-pill ens-pill--band">
          <span className="ens-pill__label">Sai số</span>
          <strong style={{ color }}>±{display.uncertainty_band.toFixed(1)}</strong>
          <span className="ens-pill__unit">µg/m³</span>
        </div>
      </div>

      <button
        className="ens-toggle-btn"
        onClick={() => setExpanded(v => !v)}
        type="button"
      >
        {expanded ? "▲" : "▼"} {expanded ? "Ẩn" : "Xem"} weights động
      </button>

      {expanded && (
        <div className="ens-weights">
          <div className="ens-weights__title">
            Weights tự động (inverse-MAE so với 6h gần nhất):
          </div>
          <WeightBar name="Main"  weight={display.weights.main}  color="#3b82f6" />
          <WeightBar name="ARIMA" weight={display.weights.arima} color="#8b5cf6" />
          <WeightBar name="XGB"   weight={display.weights.xgb}   color="#06b6d4" />
          <p className="ens-weights__note">
            Model có sai số thấp hơn trong 6h qua được tăng weight.
            Main model có sàn tối thiểu 30%.
            {!display.arima_available && " ARIMA: chưa cài statsmodels."}
            {!display.xgb_available   && " XGB: chưa cài xgboost."}
          </p>
        </div>
      )}
    </div>
  );
}