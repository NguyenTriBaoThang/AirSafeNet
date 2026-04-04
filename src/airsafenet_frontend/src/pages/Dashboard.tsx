import { useEffect, useState } from "react";
import { getDashboardFullApi } from "../api/dashboard";
import type { DashboardFullResponse } from "../types/dashboard";
import SummaryCard from "../components/dashboard/SummaryCard";
import ForecastChart from "../components/dashboard/ForecastChart";
import ForecastTable from "../components/dashboard/ForecastTable";
import RiskBadge from "../components/dashboard/RiskBadge";

export default function Dashboard() {
  const [data, setData] = useState<DashboardFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const result = await getDashboardFullApi();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="page-state">Đang tải dữ liệu dashboard...</div>;
  }

  if (error || !data) {
    return <div className="page-state error">Lỗi: {error || "Không có dữ liệu"}</div>;
  }

  const { summary, chart } = data;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard chất lượng không khí</h1>
          <p>
            Cập nhật lúc {new Date(summary.generatedAt).toLocaleString("vi-VN")} • Nhóm người dùng:{" "}
            <strong>{summary.userGroup}</strong>
          </p>
        </div>

        <button className="btn btn-primary" onClick={loadData}>
          Làm mới dữ liệu
        </button>
      </div>

      <div className="summary-grid">
        <SummaryCard
          title="AQI hiện tại"
          value={summary.currentAqi}
          subtext={`Mức độ: ${summary.currentRisk}`}
        />
        <SummaryCard
          title="PM2.5 hiện tại"
          value={summary.currentPm25.toFixed(1)}
          subtext="µg/m³"
        />
        <SummaryCard
          title="AQI cao nhất 24h"
          value={summary.maxAqiNext24h}
          subtext={
            summary.peakTime
              ? `Đỉnh lúc ${new Date(summary.peakTime).toLocaleString("vi-VN")}`
              : undefined
          }
        />
        <SummaryCard
          title="Giờ nguy cơ"
          value={summary.dangerCount}
          subtext={`Số giờ cảnh báo: ${summary.warningCount}`}
        />
      </div>

      <div className="dashboard-two-col">
        <ForecastChart points={chart.points} />

        <div className="card recommendation-card">
          <div className="card__header">
            <h3>Khuyến nghị hiện tại</h3>
          </div>

          <div className="recommendation-content">
            <RiskBadge risk={summary.currentRisk} />
            <p>{summary.currentRecommendation}</p>

            <div className="peak-box">
              <div>
                <span>Đỉnh rủi ro 24h tới</span>
                <strong>{summary.peakRiskNext24h}</strong>
              </div>
              <div>
                <span>AQI cao nhất</span>
                <strong>{summary.maxAqiNext24h}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForecastTable points={chart.points} />
    </div>
  );
}