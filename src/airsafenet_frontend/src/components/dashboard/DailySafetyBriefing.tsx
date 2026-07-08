import { useMemo } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";
import { getUserProfileRule, type UserProfileRule } from "../../data/userProfileRules";
import RiskBadge from "./RiskBadge";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type Slot = {
  timeLabel: string;
  hourLabel: string;
  aqi: number;
  pm25: number;
  risk: string;
};

type Tone = "good" | "watch" | "warn" | "danger";

type Briefing = {
  bestSlots: Slot[];
  avoidSlots: Slot[];
  rule: UserProfileRule;
  groupAdvice: string;
  mask: {
    label: string;
    detail: string;
    tone: Tone;
  };
  dose: {
    value: number;
    percent: number;
    label: string;
    detail: string;
    tone: Tone;
  };
  headline: string;
};

const WHO_DAILY_DOSE = 225;
const BREATHING_RATE = 0.625;

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

function toneFromAqi(peakAqi: number, rule: UserProfileRule): Tone {
  if (peakAqi >= 150) return "danger";
  if (peakAqi >= rule.recommendedNotifyThreshold) return "warn";
  if (peakAqi > 50) return "watch";
  return "good";
}

function getMaskRecommendation(
  peakAqi: number,
  rule: UserProfileRule,
): Briefing["mask"] {
  const tone = toneFromAqi(peakAqi, rule);

  if (tone === "danger") {
    return {
      label: rule.id === "outdoor_athlete" ? "Không nên tập nặng" : "N95/KN95",
      detail: rule.maskRule,
      tone,
    };
  }

  if (tone === "warn") {
    const label = rule.id === "asthma" || rule.id === "motorbike_commuter"
      ? "N95/KN95"
      : "KF94/N95";
    return {
      label,
      detail: rule.maskRule,
      tone,
    };
  }

  if (tone === "watch") {
    return {
      label: rule.id === "asthma" ? "N95 dự phòng" : "Mang theo dự phòng",
      detail: rule.outdoorRule,
      tone,
    };
  }

  return {
    label: "Không cần đặc biệt",
    detail: rule.activityAdvice,
    tone,
  };
}

function getGroupAdvice(rule: UserProfileRule, peakAqi: number): string {
  if (peakAqi >= 150) {
    if (rule.id === "outdoor_athlete") {
      return "Không nên chạy bộ/đá bóng ngoài trời. Chuyển indoor hoặc dời sang khung AQI thấp hơn.";
    }
    if (rule.id === "motorbike_commuter") {
      return "Giảm thời gian chạy xe ngoài đường, đeo N95/KN95 ôm kín và tránh đứng lâu sau xe tải/xe buýt.";
    }
    return `${rule.shortLabel}: ${rule.outdoorRule}`;
  }

  if (peakAqi >= rule.recommendedNotifyThreshold) {
    return `${rule.shortLabel}: ${rule.alertRule}`;
  }

  return rule.activityAdvice;
}

function getDoseTone(percent: number): Tone {
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
  const rule = getUserProfileRule(summary.userGroup);
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
  const profileAdjustedPercent = (doseValue / WHO_DAILY_DOSE) * 100 * rule.sensitivityMultiplier;
  const doseTone = getDoseTone(profileAdjustedPercent);

  const bestText = bestSlots.length
    ? `Nên ra ngoài quanh ${bestSlots[0].hourLabel}`
    : "Chưa có khung giờ tốt rõ ràng";
  const avoidText = avoidSlots.length
    ? `tránh mạnh nhất quanh ${avoidSlots[0].hourLabel}`
    : "theo dõi lại khi có dữ liệu mới";

  return {
    bestSlots,
    avoidSlots,
    rule,
    groupAdvice: getGroupAdvice(rule, peakAqi),
    mask: getMaskRecommendation(peakAqi, rule),
    dose: {
      value: doseValue,
      percent: profileAdjustedPercent,
      label: getDoseLabel(profileAdjustedPercent),
      detail: `Ước tính từ PM2.5 trung bình 24h (${avgPm25.toFixed(1)} µg/m³), hiệu chỉnh theo hệ số nhạy cảm ×${rule.sensitivityMultiplier.toFixed(2)} của ${rule.shortLabel}.`,
      tone: doseTone,
    },
    headline: `${bestText}; ${avoidText}.`,
  };
}

function TonePill({ tone, children }: {
  tone: Tone;
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
            <span>Hồ sơ</span>
            <strong>{briefing.rule.label}</strong>
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