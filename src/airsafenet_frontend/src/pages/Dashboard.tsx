import { useCallback, useEffect, useState } from "react";
import { getDashboardFullApi } from "../api/dashboard";
import type { DashboardChartPointResponse, DashboardDays, DashboardFullResponse, DashboardMode } from "../types/dashboard";
import { Link } from "react-router-dom";
import SummaryCard from "../components/dashboard/SummaryCard";
import ForecastChart from "../components/dashboard/ForecastChart";
import ForecastTable from "../components/dashboard/ForecastTable";
import ForecastVsActualChart from "../components/dashboard/ForecastVsActualChart";
import GoldenHoursWidget from "../components/dashboard/GoldenHoursWidget";
import AiExplainPanel from "../components/dashboard/AiExplainPanel";
import RiskBadge from "../components/dashboard/RiskBadge";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import DashboardSkeleton from "../components/common/DashboardSkeleton";
import { useToast } from "../components/common/useToast";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import AppIcon from "../components/common/AppIcon";
import AnomalyBanner from "../components/dashboard/AnomalyBanner";

function CacheInitializingState({ onRetry }: { onRetry: () => void }) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="cache-init-state">
      <div className="cache-init-state__icon">⏳</div>
      <h3>Hệ thống đang khởi tạo dữ liệu{dots}</h3>
      <p>AI Server đang tính toán dự báo lần đầu. Quá trình này mất khoảng 3–8 phút và chỉ xảy ra 1 lần. Sau đó dữ liệu sẽ được cache và cập nhật tự động mỗi 60 phút.</p>
      <div className="cache-init-state__bar"><div className="cache-init-state__bar-fill" /></div>
      <button className="btn btn-secondary" onClick={onRetry}>↺ Thử lại ngay</button>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]                   = useState<DashboardFullResponse | null>(null);
  const [historyPoints, setHistoryPoints] = useState<DashboardChartPointResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [is503, setIs503]                 = useState(false);
  const [days, setDays]                   = useState<DashboardDays>(1);
  const [mode, setMode]                   = useState<DashboardMode>("forecast");
  const { showToast } = useToast();

  const loadData = useCallback(async (
    selectedDays: DashboardDays = days,
    selectedMode: DashboardMode = mode,
    silent = false
  ) => {
    try {
      if (!silent) setLoading(true);
      setError(""); setIs503(false);
      const [main, history] = await Promise.all([
        getDashboardFullApi(selectedDays, selectedMode),
        getDashboardFullApi(selectedDays, "history"),
      ]);
      setData(main);
      setHistoryPoints(history.chart.points);
      if (silent) showToast("Đã làm mới dữ liệu dashboard", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      if (msg.includes("503") || msg.toLowerCase().includes("cache")) setIs503(true);
      else { setError(msg); showToast(msg, "error"); }
    } finally { setLoading(false); }
  }, [days, mode, showToast]);

  useEffect(() => { loadData(days, mode); }, [days, mode]);
  useEffect(() => {
    if (!is503) return;
    const t = setInterval(() => loadData(days, mode, true), 30_000);
    return () => clearInterval(t);
  }, [is503, days, mode, loadData]);

  if (loading) return <DashboardSkeleton />;
  if (is503)   return <CacheInitializingState onRetry={() => loadData(days, mode)} />;
  if (error || !data) return (
    <div className="cache-init-state">
      <div className="cache-init-state__icon">⚠️</div>
      <h3>Không tải được dữ liệu</h3>
      <p>{error || "Vui lòng thử lại."}</p>
      <button className="btn btn-secondary" onClick={() => loadData(days, mode)}>↺ Thử lại</button>
    </div>
  );

  const { summary, chart } = data;

  return (
    <div className="dashboard-page">
      <SectionHeader
        eyebrow="Dashboard thông minh"
        title="Tổng quan chất lượng không khí"
        description={`Cập nhật lúc ${new Date(summary.generatedAt).toLocaleString("vi-VN")} · Nhóm: ${summary.userGroup}`}
        rightSlot={
          <button className="btn btn-primary" onClick={() => loadData(days, mode, true)}>Làm mới dữ liệu</button>
        }
      />

      <div className="section-toolbar">
        <StatusChip label={mode === "forecast" ? "Forecast" : "History"} variant={mode === "forecast" ? "info" : "purple"} />
        <StatusChip label={days === 1 ? "1 ngày" : days === 3 ? "3 ngày" : "7 ngày"} variant="neutral" />
      </div>

      <DashboardFilters days={days} mode={mode} onDaysChange={setDays} onModeChange={setMode} />

      <AnomalyBanner />

      <div className="summary-grid">
        <SummaryCard title="AQI hiện tại"   value={summary.currentAqi}             subtext={summary.currentRisk}                                                                   icon={<AppIcon name="aqi" />}   tone="primary" />
        <SummaryCard title="PM2.5 hiện tại" value={summary.currentPm25.toFixed(1)} subtext="µg/m³"                                                                                 icon={<AppIcon name="air" />}   tone="default" />
        <SummaryCard title="AQI cao nhất"   value={summary.maxAqiNext24h}          subtext={summary.peakTime ? new Date(summary.peakTime).toLocaleTimeString("vi-VN") : undefined} icon={<AppIcon name="trend" />} tone="warning" />
        <SummaryCard title="Giờ cảnh báo"   value={summary.dangerCount}            subtext={`Warning: ${summary.warningCount}`}                                                     icon={<AppIcon name="alert" />} tone="danger" />
      </div>

      {mode === "forecast" && <GoldenHoursWidget points={chart.points} />}

      <div className="dashboard-two-col">
        <ForecastChart points={chart.points} mode={mode} />
        <div className="card recommendation-card">
          <div className="card__header card__header--with-icon">
            <div className="card__header-icon"><AppIcon name={mode === "forecast" ? "forecast" : "history"} /></div>
            <div><h3>{mode === "forecast" ? "Khuyến nghị hiện tại" : "Tổng quan lịch sử"}</h3></div>
          </div>
          <div className="recommendation-content">
            <div className="recommendation-topline"><RiskBadge risk={summary.currentRisk} /></div>
            <p>{summary.currentRecommendation}</p>
            <div className="peak-box">
              <div><span>Đỉnh rủi ro</span><strong>{summary.peakRiskNext24h}</strong></div>
              <div><span>AQI cao nhất</span><strong>{summary.maxAqiNext24h}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <ForecastVsActualChart forecastPoints={chart.points} historyPoints={historyPoints} />
      <AiExplainPanel />
      <ForecastTable points={chart.points} mode={mode} />

      <Link to="/impact" className="impact-teaser-card">
        <div className="impact-teaser-card__left">
          <span className="impact-teaser-card__icon">💰</span>
          <div>
            <strong>Chi phí y tế & So sánh tiêu chuẩn WHO</strong>
            <span>
              Xem ô nhiễm hôm nay gây thiệt hại bao nhiêu tỷ đồng cho TP.HCM
              và HCMC vượt tiêu chuẩn WHO bao nhiêu ngày trong 30 ngày qua.
            </span>
          </div>
        </div>
        <span className="impact-teaser-card__arrow">→</span>
      </Link>
    </div>
  );
}
