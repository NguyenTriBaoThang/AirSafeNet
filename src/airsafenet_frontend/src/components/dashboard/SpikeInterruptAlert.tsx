import { useEffect, useRef, useState } from "react";

type Anomaly = {
  detected:       boolean;
  spike_pm25:     number;
  from_pm25:      number;
  to_pm25:        number;
  spike_time:     string;
  severity:       "critical" | "warning";
  aqi_after:      number;
  aqi_before?:    number;
  risk_after:     string;
  recommendation: string;
  xai?: {
    summary:     string;
    confidence:  number;
    top_factors: Array<{ label: string; delta: number; direction: string; explanation: string }>;
  };
};

type Schedule = {
  id:              number;
  name:            string;
  icon:            string;
  hourOfDay:       number;
  minute:          number;
  durationMinutes: number;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  daysOfWeek:      string;
};

type ActiveActivity = Schedule & {
  minutesLeft:    number;   // phút còn lại trong hoạt động
  minutesElapsed: number;   // phút đã qua
};

type UserChoice = "safe" | "continue" | "cancel";

type Props = {
  schedules:       Schedule[];
  onCancelActivity:(id: number) => void;   // callback → xóa activity
};

const API_BASE      = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const POLL_MS       = 2 * 60 * 1000;   
const SNOOZE_MS     = 30 * 60 * 1000;  
const DISMISS_KEY   = "airsafenet_spike_dismissed";
const SNOOZE_KEY    = "airsafenet_spike_snooze";

function dbToJs(db: number): number { return db === 7 ? 0 : db; }

function runsToday(s: Schedule): boolean {
  const today = new Date().getDay();
  return (s.daysOfWeek ?? "").split(",").map(Number).filter(Boolean)
    .map(dbToJs).includes(today);
}

function getActiveActivities(schedules: Schedule[]): ActiveActivity[] {
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const result: ActiveActivity[] = [];

  schedules.forEach(s => {
    if (!runsToday(s)) return;
    const startMins = s.hourOfDay * 60 + s.minute;
    const endMins   = startMins + s.durationMinutes;
    if (nowMins >= startMins && nowMins < endMins) {
      result.push({
        ...s,
        minutesElapsed: nowMins - startMins,
        minutesLeft:    endMins - nowMins,
      });
    }
  });

  return result;
}

function riskColor(risk: string): string {
  return risk === "GOOD"                ? "#22c55e"
       : risk === "MODERATE"            ? "#eab308"
       : risk === "UNHEALTHY_SENSITIVE" ? "#f97316"
       : risk === "UNHEALTHY"           ? "#ef4444"
       : risk === "VERY_UNHEALTHY"      ? "#a855f7"
       : "#7f1d1d";
}

function aqiLabel(aqi: number): string {
  if (aqi <=  50) return "Tốt";
  if (aqi <= 100) return "Trung bình";
  if (aqi <= 150) return "Nhạy cảm";
  if (aqi <= 200) return "Không tốt";
  if (aqi <= 300) return "Rất kém";
  return "Nguy hiểm";
}

function fmt2(n: number) { return String(n).padStart(2, "0"); }
function fmtTime(h: number, m: number) { return `${fmt2(h)}:${fmt2(m)}`; }

function getActivityAdvice(activity: ActiveActivity, aqi: number): {
  action:  string;
  urgency: string;
  tip:     string;
} {
  const isHigh = aqi > 150;
  const isMed  = aqi > 100;

  if (!activity.isOutdoor) {
    return {
      action:  "Đóng cửa sổ, tắt quạt hút khí từ ngoài vào.",
      urgency: "Vẫn trong nhà — tương đối an toàn nhưng cần đề phòng.",
      tip:     "Không cần dừng hoạt động, nhưng kiểm tra cửa sổ.",
    };
  }

  if (activity.intensity === "high" && isHigh) {
    return {
      action:  `Dừng ${activity.name} ngay, vào trong nhà.`,
      urgency: "Khẩn cấp — cường độ cao + AQI nguy hiểm gây nguy cơ co thắt phế quản.",
      tip:     "Thở chậm, đi bộ nhẹ về nhà thay vì chạy nhanh.",
    };
  }

  if (activity.intensity === "high" && isMed) {
    return {
      action:  `Giảm cường độ ${activity.name} xuống mức nhẹ hoặc vào trong nhà.`,
      urgency: "Cần chú ý — cường độ cao làm tăng hít thở PM2.5 gấp 3 lần.",
      tip:     "Nếu tiếp tục, đeo N95 và rút ngắn thời gian còn lại.",
    };
  }

  if (isHigh) {
    return {
      action:  `Kết thúc ${activity.name} sớm, vào trong nhà.`,
      urgency: "AQI vượt mức nguy hiểm — không nên ở ngoài trời.",
      tip:     `Còn ${activity.minutesLeft} phút nữa là hết giờ — nên vào ngay.`,
    };
  }

  return {
    action:  `Rút ngắn thời gian ${activity.name}, đeo khẩu trang.`,
    urgency: "AQI tăng đột biến — theo dõi sát, sẵn sàng vào trong nhà.",
    tip:     "Đeo KF94 hoặc N95 nếu phải ở ngoài tiếp.",
  };
}

function Countdown({ endAt }: { endAt: Date }) {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.floor((endAt.getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(Math.max(0, Math.floor((endAt.getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const isUrgent = secs < 5 * 60;

  return (
    <div className={`sia-countdown ${isUrgent ? "sia-countdown--urgent" : ""}`}>
      <div className="sia-countdown__label">Nên vào trong trong</div>
      <div className="sia-countdown__time">
        {fmt2(m)}:{fmt2(s)}
      </div>
    </div>
  );
}

function AqiArrow({ from, to, color }: { from: number; to: number; color: string }) {
  return (
    <div className="sia-arrow">
      <div className="sia-arrow__from">
        <span>{from}</span>
        <span className="sia-arrow__unit">AQI</span>
        <span className="sia-arrow__label">Trước</span>
      </div>
      <div className="sia-arrow__mid">
        <svg viewBox="0 0 60 20" className="sia-arrow__svg">
          <defs>
            <marker id="ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={color} />
            </marker>
          </defs>
          <line x1="4" y1="10" x2="52" y2="10"
            stroke={color} strokeWidth="2.5"
            markerEnd="url(#ah)" strokeDasharray="4 3" />
        </svg>
        <div className="sia-arrow__delta" style={{ color }}>
          ▲ +{to - from}
        </div>
      </div>
      <div className="sia-arrow__to" style={{ color }}>
        <span>{to}</span>
        <span className="sia-arrow__unit">AQI</span>
        <span className="sia-arrow__label">{aqiLabel(to)}</span>
      </div>
    </div>
  );
}

function isDismissed(spikeTime: string): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]") as string[];
    return list.includes(spikeTime);
  } catch { return false; }
}

function dismiss(spikeTime: string) {
  try {
    const list = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]") as string[];
    const next = [...list.filter(x => x !== spikeTime), spikeTime].slice(-20);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

function isSnoozed(): boolean {
  try {
    const ts = Number(localStorage.getItem(SNOOZE_KEY) ?? "0");
    return Date.now() < ts;
  } catch { return false; }
}

function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); }
  catch { /* ignore */ }
}

export default function SpikeInterruptAlert({ schedules, onCancelActivity }: Props) {
  const [anomaly,   setAnomaly]   = useState<Anomaly | null>(null);
  const [active,    setActive]    = useState<ActiveActivity[]>([]);
  const [choice,    setChoice]    = useState<UserChoice | null>(null);
  const [visible,   setVisible]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef(false);

  const fetchAnomaly = useRef(async () => {
    try {
      const token = localStorage.getItem("airsafenet_token");
      const res   = await fetch(`${API_BASE}/api/anomaly/latest`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json() as { has_anomaly: boolean; anomaly: Anomaly | null };
      if (!data.has_anomaly || !data.anomaly) { setAnomaly(null); setVisible(false); return; }

      const a = data.anomaly;

      if (isDismissed(a.spike_time) || isSnoozed()) return;

      const nowActive = getActiveActivities(schedules);
      if (nowActive.length === 0) { setAnomaly(null); setVisible(false); return; }

      setAnomaly(a);
      setActive(nowActive);
      setVisible(true);
      setChoice(null);

      if (!soundRef.current && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
        soundRef.current = true;
      }
    } catch { /* silent */ }
  });

  useEffect(() => {
    fetchAnomaly.current();
    pollRef.current = setInterval(() => { fetchAnomaly.current(); }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [schedules]);

  function handleSafe() {
    setChoice("safe");
    if (anomaly) dismiss(anomaly.spike_time);
    setTimeout(() => setVisible(false), 2000);
  }

  function handleContinue() {
    setChoice("continue");
    snooze();
    setTimeout(() => setVisible(false), 1500);
  }

  function handleCancel(actId: number) {
    setChoice("cancel");
    onCancelActivity(actId);
    if (anomaly) dismiss(anomaly.spike_time);
    setTimeout(() => setVisible(false), 1500);
  }

  function handleDismissAll() {
    if (anomaly) dismiss(anomaly.spike_time);
    setVisible(false);
  }

  if (!visible || !anomaly || active.length === 0) return null;

  const color    = riskColor(anomaly.risk_after);
  const isCrit   = anomaly.severity === "critical";
  const mainAct  = active[0];
  const advice   = getActivityAdvice(mainAct, anomaly.aqi_after);

  if (choice) {
    return (
      <div className={`sia-wrap sia-wrap--${anomaly.severity}`}>
        <div className="sia-confirmed">
          <span className="sia-confirmed__emoji">
            {choice === "safe"    ? "🏠" :
             choice === "cancel"  ? "✅" : "⚠️"}
          </span>
          <div className="sia-confirmed__text">
            {choice === "safe"    ? "Tốt lắm! Ở trong nhà an toàn hơn." :
             choice === "cancel"  ? "Đã hủy hoạt động. Sức khỏe quan trọng hơn!" :
             "Đã hiểu — snooze 30 phút. Theo dõi sức khỏe nhé."}
          </div>
        </div>
      </div>
    );
  }

  const suggestEndInMins = Math.max(5, Math.floor(mainAct.minutesLeft * 0.5));
  // eslint-disable-next-line react-hooks/purity
  const countdownEnd = new Date(Date.now() + suggestEndInMins * 60 * 1000);

  return (
    <div className={`sia-wrap sia-wrap--${anomaly.severity}`}
      style={{ "--sia-color": color } as React.CSSProperties}>

      <div className="sia-pulse-bar" style={{ background: color }} />

      <div className="sia-header">
        <div className="sia-header__left">
          <div className="sia-live-dot">
            <div className="sia-live-dot__inner" style={{ background: color }} />
            <div className="sia-live-dot__ring"  style={{ borderColor: color }} />
          </div>
          <div>
            <div className="sia-header__eyebrow">
              {isCrit ? "🚨 CẢNH BÁO KHẨN CẤP" : "⚠️ CẢNH BÁO AQI"}
              {" · "}
              <span style={{ color }}>Anomaly AI</span>
            </div>
            <h3 className="sia-header__title">
              AQI tăng đột biến trong giờ{" "}
              <span style={{ color }}>{mainAct.icon} {mainAct.name}</span>
            </h3>
          </div>
        </div>
        <button className="sia-dismiss-x" type="button" onClick={handleDismissAll}>✕</button>
      </div>

      <div className="sia-aqi-section">
        <AqiArrow
          from={anomaly.from_pm25 ? Math.round(anomaly.from_pm25 / 4) : (anomaly.aqi_after - 40)}
          to={anomaly.aqi_after}
          color={color}
        />
        <div className="sia-pm25-note" style={{ color }}>
          PM2.5: {anomaly.from_pm25} → {anomaly.to_pm25} µg/m³
          {" "}(tăng {anomaly.spike_pm25} µg/m³)
        </div>
      </div>

      <div className="sia-activities">
        {active.map(a => (
          <div key={a.id} className="sia-activity">
            <span className="sia-activity__icon">{a.icon}</span>
            <div className="sia-activity__info">
              <strong>{a.name}</strong>
              <span>
                {fmtTime(a.hourOfDay, a.minute)} ·{" "}
                {a.minutesElapsed}p đã qua ·{" "}
                còn {a.minutesLeft}p · {a.isOutdoor ? "🌤 Ngoài trời" : "🏠 Trong nhà"}
              </span>
            </div>
            <div className="sia-activity__progress">
              <div className="sia-activity__progress-track">
                <div
                  className="sia-activity__progress-fill"
                  style={{
                    width: `${(a.minutesElapsed / a.durationMinutes) * 100}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sia-advice" style={{ borderColor: color + "40", background: color + "0c" }}>
        <div className="sia-advice__urgency" style={{ color }}>{advice.urgency}</div>
        <div className="sia-advice__action">🎯 {advice.action}</div>
        <div className="sia-advice__tip">💡 {advice.tip}</div>
      </div>

      {mainAct.isOutdoor && (
        <div className="sia-countdown-wrap">
          <Countdown endAt={countdownEnd} />
          <div className="sia-countdown-desc">
            Khuyến nghị kết thúc {mainAct.name} trong {suggestEndInMins} phút
          </div>
        </div>
      )}

      {anomaly.xai?.summary && (
        <>
          <button className="sia-xai-toggle" type="button"
            onClick={() => setExpanded(v => !v)}>
            {expanded ? "▲" : "▼"} Xem lý do tăng AQI (AI Explanation)
          </button>
          {expanded && (
            <div className="sia-xai">
              <div className="sia-xai__summary">
                🔍 {anomaly.xai!.summary}
                {anomaly.xai!.confidence > 0 && (
                  <span className="sia-xai__conf">Tin cậy {anomaly.xai!.confidence}%</span>
                )}
              </div>
              {anomaly.xai!.top_factors.slice(0, 3).map((f, i) => (
                <div key={i} className="sia-xai__factor">
                  <span className="sia-xai__rank">#{i+1}</span>
                  <span className="sia-xai__label">{f.label}</span>
                  <span style={{ color: f.direction === "tăng" ? "#ef4444" : "#22c55e" }}>
                    {f.direction === "tăng" ? "↑" : "↓"} {Math.abs(f.delta).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="sia-actions">
        <button className="sia-btn sia-btn--safe" type="button" onClick={handleSafe}>
          🏠 Đã vào trong nhà
        </button>
        <button className="sia-btn sia-btn--continue" type="button" onClick={handleContinue}>
          ⏱ Tiếp tục (snooze 30p)
        </button>
        {active.length === 1 && (
          <button className="sia-btn sia-btn--cancel" type="button"
            onClick={() => handleCancel(active[0].id)}>
            ✕ Hủy hoạt động
          </button>
        )}
      </div>

      <div className="sia-general-rec">
        {anomaly.recommendation}
      </div>
    </div>
  );
}
