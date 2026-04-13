import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardChartPointResponse } from "../../types/dashboard";

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  forecastPoints: DashboardChartPointResponse[];
  historyPoints: DashboardChartPointResponse[];
};

type MergedPoint = {
  label: string;
  time: string;
  predicted?: number;
  observed?: number;
};

type AccuracyStats = {
  mae: number;       // Mean Absolute Error
  rmse: number;      // Root Mean Square Error
  matchCount: number;
  accuracyPct: number; // % giờ có |error| ≤ 10 µg/m³
  trend: "better" | "worse" | "stable";
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toHourKey(isoString: string): string {
  // Làm tròn về giờ để join forecast ↔ history
  const d = new Date(isoString);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function formatLabel(isoString: string): string {
  return new Date(isoString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function computeStats(merged: MergedPoint[]): AccuracyStats | null {
  const pairs = merged.filter(
    (p) => p.predicted !== undefined && p.observed !== undefined
  ) as { label: string; time: string; predicted: number; observed: number }[];

  if (pairs.length < 3) return null;

  const errors = pairs.map((p) => Math.abs(p.predicted - p.observed));
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const rmse = Math.sqrt(
    pairs.reduce((s, p) => s + (p.predicted - p.observed) ** 2, 0) /
      pairs.length
  );
  const accuracyPct =
    (errors.filter((e) => e <= 10).length / errors.length) * 100;

  // Trend: so sánh MAE nửa đầu vs nửa sau
  const half = Math.floor(pairs.length / 2);
  const maeFirst =
    errors.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const maeLast =
    errors.slice(half).reduce((a, b) => a + b, 0) /
    (errors.length - half);

  const trend =
    maeLast < maeFirst - 1
      ? "better"
      : maeLast > maeFirst + 1
      ? "worse"
      : "stable";

  return { mae, rmse, matchCount: pairs.length, accuracyPct, trend };
}

function mergePoints(
  forecast: DashboardChartPointResponse[],
  history: DashboardChartPointResponse[]
): MergedPoint[] {
  const historyMap = new Map<string, number>();
  for (const h of history) {
    historyMap.set(toHourKey(h.time), h.pm25);
  }

  const forecastMap = new Map<string, number>();
  for (const f of forecast) {
    forecastMap.set(toHourKey(f.time), f.pm25);
  }

  // Union tất cả các giờ
  const allKeys = new Set([...historyMap.keys(), ...forecastMap.keys()]);

  const points: MergedPoint[] = [];
  for (const key of allKeys) {
    points.push({
      label: formatLabel(key),
      time: key,
      predicted: forecastMap.get(key),
      observed: historyMap.get(key),
    });
  }

  return points.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const predicted = payload.find((p) => p.name === "Dự báo AI");
  const observed = payload.find((p) => p.name === "Thực tế");
  const diff =
    predicted && observed
      ? Math.abs(predicted.value - observed.value).toFixed(1)
      : null;

  return (
    <div className="fva-tooltip">
      <div className="fva-tooltip__time">{label}</div>
      {predicted && (
        <div className="fva-tooltip__row">
          <span
            className="fva-tooltip__dot"
            style={{ background: predicted.color }}
          />
          <span>Dự báo AI</span>
          <strong>{predicted.value.toFixed(1)} µg/m³</strong>
        </div>
      )}
      {observed && (
        <div className="fva-tooltip__row">
          <span
            className="fva-tooltip__dot"
            style={{ background: observed.color }}
          />
          <span>Thực tế</span>
          <strong>{observed.value.toFixed(1)} µg/m³</strong>
        </div>
      )}
      {diff && (
        <div className="fva-tooltip__diff">
          Sai số: <strong>{diff} µg/m³</strong>
        </div>
      )}
    </div>
  );
}

// ── Stats Badge ───────────────────────────────────────────────────────────────

function StatsBadge({ stats }: { stats: AccuracyStats }) {
  const trendIcon =
    stats.trend === "better" ? "↗" : stats.trend === "worse" ? "↘" : "→";
  const trendLabel =
    stats.trend === "better"
      ? "Độ chính xác cải thiện"
      : stats.trend === "worse"
      ? "Sai số tăng dần"
      : "Ổn định";

  const accuracyClass =
    stats.accuracyPct >= 80
      ? "fva-stat--good"
      : stats.accuracyPct >= 60
      ? "fva-stat--moderate"
      : "fva-stat--poor";

  return (
    <div className="fva-stats">
      <div className={`fva-stat ${accuracyClass}`}>
        <span className="fva-stat__label">Độ chính xác</span>
        <strong className="fva-stat__value">
          {stats.accuracyPct.toFixed(0)}%
        </strong>
        <span className="fva-stat__sub">sai số ≤ 10 µg/m³</span>
      </div>

      <div className="fva-stat">
        <span className="fva-stat__label">MAE trung bình</span>
        <strong className="fva-stat__value">
          {stats.mae.toFixed(1)}
        </strong>
        <span className="fva-stat__sub">µg/m³</span>
      </div>

      <div className="fva-stat">
        <span className="fva-stat__label">RMSE</span>
        <strong className="fva-stat__value">
          {stats.rmse.toFixed(1)}
        </strong>
        <span className="fva-stat__sub">µg/m³</span>
      </div>

      <div className="fva-stat fva-stat--trend">
        <span className="fva-stat__label">Xu hướng</span>
        <strong className="fva-stat__value">{trendIcon}</strong>
        <span className="fva-stat__sub">{trendLabel}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ForecastVsActualChart({
  forecastPoints,
  historyPoints,
}: Props) {
  const merged = useMemo(
    () => mergePoints(forecastPoints, historyPoints),
    [forecastPoints, historyPoints]
  );

  const stats = useMemo(() => computeStats(merged), [merged]);

  // Tìm vị trí "hiện tại" để vẽ ReferenceLine
  const nowKey = toHourKey(new Date().toISOString());
  const nowLabel = formatLabel(nowKey);

  const hasOverlap = merged.some(
    (p) => p.predicted !== undefined && p.observed !== undefined
  );

  return (
    <div className="card fva-chart-card">
      {/* ── Header ── */}
      <div className="card__header card__header--with-icon">
        <div className="card__header-icon fva-header-icon">
          <span>⚡</span>
        </div>
        <div>
          <h3>Dự báo AI vs Thực tế</h3>
          <p className="card__header-desc">
            So sánh PM2.5 dự báo từ model với dữ liệu quan trắc thực tế
          </p>
        </div>

        {/* Model badge */}
        <div className="fva-model-badge">
          <span className="fva-model-badge__dot" />
          <span>Powered by ML Model</span>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {stats && hasOverlap ? (
        <StatsBadge stats={stats} />
      ) : (
        <div className="fva-no-overlap">
          <span>ℹ️</span>
          <span>
            Chưa đủ dữ liệu chồng lấp để tính độ chính xác — cần ít nhất 3
            giờ có cả forecast lẫn history.
          </span>
        </div>
      )}

      {/* ── Chart ── */}
      <div className="fva-chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={merged}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />

            <XAxis
              dataKey="label"
              minTickGap={32}
              tick={{ fontSize: 11, fill: "var(--color-text-muted, #94a3b8)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-text-muted, #94a3b8)" }}
              tickLine={false}
              axisLine={false}
              width={38}
              tickFormatter={(v) => `${v}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />

            {/* Đường thực tế — màu xanh lá */}
            <Line
              type="monotone"
              dataKey="observed"
              name="Thực tế"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              strokeDasharray="0"
            />

            {/* Đường dự báo — màu cam/vàng */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="Dự báo AI"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              strokeDasharray="5 3"
            />

            {/* Đường "Hiện tại" */}
            <ReferenceLine
              x={nowLabel}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="4 3"
              label={{
                value: "Hiện tại",
                position: "insideTopRight",
                fontSize: 10,
                fill: "rgba(255,255,255,0.4)",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend note ── */}
      <div className="fva-legend-note">
        <span className="fva-legend-note__item">
          <span
            className="fva-legend-note__line"
            style={{ background: "#22c55e" }}
          />
          Thực tế từ Open-Meteo
        </span>
        <span className="fva-legend-note__item">
          <span
            className="fva-legend-note__line fva-legend-note__line--dashed"
            style={{ background: "#f59e0b" }}
          />
          Dự báo từ AI Model
        </span>
        <span className="fva-legend-note__sep" />
        <span className="fva-legend-note__meta">
          {merged.length} điểm dữ liệu
          {stats ? ` · ${stats.matchCount} giờ chồng lấp` : ""}
        </span>
      </div>
    </div>
  );
}
