import { useAiExplain } from "../../hooks/useAiExplain";
import type { AiExplainResponse } from "../../types/air";

function impactBar(score: number) {
  return { width: Math.min(Math.abs(score) * 100, 100), isPositive: score > 0 };
}

function uvColor(uv: number) {
  if (uv >= 11) return "#7c3aed";
  if (uv >= 8)  return "#dc2626";
  if (uv >= 6)  return "#f97316";
  if (uv >= 3)  return "#eab308";
  return "#22c55e";
}

function uvLabel(uv: number) {
  if (uv >= 11) return "Cực cao";
  if (uv >= 8)  return "Rất cao";
  if (uv >= 6)  return "Cao";
  if (uv >= 3)  return "Trung bình";
  return "Thấp";
}

function windDirLabel(deg: number) {
  const dirs = ["Bắc","ĐB","Đông","ĐN","Nam","TN","Tây","TB"];
  return dirs[Math.round(deg / 45) % 8];
}

function windDirArrow(deg: number) {
  return `rotate(${deg}deg)`;
}

function trendIcon(dir: string) {
  return dir === "increasing" ? "⬆" : dir === "decreasing" ? "⬇" : "→";
}

function trendClass(dir: string) {
  return dir === "increasing" ? "xai-trend--up" : dir === "decreasing" ? "xai-trend--down" : "xai-trend--stable";
}

function WeatherChip({ icon, label, value, sub, extra }: {
  icon: string; label: string; value: string; sub?: string; extra?: React.ReactNode;
}) {
  return (
    <div className="xai-chip">
      <div className="xai-chip__icon-wrap">
        <span className="xai-chip__icon">{icon}</span>
        {extra}
      </div>
      <div>
        <div className="xai-chip__label">{label}</div>
        <strong className="xai-chip__value">{value}</strong>
        {sub && <div className="xai-chip__sub">{sub}</div>}
      </div>
    </div>
  );
}

function FactorRow({ icon, label, value, explain, impact }: {
  icon: string; label: string; value: string; explain: string; impact: number;
}) {
  const bar = impactBar(impact);
  const barColor = bar.isPositive ? "rgba(239,68,68,0.75)" : "rgba(34,197,94,0.75)";
  const scoreColor = bar.isPositive ? "#fca5a5" : "#86efac";

  return (
    <div className="xai-factor">
      <div className="xai-factor__header">
        <span className="xai-factor__icon">{icon}</span>
        <div className="xai-factor__meta">
          <span className="xai-factor__label">{label}</span>
          <strong className="xai-factor__value">{value}</strong>
        </div>
        <div className="xai-factor__bar-wrap">
          <div className="xai-factor__bar-bg">
            <div className="xai-factor__bar-fill" style={{ width: `${bar.width}%`, background: barColor }} />
          </div>
          <span className="xai-factor__score" style={{ color: scoreColor }}>
            {bar.isPositive ? "+" : ""}{impact.toFixed(2)}
          </span>
        </div>
      </div>
      <p className="xai-factor__explain">{explain}</p>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="xai-panel xai-panel--loading">
      <div className="xai-skeleton-header">
        <div className="xai-sk xai-sk--badge" />
        <div className="xai-sk xai-sk--title" />
        <div className="xai-sk xai-sk--sub" />
      </div>
      <div className="xai-skeleton-chips">
        {[1,2,3,4,5,6].map(i => <div key={i} className="xai-sk xai-sk--chip" />)}
      </div>
      <div className="xai-skeleton-factors">
        {[1,2,3,4].map(i => (
          <div key={i} className="xai-sk-row">
            <div className="xai-sk xai-sk--icon" />
            <div style={{ flex: 1 }}>
              <div className="xai-sk xai-sk--line-short" />
              <div className="xai-sk xai-sk--line-long" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AiExplainPanel() {
  const { data, loading, error, refresh } = useAiExplain();

  if (loading) return <SkeletonPanel />;

  if (error || !data) {
    return (
      <div className="xai-panel xai-panel--error">
        <span className="xai-error-icon">⚠️</span>
        <p>{error ?? "Không tải được giải thích AI"}</p>
        <button className="xai-btn" onClick={refresh} type="button">Thử lại</button>
      </div>
    );
  }

  const d: AiExplainResponse = data;
  const observedTime = new Date(d.weatherObservedAt).toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
  });

  return (
    <div className="xai-panel">

      <div className="xai-header">
        <div className="xai-header__left">
          <div className="xai-header__meta-row">
            <span className="xai-ai-badge">⚡ Explainable AI</span>
            <span className="xai-source-badge">
              🛰 {d.weatherSource} · {observedTime}
            </span>
          </div>
          <h3 className="xai-title">Tại sao AI dự đoán AQI {d.predAqi}?</h3>
          <p className="xai-summary">
            PM2.5 dự báo <strong>{d.predPm25.toFixed(1)} µg/m³</strong> ·{" "}
            {d.overallSummary}
          </p>
        </div>
        <div className={`xai-trend ${trendClass(d.trendDirection)}`}>
          <span>{trendIcon(d.trendDirection)}</span>
          <span>{d.trendLabel}</span>
        </div>
      </div>

      <div className="xai-chips-section">
        <div className="xai-chips-label">🌤 Điều kiện thời tiết thực tế</div>
        <div className="xai-chips">
          <WeatherChip
            icon="💨" label="Tốc độ gió"
            value={`${d.windSpeed.toFixed(1)} km/h`}
            sub={windDirLabel(d.windDirection)}
            extra={
              <span className="xai-wind-arrow" style={{ transform: windDirArrow(d.windDirection) }}>↑</span>
            }
          />
          <WeatherChip icon="💧" label="Độ ẩm" value={`${d.humidity.toFixed(0)}%`} />
          <WeatherChip icon="🌡️" label="Nhiệt độ" value={`${d.temperature.toFixed(1)}°C`} />
          <WeatherChip icon="🔵" label="Áp suất" value={`${d.pressure.toFixed(0)} hPa`} />
          <WeatherChip
            icon="☀️" label="Tia UV"
            value={`${d.uvIndex.toFixed(1)}`}
            sub={uvLabel(d.uvIndex)}
          />
          <WeatherChip icon="🌥️" label="Độ mây" value={`${d.cloudCover.toFixed(0)}%`} />
        </div>
      </div>

      <div className="xai-uv-section">
        <div className="xai-uv-header">
          <span>☀️ Chỉ số tia UV WHO</span>
          <span className="xai-uv-value" style={{ color: uvColor(d.uvIndex) }}>
            {d.uvIndex.toFixed(1)} — {uvLabel(d.uvIndex)}
          </span>
        </div>
        <div className="xai-uv-track">
          <div className="xai-uv-gradient" />
          <div
            className="xai-uv-pointer"
            style={{ left: `${Math.min((d.uvIndex / 12) * 100, 100)}%` }}
          />
        </div>
        <div className="xai-uv-labels">
          <span style={{ color: "#22c55e" }}>Thấp</span>
          <span style={{ color: "#eab308" }}>Trung bình</span>
          <span style={{ color: "#f97316" }}>Cao</span>
          <span style={{ color: "#dc2626" }}>Rất cao</span>
          <span style={{ color: "#7c3aed" }}>Cực cao</span>
        </div>
      </div>

      <div className="xai-factors-header">
        <span>📊 Mức độ ảnh hưởng từng yếu tố đến PM2.5</span>
        <div className="xai-legend">
          <span><span className="xai-dot xai-dot--up" /> Tăng PM2.5</span>
          <span><span className="xai-dot xai-dot--down" /> Giảm PM2.5</span>
        </div>
      </div>

      <div className="xai-factors">
        <FactorRow icon="🌫️" label="Lịch sử PM2.5"
          value={`${d.observedPm25.toFixed(1)} µg/m³`}
          explain={d.pm25HistoryExplain} impact={d.pm25HistoryImpact} />
        <FactorRow icon="💨" label="Tốc độ gió"
          value={`${d.windSpeed.toFixed(1)} km/h ${windDirLabel(d.windDirection)}`}
          explain={d.windExplain} impact={d.windImpact} />
        <FactorRow icon="💧" label="Độ ẩm"
          value={`${d.humidity.toFixed(0)}%`}
          explain={d.humidityExplain} impact={d.humidityImpact} />
        <FactorRow icon="🌡️" label="Nhiệt độ"
          value={`${d.temperature.toFixed(1)}°C`}
          explain={d.temperatureExplain} impact={d.temperatureImpact} />
        <FactorRow icon="🔵" label="Áp suất khí quyển"
          value={`${d.pressure.toFixed(0)} hPa`}
          explain={d.pressureExplain} impact={d.pressureImpact} />
        <FactorRow icon="☀️" label="Tia UV"
          value={`${d.uvIndex.toFixed(1)} (${uvLabel(d.uvIndex)})`}
          explain={d.uvExplain} impact={d.uvImpact} />
        <FactorRow icon="🌥️" label="Độ che phủ mây"
          value={`${d.cloudCover.toFixed(0)}%`}
          explain={d.cloudExplain} impact={d.cloudImpact} />
      </div>

      <div className="xai-top">
        <span className="xai-top__label">🏆 Yếu tố chi phối nhất</span>
        <strong className="xai-top__value">{d.topFactor}</strong>
      </div>

      <div className="xai-footer">
        <span>
          Score: + = tăng PM2.5, − = giảm PM2.5 ·
          Tiêu chuẩn WHO AQG 2021 & US EPA NAAQS ·
          Thời tiết: Open-Meteo (cập nhật 15 phút)
        </span>
        <button className="xai-btn" onClick={refresh} type="button">↺ Cập nhật</button>
      </div>
    </div>
  );
}