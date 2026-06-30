import { useEffect, useMemo, useState } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type UserGroup = "normal" | "child" | "elderly" | "respiratory" | "pregnant";
type Intensity = "low" | "moderate" | "high";
type ActivityKey = "run" | "school" | "work" | "football";

type ActivityPreset = {
  key: ActivityKey;
  label: string;
  icon: string;
  duration: number;
  intensity: Intensity;
  outdoor: boolean;
};

type District = {
  id: string;
  name: string;
  area: string;
  factor: number;
};

type Scenario = {
  point: DashboardChartPointResponse;
  timeLabel: string;
  relLabel: string;
  adjustedPm25: number;
  adjustedAqi: number;
  riskScore: number;
  riskLabel: string;
  riskColor: string;
  dose: number;
  dosePercent: number;
  recommendation: string;
};

const WHO_DAILY_DOSE = 225;
const INDOOR_FACTOR = 0.5;

const ACTIVITY_PRESETS: ActivityPreset[] = [
  { key: "run", label: "Chạy bộ", icon: "🏃", duration: 45, intensity: "high", outdoor: true },
  { key: "school", label: "Đi học", icon: "🏫", duration: 30, intensity: "low", outdoor: true },
  { key: "work", label: "Đi làm", icon: "💼", duration: 35, intensity: "low", outdoor: true },
  { key: "football", label: "Đá bóng", icon: "⚽", duration: 90, intensity: "high", outdoor: true },
];

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

const GROUP_LABEL: Record<UserGroup, string> = {
  normal: "Người dùng phổ thông",
  child: "Trẻ em",
  elderly: "Người cao tuổi",
  respiratory: "Bệnh hô hấp",
  pregnant: "Thai phụ",
};

const GROUP_MULTIPLIER: Record<UserGroup, number> = {
  normal: 1,
  child: 1.15,
  elderly: 1.25,
  respiratory: 1.45,
  pregnant: 1.2,
};


const INTENSITY_MULTIPLIER: Record<Intensity, number> = {
  low: 1,
  moderate: 1.15,
  high: 1.4,
};

const VENTILATION: Record<Intensity, number> = {
  low: 0.5,
  moderate: 1,
  high: 1.8,
};

function normalizeGroup(value: string): UserGroup {
  const normalized = value.trim().toLowerCase();
  if (["normal", "child", "elderly", "respiratory", "pregnant"].includes(normalized)) {
    return normalized as UserGroup;
  }
  return "normal";
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
  if (aqi <= 50) return aqi * 0.4;
  if (aqi <= 100) return 20 + (aqi - 50) * 0.4;
  if (aqi <= 150) return 40 + (aqi - 100) * 0.4;
  if (aqi <= 200) return 60 + (aqi - 150) * 0.3;
  if (aqi <= 300) return 75 + (aqi - 200) * 0.15;
  return Math.min(100, 90 + (aqi - 300) * 0.1);
}

function scoreColor(score: number): string {
  if (score <= 25) return "#22c55e";
  if (score <= 45) return "#84cc16";
  if (score <= 60) return "#eab308";
  if (score <= 75) return "#f97316";
  if (score <= 90) return "#ef4444";
  return "#a855f7";
}

function scoreLabel(score: number): string {
  if (score <= 25) return "Thấp";
  if (score <= 45) return "Chấp nhận";
  if (score <= 60) return "Cần chú ý";
  if (score <= 75) return "Rủi ro cao";
  if (score <= 90) return "Rất cao";
  return "Nguy hiểm";
}

function doseColor(percent: number): string {
  if (percent <= 20) return "#22c55e";
  if (percent <= 40) return "#eab308";
  if (percent <= 65) return "#f97316";
  return "#ef4444";
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  });
}

function relativeTime(time: string): string {
  const diff = new Date(time).getTime() - Date.now();
  if (diff < -45 * 60 * 1000) return "Đã qua";
  if (diff < 45 * 60 * 1000) return "Bây giờ";
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} phút nữa`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}p` : ""} nữa`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? `${rest}p` : ""}`;
}

function pickSeparatedTop(scenarios: Scenario[], limit = 3): Scenario[] {
  const selected: Scenario[] = [];
  for (const scenario of [...scenarios].sort((a, b) => a.riskScore - b.riskScore || a.dosePercent - b.dosePercent)) {
    if (selected.length >= limit) break;
    const currentTime = new Date(scenario.point.time).getTime();
    const tooClose = selected.some((item) => {
      const diff = Math.abs(new Date(item.point.time).getTime() - currentTime);
      return diff < 2 * 60 * 60 * 1000;
    });
    if (!tooClose) selected.push(scenario);
  }
  return selected;
}

function getRecommendation(
  score: number,
  activity: ActivityPreset,
  group: UserGroup,
  district: District,
): string {
  if (score >= 80) {
    return `${activity.label} tại ${district.name} không nên thực hiện ở khung giờ này. Nên dời lịch hoặc chuyển vào trong nhà.`;
  }
  if (score >= 65) {
    return `Rủi ro cao cho ${GROUP_LABEL[group].toLowerCase()}. Giảm thời lượng, đeo khẩu trang lọc tốt và tránh vận động mạnh.`;
  }
  if (score >= 50) {
    return `Có thể thực hiện nếu cần, nhưng nên rút ngắn thời lượng và theo dõi triệu chứng hô hấp.`;
  }
  if (score >= 35) {
    return `Mức chấp nhận được. Ưu tiên đi theo tuyến ít xe và tránh kéo dài hoạt động ngoài trời.`;
  }
  return `Khung giờ khá tốt cho ${activity.label.toLowerCase()}. Vẫn nên theo dõi AQI nếu hoạt động kéo dài.`;
}

function buildScenario(
  point: DashboardChartPointResponse,
  activity: ActivityPreset,
  duration: number,
  district: District,
  group: UserGroup,
): Scenario {
  const adjustedPm25 = Math.max(0, point.pm25 * district.factor);
  const adjustedAqi = pm25ToAqi(adjustedPm25);
  const exposureFactor = activity.outdoor ? 1 : INDOOR_FACTOR;
  const riskScore = Math.min(
    100,
    baseRiskFromAqi(adjustedAqi)
      * GROUP_MULTIPLIER[group]
      * INTENSITY_MULTIPLIER[activity.intensity]
      * exposureFactor,
  );
  const dose = adjustedPm25 * (duration / 60) * VENTILATION[activity.intensity] * exposureFactor;
  const dosePercent = (dose / WHO_DAILY_DOSE) * 100;

  return {
    point,
    timeLabel: formatTime(point.time),
    relLabel: relativeTime(point.time),
    adjustedPm25,
    adjustedAqi,
    riskScore,
    riskLabel: scoreLabel(riskScore),
    riskColor: scoreColor(riskScore),
    dose,
    dosePercent,
    recommendation: getRecommendation(riskScore, activity, group, district),
  };
}

function getUpcomingPoints(points: DashboardChartPointResponse[]): DashboardChartPointResponse[] {
  const now = Date.now();
  const future = points.filter((point) => new Date(point.time).getTime() >= now - 45 * 60 * 1000);
  return (future.length > 0 ? future : points).slice(0, 24);
}

function ScenarioCard({ title, scenario, compact = false }: {
  title: string;
  scenario: Scenario;
  compact?: boolean;
}) {
  return (
    <div
      className={`whatif-scenario ${compact ? "whatif-scenario--compact" : ""}`}
      style={{ "--scenario-color": scenario.riskColor } as React.CSSProperties}
    >
      <div className="whatif-scenario__top">
        <span>{title}</span>
        <strong>{scenario.timeLabel}</strong>
      </div>
      <div className="whatif-scenario__body">
        <div className="whatif-score">
          <strong>{Math.round(scenario.riskScore)}</strong>
          <span>{scenario.riskLabel}</span>
        </div>
        <div className="whatif-scenario__meta">
          <span>AQI {scenario.adjustedAqi}</span>
          <span>PM2.5 {scenario.adjustedPm25.toFixed(1)} µg/m³</span>
          <span>Dose {scenario.dose.toFixed(1)} µg · {scenario.dosePercent.toFixed(1)}% WHO</span>
        </div>
      </div>
      {!compact && <p>{scenario.recommendation}</p>}
    </div>
  );
}

export default function WhatIfActivitySimulator({ summary, points }: Props) {
  const [activityKey, setActivityKey] = useState<ActivityKey>("run");
  const [duration, setDuration] = useState(45);
  const [districtId, setDistrictId] = useState("q1");
  const [group, setGroup] = useState<UserGroup>(() => normalizeGroup(summary.userGroup));

  const activity = useMemo(
    () => ACTIVITY_PRESETS.find((item) => item.key === activityKey) ?? ACTIVITY_PRESETS[0],
    [activityKey],
  );

  useEffect(() => {
    const nextActivity = ACTIVITY_PRESETS.find((item) => item.key === activityKey) ?? ACTIVITY_PRESETS[0];
    setDuration(nextActivity.duration);
  }, [activityKey]);

  useEffect(() => {
    setGroup(normalizeGroup(summary.userGroup));
  }, [summary.userGroup]);

  const district = useMemo(
    () => DISTRICTS.find((item) => item.id === districtId) ?? DISTRICTS[0],
    [districtId],
  );

  const { current, best, suggestions } = useMemo(() => {
    const source = getUpcomingPoints(points);
    const scenarios = source.map((point) => buildScenario(point, activity, duration, district, group));
    const currentScenario = scenarios[0]
      ?? buildScenario({
        time: new Date().toISOString(),
        pm25: summary.currentPm25,
        aqi: summary.currentAqi,
        risk: summary.currentRisk,
        recommendation: summary.currentRecommendation,
        colorKey: "",
      }, activity, duration, district, group);
    const top = pickSeparatedTop(scenarios.length > 0 ? scenarios : [currentScenario], 3);
    return {
      current: currentScenario,
      best: top[0] ?? currentScenario,
      suggestions: top,
    };
  }, [activity, district, duration, group, points, summary]);

  const improvement = Math.max(0, current.riskScore - best.riskScore);
  const doseSaving = Math.max(0, current.dosePercent - best.dosePercent);
  const doseTone = doseColor(current.dosePercent);

  return (
    <section className="whatif-card">
      <div className="whatif-card__header">
        <div>
          <div className="whatif-card__eyebrow">What-if Activity Simulator</div>
          <h3>Mô phỏng rủi ro trước khi ra ngoài</h3>
          <p>Chọn hoạt động, thời lượng, quận/huyện và nhóm sức khỏe để so sánh làm ngay với dời sang giờ tốt hơn.</p>
        </div>
        <div className="whatif-card__badge">
          {activity.icon} {activity.label}
        </div>
      </div>

      <div className="whatif-controls">
        <div className="whatif-field whatif-field--activity">
          <label>Hoạt động</label>
          <div className="whatif-activity-grid">
            {ACTIVITY_PRESETS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`whatif-activity ${activityKey === item.key ? "whatif-activity--active" : ""}`}
                onClick={() => setActivityKey(item.key)}
              >
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="whatif-field">
          <label>Thời lượng</label>
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {[15, 20, 30, 45, 60, 90, 120].map((value) => (
              <option key={value} value={value}>{formatDuration(value)}</option>
            ))}
          </select>
        </div>

        <div className="whatif-field">
          <label>Quận/huyện</label>
          <select value={districtId} onChange={(event) => setDistrictId(event.target.value)}>
            {DISTRICTS.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <span>{district.area} · hệ số khu vực ×{district.factor.toFixed(2)}</span>
        </div>

        <div className="whatif-field">
          <label>Nhóm sức khỏe</label>
          <select value={group} onChange={(event) => setGroup(event.target.value as UserGroup)}>
            {(Object.keys(GROUP_LABEL) as UserGroup[]).map((key) => (
              <option key={key} value={key}>{GROUP_LABEL[key]}</option>
            ))}
          </select>
          <span>Hệ số nhạy cảm ×{GROUP_MULTIPLIER[group].toFixed(2)}</span>
        </div>
      </div>

      <div className="whatif-results">
        <ScenarioCard title="Nếu làm lúc này" scenario={current} />
        <ScenarioCard title="Nếu dời sang giờ tốt nhất" scenario={best} />

        <div className="whatif-dose-card">
          <div className="whatif-dose-card__top">
            <span>Dose budget tiêu hao</span>
            <strong style={{ color: doseTone }}>{current.dosePercent.toFixed(1)}%</strong>
          </div>
          <div className="whatif-dose-card__bar">
            <div style={{ width: `${Math.min(100, current.dosePercent)}%`, background: doseTone }} />
          </div>
          <p>
            {current.dose.toFixed(1)} µg / {WHO_DAILY_DOSE} µg WHO. Dời sang giờ tốt nhất có thể giảm
            khoảng {improvement.toFixed(0)} điểm rủi ro và {doseSaving.toFixed(1)}% dose.
          </p>
        </div>
      </div>

      <div className="whatif-suggestions">
        <div className="whatif-suggestions__header">
          <strong>3 khung giờ tốt hơn</strong>
          <span>Dựa trên forecast 24h, PM2.5 đã điều chỉnh theo khu vực</span>
        </div>
        <div className="whatif-suggestions__grid">
          {suggestions.map((scenario, index) => (
            <button
              type="button"
              key={`${scenario.point.time}-${index}`}
              className="whatif-suggestion"
              style={{ "--suggestion-color": scenario.riskColor } as React.CSSProperties}
            >
              <div className="whatif-suggestion__rank">#{index + 1}</div>
              <div>
                <strong>{scenario.timeLabel}</strong>
                <span>{scenario.relLabel}</span>
              </div>
              <div className="whatif-suggestion__score">
                <strong>{Math.round(scenario.riskScore)}</strong>
                <span>{scenario.riskLabel}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="whatif-footnote">
        Mô phỏng dùng forecast hiện tại và hệ số khu vực tạm thời; khi nối trực tiếp dữ liệu heatmap quận/huyện,
        hệ số này có thể thay bằng AQI thật từng quận.
      </div>
    </section>
  );
}
