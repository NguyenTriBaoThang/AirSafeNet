import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getForecastAccuracyApi } from "../../api/dashboard";
import type { ForecastAccuracyResponse } from "../../types/dashboard";

type Tone = ForecastAccuracyResponse["reliabilityTone"];

function toneColor(tone: Tone): string {
  if (tone === "excellent") return "#22c55e";
  if (tone === "good") return "#84cc16";
  if (tone === "watch") return "#eab308";
  if (tone === "low") return "#ef4444";
  return "#38bdf8";
}

function trendLabel(trend: ForecastAccuracyResponse["trend"]): string {
  if (trend === "better") return "Sai số đang giảm";
  if (trend === "worse") return "Sai số đang tăng";
  return "Sai số ổn định";
}

function trendIcon(trend: ForecastAccuracyResponse["trend"]): string {
  if (trend === "better") return "↗";
  if (trend === "worse") return "↘";
  return "→";
}

function formatTime(iso?: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateRange(data: ForecastAccuracyResponse): string {
  if (!data.comparisonStart || !data.comparisonEnd) return "Chưa đủ khung so sánh";
  return `${formatTime(data.comparisonStart)} - ${formatTime(data.comparisonEnd)}`;
}

function signed(value: number): string {
  if (Math.abs(value) < 0.05) return "0.0";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function LoadingState() {
  return (
    <section className="accuracy-panel accuracy-panel--loading">
      <div className="accuracy-skeleton accuracy-skeleton--wide" />
      <div className="accuracy-skeleton-grid">
        <div className="accuracy-skeleton" />
        <div className="accuracy-skeleton" />
        <div className="accuracy-skeleton" />
      </div>
    </section>
  );
}

export default function ForecastAccuracyScore() {
  const [data, setData] = useState<ForecastAccuracyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getForecastAccuracyApi();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được Forecast Accuracy Score");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tone = data?.reliabilityTone ?? "collecting";
  const color = toneColor(tone);
  const recentPoints = useMemo(() => data?.points.slice(0, 6) ?? [], [data]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <section className="accuracy-panel accuracy-panel--error">
        <div>
          <div className="accuracy-panel__eyebrow">Forecast Accuracy Score</div>
          <h3>Không tải được độ chính xác forecast</h3>
          <p>{error}</p>
        </div>
        <button className="accuracy-refresh" type="button" onClick={load}>Thử lại</button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="accuracy-panel" style={{ "--accuracy-color": color } as CSSProperties}>
      <div className="accuracy-panel__header">
        <div>
          <div className="accuracy-panel__eyebrow">Forecast Accuracy Score</div>
          <h3>Độ tin cậy dự báo hôm qua so với thực tế hôm nay</h3>
          <p>{data.method}</p>
        </div>
        <button className="accuracy-refresh" type="button" onClick={load}>Tải lại</button>
      </div>

      <div className="accuracy-main-grid">
        <div className="accuracy-score-card">
          <div className="accuracy-ring" style={{ background: `conic-gradient(${color} ${Math.max(0, data.accuracyScore)}%, rgba(255,255,255,0.08) 0)` }}>
            <div>
              <strong>{data.hasEnoughData ? data.accuracyScore.toFixed(0) : "--"}</strong>
              <span>/100</span>
            </div>
          </div>
          <div className="accuracy-score-card__text">
            <span>Độ tin cậy</span>
            <strong style={{ color }}>{data.reliabilityLabel}</strong>
            <small>{formatDateRange(data)}</small>
          </div>
        </div>

        <div className="accuracy-stat-grid">
          <div className="accuracy-stat">
            <span>Giờ match</span>
            <strong>{data.matchedHours}</strong>
            <small>{data.snapshotCount} snapshot đã lưu</small>
          </div>
          <div className="accuracy-stat">
            <span>MAE PM2.5</span>
            <strong>{data.hasEnoughData ? data.pm25Mae.toFixed(1) : "--"}</strong>
            <small>µg/m³</small>
          </div>
          <div className="accuracy-stat">
            <span>Trong ngưỡng</span>
            <strong>{data.hasEnoughData ? `${data.withinTolerancePct.toFixed(0)}%` : "--"}</strong>
            <small>≤ 10 µg/m³ hoặc ≤ 25 AQI</small>
          </div>
          <div className="accuracy-stat">
            <span>Bias</span>
            <strong>{data.hasEnoughData ? signed(data.biasPm25) : "--"}</strong>
            <small>{data.biasPm25 > 0 ? "dự báo cao hơn" : data.biasPm25 < 0 ? "dự báo thấp hơn" : "cân bằng"}</small>
          </div>
        </div>
      </div>

      <div className="accuracy-summary-row">
        <div className="accuracy-summary-box">
          <span>Tóm tắt</span>
          <strong>{data.summary}</strong>
        </div>
        <div className="accuracy-trend-box">
          <span>{trendIcon(data.trend)}</span>
          <div>
            <strong>{trendLabel(data.trend)}</strong>
            <small>Cập nhật {formatTime(data.generatedAt)}</small>
          </div>
        </div>
      </div>

      {recentPoints.length > 0 ? (
        <div className="accuracy-points">
          <div className="accuracy-points__header">
            <strong>Các giờ so sánh gần nhất</strong>
            <span>Dự báo phát hành trước thực tế khoảng 24h</span>
          </div>
          <div className="accuracy-point-list">
            {recentPoints.map((point) => (
              <div key={`${point.targetTime}-${point.forecastIssuedAt}`} className="accuracy-point">
                <div>
                  <strong>{formatTime(point.targetTime)}</strong>
                  <span>Lead {point.leadHours.toFixed(1)}h</span>
                </div>
                <div className="accuracy-point__values">
                  <span>Dự báo {point.predictedPm25.toFixed(1)}</span>
                  <span>Thực tế {point.actualPm25.toFixed(1)}</span>
                  <strong className={point.withinTolerance ? "accuracy-point__ok" : "accuracy-point__miss"}>
                    Δ {point.pm25Error.toFixed(1)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="accuracy-collecting-note">
          Hệ thống vừa bắt đầu lưu forecast snapshot. Sau khi có dữ liệu thực tế của các giờ đã dự báo trước đó, score sẽ tự xuất hiện ở đây.
        </div>
      )}
    </section>
  );
}