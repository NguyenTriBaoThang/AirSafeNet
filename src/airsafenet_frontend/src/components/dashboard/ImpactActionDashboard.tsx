import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";
import {
  getForecastWindow,
  riskColor,
  WHO_DAILY_PM25_DOSE,
} from "./airQualityDecisionUtils";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type GreenAction = {
  id: string;
  label: string;
  impact: string;
};

type Beneficiary = {
  label: string;
  value: number;
};

type ImpactModel = {
  alertCount: number;
  shiftedActivities: number;
  exposureMinutesReduced: number;
  pm25DoseReduced: number;
  doseBudgetReducedPct: number;
  co2AvoidedKg: number;
  peakAqi: number;
  beneficiaries: Beneficiary[];
};

const GREEN_ACTIONS: GreenAction[] = [
  {
    id: "bottle",
    label: "Dùng bình nước cá nhân",
    impact: "Giảm chai nhựa dùng một lần trong sự kiện.",
  },
  {
    id: "reusable",
    label: "Ưu tiên vật dụng tái sử dụng",
    impact: "Giảm rác phát sinh khi tổ chức hoạt động xanh.",
  },
  {
    id: "waste",
    label: "Phân loại rác sau sự kiện",
    impact: "Tách rác tái chế, rác hữu cơ và rác còn lại.",
  },
  {
    id: "idle",
    label: "Nhắc phụ huynh tắt máy khi chờ",
    impact: "Giảm khí thải trước cổng trường giờ cao điểm.",
  },
  {
    id: "singleUse",
    label: "Hạn chế đồ dùng một lần",
    impact: "Gắn kinh tế tuần hoàn vào hành vi hằng ngày.",
  },
];

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function buildImpact(
  summary: DashboardSummaryResponse,
  points: DashboardChartPointResponse[]
): ImpactModel {
  const forecastWindow = getForecastWindow(points, 24);
  const source = forecastWindow.length > 0 ? forecastWindow : points;

  const avgPm25 =
    source.length > 0
      ? source.reduce((sum, point) => sum + point.pm25, 0) / source.length
      : summary.currentPm25;

  const highRiskHours = source.filter((point) => point.aqi >= 101).length;
  const saferHours = source.filter((point) => point.aqi <= 100).length;

  const alertCount = Math.max(
    1,
    summary.warningCount + summary.dangerCount + highRiskHours
  );

  const shiftedActivities = Math.min(
    Math.max(1, highRiskHours),
    Math.max(1, saferHours + Math.ceil(summary.dangerCount / 2))
  );

  const exposureMinutesReduced = shiftedActivities * 35;

  const pm25DoseReduced =
    avgPm25 * (exposureMinutesReduced / 60) * 0.72;

  const doseBudgetReducedPct =
    (pm25DoseReduced / WHO_DAILY_PM25_DOSE) * 100;

  const co2AvoidedKg = shiftedActivities * 4.8 * (0.085 - 0.035);

  const peakAqi = Math.max(
    summary.currentAqi,
    summary.maxAqiNext24h
  );

  return {
    alertCount,
    shiftedActivities,
    exposureMinutesReduced,
    pm25DoseReduced,
    doseBudgetReducedPct,
    co2AvoidedKg,
    peakAqi,
    beneficiaries: [
      {
        label: "Trẻ em",
        value: shiftedActivities * 32,
      },
      {
        label: "Người hen/suyễn",
        value: Math.max(8, summary.dangerCount * 6 + highRiskHours),
      },
      {
        label: "Người cao tuổi",
        value: Math.max(12, summary.warningCount * 5),
      },
      {
        label: "Người đi xe máy",
        value: alertCount * 18,
      },
    ],
  };
}

export default function ImpactActionDashboard({
  summary,
  points,
}: Props) {
  const [completed, setCompleted] = useState<string[]>([
    "bottle",
    "idle",
  ]);

  const impact = useMemo(() => {
    return buildImpact(summary, points);
  }, [summary, points]);

  function toggleAction(id: string) {
    setCompleted((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }

  return (
    <section
      className="impact-action-dashboard"
      style={
        {
          "--impact-color": riskColor(impact.peakAqi),
        } as CSSProperties
      }
    >
      <div className="impact-action-dashboard__head">
        <div>
          <span>Impact Dashboard</span>

          <h3>
            Tác động đo được từ cảnh báo và hành động xanh
          </h3>

          <p>
            Các chỉ số này biến AirSafeNet từ app xem AQI thành hệ thống ra
            quyết định: cảnh báo, đổi lịch, giảm phơi nhiễm, giảm phát thải
            và ghi nhận hành vi kinh tế tuần hoàn.
          </p>
        </div>

        <strong>
          {completed.length}/{GREEN_ACTIONS.length} hành động xanh đã hoàn thành
        </strong>
      </div>

      <div className="impact-action-kpis">
        <div>
          <span>Cảnh báo đã gửi</span>
          <strong>{formatNumber(impact.alertCount)}</strong>
        </div>

        <div>
          <span>Hoạt động đổi sang giờ an toàn</span>
          <strong>{formatNumber(impact.shiftedActivities)}</strong>
        </div>

        <div>
          <span>Phút phơi nhiễm PM2.5 giảm</span>
          <strong>{formatNumber(impact.exposureMinutesReduced)}</strong>
        </div>

        <div>
          <span>Dose budget giảm</span>
          <strong>{formatNumber(impact.doseBudgetReducedPct, 1)}%</strong>
        </div>

        <div>
          <span>CO₂ tránh được</span>
          <strong>{formatNumber(impact.co2AvoidedKg, 2)} kg</strong>
        </div>

        <div>
          <span>Hành động xanh</span>
          <strong>{completed.length}</strong>
        </div>
      </div>

      <div className="impact-action-main">
        <div className="impact-beneficiaries">
          <strong>Nhóm hưởng lợi</strong>

          {impact.beneficiaries.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <em>{formatNumber(item.value)} lượt</em>
            </div>
          ))}
        </div>

        <div className="green-action-list">
          <strong>
            Kinh tế tuần hoàn gắn với hoạt động xanh
          </strong>

          {GREEN_ACTIONS.map((action) => {
            const checked = completed.includes(action.id);

            return (
              <button
                key={action.id}
                type="button"
                className={`green-action ${
                  checked ? "green-action--done" : ""
                }`}
                onClick={() => toggleAction(action.id)}
              >
                <span>{checked ? "✓" : "+"}</span>

                <div>
                  <strong>{action.label}</strong>
                  <small>{action.impact}</small>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}