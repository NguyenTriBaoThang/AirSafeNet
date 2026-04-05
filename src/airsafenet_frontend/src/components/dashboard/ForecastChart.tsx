import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardChartPointResponse } from "../../types/dashboard";

type Props = {
  points: DashboardChartPointResponse[];
  mode: "forecast" | "history";
};

export default function ForecastChart({ points, mode }: Props) {
  const data = points.map((item) => ({
    ...item,
    label: new Date(item.time).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="card chart-card">
      <div className="card__header">
        <h3>
          {mode === "forecast"
            ? "Xu hướng AQI / PM2.5 trong thời gian dự báo"
            : "Lịch sử AQI / PM2.5"}
        </h3>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" minTickGap={24} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="aqi"
              name="AQI"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pm25"
              name="PM2.5"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}