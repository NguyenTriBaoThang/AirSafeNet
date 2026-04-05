import { useEffect, useState } from "react";
import { getDashboardFullApi } from "../api/dashboard";
import type {
  DashboardDays,
  DashboardFullResponse,
  DashboardMode,
} from "../types/dashboard";
import SummaryCard from "../components/dashboard/SummaryCard";
import ForecastChart from "../components/dashboard/ForecastChart";
import ForecastTable from "../components/dashboard/ForecastTable";
import RiskBadge from "../components/dashboard/RiskBadge";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardSkeleton from "../components/common/DashboardSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/useToast";

export default function Dashboard() {
  const [data, setData] = useState<DashboardFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [days, setDays] = useState<DashboardDays>(1);
  const [mode, setMode] = useState<DashboardMode>("forecast");

  const { showToast } = useToast();

  async function loadData(selectedDays = days, selectedMode = mode, silent = false) {
    try {
      if (!silent) setLoading(true);
      setError("");

      const result = await getDashboardFullApi(selectedDays, selectedMode);
      setData(result);

      if (silent) {
        showToast("Đã làm mới dữ liệu dashboard", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(days, mode);
  }, [days, mode]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        title="Không tải được dữ liệu dashboard"
        description={error}
      />
    );
  }

  if (!data || data.chart.points.length === 0) {
    return (
      <EmptyState
        title="Chưa có dữ liệu hiển thị"
        description="Hiện chưa có điểm dữ liệu phù hợp cho khoảng thời gian bạn chọn."
      />
    );
  }

  const { summary, chart } = data;

  const periodLabel =
    days === 1 ? "1 ngày" : days === 3 ? "3 ngày" : "7 ngày";

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard chất lượng không khí</h1>
          <p>
            Cập nhật lúc {new Date(summary.generatedAt).toLocaleString("vi-VN")} •
            Nhóm người dùng: <strong>{summary.userGroup}</strong>
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => loadData(days, mode, true)}
        >
          Làm mới dữ liệu
        </button>
      </div>

      <DashboardFilters
        days={days}
        mode={mode}
        onDaysChange={setDays}
        onModeChange={setMode}
      />

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
          title={mode === "forecast" ? `AQI cao nhất ${periodLabel}` : `AQI cao nhất lịch sử ${periodLabel}`}
          value={summary.maxAqiNext24h}
          subtext={
            summary.peakTime
              ? `Đỉnh lúc ${new Date(summary.peakTime).toLocaleString("vi-VN")}`
              : undefined
          }
        />
        <SummaryCard
          title={mode === "forecast" ? "Giờ nguy cơ" : "Giờ nguy cơ đã ghi nhận"}
          value={summary.dangerCount}
          subtext={`Số giờ cảnh báo: ${summary.warningCount}`}
        />
      </div>

      <div className="dashboard-two-col">
        <ForecastChart points={chart.points} mode={mode} />

        <div className="card recommendation-card">
          <div className="card__header">
            <h3>{mode === "forecast" ? "Khuyến nghị hiện tại" : "Tổng quan lịch sử"}</h3>
          </div>

          <div className="recommendation-content">
            <RiskBadge risk={summary.currentRisk} />
            <p>{summary.currentRecommendation}</p>

            <div className="peak-box">
              <div>
                <span>{mode === "forecast" ? "Đỉnh rủi ro trong giai đoạn chọn" : "Mức rủi ro nổi bật"}</span>
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

      <ForecastTable points={chart.points} mode={mode} />
    </div>
  );
}