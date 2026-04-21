import { useCallback, useEffect, useState } from "react";
import { getDashboardFullApi } from "../api/dashboard";
import type { DashboardDays, DashboardFullResponse } from "../types/dashboard";
import ImpactEstimateWidget from "../components/dashboard/ImpactEstimateWidget";
import WhoComparisonChart from "../components/dashboard/WhoComparisonChart";
import HealthScoreWidget from "../components/dashboard/HealthScoreWidget";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import DashboardSkeleton from "../components/common/DashboardSkeleton";
import { useToast } from "../components/common/useToast";

export default function ImpactPage() {
  const [data,    setData]    = useState<DashboardFullResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [days,    setDays]    = useState<DashboardDays>(1);
  const { showToast } = useToast();

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const result = await getDashboardFullApi(days, "forecast");
      setData(result);
      if (silent) showToast("Đã làm mới dữ liệu", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setError(msg);
      if (!silent) showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [days, showToast]);

  useEffect(() => { load(); }, [days]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="cache-init-state">
        <div className="cache-init-state__icon">⚠️</div>
        <h3>Không tải được dữ liệu</h3>
        <p>{error || "Vui lòng thử lại."}</p>
        <button className="btn btn-secondary" onClick={() => load()}>↺ Thử lại</button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="dashboard-page">
      <SectionHeader
        eyebrow="Phân tích tác động"
        title="Chi phí y tế & So sánh tiêu chuẩn WHO"
        description={`Cập nhật lúc ${new Date(summary.generatedAt).toLocaleString("vi-VN")} · Nhóm: ${summary.userGroup}`}
        rightSlot={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              className="impact-days-select"
              value={days}
              onChange={e => setDays(Number(e.target.value) as DashboardDays)}
            >
              <option value={1}>1 ngày</option>
              <option value={3}>3 ngày</option>
              <option value={7}>7 ngày</option>
            </select>
            <button className="btn btn-primary" onClick={() => load(true)}>
              ↺ Làm mới
            </button>
          </div>
        }
      />

      <div className="section-toolbar">
        <StatusChip label={`AQI ${summary.currentAqi}`} variant="info" />
        <StatusChip label={`PM2.5 ${summary.currentPm25.toFixed(1)} µg/m³`} variant="neutral" />
        <StatusChip label={`${summary.dangerCount} giờ nguy hiểm`} variant={summary.dangerCount > 0 ? "error" : "success"} />
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 25 }}>
        <HealthScoreWidget
          currentAqi={summary.currentAqi}
          currentRisk={summary.currentRisk}
          warningCount={summary.warningCount}
          dangerCount={summary.dangerCount}
          days={days}
        />
      </div>

      <ImpactEstimateWidget
        currentRisk={summary.currentRisk}
        currentAqi={summary.currentAqi}
        currentPm25={summary.currentPm25}
        warningCount={summary.warningCount}
        days={days}
      />

      <WhoComparisonChart />
    </div>
  );
}