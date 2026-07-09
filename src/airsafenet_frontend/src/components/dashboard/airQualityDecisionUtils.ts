import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";

export const WHO_DAILY_PM25_DOSE = 225;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pm25ToAqi(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];
  const bp = breakpoints.find((item) => pm25 >= item.cLow && pm25 <= item.cHigh) ?? breakpoints[breakpoints.length - 1];
  const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow;
  return Math.round(clamp(aqi, 0, 500));
}

export function riskColor(aqi: number): string {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#a855f7";
}

export function riskLabel(aqi: number): string {
  if (aqi <= 50) return "Tốt";
  if (aqi <= 100) return "Trung bình";
  if (aqi <= 150) return "Nhạy cảm";
  if (aqi <= 200) return "Không tốt";
  return "Rất xấu";
}

export function formatHour(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  });
}

export function getForecastWindow(points: DashboardChartPointResponse[], limit = 24): DashboardChartPointResponse[] {
  const now = Date.now();
  const future = points
    .filter((point) => new Date(point.time).getTime() >= now - 45 * 60_000)
    .slice(0, limit);
  return future.length > 0 ? future : points.slice(0, limit);
}

export function sampleForecastAt(
  points: DashboardChartPointResponse[],
  target: Date,
  fallback: DashboardSummaryResponse,
): { pm25: number; aqi: number } {
  const sorted = [...points]
    .map((point) => ({ ...point, ts: new Date(point.time).getTime() }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);

  if (sorted.length === 0) return { pm25: fallback.currentPm25, aqi: fallback.currentAqi };

  const targetTs = target.getTime();
  if (targetTs <= sorted[0].ts) return { pm25: sorted[0].pm25, aqi: sorted[0].aqi };

  const last = sorted[sorted.length - 1];
  if (targetTs >= last.ts) return { pm25: last.pm25, aqi: last.aqi };

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];
    const prev = sorted[index - 1];
    if (targetTs <= next.ts) {
      const ratio = (targetTs - prev.ts) / Math.max(1, next.ts - prev.ts);
      return {
        pm25: prev.pm25 + (next.pm25 - prev.pm25) * ratio,
        aqi: Math.round(prev.aqi + (next.aqi - prev.aqi) * ratio),
      };
    }
  }

  return { pm25: fallback.currentPm25, aqi: fallback.currentAqi };
}
