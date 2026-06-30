import { useMemo } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";
import RiskBadge from "./RiskBadge";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type UserGroup = "normal" | "child" | "elderly" | "respiratory" | "pregnant";

type Slot = {
  timeLabel: string;
  hourLabel: string;
  aqi: number;
  pm25: number;
  risk: string;
};

type Briefing = {
  bestSlots: Slot[];
  avoidSlots: Slot[];
  groupLabel: string;
  groupAdvice: string;
  mask: {
    label: string;
    detail: string;
    tone: "good" | "watch" | "warn" | "danger";
  };
  dose: {
    value: number;
    percent: number;
    label: string;
    detail: string;
    tone: "good" | "watch" | "warn" | "danger";
  };
  headline: string;
};

const WHO_DAILY_DOSE = 225;
const BREATHING_RATE = 0.625;

const GROUP_LABEL: Record<UserGroup, string> = {
  normal: "Người dùng phổ thông",
  child: "Trẻ em",
  elderly: "Người cao tuổi",
  respiratory: "Người có bệnh hô hấp",
  pregnant: "Phụ nữ mang thai",
};

function normalizeGroup(value: string): UserGroup {
  const group = value.trim().toLowerCase();
  if (["child", "elderly", "respiratory", "pregnant", "normal"].includes(group)) {
    return group as UserGroup;
  }
  return "normal";
}

function getSeverity(risk: string, aqi: number): number {
  const normalized = risk.toUpperCase();
  if (normalized.includes("HAZARDOUS") || aqi > 300) return 5;
  if (normalized.includes("VERY") || aqi > 200) return 4;
  if (normalized === "UNHEALTHY" || aqi > 150) return 3;
  if (normalized.includes("SENSITIVE") || aqi > 100) return 2;
  if (normalized === "MODERATE" || aqi > 50) return 1;
  return 0;
}

function formatSlot(point: DashboardChartPointResponse): Slot {
  const time = new Date(point.time);
  return {
    timeLabel: time.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      hour12: false,
    }),
    hourLabel: time.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    aqi: point.aqi,
    pm25: point.pm25,
    risk: point.risk,
  };
}

function pickSeparatedSlots(
  points: DashboardChartPointResponse[],
  sortFn: (a: DashboardChartPointResponse, b: DashboardChartPointResponse) => number,
  limit = 3,
): Slot[] {
  const selected: DashboardChartPointResponse[] = [];

  for (const point of [...points].sort(sortFn)) {
    if (selected.length >= limit) break;

    const currentTime = new Date(point.time).getTime();
    const isTooClose = selected.some((item) => {
      const diff = Math.abs(new Date(item.time).getTime() - currentTime);
      return diff < 2 * 60 * 60 * 1000;
    });

    if (!isTooClose) selected.push(point);
  }

  return selected.map(formatSlot);
}

function getMaskRecommendation(
  peakAqi: number,
  group: UserGroup,
): Briefing["mask"] {
  const sensitive = group !== "normal";

  if (group === "respiratory") {
    if (peakAqi > 150) {
      return {
        label: "N95/N99 khi ra ngoài",
        detail: "AQI có thể lên cao với nhóm hô hấp. Mang khẩu trang lọc hạt mịn và thuốc cắt cơn nếu có chỉ định.",
        tone: "danger",
      };
    }
    if (peakAqi > 100) {
      return {
        label: "N95 hoặc KF94",
        detail: "Nên đeo khi ra ngoài, đặc biệt lúc di chuyển lâu hoặc vận động.",
        tone: "warn",
      };
    }
    if (peakAqi > 50) {
      return {
        label: "KF94 khuyến nghị",
        detail: "Không khí ở mức trung bình; nhóm hô hấp vẫn nên bảo vệ đường thở.",
        tone: "watch",
      };
    }
    return {
      label: "Khẩu trang y tế tùy chọn",
      detail: "AQI dự kiến tốt, nhưng vẫn nên mang theo nếu có triệu chứng hô hấp.",
      tone: "good",
    };
  }

  if (peakAqi > 150) {
    return {
      label: "N95/KF94 bắt buộc",
      detail: "Chỉ ra ngoài khi cần thiết và tránh hoạt động cường độ cao.",
      tone: "danger",
    };
  }
  if (peakAqi > 100) {
    return {
      label: sensitive ? "N95 hoặc KF94" : "KF94 khuyến nghị",
      detail: sensitive
        ? "Nhóm nhạy cảm nên dùng khẩu trang lọc hạt mịn khi ra ngoài."
        : "Người khỏe mạnh nên đeo KF94 nếu phải di chuyển lâu.",
      tone: "warn",
    };
  }
  if (peakAqi > 50) {
    return {
      label: sensitive ? "Khẩu trang y tế/KF94" : "Mang theo dự phòng",
      detail: sensitive
        ? "Nên đeo khi đi đường đông xe hoặc ở ngoài trời hơn 30 phút."
        : "Không bắt buộc, nhưng nên mang theo nếu đi vào giờ cao điểm.",
      tone: "watch",
    };
  }
  return {
    label: "Không cần khẩu trang đặc biệt",
    detail: "AQI dự kiến tốt. Chỉ cần khẩu trang thông thường nếu môi trường đông người.",
    tone: "good",
  };
}

function getGroupAdvice(group: UserGroup, peakAqi: number): string {
  if (group === "respiratory") {
    if (peakAqi > 100) {
      return "Ưu tiên ở trong nhà trong giờ AQI cao, mang inhaler/thuốc theo chỉ định, dừng hoạt động nếu khó thở hoặc tức ngực.";
    }
    return "Theo dõi triệu chứng hô hấp, tránh chạy bộ mạnh ngoài trời và chọn các khung giờ AQI thấp nhất.";
  }

  if (group === "child") {
    if (peakAqi > 100) {
      return "Không nên cho trẻ chơi ngoài trời lâu. Nếu có tiết thể dục/ra chơi, nên chuyển vào trong nhà hoặc giảm thời lượng.";
    }
    return "Cho trẻ ra ngoài ở khung giờ tốt, tránh đường đông xe và nhắc trẻ uống nước sau khi hoạt động.";
  }

  if (group === "elderly") {
    if (peakAqi > 100) {
      return "Tránh đi bộ nhanh hoặc đứng ngoài trời lâu. Nên đi cùng người thân và nghỉ ngay nếu chóng mặt, đau ngực, khó thở.";
    }
    return "Có thể ra ngoài nhẹ nhàng ở giờ tốt; tránh nắng gắt, đường đông xe và uống nước trước khi đi.";
  }

  if (group === "pregnant") {
    if (peakAqi > 100) {
      return "Ưu tiên hoạt động trong nhà, hạn chế đi lại giờ cao điểm và đeo khẩu trang lọc tốt nếu bắt buộc ra ngoài.";
    }
    return "Chọn khung giờ AQI thấp, tránh vận động mạnh và vào trong nhà ngay nếu thấy mệt hoặc khó thở.";
  }

  if (peakAqi > 150) {
    return "Hạn chế hoạt động ngoài trời, đặc biệt là chạy bộ hoặc đạp xe lâu. Chuyển lịch sang giờ AQI thấp hơn.";
  }
  if (peakAqi > 100) {
    return "Có thể ra ngoài ngắn, nhưng nên tránh vận động mạnh và tránh các khung giờ AQI cao nhất.";
  }
  return "Có thể sinh hoạt bình thường, ưu tiên các khung giờ AQI thấp để giảm phơi nhiễm tích lũy.";
}

function getDoseTone(percent: number): Briefing["dose"]["tone"] {
  if (percent <= 60) return "good";
  if (percent <= 85) return "watch";
  if (percent <= 100) return "warn";
  return "danger";
}

function getDoseLabel(percent: number): string {
  if (percent <= 60) return "Còn dư nhiều";
  if (percent <= 85) return "Cần chú ý";
  if (percent <= 100) return "Gần ngưỡng WHO";
  return "Vượt ngưỡng WHO";
}

function buildBriefing(
  summary: DashboardSummaryResponse,
  points: DashboardChartPointResponse[],
): Briefing {
  const firstDay = points.slice(0, 24);
  const source = firstDay.length > 0 ? firstDay : points;
  const group = normalizeGroup(summary.userGroup);
  const peakAqi = Math.max(summary.currentAqi, summary.maxAqiNext24h);

  const bestSlots = pickSeparatedSlots(
    source,
    (a, b) => a.aqi - b.aqi || getSeverity(a.risk, a.aqi) - getSeverity(b.risk, b.aqi),
  );
  const avoidSlots = pickSeparatedSlots(
    source,
    (a, b) => b.aqi - a.aqi || getSeverity(b.risk, b.aqi) - getSeverity(a.risk, a.aqi),
  );

  const avgPm25 = source.length
    ? source.reduce((sum, point) => sum + point.pm25, 0) / source.length
    : summary.currentPm25;
  const doseValue = avgPm25 * 24 * BREATHING_RATE;
  const dosePercent = (doseValue / WHO_DAILY_DOSE) * 100;
  const doseTone = getDoseTone(dosePercent);

  const bestText = bestSlots.length
    ? `Nên ra ngoài quanh ${bestSlots[0].hourLabel}`
    : "Chưa có khung giờ tốt rõ ràng";
  const avoidText = avoidSlots.length
    ? `tránh mạnh nhất quanh ${avoidSlots[0].hourLabel}`
    : "theo dõi lại khi có dữ liệu mới";

  return {
    bestSlots,
    avoidSlots,
    groupLabel: GROUP_LABEL[group],
    groupAdvice: getGroupAdvice(group, peakAqi),
    mask: getMaskRecommendation(peakAqi, group),
    dose: {
      value: doseValue,
      percent: dosePercent,
      label: getDoseLabel(dosePercent),
      detail: `Ước tính từ PM2.5 trung bình 24h (${avgPm25.toFixed(1)} µg/m³) so với ngưỡng WHO ${WHO_DAILY_DOSE} µg/ngày.`,
      tone: doseTone,
    },
    headline: `${bestText}; ${avoidText}.`,
  };
}

function TonePill({ tone, children }: {
  tone: "good" | "watch" | "warn" | "danger";
  children: React.ReactNode;
}) {
  return <span className={`daily-briefing-pill daily-briefing-pill--${tone}`}>{children}</span>;
}

function SlotList({ title, slots, variant }: {
  title: string;
  slots: Slot[];
  variant: "best" | "avoid";
}) {
  return (
    <div className={`daily-briefing-slots daily-briefing-slots--${variant}`}>
      <div className="daily-briefing-slots__title">{title}</div>
      <div className="daily-briefing-slots__list">
        {slots.map((slot) => (
          <div className="daily-briefing-slot" key={`${variant}-${slot.timeLabel}`}>
            <div>
              <strong>{slot.timeLabel}</strong>
              <span>PM2.5 {slot.pm25.toFixed(1)} µg/m³</span>
            </div>
            <div className="daily-briefing-slot__aqi">
              <strong>{slot.aqi}</strong>
              <span>AQI</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailySafetyBriefing({ summary, points }: Props) {
  const briefing = useMemo(
    () => buildBriefing(summary, points),
    [summary, points],
  );

  return (
    <section className="daily-briefing-card">
      <div className="daily-briefing-card__header">
        <div className="daily-briefing-card__title">
          <span className="daily-briefing-card__icon">☀️</span>
          <div>
            <h3>Daily Safety Briefing</h3>
            <p>Bản tin an toàn hôm nay dựa trên 24h dự báo gần nhất</p>
          </div>
        </div>
        <div className="daily-briefing-card__risk">
          <RiskBadge risk={summary.currentRisk} />
        </div>
      </div>

      <div className="daily-briefing-card__headline">
        {briefing.headline}
      </div>

      <div className="daily-briefing-card__grid">
        <SlotList title="Nên ra ngoài" slots={briefing.bestSlots} variant="best" />
        <SlotList title="Nên tránh" slots={briefing.avoidSlots} variant="avoid" />

        <div className="daily-briefing-advice">
          <div className="daily-briefing-advice__topline">
            <span>Nhóm sức khỏe</span>
            <strong>{briefing.groupLabel}</strong>
          </div>
          <p>{briefing.groupAdvice}</p>
        </div>

        <div className="daily-briefing-protection">
          <div className="daily-briefing-protection__item">
            <div>
              <span>Khẩu trang</span>
              <strong>{briefing.mask.label}</strong>
            </div>
            <TonePill tone={briefing.mask.tone}>AQI đỉnh {summary.maxAqiNext24h}</TonePill>
          </div>
          <p>{briefing.mask.detail}</p>

          <div className="daily-briefing-dose">
            <div className="daily-briefing-dose__head">
              <div>
                <span>WHO Dose Budget dự kiến</span>
                <strong>{briefing.dose.value.toFixed(0)} µg</strong>
              </div>
              <TonePill tone={briefing.dose.tone}>
                {Math.round(briefing.dose.percent)}% · {briefing.dose.label}
              </TonePill>
            </div>
            <div className="daily-briefing-dose__bar">
              <div
                className={`daily-briefing-dose__fill daily-briefing-dose__fill--${briefing.dose.tone}`}
                style={{ width: `${Math.min(100, briefing.dose.percent)}%` }}
              />
            </div>
            <p>{briefing.dose.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
