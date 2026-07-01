import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type Purpose = "school" | "work";
type UserGroup = "normal" | "child" | "elderly" | "respiratory" | "pregnant";
type CommuteMode = "motorbike" | "car" | "bus" | "walk";

type ForecastSample = {
  pm25: number;
  aqi: number;
};

type CommuteSlot = {
  targetTime: Date;
  offsetMinutes: number;
  timeLabel: string;
  offsetLabel: string;
  pm25: number;
  aqi: number;
  trafficFactor: number;
  trafficLabel: string;
  riskScore: number;
  riskLabel: string;
  riskColor: string;
  dose: number;
  dosePercent: number;
  recommendation: string;
};

const WHO_DAILY_DOSE = 225;
const SLOT_OFFSETS = [-90, -60, -30, 0, 30, 60, 90, 120];

const PURPOSES: Record<Purpose, {
  label: string;
  icon: string;
  defaultTime: string;
  defaultDuration: number;
}> = {
  school: { label: "Đi học", icon: "🏫", defaultTime: "06:45", defaultDuration: 30 },
  work: { label: "Đi làm", icon: "💼", defaultTime: "07:30", defaultDuration: 40 },
};

const MODE_OPTIONS: Record<CommuteMode, {
  label: string;
  exposure: number;
  breathing: number;
  description: string;
}> = {
  motorbike: { label: "Xe máy", exposure: 1.18, breathing: 1.0, description: "Tiếp xúc trực tiếp khói xe" },
  car: { label: "Ô tô", exposure: 0.68, breathing: 0.75, description: "Giảm phơi nhiễm nếu đóng kính/lọc gió" },
  bus: { label: "Xe buýt", exposure: 0.9, breathing: 0.85, description: "Phơi nhiễm trung bình, tùy tuyến" },
  walk: { label: "Đi bộ", exposure: 1.25, breathing: 1.15, description: "Hít thở nhiều hơn khi đi ngoài trời" },
};

const GROUP_LABEL: Record<UserGroup, string> = {
  normal: "Người dùng phổ thông",
  child: "Trẻ em",
  elderly: "Người cao tuổi",
  respiratory: "Bệnh hô hấp",
  pregnant: "Thai phụ",
};

const GROUP_MULTIPLIER: Record<UserGroup, number> = {
  normal: 1,
  child: 1.16,
  elderly: 1.25,
  respiratory: 1.48,
  pregnant: 1.22,
};

function normalizeGroup(value: string): UserGroup {
  const normalized = value.trim().toLowerCase();
  if (["normal", "child", "elderly", "respiratory", "pregnant"].includes(normalized)) {
    return normalized as UserGroup;
  }
  return "normal";
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseTimeInput(value: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Math.min(23, Math.max(0, Number(hourRaw) || 0));
  const minute = Math.min(59, Math.max(0, Number(minuteRaw) || 0));
  return { hour, minute };
}

function toTimeInput(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? `${rest}p` : ""}`;
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return "Giờ đã chọn";
  const abs = Math.abs(minutes);
  const text = abs >= 60 ? `${abs / 60}h` : `${abs}p`;
  return minutes < 0 ? `Sớm hơn ${text}` : `Muộn hơn ${text}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function resolveDepartureDate(timeValue: string): Date {
  const { hour, minute } = parseTimeInput(timeValue);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target.getTime() < now.getTime() - 30 * 60_000) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

function pm25ToAqi(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];
  const bp = breakpoints.find((item) => pm25 >= item.cLow && pm25 <= item.cHigh) ?? breakpoints[breakpoints.length - 1];
  const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow;
  return Math.round(Math.max(0, Math.min(500, aqi)));
}

function baseRiskFromAqi(aqi: number): number {
  if (aqi <= 50) return aqi * 0.45;
  if (aqi <= 100) return 22 + (aqi - 50) * 0.42;
  if (aqi <= 150) return 43 + (aqi - 100) * 0.4;
  if (aqi <= 200) return 63 + (aqi - 150) * 0.3;
  if (aqi <= 300) return 78 + (aqi - 200) * 0.14;
  return Math.min(100, 92 + (aqi - 300) * 0.08);
}

function riskLabel(score: number): string {
  if (score <= 28) return "An toàn";
  if (score <= 45) return "Ổn";
  if (score <= 60) return "Cần chú ý";
  if (score <= 75) return "Nên dời giờ";
  if (score <= 90) return "Rủi ro cao";
  return "Tránh đi";
}

function riskColor(score: number): string {
  if (score <= 28) return "#22c55e";
  if (score <= 45) return "#84cc16";
  if (score <= 60) return "#eab308";
  if (score <= 75) return "#f97316";
  if (score <= 90) return "#ef4444";
  return "#a855f7";
}

function doseColor(percent: number): string {
  if (percent <= 20) return "#22c55e";
  if (percent <= 40) return "#eab308";
  if (percent <= 65) return "#f97316";
  return "#ef4444";
}

function trafficProfile(date: Date, purpose: Purpose): { factor: number; label: string } {
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();
  const inRange = (start: number, end: number) => minuteOfDay >= start && minuteOfDay <= end;

  if (purpose === "school") {
    if (inRange(6 * 60 + 15, 7 * 60 + 45)) return { factor: 1.2, label: "Giờ vào trường" };
    if (inRange(15 * 60 + 45, 17 * 60 + 15)) return { factor: 1.14, label: "Giờ tan trường" };
  }

  if (inRange(7 * 60, 9 * 60)) return { factor: 1.22, label: "Cao điểm sáng" };
  if (inRange(16 * 60 + 30, 18 * 60 + 30)) return { factor: 1.24, label: "Cao điểm chiều" };
  if (inRange(11 * 60, 13 * 60)) return { factor: 1.08, label: "Giờ trưa" };
  return { factor: 1, label: "Bình thường" };
}

function sampleForecastAt(
  points: DashboardChartPointResponse[],
  target: Date,
  fallback: DashboardSummaryResponse,
): ForecastSample {
  const sorted = [...points]
    .map((point) => ({ ...point, ts: new Date(point.time).getTime() }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);

  if (sorted.length === 0) {
    return { pm25: fallback.currentPm25, aqi: fallback.currentAqi };
  }

  const targetTs = target.getTime();
  if (targetTs <= sorted[0].ts) return { pm25: sorted[0].pm25, aqi: sorted[0].aqi };
  if (targetTs >= sorted[sorted.length - 1].ts) {
    const last = sorted[sorted.length - 1];
    return { pm25: last.pm25, aqi: last.aqi };
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];
    const prev = sorted[index - 1];
    if (targetTs <= next.ts) {
      const ratio = (targetTs - prev.ts) / Math.max(1, next.ts - prev.ts);
      return {
        pm25: prev.pm25 + (next.pm25 - prev.pm25) * ratio,
        aqi: Math.round(prev.aqi + (next.aqi - prev.aqi) * ratio),
      };
    }
  }

  return { pm25: fallback.currentPm25, aqi: fallback.currentAqi };
}

function recommendationForSlot(
  score: number,
  purpose: Purpose,
  group: UserGroup,
  mode: CommuteMode,
  trafficLabel: string,
): string {
  const purposeLabel = PURPOSES[purpose].label.toLowerCase();
  const modeLabel = MODE_OPTIONS[mode].label.toLowerCase();
  const groupLabel = GROUP_LABEL[group].toLowerCase();

  if (score >= 85) {
    return `Không nên ${purposeLabel} ở khung này, đặc biệt với ${groupLabel}. Dời giờ hoặc đổi sang phương tiện kín hơn.`;
  }
  if (score >= 70) {
    return `${trafficLabel} làm phơi nhiễm tăng. Nếu phải đi bằng ${modeLabel}, nên đeo khẩu trang lọc tốt và rút ngắn thời gian ngoài đường.`;
  }
  if (score >= 55) {
    return `Có thể đi nhưng nên tránh tuyến nhiều xe, chuẩn bị khẩu trang và theo dõi triệu chứng hô hấp.`;
  }
  if (score >= 38) {
    return `Khung giờ dùng được. Nếu linh hoạt, chọn slot xanh hơn để tiết kiệm dose budget trong ngày.`;
  }
  return `Khung giờ khá tốt cho ${purposeLabel}. Rủi ro thấp hơn các slot cao điểm gần đó.`;
}

function buildSlot(
  targetTime: Date,
  offsetMinutes: number,
  purpose: Purpose,
  mode: CommuteMode,
  duration: number,
  group: UserGroup,
  points: DashboardChartPointResponse[],
  summary: DashboardSummaryResponse,
): CommuteSlot {
  const sample = sampleForecastAt(points, targetTime, summary);
  const traffic = trafficProfile(targetTime, purpose);
  const modeOption = MODE_OPTIONS[mode];
  const adjustedPm25 = Math.max(0, sample.pm25 * traffic.factor * modeOption.exposure);
  const adjustedAqi = pm25ToAqi(adjustedPm25);
  const durationFactor = Math.min(1.35, 0.78 + duration / 120);
  const riskScore = Math.min(
    100,
    baseRiskFromAqi(adjustedAqi) * GROUP_MULTIPLIER[group] * durationFactor,
  );
  const dose = adjustedPm25 * (duration / 60) * modeOption.breathing;
  const dosePercent = (dose / WHO_DAILY_DOSE) * 100;

  return {
    targetTime,
    offsetMinutes,
    timeLabel: formatTime(targetTime),
    offsetLabel: formatOffset(offsetMinutes),
    pm25: adjustedPm25,
    aqi: adjustedAqi,
    trafficFactor: traffic.factor,
    trafficLabel: traffic.label,
    riskScore,
    riskLabel: riskLabel(riskScore),
    riskColor: riskColor(riskScore),
    dose,
    dosePercent,
    recommendation: recommendationForSlot(riskScore, purpose, group, mode, traffic.label),
  };
}

function sortByRisk(slots: CommuteSlot[]): CommuteSlot[] {
  return [...slots].sort((a, b) => a.riskScore - b.riskScore || a.dosePercent - b.dosePercent);
}

function findDirectionalBest(slots: CommuteSlot[], direction: "earlier" | "later"): CommuteSlot | null {
  const filtered = slots.filter((slot) => direction === "earlier" ? slot.offsetMinutes < 0 : slot.offsetMinutes > 0);
  return sortByRisk(filtered)[0] ?? null;
}

function SlotPill({ slot, onSelect }: { slot: CommuteSlot; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`commute-slot ${slot.offsetMinutes === 0 ? "commute-slot--selected" : ""}`}
      style={{ "--slot-color": slot.riskColor } as CSSProperties}
      onClick={onSelect}
    >
      <span className="commute-slot__offset">{slot.offsetLabel}</span>
      <strong>{toTimeInput(slot.targetTime)}</strong>
      <span className="commute-slot__risk">{slot.riskLabel}</span>
      <span className="commute-slot__meta">AQI {slot.aqi} · {slot.trafficLabel}</span>
    </button>
  );
}

function ResultCard({ title, slot, caption }: {
  title: string;
  slot: CommuteSlot;
  caption: string;
}) {
  return (
    <div className="commute-result" style={{ "--result-color": slot.riskColor } as CSSProperties}>
      <div className="commute-result__top">
        <span>{title}</span>
        <strong>{slot.timeLabel}</strong>
      </div>
      <div className="commute-result__score">
        <strong>{Math.round(slot.riskScore)}</strong>
        <div>
          <span>{slot.riskLabel}</span>
          <small>{caption}</small>
        </div>
      </div>
      <div className="commute-result__stats">
        <span>AQI {slot.aqi}</span>
        <span>PM2.5 {slot.pm25.toFixed(1)}</span>
        <span>Dose {slot.dosePercent.toFixed(1)}%</span>
      </div>
      <p>{slot.recommendation}</p>
    </div>
  );
}

export default function CommuteSafetyPlanner({ summary, points }: Props) {
  const [purpose, setPurpose] = useState<Purpose>("school");
  const [departTime, setDepartTime] = useState(PURPOSES.school.defaultTime);
  const [duration, setDuration] = useState(PURPOSES.school.defaultDuration);
  const [mode, setMode] = useState<CommuteMode>("motorbike");
  const [group, setGroup] = useState<UserGroup>(() => normalizeGroup(summary.userGroup));

  useEffect(() => {
    setGroup(normalizeGroup(summary.userGroup));
  }, [summary.userGroup]);

  function handlePurposeChange(nextPurpose: Purpose) {
    setPurpose(nextPurpose);
    setDepartTime(PURPOSES[nextPurpose].defaultTime);
    setDuration(PURPOSES[nextPurpose].defaultDuration);
  }

  const plannedDate = useMemo(() => resolveDepartureDate(departTime), [departTime]);

  const slots = useMemo(() => (
    SLOT_OFFSETS.map((offset) => buildSlot(
      addMinutes(plannedDate, offset),
      offset,
      purpose,
      mode,
      duration,
      group,
      points,
      summary,
    ))
  ), [duration, group, mode, plannedDate, points, purpose, summary]);

  const plannedSlot = slots.find((slot) => slot.offsetMinutes === 0) ?? slots[0];
  const bestSlot = sortByRisk(slots)[0] ?? plannedSlot;
  const earlierBest = findDirectionalBest(slots, "earlier");
  const laterBest = findDirectionalBest(slots, "later");
  const avoidedSlots = slots.filter((slot) => slot.riskScore >= 65).length;
  const riskSaving = Math.max(0, plannedSlot.riskScore - bestSlot.riskScore);
  const doseSaving = Math.max(0, plannedSlot.dosePercent - bestSlot.dosePercent);
  const doseTone = doseColor(plannedSlot.dosePercent);

  return (
    <section className="commute-planner">
      <div className="commute-planner__header">
        <div>
          <div className="commute-planner__eyebrow">Commute Safety Planner</div>
          <h3>Chọn giờ đi học/đi làm ít rủi ro hơn</h3>
          <p>So sánh forecast quanh giờ xuất phát, tính thêm cao điểm giao thông, phương tiện và nhóm sức khỏe.</p>
        </div>
        <div className="commute-planner__badge">
          {PURPOSES[purpose].icon} {PURPOSES[purpose].label} · {MODE_OPTIONS[mode].label}
        </div>
      </div>

      <div className="commute-controls">
        <div className="commute-field commute-field--purpose">
          <label>Mục đích</label>
          <div className="commute-purpose-grid">
            {(Object.keys(PURPOSES) as Purpose[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`commute-purpose ${purpose === key ? "commute-purpose--active" : ""}`}
                onClick={() => handlePurposeChange(key)}
              >
                <span>{PURPOSES[key].icon}</span>
                <strong>{PURPOSES[key].label}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="commute-field">
          <label>Giờ xuất phát</label>
          <input
            type="time"
            value={departTime}
            onChange={(event) => setDepartTime(event.target.value)}
          />
          <span>App so sánh quanh khung này</span>
        </div>

        <div className="commute-field">
          <label>Thời lượng</label>
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {[15, 20, 30, 40, 50, 60, 75, 90].map((value) => (
              <option key={value} value={value}>{formatDuration(value)}</option>
            ))}
          </select>
          <span>Thời gian ở ngoài đường</span>
        </div>

        <div className="commute-field">
          <label>Phương tiện</label>
          <select value={mode} onChange={(event) => setMode(event.target.value as CommuteMode)}>
            {(Object.keys(MODE_OPTIONS) as CommuteMode[]).map((key) => (
              <option key={key} value={key}>{MODE_OPTIONS[key].label}</option>
            ))}
          </select>
          <span>{MODE_OPTIONS[mode].description}</span>
        </div>

        <div className="commute-field">
          <label>Nhóm sức khỏe</label>
          <select value={group} onChange={(event) => setGroup(event.target.value as UserGroup)}>
            {(Object.keys(GROUP_LABEL) as UserGroup[]).map((key) => (
              <option key={key} value={key}>{GROUP_LABEL[key]}</option>
            ))}
          </select>
          <span>Hệ số nhạy cảm ×{GROUP_MULTIPLIER[group].toFixed(2)}</span>
        </div>
      </div>

      <div className="commute-results">
        <ResultCard
          title="Giờ bạn chọn"
          slot={plannedSlot}
          caption={`${plannedSlot.trafficLabel} · hệ số ${plannedSlot.trafficFactor.toFixed(2)}`}
        />
        <ResultCard
          title="Giờ nên đi hơn"
          slot={bestSlot}
          caption={`Giảm ${riskSaving.toFixed(0)} điểm risk · ${doseSaving.toFixed(1)}% dose`}
        />
        <div className="commute-dose-card">
          <div className="commute-dose-card__top">
            <span>Dose budget chuyến đi</span>
            <strong style={{ color: doseTone }}>{plannedSlot.dosePercent.toFixed(1)}%</strong>
          </div>
          <div className="commute-dose-card__bar">
            <div style={{ width: `${Math.min(100, plannedSlot.dosePercent)}%`, background: doseTone }} />
          </div>
          <p>
            Chuyến này tiêu hao khoảng {plannedSlot.dose.toFixed(1)} µg / {WHO_DAILY_DOSE} µg ngân sách ngày.
            {avoidedSlots > 0 ? ` Có ${avoidedSlots} slot quanh giờ này nên tránh.` : " Các slot quanh giờ này tương đối ổn."}
          </p>
        </div>
      </div>

      <div className="commute-slot-panel">
        <div className="commute-slot-panel__header">
          <strong>So sánh theo khung giờ</strong>
          <span>Bấm một slot để đặt lại giờ xuất phát và tính lại toàn bộ</span>
        </div>
        <div className="commute-slot-grid">
          {slots.map((slot) => (
            <SlotPill
              key={`${slot.offsetMinutes}-${slot.targetTime.toISOString()}`}
              slot={slot}
              onSelect={() => setDepartTime(toTimeInput(slot.targetTime))}
            />
          ))}
        </div>
      </div>

      <div className="commute-insights">
        <div>
          <span>Sớm hơn tốt nhất</span>
          <strong>{earlierBest ? `${toTimeInput(earlierBest.targetTime)} · ${earlierBest.riskLabel}` : "Không có"}</strong>
        </div>
        <div>
          <span>Muộn hơn tốt nhất</span>
          <strong>{laterBest ? `${toTimeInput(laterBest.targetTime)} · ${laterBest.riskLabel}` : "Không có"}</strong>
        </div>
        <div>
          <span>Khuyến nghị nhanh</span>
          <strong>
            {bestSlot.offsetMinutes === 0
              ? "Giữ giờ hiện tại"
              : `${bestSlot.offsetMinutes < 0 ? "Đi sớm" : "Đi muộn"} ${Math.abs(bestSlot.offsetMinutes)} phút`}
          </strong>
        </div>
      </div>

      <div className="commute-footnote">
        Planner dùng forecast hiện tại, ước lượng cao điểm giao thông và hệ số phơi nhiễm theo phương tiện. Khi có dữ liệu tuyến đường thật,
        phần này có thể nâng cấp thành so sánh route-by-route.
      </div>
    </section>
  );
}