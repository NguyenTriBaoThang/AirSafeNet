import { useEffect, useRef, useState } from "react";

type XaiFactor = {
  feature:     string;
  label:       string;
  delta:       number;
  direction:   string;
  explanation: string;
  importance:  number;
};

type AnomalyXai = {
  summary:     string;
  confidence:  number;
  top_factors: XaiFactor[];
};

type Anomaly = {
  detected:       boolean;
  spike_pm25:     number;
  from_pm25:      number;
  to_pm25:        number;
  spike_time:     string;
  severity:       "critical" | "warning";
  aqi_after:      number;
  risk_after:     string;
  recommendation: string;
  xai:            AnomalyXai;
  created_at:     string;
};

type ApiResponse = {
  has_anomaly: boolean;
  anomaly:     Anomaly | null;
  threshold:   number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const POLL_INTERVAL_MS = 5 * 60 * 1000;

function riskColor(risk: string): string {
  return risk === "GOOD"                ? "#16a34a"
       : risk === "MODERATE"            ? "#ca8a04"
       : risk === "UNHEALTHY_SENSITIVE" ? "#ea580c"
       : risk === "UNHEALTHY"           ? "#dc2626"
       : risk === "VERY_UNHEALTHY"      ? "#7c3aed"
       : "#7f1d1d";
}

function timeAgo(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)   return `${Math.round(diff)}s trước`;
    if (diff < 3600) return `${Math.round(diff / 60)} phút trước`;
    return `${Math.round(diff / 3600)} giờ trước`;
  } catch { return ""; }
}

function directionIcon(direction: string): string {
  return direction === "tăng" ? "↑" : "↓";
}

export default function AnomalyBanner() {
  const [anomaly,   setAnomaly]   = useState<Anomaly | null>(null);
  const [expanded,  setExpanded]  = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null); 
  const [loading,   setLoading]   = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchAnomaly() {
      try {
        const token = localStorage.getItem("airsafenet_token");
        const res   = await fetch(`${API_BASE}/api/anomaly/latest`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data: ApiResponse = await res.json();
        if (data.has_anomaly && data.anomaly) {
          setAnomaly(data.anomaly);
        } else {
          setAnomaly(null);
        }
      } catch {
        // Lỗi fetch → không hiển thị gì, không làm gián đoạn dashboard
      } finally {
        setLoading(false);
      }
    }

    fetchAnomaly();
    pollRef.current = setInterval(fetchAnomaly, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (loading || !anomaly) return null;
  if (dismissed === anomaly.created_at) return null;

  const color      = riskColor(anomaly.risk_after);
  const isCritical = anomaly.severity === "critical";

  return (
    <div
      className={`anomaly-banner anomaly-banner--${anomaly.severity}`}
      role="alert"
    >
      <div className="anomaly-banner__header">
        <div className="anomaly-banner__left">
          <span className="anomaly-banner__pulse-dot" style={{ background: color }} />
          <div>
            <div className="anomaly-banner__eyebrow">
              {isCritical ? "🚨 PHÁT HIỆN BẤT THƯỜNG" : "⚠️ CẢNH BÁO"} ·{" "}
              <span style={{ color }}>Anomaly Detection AI</span>
            </div>
            <div className="anomaly-banner__title">
              PM2.5 tăng đột biến{" "}
              <strong style={{ color }}>+{anomaly.spike_pm25} µg/m³</strong>
              {" "}trong 1 giờ
              <span className="anomaly-banner__time">
                · {timeAgo(anomaly.spike_time)}
              </span>
            </div>
          </div>
        </div>

        <div className="anomaly-banner__right">
          <div className="anomaly-banner__aqi-chip" style={{ background: color + "20", borderColor: color + "50", color }}>
            AQI {anomaly.aqi_after}
          </div>
          <button
            className="anomaly-banner__expand-btn"
            onClick={() => setExpanded(v => !v)}
            type="button"
            aria-label={expanded ? "Thu gọn" : "Xem chi tiết"}
          >
            {expanded ? "▲ Thu gọn" : "▼ Xem XAI"}
          </button>
          <button
            className="anomaly-banner__dismiss"
            onClick={() => setDismissed(anomaly.created_at)}
            type="button"
            aria-label="Đóng"
          >✕</button>
        </div>
      </div>

      <div className="anomaly-banner__journey">
        <span className="anomaly-banner__journey-from">{anomaly.from_pm25} µg/m³</span>
        <span className="anomaly-banner__journey-arrow">
          {"→".repeat(3)} <span style={{ color }}>+{anomaly.spike_pm25}</span> {"→".repeat(3)}
        </span>
        <span className="anomaly-banner__journey-to" style={{ color }}>
          {anomaly.to_pm25} µg/m³
        </span>
      </div>

      {expanded && (
        <div className="anomaly-banner__xai">
          <div className="anomaly-banner__xai-summary">
            <span className="anomaly-banner__xai-icon">🔍</span>
            <span>{anomaly.xai.summary}</span>
            {anomaly.xai.confidence > 0 && (
              <span className="anomaly-banner__confidence">
                Tin cậy: {anomaly.xai.confidence}%
              </span>
            )}
          </div>

          {anomaly.xai.top_factors.length > 0 && (
            <div className="anomaly-banner__factors">
              {anomaly.xai.top_factors.map((f, i) => (
                <div key={i} className="anomaly-factor">
                  <div className="anomaly-factor__rank">#{i + 1}</div>
                  <div className="anomaly-factor__body">
                    <div className="anomaly-factor__top">
                      <span className="anomaly-factor__label">{f.label}</span>
                      <span
                        className="anomaly-factor__delta"
                        style={{ color: f.direction === "tăng" ? "#ef4444" : "#16a34a" }}
                      >
                        {directionIcon(f.direction)} {Math.abs(f.delta).toFixed(2)}
                      </span>
                    </div>
                    <p className="anomaly-factor__explain">{f.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="anomaly-banner__recommendation">
            <span>💡</span>
            <span>{anomaly.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}