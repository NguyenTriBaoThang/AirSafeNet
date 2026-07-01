import { useEffect, useMemo, useState } from "react";
import { getCurrentAirApi } from "../../api/air";
import { useAiExplain } from "../../hooks/useAiExplain";
import type {
  AirEnsembleMeta,
  AirPredictResponse,
  AiExplainResponse,
} from "../../types/air";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type XaiFactor = {
  feature: string;
  label: string;
  delta: number;
  direction: string;
  explanation: string;
  importance: number;
};

type Anomaly = {
  spike_pm25: number;
  from_pm25: number;
  to_pm25: number;
  spike_time: string;
  severity: "critical" | "warning";
  aqi_after: number;
  risk_after: string;
  recommendation: string;
  xai?: {
    summary?: string;
    confidence?: number;
    top_factors?: XaiFactor[];
  };
  created_at: string;
};

type AnomalyResponse = {
  has_anomaly: boolean;
  anomaly: Anomaly | null;
  threshold: number;
};

type AlertCause = "forecast" | "real-time spike" | "fallback cache";

type Factor = {
  key: string;
  icon: string;
  label: string;
  value: string;
  impact: number;
  explain: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";

function fmtDate(value?: string | null): string {
  if (!value) return "Chưa có";
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "Không rõ";
  return time.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function minutesAgo(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / 60000));
}

function freshnessLabel(minutes: number | null): {
  label: string;
  tone: "good" | "watch" | "stale";
} {
  if (minutes == null) return { label: "Không rõ tuổi dữ liệu", tone: "stale" };
  if (minutes <= 20) return { label: `${minutes} phút trước`, tone: "good" };
  if (minutes <= 90) return { label: `${minutes} phút trước`, tone: "watch" };
  return { label: `${Math.round(minutes / 60)} giờ trước`, tone: "stale" };
}

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "#22c55e";
  if (confidence >= 70) return "#eab308";
  if (confidence >= 55) return "#f97316";
  return "#ef4444";
}

function agreementLabel(agreement?: string): string {
  if (agreement === "high") return "Đồng thuận cao";
  if (agreement === "medium") return "Đồng thuận vừa";
  if (agreement === "low") return "Model phân kỳ";
  if (agreement === "unknown") return "Không rõ đồng thuận";
  return "Chưa có ensemble";
}

function derivedConfidence(
  summary: DashboardSummaryResponse,
  explain: AiExplainResponse | null,
): number {
  if (!explain) return 62;
  const spreadPenalty = Math.min(22, Math.abs(summary.currentAqi - explain.predAqi) * 0.65);
  const factorMagnitude = Math.min(
    18,
    (
      Math.abs(explain.pm25HistoryImpact)
      + Math.abs(explain.windImpact)
      + Math.abs(explain.humidityImpact)
      + Math.abs(explain.temperatureImpact)
      + Math.abs(explain.uvImpact)
    ) * 5,
  );
  return Math.max(45, Math.round(88 - spreadPenalty - factorMagnitude));
}

function getAlertCause(
  anomaly: Anomaly | null,
  summary: DashboardSummaryResponse,
  explainError: string | null,
): {
  cause: AlertCause;
  label: string;
  detail: string;
} {
  if (anomaly) {
    return {
      cause: "real-time spike",
      label: "Real-time spike",
      detail: `PM2.5 biến động ${anomaly.spike_pm25.toFixed(1)} µg/m³, AQI sau spike ${anomaly.aqi_after}.`,
    };
  }

  if (explainError) {
    return {
      cause: "fallback cache",
      label: "Fallback cache",
      detail: "Không tải được explain/weather realtime; dashboard đang dựa vào dữ liệu cache gần nhất.",
    };
  }

  if (summary.warningCount > 0 || summary.dangerCount > 0) {
    return {
      cause: "forecast",
      label: "Forecast warning",
      detail: `${summary.warningCount} giờ cảnh báo, ${summary.dangerCount} giờ rủi ro cao trong forecast hiện tại.`,
    };
  }

  return {
    cause: "forecast",
    label: "Forecast",
    detail: "Không có spike realtime; cảnh báo hiện tại đến từ dự báo và ngưỡng rủi ro cá nhân.",
  };
}

function buildFactors(explain: AiExplainResponse | null, summary: DashboardSummaryResponse): Factor[] {
  if (!explain) {
    return [
      {
        key: "pm25",
        icon: "🌫",
        label: "PM2.5",
        value: `${summary.currentPm25.toFixed(1)} µg/m³`,
        impact: 0.58,
        explain: "Dùng PM2.5 hiện tại từ dashboard cache làm yếu tố chính.",
      },
      {
        key: "wind",
        icon: "💨",
        label: "Gió",
        value: "Chưa có",
        impact: -0.16,
        explain: "Không tải được dữ liệu gió realtime.",
      },
      {
        key: "humidity",
        icon: "💧",
        label: "Độ ẩm",
        value: "Chưa có",
        impact: 0.12,
        explain: "Không tải được độ ẩm realtime.",
      },
      {
        key: "uv",
        icon: "☀",
        label: "UV",
        value: "Chưa có",
        impact: 0.08,
        explain: "Không tải được UV realtime.",
      },
      {
        key: "temp",
        icon: "🌡",
        label: "Nhiệt độ",
        value: "Chưa có",
        impact: 0.1,
        explain: "Không tải được nhiệt độ realtime.",
      },
    ];
  }

  return [
    {
      key: "pm25",
      icon: "🌫",
      label: "PM2.5 lịch sử",
      value: `${explain.observedPm25.toFixed(1)} µg/m³`,
      impact: explain.pm25HistoryImpact,
      explain: explain.pm25HistoryExplain,
    },
    {
      key: "wind",
      icon: "💨",
      label: "Gió",
      value: `${explain.windSpeed.toFixed(1)} km/h`,
      impact: explain.windImpact,
      explain: explain.windExplain,
    },
    {
      key: "humidity",
      icon: "💧",
      label: "Độ ẩm",
      value: `${explain.humidity.toFixed(0)}%`,
      impact: explain.humidityImpact,
      explain: explain.humidityExplain,
    },
    {
      key: "uv",
      icon: "☀",
      label: "UV",
      value: explain.uvIndex.toFixed(1),
      impact: explain.uvImpact,
      explain: explain.uvExplain,
    },
    {
      key: "temp",
      icon: "🌡",
      label: "Nhiệt độ",
      value: `${explain.temperature.toFixed(1)}°C`,
      impact: explain.temperatureImpact,
      explain: explain.temperatureExplain,
    },
  ];
}

function factorBarWidth(impact: number): number {
  return Math.min(100, Math.max(10, Math.abs(impact) * 100));
}

function SourceChip({ label, value, tone = "neutral" }: {
  label: string;
  value: string;
  tone?: "good" | "watch" | "stale" | "neutral";
}) {
  return (
    <div className={`trust-source trust-source--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FactorRow({ factor }: { factor: Factor }) {
  const positive = factor.impact >= 0;
  return (
    <div className="trust-factor">
      <div className="trust-factor__head">
        <span className="trust-factor__icon">{factor.icon}</span>
        <div>
          <strong>{factor.label}</strong>
          <span>{factor.value}</span>
        </div>
        <em className={positive ? "trust-factor__impact--up" : "trust-factor__impact--down"}>
          {positive ? "+" : ""}{factor.impact.toFixed(2)}
        </em>
      </div>
      <div className="trust-factor__bar">
        <div
          className={positive ? "trust-factor__fill--up" : "trust-factor__fill--down"}
          style={{ width: `${factorBarWidth(factor.impact)}%` }}
        />
      </div>
      <p>{factor.explain}</p>
    </div>
  );
}

export default function TrustExplainabilityPanel({ summary, points }: Props) {
  const { data: explain, loading: explainLoading, error: explainError, refresh } = useAiExplain();
  const [current, setCurrent] = useState<AirPredictResponse | null>(null);
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrent() {
      try {
        setCurrentError(null);
        const result = await getCurrentAirApi();
        if (!cancelled) setCurrent(result);
      } catch (err) {
        if (!cancelled) {
          setCurrentError(err instanceof Error ? err.message : "Không tải được current AQI");
        }
      }
    }

    async function loadAnomaly() {
      try {
        const token = localStorage.getItem("airsafenet_token");
        const response = await fetch(`${API_BASE}/api/anomaly/latest`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const result = await response.json() as AnomalyResponse;
        if (!cancelled) setAnomaly(result.has_anomaly ? result.anomaly : null);
      } catch {
        if (!cancelled) setAnomaly(null);
      }
    }

    loadCurrent();
    loadAnomaly();
    return () => { cancelled = true; };
  }, []);

  const ensemble: AirEnsembleMeta | null = current?.ensemble ?? null;
  const modelConfidence = ensemble?.confidence ?? derivedConfidence(summary, explain);
  const confidenceSource = ensemble ? "Ensemble metadata" : "Ước tính từ explain/cache";
  const confidenceColorValue = confidenceColor(modelConfidence);
  const dashboardFreshness = freshnessLabel(minutesAgo(summary.generatedAt));
  const weatherFreshness = freshnessLabel(minutesAgo(explain?.weatherObservedAt));
  const alertCause = getAlertCause(anomaly, summary, explainError ?? currentError);
  const factors = useMemo(() => buildFactors(explain, summary), [explain, summary]);
  const topFactor = explain?.topFactor ?? factors[0]?.label ?? "PM2.5";
  const latestForecastTime = points[0]?.time ?? summary.generatedAt;

  return (
    <section className="trust-panel">
      <div className="trust-panel__header">
        <div>
          <div className="trust-panel__eyebrow">Trust & Explainability</div>
          <h3>Vì sao hệ thống đưa ra dự báo/cảnh báo này?</h3>
          <p>
            Panel này gom nguồn dữ liệu, độ mới, confidence mô hình và nguyên nhân cảnh báo để tránh cảm giác AI nói đại.
          </p>
        </div>
        <button className="trust-panel__refresh" type="button" onClick={refresh} disabled={explainLoading}>
          {explainLoading ? "Đang tải..." : "↺ Cập nhật explain"}
        </button>
      </div>

      <div className="trust-panel__summary">
        <div className="trust-confidence">
          <div className="trust-confidence__ring" style={{ "--trust-color": confidenceColorValue } as React.CSSProperties}>
            <strong>{Math.round(modelConfidence)}</strong>
            <span>%</span>
          </div>
          <div>
            <span>Model confidence</span>
            <strong style={{ color: confidenceColorValue }}>
              {agreementLabel(ensemble?.agreement)}
            </strong>
            <em>{confidenceSource}</em>
          </div>
        </div>

        <div className={`trust-cause trust-cause--${alertCause.cause.replaceAll(" ", "-")}`}>
          <span>Nguồn cảnh báo</span>
          <strong>{alertCause.label}</strong>
          <p>{alertCause.detail}</p>
        </div>
      </div>

      <div className="trust-sources">
        <SourceChip label="Dashboard cache" value={dashboardFreshness.label} tone={dashboardFreshness.tone} />
        <SourceChip label="Weather source" value={explain?.weatherSource ?? "Fallback cache"} tone={weatherFreshness.tone} />
        <SourceChip label="Weather observed" value={fmtDate(explain?.weatherObservedAt)} tone={weatherFreshness.tone} />
        <SourceChip label="Forecast point" value={fmtDate(latestForecastTime)} tone="neutral" />
      </div>

      <div className="trust-model-row">
        <div>
          <span>Model path</span>
          <strong>{ensemble?.method === "weighted_average" ? "Main + ARIMA + XGBoost" : "Main model / fallback"}</strong>
        </div>
        <div>
          <span>Uncertainty</span>
          <strong>{ensemble ? `±${ensemble.uncertainty_band.toFixed(1)} µg/m³` : "Chưa có metadata"}</strong>
        </div>
        <div>
          <span>Yếu tố chi phối</span>
          <strong>{topFactor}</strong>
        </div>
      </div>

      <div className="trust-factors-header">
        <strong>Yếu tố ảnh hưởng chính</strong>
        <span>+ làm tăng PM2.5/rủi ro, − làm giảm hoặc pha loãng ô nhiễm</span>
      </div>

      <div className="trust-factors">
        {factors.map((factor) => (
          <FactorRow key={factor.key} factor={factor} />
        ))}
      </div>

      {anomaly?.xai?.top_factors && anomaly.xai.top_factors.length > 0 && (
        <div className="trust-anomaly-xai">
          <div>
            <strong>Spike XAI</strong>
            <span>{anomaly.xai.summary ?? "Có bất thường trong dữ liệu gần đây."}</span>
          </div>
          <div className="trust-anomaly-xai__items">
            {anomaly.xai.top_factors.slice(0, 3).map((factor, index) => (
              <span key={`${factor.feature}-${index}`}>
                #{index + 1} {factor.label}: {factor.direction} {Math.abs(factor.delta).toFixed(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {(explainError || currentError) && (
        <div className="trust-warning">
          Một số dữ liệu explain chưa tải được: {explainError ?? currentError}. Panel đang dùng cache/fallback.
        </div>
      )}
    </section>
  );
}
