import {
  CartesianGrid,
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
};

export default function ForecastChart({ points }: Props) {
  const data = points.map((item) => ({
    ...item,
    label: new Date(item.time).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="card chart-card">
      <div className="card__header">
        <h3>Xu hướng AQI / PM2.5 trong 24 giờ tới</h3>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="aqi" strokeWidth={3} />
            <Line type="monotone" dataKey="pm25" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}