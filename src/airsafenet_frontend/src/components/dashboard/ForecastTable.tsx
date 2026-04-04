import type { DashboardChartPointResponse } from "../../types/dashboard";
import RiskBadge from "./RiskBadge";

type Props = {
  points: DashboardChartPointResponse[];
};

export default function ForecastTable({ points }: Props) {
  return (
    <div className="card">
      <div className="card__header">
        <h3>Dự báo 24 giờ</h3>
      </div>

      <div className="table-wrap">
        <table className="forecast-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>PM2.5</th>
              <th>AQI</th>
              <th>Mức độ</th>
              <th>Khuyến nghị</th>
            </tr>
          </thead>
          <tbody>
            {points.map((item) => (
              <tr key={item.time}>
                <td>{new Date(item.time).toLocaleString("vi-VN")}</td>
                <td>{item.pm25.toFixed(1)}</td>
                <td>{item.aqi}</td>
                <td>
                  <RiskBadge risk={item.risk} />
                </td>
                <td>{item.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}