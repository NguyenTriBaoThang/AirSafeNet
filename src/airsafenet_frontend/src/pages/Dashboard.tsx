import { useEffect, useState } from "react";
import { getDashboardFullApi } from "../api/dashboard";
import type { DashboardChartPointResponse, DashboardDays, DashboardFullResponse, DashboardMode } from "../types/dashboard";
import SummaryCard from "../components/dashboard/SummaryCard";
import ForecastChart from "../components/dashboard/ForecastChart";
import ForecastTable from "../components/dashboard/ForecastTable";
import ForecastVsActualChart from "../components/dashboard/ForecastVsActualChart";
import GoldenHoursWidget from "../components/dashboard/GoldenHoursWidget";
import ImpactEstimateWidget from "../components/dashboard/ImpactEstimateWidget";
import AiExplainPanel from "../components/dashboard/AiExplainPanel"; // ✅ MỚI
import RiskBadge from "../components/dashboard/RiskBadge";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardSkeleton from "../components/common/DashboardSkeleton";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/useToast";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import AppIcon from "../components/common/AppIcon";

export default function Dashboard() {
  const [data, setData] = useState<DashboardFullResponse | null>(null);
  const [historyPoints, setHistoryPoints] = useState<DashboardChartPointResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState<DashboardDays>(1);
  const [mode, setMode] = useState<DashboardMode>("forecast");
  const { showToast } = useToast();

  async function loadData(selectedDays: DashboardDays = days, selectedMode: DashboardMode = mode, silent = false) {
    try {
      if (!silent) setLoading(true);
      setError("");
      const [mainResult, historyResult] = await Promise.all([
        getDashboardFullApi(selectedDays, selectedMode),
        getDashboardFullApi(selectedDays, "history"),
      ]);
      setData(mainResult);
      setHistoryPoints(historyResult.chart.points);
      if (silent) showToast("Đã làm mới dữ liệu dashboard", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(days, mode); }, [days, mode]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <EmptyState title="Không tải được dữ liệu dashboard" description={error} />;
  if (!data || data.chart.points.length === 0) {
    return <EmptyState title="Chưa có dữ liệu hiển thị" description="Hiện chưa có điểm dữ liệu phù hợp cho khoảng thời gian bạn chọn." />;
  }

  const { summary, chart } = data;
  const periodLabel = days === 1 ? "1 ngày" : days === 3 ? "3 ngày" : "7 ngày";
  const currentVariant = summary.currentRisk === "GOOD" ? "success" : summary.currentRisk === "MODERATE" ? "warning" : "danger";

  return (
    <div className="dashboard-page">
      <SectionHeader
        eyebrow="Dashboard thông minh"
        title="Tổng quan chất lượng không khí"
        description={`Cập nhật lúc ${new Date(summary.generatedAt).toLocaleString("vi-VN")} • Nhóm người dùng: ${summary.userGroup}`}
        rightSlot={<button className="btn btn-primary" onClick={() => loadData(days, mode, true)}>Làm mới dữ liệu</button>}
      />
      <div className="section-toolbar">
        <StatusChip label={mode === "forecast" ? "Chế độ Forecast" : "Chế độ History"} variant={mode === "forecast" ? "info" : "purple"} />
        <StatusChip label={`Khoảng thời gian: ${periodLabel}`} variant="neutral" />
      </div>
      <DashboardFilters days={days} mode={mode} onDaysChange={setDays} onModeChange={setMode} />
      <div className="summary-grid">
        <SummaryCard title="AQI hiện tại" value={summary.currentAqi} subtext={`Mức độ: ${summary.currentRisk}`} icon={<AppIcon name="aqi" />} tone="primary" />
        <SummaryCard title="PM2.5 hiện tại" value={summary.currentPm25.toFixed(1)} subtext="µg/m³" icon={<AppIcon name="air" />} tone="default" />
        <SummaryCard title={mode === "forecast" ? `AQI cao nhất ${periodLabel}` : `AQI cao nhất lịch sử ${periodLabel}`} value={summary.maxAqiNext24h} subtext={summary.peakTime ? `Đỉnh lúc ${new Date(summary.peakTime).toLocaleString("vi-VN")}` : undefined} icon={<AppIcon name="trend" />} tone="warning" />
        <SummaryCard title={mode === "forecast" ? "Giờ nguy cơ" : "Giờ nguy cơ đã ghi nhận"} value={summary.dangerCount} subtext={`Số giờ cảnh báo: ${summary.warningCount}`} icon={<AppIcon name="alert" />} tone="danger" />
      </div>

      {mode === "forecast" && <GoldenHoursWidget points={chart.points} />}

      <div className="dashboard-two-col">
        <ForecastChart points={chart.points} mode={mode} />
        <div className="card recommendation-card interactive-card">
          <div className="card__header card__header--with-icon">
            <div className="card__header-icon"><AppIcon name={mode === "forecast" ? "forecast" : "history"} /></div>
            <div>
              <h3>{mode === "forecast" ? "Khuyến nghị hiện tại" : "Tổng quan lịch sử"}</h3>
              <p className="card__header-desc">Gợi ý hành động và mức độ rủi ro đáng chú ý</p>
            </div>
          </div>
          <div className="recommendation-content">
            <div className="recommendation-topline">
              <RiskBadge risk={summary.currentRisk} />
              <StatusChip label={`Ngưỡng hiện tại: ${summary.currentRisk}`} variant={currentVariant} />
            </div>
            <p>{summary.currentRecommendation}</p>
            <div className="peak-box">
              <div><span>{mode === "forecast" ? "Đỉnh rủi ro trong giai đoạn chọn" : "Mức rủi ro nổi bật"}</span><strong>{summary.peakRiskNext24h}</strong></div>
              <div><span>AQI cao nhất</span><strong>{summary.maxAqiNext24h}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <ForecastVsActualChart forecastPoints={chart.points} historyPoints={historyPoints} />

      <AiExplainPanel />

      <ImpactEstimateWidget
        currentRisk={summary.currentRisk}
        currentAqi={summary.currentAqi}
        currentPm25={summary.currentPm25}
        warningCount={summary.warningCount}
        days={days}
      />

      <ForecastTable points={chart.points} mode={mode} />
    </div>
  );
}
