import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";
import {
  clamp,
  formatDateTime,
  getForecastWindow,
  pm25ToAqi,
  riskColor,
  sampleForecastAt,
  WHO_DAILY_PM25_DOSE,
} from "./airQualityDecisionUtils";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type EventType = "pe" | "football" | "union" | "outdoorEvent";
type VenueType = "schoolyard" | "roadside" | "greenShade" | "indoorReady";
type Decision = "organize" | "prepare" | "shift" | "indoor";

type EventPreset = {
  label: string;
  duration: number;
  intensity: number;
  description: string;
};

type Assessment = {
  time: Date;
  pm25: number;
  aqi: number;
  riskScore: number;
  decision: Decision;
  decisionLabel: string;
  color: string;
  dosePercent: number;
};

const EVENT_PRESETS: Record<EventType, EventPreset> = {
  pe: {
    label: "Tiết thể dục",
    duration: 45,
    intensity: 1.38,
    description: "Vận động vừa đến mạnh, học sinh hít thở nhiều hơn bình thường.",
  },
  football: {
    label: "Đá bóng",
    duration: 60,
    intensity: 1.62,
    description: "Cường độ cao, nên dùng ngưỡng AQI chặt hơn các hoạt động nhẹ.",
  },
  union: {
    label: "Sinh hoạt Đoàn/Hội",
    duration: 40,
    intensity: 1.05,
    description: "Tập trung đông, cường độ thấp nhưng có thể đứng ngoài trời lâu.",
  },
  outdoorEvent: {
    label: "Sự kiện ngoài trời",
    duration: 120,
    intensity: 1.2,
    description: "Cần kế hoạch giờ sạch hơn, nước uống, điểm nghỉ và phương án trong nhà.",
  },
};

const VENUES: Record<VenueType, { label: string; factor: number; note: string }> = {
  schoolyard: { label: "Sân trường", factor: 1, note: "Điều kiện ngoài trời tiêu chuẩn." },
  roadside: { label: "Gần cổng/đường lớn", factor: 1.18, note: "Tăng phơi nhiễm do xe chờ và xe qua lại." },
  greenShade: { label: "Có cây xanh/mái che", factor: 0.9, note: "Giảm nhiệt và giảm một phần phơi nhiễm." },
  indoorReady: { label: "Có phương án trong nhà", factor: 0.76, note: "Giảm mạnh rủi ro nếu chuyển nhanh vào nhà." },
};

const GREEN_ACTIONS = [
  "Dùng bình nước cá nhân",
  "Hạn chế đồ dùng một lần",
  "Phân loại rác sau sự kiện",
  "Ưu tiên vật dụng tái sử dụng",
  "Nhắc phụ huynh tắt máy khi chờ trước cổng trường",
];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateTimeInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(Date.now() + 2 * 60 * 60_000);
}

function decisionFrom(score: number, aqi: number): Decision {
  if (score >= 82 || aqi >= 170) return "indoor";
  if (score >= 66 || aqi >= 140) return "shift";
  if (score >= 50 || aqi >= 101) return "prepare";
  return "organize";
}

function decisionLabel(decision: Decision): string {
  if (decision === "indoor") return "Chuyển trong nhà";
  if (decision === "shift") return "Đổi giờ";
  if (decision === "prepare") return "Tổ chức có chuẩn bị";
  return "Có thể tổ chức";
}

function buildAssessment(
  time: Date,
  preset: EventPreset,
  venue: VenueType,
  duration: number,
  students: number,
  sensitivePct: number,
  points: DashboardChartPointResponse[],
  summary: DashboardSummaryResponse,
): Assessment {
  const sample = sampleForecastAt(points, time, summary);
  const venueFactor = VENUES[venue].factor;
  const sensitiveFactor = 1 + sensitivePct / 100 * 0.55;
  const crowdFactor = students >= 500 ? 1.16 : students >= 220 ? 1.1 : students >= 90 ? 1.05 : 1;
  const adjustedPm25 = sample.pm25 * venueFactor;
  const adjustedAqi = pm25ToAqi(adjustedPm25);
  const dose = adjustedPm25 * (duration / 60) * preset.intensity * sensitiveFactor;
  const dosePercent = (dose / WHO_DAILY_PM25_DOSE) * 100;
  const riskScore = clamp((adjustedAqi / 2.15) * preset.intensity * sensitiveFactor * crowdFactor + duration / 8, 0, 100);
  const decision = decisionFrom(riskScore, adjustedAqi);

  return {
    time,
    pm25: adjustedPm25,
    aqi: adjustedAqi,
    riskScore,
    decision,
    decisionLabel: decisionLabel(decision),
    color: riskColor(adjustedAqi),
    dosePercent,
  };
}

function decisionText(decision: Decision, bestTime: Date): string {
  if (decision === "indoor") return "Nên chuyển vào nhà đa năng/lớp học hoặc hoãn nếu không có không gian trong nhà.";
  if (decision === "shift") return `Nên đổi sang ${formatDateTime(bestTime)} để giảm phơi nhiễm PM2.5.`;
  if (decision === "prepare") return "Có thể tổ chức nếu giảm thời lượng, giảm vận động mạnh và chuẩn bị khẩu trang cho nhóm nhạy cảm.";
  return "Có thể giữ lịch, vẫn nên kiểm tra AQI lại trước giờ bắt đầu 30 phút.";
}

export default function SchoolGreenSafetyMode({ summary, points }: Props) {
  const [eventType, setEventType] = useState<EventType>("pe");
  const [startValue, setStartValue] = useState(() => toDateTimeInput(new Date(Date.now() + 2 * 60 * 60_000)));
  const [duration, setDuration] = useState(EVENT_PRESETS.pe.duration);
  const [students, setStudents] = useState(120);
  const [sensitivePct, setSensitivePct] = useState(12);
  const [venue, setVenue] = useState<VenueType>("schoolyard");
  const [completed, setCompleted] = useState<string[]>(["Nhắc phụ huynh tắt máy khi chờ trước cổng trường"]);

  const preset = EVENT_PRESETS[eventType];
  const startTime = useMemo(() => parseDate(startValue), [startValue]);

  const model = useMemo(() => {
    const assessment = buildAssessment(startTime, preset, venue, duration, students, sensitivePct, points, summary);
    const candidates = getForecastWindow(points, 24).map((point) => buildAssessment(
      new Date(point.time),
      preset,
      venue,
      duration,
      students,
      sensitivePct,
      points,
      summary,
    ));
    const ranked = (candidates.length ? candidates : [assessment]).sort((a, b) => a.riskScore - b.riskScore || a.dosePercent - b.dosePercent);
    const best = ranked[0] ?? assessment;
    const exposureMinutesReduced = Math.max(0, Math.round(students * Math.min(duration, duration * ((assessment.riskScore - best.riskScore) / 100 + 0.18))));
    const doseReduced = Math.max(0, assessment.dosePercent - best.dosePercent);
    const engineOffMinutes = Math.round(students * 0.22 * 8);

    return { assessment, suggestions: ranked.slice(0, 3), best, exposureMinutesReduced, doseReduced, engineOffMinutes };
  }, [duration, points, preset, sensitivePct, startTime, students, summary, venue]);

  function handleEventChange(next: EventType) {
    setEventType(next);
    setDuration(EVENT_PRESETS[next].duration);
  }

  function toggleAction(action: string) {
    setCompleted((current) => (
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action]
    ));
  }

  return (
    <section className="school-green-mode" style={{ "--school-color": model.assessment.color } as CSSProperties}>
      <div className="school-green-mode__head">
        <div>
          <span>School Green Safety Mode</span>
          <h3>Quyết định hoạt động trường học theo không khí sạch và hành vi xanh</h3>
          <p>
            Nhập tiết thể dục, đá bóng, sinh hoạt Đoàn/Hội hoặc sự kiện ngoài trời để app khuyến nghị
            tổ chức, đổi giờ, chuyển trong nhà và ghi nhận hành động kinh tế tuần hoàn.
          </p>
        </div>
        <strong>{model.assessment.decisionLabel}</strong>
      </div>

      <div className="school-green-controls">
        <label>
          Hoạt động
          <select value={eventType} onChange={(event) => handleEventChange(event.target.value as EventType)}>
            {(Object.keys(EVENT_PRESETS) as EventType[]).map((key) => <option key={key} value={key}>{EVENT_PRESETS[key].label}</option>)}
          </select>
        </label>
        <label>
          Bắt đầu
          <input type="datetime-local" value={startValue} onChange={(event) => setStartValue(event.target.value)} />
        </label>
        <label>
          Thời lượng
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {[30, 45, 60, 90, 120, 180].map((value) => <option key={value} value={value}>{value} phút</option>)}
          </select>
        </label>
        <label>
          Không gian
          <select value={venue} onChange={(event) => setVenue(event.target.value as VenueType)}>
            {(Object.keys(VENUES) as VenueType[]).map((key) => <option key={key} value={key}>{VENUES[key].label}</option>)}
          </select>
        </label>
        <label>
          Số học sinh
          <input type="number" min={5} max={3000} value={students} onChange={(event) => setStudents(Math.max(5, Number(event.target.value) || 5))} />
        </label>
        <label>
          Nhóm nhạy cảm
          <input type="number" min={0} max={100} value={sensitivePct} onChange={(event) => setSensitivePct(clamp(Number(event.target.value) || 0, 0, 100))} />
          <span>% học sinh cần chú ý</span>
        </label>
      </div>

      <div className="school-green-result">
        <div>
          <span>{preset.label}</span>
          <strong>{decisionText(model.assessment.decision, model.best.time)}</strong>
          <p>{preset.description} {VENUES[venue].note}</p>
        </div>
        <div className="school-green-score">
          <strong>{Math.round(model.assessment.riskScore)}</strong>
          <span>risk score</span>
        </div>
      </div>

      <div className="school-green-kpis">
        <div><span>AQI dự kiến</span><strong>{model.assessment.aqi}</strong></div>
        <div><span>PM2.5</span><strong>{model.assessment.pm25.toFixed(1)} µg/m³</strong></div>
        <div><span>Dose budget</span><strong>{model.assessment.dosePercent.toFixed(1)}%</strong></div>
        <div><span>Phút phơi nhiễm giảm</span><strong>{model.exposureMinutesReduced.toLocaleString("vi-VN")}</strong></div>
        <div><span>Dose giảm nếu đổi giờ</span><strong>{model.doseReduced.toFixed(1)}%</strong></div>
        <div><span>Phút nổ máy tránh được</span><strong>{model.engineOffMinutes.toLocaleString("vi-VN")}</strong></div>
      </div>

      <div className="school-green-suggestions">
        <strong>3 khung giờ tốt hơn</strong>
        <div>
          {model.suggestions.map((item, index) => (
            <button key={`${item.time.toISOString()}-${index}`} type="button" onClick={() => setStartValue(toDateTimeInput(item.time))}>
              <span>#{index + 1}</span>
              <strong>{formatDateTime(item.time)}</strong>
              <em>AQI {item.aqi} · risk {Math.round(item.riskScore)}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="school-green-actions">
        <div>
          <strong>Checklist hành động xanh</strong>
          <span>{completed.length}/{GREEN_ACTIONS.length} completed</span>
        </div>
        <div>
          {GREEN_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              className={completed.includes(action) ? "is-done" : ""}
              onClick={() => toggleAction(action)}
            >
              <span>{completed.includes(action) ? "✓" : "+"}</span>
              {action}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
