import { useCallback, useEffect, useState } from "react";
import { getDashboardFullApi } from "../api/dashboard";
import type { DashboardDays, DashboardFullResponse } from "../types/dashboard";
import ImpactEstimateWidget from "../components/dashboard/ImpactEstimateWidget";
import ImpactActionDashboard from "../components/dashboard/ImpactActionDashboard";
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
      if (silent) showToast("ÄÃ£ lÃ m má»›i dá»¯ liá»‡u", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "CÃ³ lá»—i xáº£y ra";
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
        <div className="cache-init-state__icon">âš ï¸</div>
        <h3>KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u</h3>
        <p>{error || "Vui lÃ²ng thá»­ láº¡i."}</p>
        <button className="btn btn-secondary" onClick={() => load()}>â†º Thá»­ láº¡i</button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="dashboard-page">
      <SectionHeader
        eyebrow="PhÃ¢n tÃ­ch tÃ¡c Ä‘á»™ng"
        title="Chi phÃ­ y táº¿ & So sÃ¡nh tiÃªu chuáº©n WHO"
        description={`Cáº­p nháº­t lÃºc ${new Date(summary.generatedAt).toLocaleString("vi-VN")} Â· NhÃ³m: ${summary.userGroup}`}
        rightSlot={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              className="impact-days-select"
              value={days}
              onChange={e => setDays(Number(e.target.value) as DashboardDays)}
            >
              <option value={1}>1 ngÃ y</option>
              <option value={3}>3 ngÃ y</option>
              <option value={7}>7 ngÃ y</option>
            </select>
            <button className="btn btn-primary" onClick={() => load(true)}>
              â†º LÃ m má»›i
            </button>
          </div>
        }
      />

      <div className="section-toolbar">
        <StatusChip label={`AQI ${summary.currentAqi}`} variant="info" />
        <StatusChip label={`PM2.5 ${summary.currentPm25.toFixed(1)} Âµg/mÂ³`} variant="neutral" />
        <StatusChip label={`${summary.dangerCount} giá» nguy hiá»ƒm`} variant={summary.dangerCount > 0 ? "error" : "success"} />
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

      <ImpactActionDashboard summary={summary} points={data.chart.points} />

      <WhoComparisonChart />
    </div>
  );
}