import { useAiExplain } from "../../hooks/useAiExplain";
import type { AiExplainResponse } from "../../types/air";

function impactBar(score: number): { width: number; isPositive: boolean } {
  return {
    width: Math.min(Math.abs(score) * 100, 100),
    isPositive: score > 0,
  };
}

function uvColor(uv: number): string {
  if (uv >= 11) return "#7c3aed";
  if (uv >= 8)  return "#dc2626";
  if (uv >= 6)  return "#f97316";
  if (uv >= 3)  return "#eab308";
  return "#22c55e";
}

function uvLabel(uv: number): string {
  if (uv >= 11) return "Cực cao";
  if (uv >= 8)  return "Rất cao";
  if (uv >= 6)  return "Cao";
  if (uv >= 3)  return "Trung bình";
  return "Thấp";
}

function windDirLabel(deg: number): string {
  const dirs = ["Bắc","Đông Bắc","Đông","Đông Nam","Nam","Tây Nam","Tây","Tây Bắc"];
  return dirs[Math.round(deg / 45) % 8];
}

function trendIcon(dir: string): string {
  if (dir === "increasing") return "⬆";
  if (dir === "decreasing") return "⬇";
  return "→";
}

function trendClass(dir: string): string {
  if (dir === "increasing") return "xai-trend--up";
  if (dir === "decreasing") return "xai-trend--down";
  return "xai-trend--stable";
}

function FactorRow({
  icon, label, value, explain, impact,
}: {
  icon: string;
  label: string;
  value: string;
  explain: string;
  impact: number;
}) {
  const bar = impactBar(impact);
  const barColor = bar.isPositive
    ? "rgba(239,68,68,0.7)"   // dương = tăng PM2.5 = đỏ
    : "rgba(34,197,94,0.7)";  // âm = giảm PM2.5 = xanh

  return (
    <div className="xai-factor">
      <div className="xai-factor__header">
        <span className="xai-factor__icon">{icon}</span>
        <div className="xai-factor__meta">
          <span className="xai-factor__label">{label}</span>
          <strong className="xai-factor__value">{value}</strong>
        </div>
        <div className="xai-factor__impact-wrap">
          <div className="xai-factor__bar-bg">
            <div
              className="xai-factor__bar-fill"
              style={{ width: `${bar.width}%`, background: barColor }}
            />
          </div>
          <span
            className="xai-factor__impact-score"
            style={{ color: bar.isPositive ? "#fca5a5" : "#86efac" }}
          >
            {bar.isPositive ? "+" : ""}{impact.toFixed(2)}
          </span>
        </div>
      </div>
      <p className="xai-factor__explain">{explain}</p>
    </div>
  );
}

function WeatherChip({
  icon, label, value, sub,
}: {
  icon: string; label: string; value: string; sub?: string;
}) {
  return (
    <div className="xai-chip">
      <span className="xai-chip__icon">{icon}</span>
      <div>
        <div className="xai-chip__label">{label}</div>
        <strong className="xai-chip__value">{value}</strong>
        {sub && <div className="xai-chip__sub">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="xai-panel xai-panel--loading">
      {[1,2,3].map(i => (
        <div key={i} className="xai-skeleton-row">
          <div className="xai-skeleton xai-skeleton--icon" />
          <div style={{ flex: 1 }}>
            <div className="xai-skeleton xai-skeleton--title" />
            <div className="xai-skeleton xai-skeleton--text" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AiExplainPanel() {
  const { data, loading, error, refresh } = useAiExplain();

  if (loading) return <SkeletonPanel />;

  if (error || !data) {
    return (
      <div className="xai-panel xai-panel--error">
        <span>⚠️</span>
        <p>{error ?? "Không tải được giải thích AI"}</p>
        <button className="xai-refresh-btn" onClick={refresh} type="button">
          Thử lại
        </button>
      </div>
    );
  }

  const d: AiExplainResponse = data;

  return (
    <div className="xai-panel">

      <div className="xai-header">
        <div className="xai-header__left">
          <div className="xai-header__eyebrow">
            <span className="xai-ai-badge">⚡ Explainable AI</span>
            <span className="xai-header__time">
              {new Date(d.generatedAt).toLocaleString("vi-VN", {
                hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit"
              })}
            </span>
          </div>
          <h3>Tại sao AI dự đoán AQI {d.predAqi}?</h3>
          <p className="xai-header__sub">
            PM2.5 dự báo <strong>{d.predPm25.toFixed(1)} µg/m³</strong> ·{" "}
            {d.overallSummary}
          </p>
        </div>

        <div className={`xai-trend ${trendClass(d.trendDirection)}`}>
          <span className="xai-trend__icon">{trendIcon(d.trendDirection)}</span>
          <span>{d.trendLabel}</span>
        </div>
      </div>

      <div className="xai-weather-chips">
        <WeatherChip
          icon="💨"
          label="Tốc độ gió"
          value={`${d.windSpeed.toFixed(1)} km/h`}
          sub={windDirLabel(d.windDirection)}
        />
        <WeatherChip
          icon="💧"
          label="Độ ẩm"
          value={`${d.humidity.toFixed(0)}%`}
        />
        <WeatherChip
          icon="🌡️"
          label="Nhiệt độ"
          value={`${d.temperature.toFixed(1)}°C`}
        />
        <WeatherChip
          icon="🔵"
          label="Áp suất"
          value={`${d.pressure.toFixed(0)} hPa`}
        />
        <WeatherChip
          icon="☀️"
          label="Tia UV"
          value={`${d.uvIndex.toFixed(1)}`}
          sub={uvLabel(d.uvIndex)}
        />
        <WeatherChip
          icon="🌫️"
          label="PM2.5 quan trắc"
          value={`${d.observedPm25.toFixed(1)} µg/m³`}
        />
      </div>

      <div className="xai-uv-scale">
        <div className="xai-uv-scale__header">
          <span>☀️ Chỉ số UV hiện tại</span>
          <span
            className="xai-uv-scale__label"
            style={{ color: uvColor(d.uvIndex) }}
          >
            {d.uvIndex.toFixed(1)} — {uvLabel(d.uvIndex)}
          </span>
        </div>
        <div className="xai-uv-scale__bar">
          <div className="xai-uv-scale__gradient" />
          <div
            className="xai-uv-scale__pointer"
            style={{ left: `${Math.min((d.uvIndex / 12) * 100, 100)}%` }}
          />
        </div>
        <div className="xai-uv-scale__labels">
          <span>Thấp</span>
          <span>TB</span>
          <span>Cao</span>
          <span>Rất cao</span>
          <span>Cực cao</span>
        </div>
      </div>

      <div className="xai-section-title">
        <span>📊</span>
        <span>Mức độ ảnh hưởng từng yếu tố</span>
        <span className="xai-legend">
          <span className="xai-legend__dot xai-legend__dot--up" /> Tăng PM2.5
          <span className="xai-legend__dot xai-legend__dot--down" /> Giảm PM2.5
        </span>
      </div>

      <div className="xai-factors">
        <FactorRow
          icon="🌫️"
          label="Lịch sử PM2.5"
          value={`${d.observedPm25.toFixed(1)} µg/m³`}
          explain={d.pm25HistoryExplain}
          impact={d.pm25HistoryImpact}
        />
        <FactorRow
          icon="💨"
          label="Tốc độ gió"
          value={`${d.windSpeed.toFixed(1)} km/h`}
          explain={d.windExplain}
          impact={d.windImpact}
        />
        <FactorRow
          icon="💧"
          label="Độ ẩm"
          value={`${d.humidity.toFixed(0)}%`}
          explain={d.humidityExplain}
          impact={d.humidityImpact}
        />
        <FactorRow
          icon="🌡️"
          label="Nhiệt độ"
          value={`${d.temperature.toFixed(1)}°C`}
          explain={d.temperatureExplain}
          impact={d.temperatureImpact}
        />
        <FactorRow
          icon="🔵"
          label="Áp suất khí quyển"
          value={`${d.pressure.toFixed(0)} hPa`}
          explain={d.pressureExplain}
          impact={d.pressureImpact}
        />
        <FactorRow
          icon="☀️"
          label="Tia UV"
          value={`${d.uvIndex.toFixed(1)} (${uvLabel(d.uvIndex)})`}
          explain={d.uvExplain}
          impact={d.uvImpact}
        />
      </div>

      <div className="xai-top-factor">
        <span className="xai-top-factor__label">🏆 Yếu tố chi phối nhất</span>
        <strong className="xai-top-factor__value">{d.topFactor}</strong>
      </div>

      <div className="xai-footer">
        <span>
          Score Impact: dương (+) = tăng PM2.5, âm (−) = giảm PM2.5.
          Phân tích dựa trên WHO Air Quality Guidelines 2021 & US EPA NAAQS.
        </span>
        <button className="xai-refresh-btn" onClick={refresh} type="button">
          ↺ Cập nhật
        </button>
      </div>
    </div>
  );
}
