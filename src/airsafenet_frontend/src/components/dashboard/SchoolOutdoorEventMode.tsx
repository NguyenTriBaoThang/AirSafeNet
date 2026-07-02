import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type EventType = "assembly" | "sports" | "fieldTrip" | "outdoorClass" | "competition";
type AudienceType = "students" | "mixed" | "sensitive" | "elderly";
type VenueType = "open" | "shade" | "roadside" | "indoorBackup";
type Decision = "proceed" | "prepare" | "shift" | "postpone";

type EventPreset = {
  label: string;
  short: string;
  defaultDuration: number;
  intensity: number;
  description: string;
};

type District = {
  id: string;
  name: string;
  area: string;
  factor: number;
};

type EventAssessment = {
  startTime: Date;
  timeLabel: string;
  pm25: number;
  aqi: number;
  riskScore: number;
  riskColor: string;
  decision: Decision;
  decisionLabel: string;
  headline: string;
  maskPlan: string;
  dosePercent: number;
  actions: string[];
};

const WHO_DAILY_DOSE = 225;
const EVENT_PRESETS: Record<EventType, EventPreset> = {
  assembly: {
    label: "Chào cờ / sinh hoạt sân trường",
    short: "School",
    defaultDuration: 35,
    intensity: 1.05,
    description: "Đông học sinh, vận động thấp nhưng đứng ngoài trời lâu.",
  },
  sports: {
    label: "Ngày hội thể thao",
    short: "Sport",
    defaultDuration: 120,
    intensity: 1.45,
    description: "Vận động mạnh, hít thở nhiều, cần ngưỡng an toàn chặt hơn.",
  },
  fieldTrip: {
    label: "Tham quan / ngoại khóa",
    short: "Trip",
    defaultDuration: 180,
    intensity: 1.22,
    description: "Di chuyển ngoài trời kéo dài, cần kế hoạch nghỉ và điểm trú.",
  },
  outdoorClass: {
    label: "Tiết học ngoài trời",
    short: "Class",
    defaultDuration: 45,
    intensity: 1.0,
    description: "Nhóm nhỏ hơn, có thể đổi sang lớp học trong nhà nhanh.",
  },
  competition: {
    label: "Thi đấu / giải ngoài trời",
    short: "Match",
    defaultDuration: 90,
    intensity: 1.55,
    description: "Cường độ cao, nên ưu tiên khung giờ AQI thấp nhất.",
  },
};

const AUDIENCE_LABEL: Record<AudienceType, string> = {
  students: "Học sinh",
  mixed: "Gia đình / cộng đồng",
  sensitive: "Có nhiều nhóm nhạy cảm",
  elderly: "Người cao tuổi",
};

const AUDIENCE_FACTOR: Record<AudienceType, number> = {
  students: 1.16,
  mixed: 1.08,
  sensitive: 1.42,
  elderly: 1.32,
};

const VENUE_LABEL: Record<VenueType, string> = {
  open: "Sân trống",
  shade: "Có mái che / cây xanh",
  roadside: "Gần đường lớn",
  indoorBackup: "Có phương án trong nhà",
};

const VENUE_FACTOR: Record<VenueType, number> = {
  open: 1,
  shade: 0.92,
  roadside: 1.18,
  indoorBackup: 0.82,
};

const DISTRICTS: District[] = [
  { id: "q1", name: "Quận 1", area: "Trung tâm", factor: 1.12 },
  { id: "q3", name: "Quận 3", area: "Trung tâm", factor: 1.1 },
  { id: "q4", name: "Quận 4", area: "Nam trung tâm", factor: 1.08 },
  { id: "q5", name: "Quận 5", area: "Tây trung tâm", factor: 1.12 },
  { id: "q6", name: "Quận 6", area: "Tây", factor: 1.1 },
  { id: "q8", name: "Quận 8", area: "Tây Nam", factor: 1.1 },
  { id: "q10", name: "Quận 10", area: "Trung tâm", factor: 1.11 },
  { id: "q11", name: "Quận 11", area: "Tây trung tâm", factor: 1.08 },
  { id: "q_pn", name: "Phú Nhuận", area: "Bắc trung tâm", factor: 1.11 },
  { id: "q_bt", name: "Bình Thạnh", area: "Đông Bắc trung tâm", factor: 1.09 },
  { id: "q7", name: "Quận 7", area: "Nam", factor: 1.02 },
  { id: "q9", name: "Quận 9", area: "Đông", factor: 0.95 },
  { id: "q12", name: "Quận 12", area: "Bắc", factor: 1.04 },
  { id: "q_gv", name: "Gò Vấp", area: "Bắc trung tâm", factor: 1.09 },
  { id: "q_tb", name: "Tân Bình", area: "Tây Bắc trung tâm", factor: 1.13 },
  { id: "q_tp", name: "Tân Phú", area: "Tây", factor: 1.1 },
  { id: "q_btn", name: "Bình Tân", area: "Tây", factor: 1.14 },
  { id: "q_td", name: "Thủ Đức", area: "Đông", factor: 0.98 },
  { id: "h_bc", name: "Bình Chánh", area: "Tây Nam", factor: 1.03 },
  { id: "h_hm", name: "Hóc Môn", area: "Tây Bắc", factor: 1.0 },
  { id: "h_nb", name: "Nhà Bè", area: "Nam", factor: 0.97 },
  { id: "h_cc", name: "Củ Chi", area: "Bắc", factor: 0.92 },
  { id: "h_cn", name: "Cần Giờ", area: "Nam biển", factor: 0.82 },
];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateTimeInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseDateTimeInput(value: string): Date {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(Date.now() + 2 * 60 * 60_000);
}

function formatDateTime(date: Date): string {
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
  if (aqi <= 50) return aqi * 0.42;
  if (aqi <= 100) return 21 + (aqi - 50) * 0.43;
  if (aqi <= 150) return 43 + (aqi - 100) * 0.42;
  if (aqi <= 200) return 64 + (aqi - 150) * 0.32;
  if (aqi <= 300) return 80 + (aqi - 200) * 0.14;
  return Math.min(100, 94 + (aqi - 300) * 0.06);
}

function scoreColor(score: number): string {
  if (score <= 35) return "#22c55e";
  if (score <= 52) return "#eab308";
  if (score <= 68) return "#f97316";
  if (score <= 84) return "#ef4444";
  return "#a855f7";
}

function decisionFrom(score: number, aqi: number): Decision {
  if (score >= 84 || aqi >= 180) return "postpone";
  if (score >= 68 || aqi >= 150) return "shift";
  if (score >= 52 || aqi >= 101) return "prepare";
  return "proceed";
}

function decisionLabel(decision: Decision): string {
  if (decision === "postpone") return "Nên hoãn / chuyển trong nhà";
  if (decision === "shift") return "Nên đổi giờ";
  if (decision === "prepare") return "Tổ chức nhưng chuẩn bị khẩu trang";
  return "Có thể tổ chức";
}

function decisionHeadline(decision: Decision, eventLabel: string): string {
  if (decision === "postpone") return `${eventLabel} không phù hợp ngoài trời ở khung giờ này.`;
  if (decision === "shift") return `Nên đổi ${eventLabel.toLowerCase()} sang khung giờ sạch hơn.`;
  if (decision === "prepare") return `Có thể tổ chức nếu giảm phơi nhiễm và chuẩn bị khẩu trang.`;
  return `Điều kiện tương đối ổn cho sự kiện ngoài trời.`;
}
function sampleForecastAt(
  points: DashboardChartPointResponse[],
  target: Date,
  fallback: DashboardSummaryResponse,
): { pm25: number; aqi: number } {
  const sorted = [...points]
    .map((point) => ({ ...point, ts: new Date(point.time).getTime() }))
    .filter((point) => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);

  if (sorted.length === 0) return { pm25: fallback.currentPm25, aqi: fallback.currentAqi };
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

function getUpcomingPoints(points: DashboardChartPointResponse[]): DashboardChartPointResponse[] {
  const now = Date.now();
  const future = points.filter((point) => new Date(point.time).getTime() >= now - 45 * 60_000);
  return (future.length > 0 ? future : points).slice(0, 36);
}

function buildActions(decision: Decision, event: EventPreset, audience: AudienceType, attendees: number): string[] {
  const actions: string[] = [];
  if (decision === "postpone") {
    actions.push("Hoãn hoặc chuyển sang không gian trong nhà có lọc gió/đóng cửa tốt.");
    actions.push("Thông báo phụ huynh/người tham dự sớm, kèm khung giờ dự phòng sạch hơn.");
  } else if (decision === "shift") {
    actions.push("Đổi sang một trong các khung giờ gợi ý có risk thấp hơn.");
    actions.push("Giảm phần vận động mạnh, ưu tiên hoạt động ngắn và có nghỉ giữa chặng.");
  } else if (decision === "prepare") {
    actions.push("Chuẩn bị khẩu trang lọc bụi cho người nhạy cảm và người phải đứng lâu ngoài trời.");
    actions.push("Bố trí điểm nghỉ có bóng râm, nước uống và người theo dõi triệu chứng hô hấp.");
  } else {
    actions.push("Có thể tổ chức, vẫn nên kiểm tra AQI lại trước giờ bắt đầu 30 phút.");
    actions.push("Giữ phương án trong nhà nếu xuất hiện spike AQI bất thường.");
  }

  if (event.intensity >= 1.4) actions.push("Không cho nhóm nhạy cảm tham gia phần vận động cường độ cao nếu AQI tăng.");
  if (audience === "sensitive" || audience === "elderly") actions.push("Tạo khu vực nghỉ riêng cho nhóm nhạy cảm, hạn chế đứng dưới nắng hoặc gần đường xe.");
  if (attendees >= 200) actions.push("Chia ca hoặc chia cụm người tham dự để giảm thời gian tập trung ngoài trời.");
  return actions.slice(0, 5);
}

function maskPlan(decision: Decision, audience: AudienceType): string {
  if (decision === "postpone") return "Không nên dùng khẩu trang như giải pháp chính; ưu tiên hoãn hoặc chuyển trong nhà.";
  if (decision === "shift") return "Nếu vẫn tổ chức: KF94/N95 cho giáo viên, ban tổ chức, nhóm nhạy cảm và người vận động nhẹ.";
  if (decision === "prepare") {
    return audience === "students"
      ? "Chuẩn bị khẩu trang vừa mặt cho học sinh nhạy cảm; không ép đeo khi vận động mạnh, thay bằng giảm cường độ."
      : "Chuẩn bị KF94/N95 cho nhóm nhạy cảm và khẩu trang y tế dự phòng cho người tham dự.";
  }
  return "Không bắt buộc cho tất cả, nhưng nên có khẩu trang dự phòng tại bàn y tế/sự kiện.";
}

function buildAssessment({
  startTime,
  event,
  duration,
  district,
  audience,
  venue,
  attendees,
  points,
  summary,
}: {
  startTime: Date;
  event: EventPreset;
  duration: number;
  district: District;
  audience: AudienceType;
  venue: VenueType;
  attendees: number;
  points: DashboardChartPointResponse[];
  summary: DashboardSummaryResponse;
}): EventAssessment {
  const sample = sampleForecastAt(points, startTime, summary);
  const adjustedPm25 = Math.max(0, sample.pm25 * district.factor * VENUE_FACTOR[venue]);
  const adjustedAqi = pm25ToAqi(adjustedPm25);
  const durationFactor = Math.min(1.42, 0.82 + duration / 180);
  const crowdFactor = attendees >= 500 ? 1.14 : attendees >= 200 ? 1.08 : attendees >= 80 ? 1.04 : 1;
  const riskScore = Math.min(
    100,
    baseRiskFromAqi(adjustedAqi) * event.intensity * AUDIENCE_FACTOR[audience] * durationFactor * crowdFactor,
  );
  const decision = decisionFrom(riskScore, adjustedAqi);
  const dose = adjustedPm25 * (duration / 60) * event.intensity;
  const dosePercent = (dose / WHO_DAILY_DOSE) * 100;

  return {
    startTime,
    timeLabel: formatDateTime(startTime),
    pm25: adjustedPm25,
    aqi: adjustedAqi,
    riskScore,
    riskColor: scoreColor(riskScore),
    decision,
    decisionLabel: decisionLabel(decision),
    headline: decisionHeadline(decision, event.label),
    maskPlan: maskPlan(decision, audience),
    dosePercent,
    actions: buildActions(decision, event, audience, attendees),
  };
}

function pickBestSlots(assessments: EventAssessment[], limit = 3): EventAssessment[] {
  const selected: EventAssessment[] = [];
  for (const assessment of [...assessments].sort((a, b) => a.riskScore - b.riskScore || a.dosePercent - b.dosePercent)) {
    if (selected.length >= limit) break;
    const tooClose = selected.some((item) => Math.abs(item.startTime.getTime() - assessment.startTime.getTime()) < 2 * 60 * 60_000);
    if (!tooClose) selected.push(assessment);
  }
  return selected;
}

function ResultMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="event-mode-metric">
      <span>{label}</span>
      <strong style={tone ? { color: tone } : undefined}>{value}</strong>
    </div>
  );
}

export default function SchoolOutdoorEventMode({ summary, points }: Props) {
  const [eventName, setEventName] = useState("Sinh hoạt ngoài trời");
  const [eventType, setEventType] = useState<EventType>("assembly");
  const [startValue, setStartValue] = useState(() => toDateTimeInput(new Date(Date.now() + 2 * 60 * 60_000)));
  const [duration, setDuration] = useState(EVENT_PRESETS.assembly.defaultDuration);
  const [districtId, setDistrictId] = useState("q1");
  const [audience, setAudience] = useState<AudienceType>("students");
  const [venue, setVenue] = useState<VenueType>("open");
  const [attendees, setAttendees] = useState(120);

  const event = EVENT_PRESETS[eventType];
  const district = DISTRICTS.find((item) => item.id === districtId) ?? DISTRICTS[0];
  const startTime = useMemo(() => parseDateTimeInput(startValue), [startValue]);

  const assessment = useMemo(() => buildAssessment({
    startTime,
    event,
    duration,
    district,
    audience,
    venue,
    attendees,
    points,
    summary,
  }), [attendees, audience, district, duration, event, points, startTime, summary, venue]);

  const suggestions = useMemo(() => {
    const upcoming = getUpcomingPoints(points);
    const candidates = upcoming.map((point) => buildAssessment({
      startTime: new Date(point.time),
      event,
      duration,
      district,
      audience,
      venue,
      attendees,
      points,
      summary,
    }));
    return pickBestSlots(candidates.length > 0 ? candidates : [assessment]);
  }, [assessment, attendees, audience, district, duration, event, points, summary, venue]);

  const best = suggestions[0] ?? assessment;
  const riskSaving = Math.max(0, assessment.riskScore - best.riskScore);
  const shouldShift = assessment.decision === "shift" || assessment.decision === "postpone" || riskSaving >= 12;

  function handleEventType(next: EventType) {
    setEventType(next);
    setDuration(EVENT_PRESETS[next].defaultDuration);
  }

  return (
    <section className="event-mode" style={{ "--event-color": assessment.riskColor } as CSSProperties}>
      <div className="event-mode__header">
        <div>
          <div className="event-mode__eyebrow">School / Outdoor Event Mode</div>
          <h3>Lập kế hoạch sự kiện ngoài trời theo AQI</h3>
          <p>Nhập sự kiện, địa điểm và nhóm tham dự để app khuyến nghị tổ chức, đổi giờ, hoãn hoặc chuẩn bị khẩu trang.</p>
        </div>
        <div className="event-mode__decision">{assessment.decisionLabel}</div>
      </div>

      <div className="event-mode-controls">
        <div className="event-mode-field event-mode-field--name">
          <label>Tên sự kiện</label>
          <input value={eventName} onChange={(eventChange) => setEventName(eventChange.target.value)} />
        </div>

        <div className="event-mode-field event-mode-field--type">
          <label>Loại sự kiện</label>
          <div className="event-mode-type-grid">
            {(Object.keys(EVENT_PRESETS) as EventType[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`event-mode-type ${eventType === key ? "event-mode-type--active" : ""}`}
                onClick={() => handleEventType(key)}
              >
                <span>{EVENT_PRESETS[key].short}</span>
                <strong>{EVENT_PRESETS[key].label}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="event-mode-field">
          <label>Thời gian bắt đầu</label>
          <input type="datetime-local" value={startValue} onChange={(eventChange) => setStartValue(eventChange.target.value)} />
        </div>

        <div className="event-mode-field">
          <label>Thời lượng</label>
          <select value={duration} onChange={(eventChange) => setDuration(Number(eventChange.target.value))}>
            {[30, 45, 60, 90, 120, 180, 240].map((value) => (
              <option key={value} value={value}>{formatDuration(value)}</option>
            ))}
          </select>
        </div>

        <div className="event-mode-field">
          <label>Quận/huyện</label>
          <select value={districtId} onChange={(eventChange) => setDistrictId(eventChange.target.value)}>
            {DISTRICTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <span>{district.area} · hệ số khu vực ×{district.factor.toFixed(2)}</span>
        </div>

        <div className="event-mode-field">
          <label>Nhóm tham dự</label>
          <select value={audience} onChange={(eventChange) => setAudience(eventChange.target.value as AudienceType)}>
            {(Object.keys(AUDIENCE_LABEL) as AudienceType[]).map((key) => <option key={key} value={key}>{AUDIENCE_LABEL[key]}</option>)}
          </select>
        </div>

        <div className="event-mode-field">
          <label>Không gian</label>
          <select value={venue} onChange={(eventChange) => setVenue(eventChange.target.value as VenueType)}>
            {(Object.keys(VENUE_LABEL) as VenueType[]).map((key) => <option key={key} value={key}>{VENUE_LABEL[key]}</option>)}
          </select>
        </div>

        <div className="event-mode-field">
          <label>Số người</label>
          <input
            type="number"
            min={5}
            max={3000}
            value={attendees}
            onChange={(eventChange) => setAttendees(Math.max(5, Number(eventChange.target.value) || 5))}
          />
        </div>
      </div>

      <div className="event-mode-result">
        <div className="event-mode-verdict">
          <span>{eventName || event.label}</span>
          <strong>{assessment.headline}</strong>
          <p>{event.description}</p>
        </div>
        <div className="event-mode-score">
          <strong>{Math.round(assessment.riskScore)}</strong>
          <span>risk score</span>
        </div>
      </div>

      <div className="event-mode-metrics">
        <ResultMetric label="Thời điểm" value={assessment.timeLabel} />
        <ResultMetric label="AQI dự kiến" value={String(assessment.aqi)} tone={assessment.riskColor} />
        <ResultMetric label="PM2.5" value={`${assessment.pm25.toFixed(1)} µg/m³`} />
        <ResultMetric label="Dose budget" value={`${assessment.dosePercent.toFixed(1)}%`} tone={assessment.riskColor} />
      </div>

      <div className="event-mode-plan-grid">
        <div className="event-mode-plan event-mode-plan--primary">
          <span>Khuyến nghị lịch</span>
          <strong>{shouldShift ? `Đổi sang ${formatDateTime(best.startTime)}` : "Giữ lịch hiện tại"}</strong>
          <p>{shouldShift ? `Giảm khoảng ${riskSaving.toFixed(0)} điểm rủi ro so với giờ đang chọn.` : "Giờ đang chọn đã nằm trong nhóm khung giờ tốt của forecast hiện tại."}</p>
        </div>
        <div className="event-mode-plan">
          <span>Khẩu trang</span>
          <strong>{assessment.maskPlan}</strong>
        </div>
      </div>

      <div className="event-mode-suggestions">
        <div className="event-mode-suggestions__head">
          <strong>Khung giờ tốt hơn</strong>
          <span>Bấm để áp dụng ngay vào thời gian bắt đầu</span>
        </div>
        <div className="event-mode-suggestion-grid">
          {suggestions.map((item, index) => (
            <button
              key={`${item.startTime.toISOString()}-${index}`}
              type="button"
              className="event-mode-suggestion"
              style={{ "--slot-color": item.riskColor } as CSSProperties}
              onClick={() => setStartValue(toDateTimeInput(item.startTime))}
            >
              <span>#{index + 1}</span>
              <strong>{formatDateTime(item.startTime)}</strong>
              <em>{Math.round(item.riskScore)} điểm · AQI {item.aqi}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="event-mode-actions">
        <strong>Checklist hành động</strong>
        <div>
          {assessment.actions.map((action) => <span key={action}>{action}</span>)}
        </div>
      </div>
    </section>
  );
}