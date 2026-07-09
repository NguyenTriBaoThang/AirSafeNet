import { useMemo } from "react";
import type { CSSProperties } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";
import { getUserProfileRule } from "../../data/userProfileRules";
import {
  formatHour,
  getForecastWindow,
  riskColor,
  riskLabel,
  WHO_DAILY_PM25_DOSE,
} from "./airQualityDecisionUtils";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type Slot = {
  time: Date;
  aqi: number;
  pm25: number;
  label: string;
  color: string;
};

function toSlot(point: DashboardChartPointResponse): Slot {
  const time = new Date(point.time);

  return {
    time,
    aqi: point.aqi,
    pm25: point.pm25,
    label: formatHour(time),
    color: riskColor(point.aqi),
  };
}

function pickSeparated(
  points: DashboardChartPointResponse[],
  direction: "best" | "avoid",
  limit = 3
): Slot[] {
  const sorted = [...points].sort((a, b) => {
    if (direction === "best") {
      return a.aqi - b.aqi || a.pm25 - b.pm25;
    }

    return b.aqi - a.aqi || b.pm25 - a.pm25;
  });

  const selected: DashboardChartPointResponse[] = [];

  for (const point of sorted) {
    if (selected.length >= limit) break;

    const currentTime = new Date(point.time).getTime();

    const tooClose = selected.some((item) => {
      const selectedTime = new Date(item.time).getTime();
      const diff = Math.abs(selectedTime - currentTime);

      return diff < 2 * 60 * 60_000;
    });

    if (!tooClose) {
      selected.push(point);
    }
  }

  return selected.map(toSlot);
}

function schoolOutdoorDecision(
  maxAqi: number,
  avgPm25: number
): {
  label: string;
  detail: string;
  color: string;
} {
  if (maxAqi >= 151 || avgPm25 >= 45) {
    return {
      label: "Chuyển vào trong nhà hoặc đổi giờ",
      detail:
        "Không nên tổ chức thể dục, đá bóng hoặc sự kiện sân trường vào khung giờ AQI xấu. Ưu tiên nhà đa năng hoặc lớp học có thông gió, lọc bụi.",
      color: "#ef4444",
    };
  }

  if (maxAqi >= 101 || avgPm25 >= 30) {
    return {
      label: "Tổ chức có điều kiện",
      detail:
        "Rút ngắn thời lượng, giảm vận động mạnh, chuẩn bị khẩu trang cho học sinh nhạy cảm và kiểm tra AQI lại trước giờ bắt đầu.",
      color: "#f97316",
    };
  }

  return {
    label: "Có thể tổ chức",
    detail:
      "Điều kiện phù hợp hơn cho tiết thể dục hoặc sự kiện ngoài trời. Tuy nhiên, vẫn nên có phương án trong nhà nếu xuất hiện spike bất thường.",
    color: "#22c55e",
  };
}

function sensitiveAdvice(maxAqi: number, userGroup: string): string {
  const rule = getUserProfileRule(userGroup);

  if (maxAqi >= 151) {
    return `${rule.shortLabel}: đổi lịch hoạt động ngoài trời, dùng N95/KN95 nếu bắt buộc ra đường và giảm thời lượng còn 20-30 phút.`;
  }

  if (maxAqi >= rule.recommendedNotifyThreshold) {
    return `${rule.shortLabel}: ${rule.alertRule}`;
  }

  return `${rule.shortLabel}: ${rule.activityAdvice}`;
}

export default function AirQualityManagementPanel({
  summary,
  points,
}: Props) {
  const model = useMemo(() => {
    const forecastWindow = getForecastWindow(points, 24);
    const source = forecastWindow.length > 0 ? forecastWindow : points;

    const best = pickSeparated(source, "best");
    const avoid = pickSeparated(source, "avoid");

    const avgPm25 =
      source.length > 0
        ? source.reduce((sum, point) => sum + point.pm25, 0) / source.length
        : summary.currentPm25;

    const maxAqi = Math.max(
      summary.currentAqi,
      ...source.map((point) => point.aqi)
    );

    const estimatedDose = avgPm25 * 24 * 0.625;
    const dosePercent = (estimatedDose / WHO_DAILY_PM25_DOSE) * 100;

    const school = schoolOutdoorDecision(maxAqi, avgPm25);

    return {
      best,
      avoid,
      avgPm25,
      maxAqi,
      dosePercent,
      school,
      sensitiveAdvice: sensitiveAdvice(maxAqi, summary.userGroup),
    };
  }, [points, summary.currentAqi, summary.currentPm25, summary.userGroup]);

  return (
    <section className="aq-management-panel">
      <div className="aq-management-panel__head">
        <div>
          <span>Quản lý chất lượng không khí</span>

          <h3>
            Biến AQI/PM2.5 và dự báo theo giờ thành quyết định hành động
          </h3>

          <p>
            App đọc forecast 24h, nhận diện giờ nên ra ngoài, giờ nên tránh,
            khuyến nghị cho trường học và nhóm nhạy cảm theo hồ sơ sức khỏe
            hiện tại.
          </p>
        </div>

        <div
          className="aq-management-panel__score"
          style={
            {
              "--aq-color": riskColor(model.maxAqi),
            } as CSSProperties
          }
        >
          <strong>{model.maxAqi}</strong>
          <span>AQI cao nhất 24h</span>
        </div>
      </div>

      <div className="aq-decision-grid">
        <div className="aq-decision-card aq-decision-card--good">
          <span>Giờ nên ra ngoài</span>

          <div>
            {model.best.length > 0 ? (
              model.best.map((slot) => (
                <strong key={slot.time.toISOString()}>
                  {slot.label} · AQI {slot.aqi}
                </strong>
              ))
            ) : (
              <strong>Chưa có dữ liệu forecast</strong>
            )}
          </div>
        </div>

        <div className="aq-decision-card aq-decision-card--avoid">
          <span>Giờ nên tránh</span>

          <div>
            {model.avoid.length > 0 ? (
              model.avoid.map((slot) => (
                <strong
                  key={slot.time.toISOString()}
                  style={{ color: slot.color }}
                >
                  {slot.label} · AQI {slot.aqi}
                </strong>
              ))
            ) : (
              <strong>Chưa có dữ liệu forecast</strong>
            )}
          </div>
        </div>

        <div className="aq-decision-card">
          <span>Trường học ngoài trời</span>

          <strong style={{ color: model.school.color }}>
            {model.school.label}
          </strong>

          <p>{model.school.detail}</p>
        </div>

        <div className="aq-decision-card">
          <span>Nhóm nhạy cảm</span>

          <strong>
            {riskLabel(model.maxAqi)} · dose {model.dosePercent.toFixed(0)}%
          </strong>

          <p>{model.sensitiveAdvice}</p>
        </div>
      </div>
    </section>
  );
}