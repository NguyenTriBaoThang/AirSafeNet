/**
 * 
 * Phát hiện pattern AQI bất lợi trong lịch sử 30 ngày:
 *
 * Thuật toán:
 *   1. Fetch /api/air/history?days=30 → 720 điểm hourly
 *   2. Group by (dayOfWeek × hour) → avgAQI mỗi slot
 *   3. Với mỗi hoạt động đã lên lịch:
 *      a. Tính avgAQI cho (ngày lịch × giờ lịch) của hoạt động
 *      b. Tìm slot tốt hơn ≥ 10 AQI trong ±3h, cùng hoặc khác ngày
 *      c. Nếu ngày cụ thể trong daysOfWeek có AQI cao bất thường → flag
 *   4. Sinh insight card với action "Áp dụng" → callback onApply
 *
 * Loại insight:
 *   - BAD_DAY:   "Thứ 3 và Thứ 5 AQI thường cao hơn 20% — cân nhắc bỏ những ngày này"
 *   - BAD_HOUR:  "19h thường cao hơn 18h — nên đổi sang 18h"
 *   - GOOD_SLOT: "09h Thứ 7 là khung giờ an toàn nhất tuần cho Tập thể dục"
 */

import { useEffect, useRef, useState } from "react";
import { http } from "../../api/http";

type HistoryPoint = { time: string; aqi: number; pm25: number; };

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

type SlotStats = Record<string, { sum: number; count: number; avg: number }>;

type InsightType = "BAD_DAY" | "BAD_HOUR" | "GOOD_SLOT" | "CONFLICT_DAY";

type Insight = {
  id:          string;
  type:        InsightType;
  scheduleId:  number;
  scheduleName:string;
  scheduleIcon:string;
  title:       string;
  description: string;
  impact:      string;  
  severity:    "warning" | "info" | "success";
  dismissed:   boolean;
  action?:     {
    label:     string;
    newHour?:  number;
    removeDays?: number[];  
  };
};

type Props = {
  schedules:  Schedule[];
  onApplyHour:   (scheduleId: number, newHour: number) => Promise<void>;
  onRemoveDays:  (scheduleId: number, days: number[]) => Promise<void>;
};

const CACHE_KEY    = "airsafenet_pattern_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

const DAY_LABELS: Record<number, string> = {
  0:"Chủ nhật", 1:"Thứ 2", 2:"Thứ 3", 3:"Thứ 4",
  4:"Thứ 5",    5:"Thứ 6", 6:"Thứ 7",
};
const DAY_SHORT: Record<number, string> = {
  0:"CN", 1:"T2", 2:"T3", 3:"T4", 4:"T5", 5:"T6", 6:"T7",
};

function dbToJs(db: number): number { return db === 7 ? 0 : db; }
function jsToDb(js: number): number { return js === 0 ? 7 : js; }

function slotKey(jsDay: number, hour: number) { return `${jsDay}_${hour}`; }

function aqiColor(aqi: number): string {
  if (aqi <=  50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#a855f7";
}

function fmt2(n: number) { return String(n).padStart(2,"0"); }

function buildSlotStats(history: HistoryPoint[]): SlotStats {
  const stats: SlotStats = {};
  history.forEach(p => {
    if (!p.time || isNaN(p.aqi)) return;
    const dt   = new Date(p.time);
    const key  = slotKey(dt.getDay(), dt.getHours());
    if (!stats[key]) stats[key] = { sum: 0, count: 0, avg: 0 };
    stats[key].sum   += p.aqi;
    stats[key].count += 1;
    stats[key].avg    = stats[key].sum / stats[key].count;
  });
  return stats;
}

function analyzeSchedule(s: Schedule, stats: SlotStats): Insight[] {
  const insights: Insight[] = [];
  const scheduledDays = (s.daysOfWeek ?? "").split(",").map(Number).filter(Boolean)
    .map(dbToJs);

  if (scheduledDays.length === 0) return [];

  const currentHour = s.hourOfDay;

  const dayAqis = scheduledDays.map(jsDay => ({
    jsDay,
    avg: stats[slotKey(jsDay, currentHour)]?.avg ?? 0,
    count: stats[slotKey(jsDay, currentHour)]?.count ?? 0,
  })).filter(x => x.count >= 2); 

  if (dayAqis.length === 0) return [];

  const overallAvg = dayAqis.reduce((s,x) => s + x.avg, 0) / dayAqis.length;

  const badDays = dayAqis.filter(d => d.avg - overallAvg >= 15 && d.avg > 60);
  if (badDays.length > 0 && badDays.length < scheduledDays.length) {
    const badNames = badDays.map(d => DAY_LABELS[d.jsDay]).join(", ");
    const avgBad   = Math.round(badDays.reduce((s,x) => s+x.avg, 0) / badDays.length);
    const avgGood  = Math.round(overallAvg);
    const diff     = avgBad - avgGood;

    insights.push({
      id:           `bad_day_${s.id}`,
      type:         "BAD_DAY",
      scheduleId:   s.id,
      scheduleName: s.name,
      scheduleIcon: s.icon,
      title:        `${badNames} thường ô nhiễm hơn`,
      description:  `Trong 30 ngày qua, ${badNames} có AQI trung bình cao hơn ${diff} đơn vị so với các ngày còn lại khi bạn ${s.name.toLowerCase()}.`,
      impact:       `AQI TB ${avgBad} vs ${avgGood}`,
      severity:     "warning",
      dismissed:    false,
      action: {
        label:      `Bỏ ${badNames} khỏi lịch`,
        removeDays: badDays.map(d => jsToDb(d.jsDay)),
      },
    });
  }

  const currentAvgAqi = overallAvg;

  let bestHour     = currentHour;
  let bestAvgAqi   = currentAvgAqi;
  let bestDiff     = 0;

  for (let dh = -3; dh <= 3; dh++) {
    if (dh === 0) continue;
    const testHour = currentHour + dh;
    if (testHour < 5 || testHour > 22) continue;

    const testAqis = scheduledDays.map(jsDay =>
      stats[slotKey(jsDay, testHour)]?.avg ?? 0
    ).filter(x => x > 0);

    if (testAqis.length === 0) continue;
    const testAvg = testAqis.reduce((a,b) => a+b,0) / testAqis.length;
    const diff    = currentAvgAqi - testAvg;

    if (diff >= 10 && testAvg < bestAvgAqi) {
      bestHour   = testHour;
      bestAvgAqi = testAvg;
      bestDiff   = diff;
    }
  }

  if (bestDiff >= 10 && bestHour !== currentHour) {
    const dir = bestHour > currentHour ? "muộn hơn" : "sớm hơn";
    const hrs = Math.abs(bestHour - currentHour);
    insights.push({
      id:           `bad_hour_${s.id}`,
      type:         "BAD_HOUR",
      scheduleId:   s.id,
      scheduleName: s.name,
      scheduleIcon: s.icon,
      title:        `${fmt2(bestHour)}:00 an toàn hơn ${fmt2(currentHour)}:00`,
      description:  `Theo lịch sử 30 ngày, ${fmt2(bestHour)}:00 có AQI thấp hơn trung bình ${Math.round(bestDiff)} đơn vị — ${hrs}h ${dir} so với hiện tại.`,
      impact:       `AQI TB ${Math.round(bestAvgAqi)} vs ${Math.round(currentAvgAqi)}`,
      severity:     "warning",
      dismissed:    false,
      action: {
        label:   `Đổi sang ${fmt2(bestHour)}:00`,
        newHour: bestHour,
      },
    });
  }

  let goldenSlot: { jsDay: number; hour: number; avg: number } | null = null;
  let goldenAvg = Infinity;

  for (let jsDay = 0; jsDay < 7; jsDay++) {
    for (let h = 6; h <= 21; h++) {
      const slot = stats[slotKey(jsDay, h)];
      if (!slot || slot.count < 2) continue;
      if (slot.avg < goldenAvg) {
        goldenAvg  = slot.avg;
        goldenSlot = { jsDay, hour: h, avg: slot.avg };
      }
    }
  }

  if (goldenSlot && goldenAvg < currentAvgAqi - 15 &&
      !(scheduledDays.includes(goldenSlot.jsDay) && goldenSlot.hour === currentHour)) {

    const alreadyScheduled = scheduledDays.includes(goldenSlot.jsDay);
    insights.push({
      id:           `good_slot_${s.id}`,
      type:         "GOOD_SLOT",
      scheduleId:   s.id,
      scheduleName: s.name,
      scheduleIcon: s.icon,
      title:        `${DAY_LABELS[goldenSlot.jsDay]} ${fmt2(goldenSlot.hour)}:00 — khung giờ vàng`,
      description:  `${DAY_LABELS[goldenSlot.jsDay]} lúc ${fmt2(goldenSlot.hour)}:00 là thời điểm AQI thấp nhất trong tuần${alreadyScheduled ? " (đã có trong lịch)" : ""}. Phù hợp nhất để ${s.name.toLowerCase()}.`,
      impact:       `AQI TB ${Math.round(goldenAvg)} — thấp hơn ${Math.round(currentAvgAqi - goldenAvg)} đơn vị`,
      severity:     "success",
      dismissed:    false,
      action: {
        label:   `Chuyển sang ${DAY_SHORT[goldenSlot.jsDay]} ${fmt2(goldenSlot.hour)}:00`,
        newHour: goldenSlot.hour,
      },
    });
  }

  return insights;
}

function loadCache(): HistoryPoint[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}
function saveCache(data: HistoryPoint[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* ignore */ }
}

function AqiTimeline({ stats, scheduledDays, hour }: {
  stats: SlotStats; scheduledDays: number[]; hour: number;
}) {
  return (
    <div className="pit-timeline">
      {[0,1,2,3,4,5,6].map(jsDay => {
        const slot     = stats[slotKey(jsDay, hour)];
        const aqi      = slot?.avg ?? 0;
        const isSchd   = scheduledDays.includes(jsDay);
        const hasData  = (slot?.count ?? 0) >= 2;
        const color    = aqiColor(aqi);
        const heightPct = hasData ? Math.min(100, (aqi / 200) * 100) : 20;

        return (
          <div key={jsDay} className="pit-timeline__col">
            <div className="pit-timeline__bar-track">
              <div
                className="pit-timeline__bar"
                style={{
                  height: `${heightPct}%`,
                  background: hasData ? color : "rgba(255,255,255,.1)",
                  opacity: hasData ? 1 : 0.4,
                }}
                title={hasData ? `${DAY_LABELS[jsDay]}: AQI ${Math.round(aqi)}` : "Không đủ data"}
              />
            </div>
            <span className={`pit-timeline__label ${isSchd ? "pit-timeline__label--schd" : ""}`}>
              {DAY_SHORT[jsDay]}
            </span>
            {isSchd && <span className="pit-timeline__dot" style={{ background: color }} />}
          </div>
        );
      })}
    </div>
  );
}

function InsightCard({
  insight, stats, schedule, onApply, onDismiss, applying,
}: {
  insight:   Insight;
  stats:     SlotStats;
  schedule:  Schedule | undefined;
  onApply:   () => void;
  onDismiss: () => void;
  applying:  boolean;
}) {
  const scheduledDays = schedule
    ? (schedule.daysOfWeek ?? "").split(",").map(Number).filter(Boolean).map(dbToJs)
    : [];

  const borderColor =
    insight.severity === "warning" ? "rgba(249,115,22,.3)"
    : insight.severity === "success" ? "rgba(34,197,94,.25)"
    : "rgba(59,130,246,.25)";

  const bgColor =
    insight.severity === "warning" ? "rgba(249,115,22,.06)"
    : insight.severity === "success" ? "rgba(34,197,94,.05)"
    : "rgba(59,130,246,.05)";

  const icon =
    insight.severity === "warning" ? "⚠️"
    : insight.severity === "success" ? "✅"
    : "💡";

  return (
    <div className="pit-card" style={{ borderColor, background: bgColor }}>
      <div className="pit-card__header">
        <div className="pit-card__left">
          <span className="pit-card__icon">{insight.scheduleIcon}</span>
          <div>
            <div className="pit-card__activity">{insight.scheduleName}</div>
            <div className="pit-card__title">
              <span>{icon}</span> {insight.title}
            </div>
          </div>
        </div>
        <div className="pit-card__impact">
          {insight.impact}
        </div>
      </div>

      <p className="pit-card__desc">{insight.description}</p>

      {schedule && (
        <AqiTimeline
          stats={stats}
          scheduledDays={scheduledDays}
          hour={schedule.hourOfDay}
        />
      )}

      <div className="pit-card__actions">
        <button className="pit-dismiss" type="button" onClick={onDismiss}>
          Bỏ qua
        </button>
        {insight.action && (
          <button
            className="pit-apply"
            type="button"
            disabled={applying}
            onClick={onApply}
            style={{ borderColor, color: insight.severity === "success" ? "#22c55e" : "#f97316" }}
          >
            {applying ? "Đang áp dụng..." : insight.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PatternInsightWidget({ schedules, onApplyHour, onRemoveDays }: Props) {
  const [insights,    setInsights]    = useState<Insight[]>([]);
  const [stats,       setStats]       = useState<SlotStats>({});
  const [loading,     setLoading]     = useState(true);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [error,       setError]       = useState("");
  const [applyingId,  setApplyingId]  = useState<string | null>(null);
  const [dataPoints,  setDataPoints]  = useState(0);
  const [expanded,    setExpanded]    = useState(true);
  const analyzedRef = useRef(false);

  useEffect(() => {
    if (schedules.length === 0) { setLoading(false); return; }
    if (analyzedRef.current) return;

    let cancelled = false;
    async function doAnalyze() {
      try {
        setLoading(true);

        let history = loadCache();

        if (!history) {
          const data = await http<{ history: HistoryPoint[] }>(
            "/api/air/history?days=30",
            { method: "GET", auth: true }
          );
          if (cancelled) return;
          history = data.history ?? [];
          saveCache(history);
        }

        if (cancelled) return;
        setDataPoints(history.length);

        if (history.length < 48) {
          setError("Cần ít nhất 2 ngày dữ liệu lịch sử để phân tích pattern.");
          setLoading(false);
          return;
        }

        setAnalyzing(true);
        const slotStats = buildSlotStats(history);
        setStats(slotStats);

        const allInsights: Insight[] = [];
        schedules.forEach(s => {
          const found = analyzeSchedule(s, slotStats);
          allInsights.push(...found);
        });

        const dismissed = getDismissed();
        const filtered  = allInsights.map(ins => ({
          ...ins,
          dismissed: dismissed.includes(ins.id),
        }));

        setInsights(filtered);
        analyzedRef.current = true;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi phân tích");
      } finally {
        if (!cancelled) { setLoading(false); setAnalyzing(false); }
      }
    }
    doAnalyze();
    return () => { cancelled = true; };
  }, [schedules]);

  function getDismissed(): string[] {
    try { return JSON.parse(localStorage.getItem("airsafenet_dismissed_insights") ?? "[]"); }
    catch { return []; }
  }
  function addDismissed(id: string) {
    const cur = getDismissed();
    localStorage.setItem("airsafenet_dismissed_insights", JSON.stringify([...cur, id]));
  }

  function handleDismiss(insightId: string) {
    addDismissed(insightId);
    setInsights(prev => prev.map(ins =>
      ins.id === insightId ? { ...ins, dismissed: true } : ins
    ));
  }

  async function handleApply(insight: Insight) {
    setApplyingId(insight.id);
    try {
      if (insight.action?.newHour !== undefined) {
        await onApplyHour(insight.scheduleId, insight.action.newHour);
      } else if (insight.action?.removeDays) {
        await onRemoveDays(insight.scheduleId, insight.action.removeDays);
      }
      handleDismiss(insight.id);
    } catch {/* silent */}
    finally { setApplyingId(null); }
  }

  const visible = insights.filter(ins => !ins.dismissed);
  const warnings = visible.filter(ins => ins.severity === "warning").length;
  const successes = visible.filter(ins => ins.severity === "success").length;

  if (loading || analyzing) {
    return (
      <div className="pit-card pit-card--loading">
        <div className="pit-loading">
          <div className="pit-spin" />
          <div>
            <strong>Đang phân tích pattern lịch sử...</strong>
            <span>Phân tích {dataPoints} điểm dữ liệu · 30 ngày × 24 giờ × 7 thứ</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pit-card pit-card--error">
        <span>⚠️</span> {error}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="pit-card pit-card--empty">
        <span>📊</span>
        <p>Thêm hoạt động vào lịch để hệ thống phân tích pattern AQI.</p>
      </div>
    );
  }

  return (
    <div className="pit-widget">
      <div className="pit-header">
        <div className="pit-header__left">
          <div className="pit-header__eyebrow">🔍 Pattern Detection AI</div>
          <h3 className="pit-header__title">Phân tích xu hướng AQI theo lịch của bạn</h3>
          <p className="pit-header__sub">
            Dựa trên {dataPoints} điểm dữ liệu trong 30 ngày qua
          </p>
        </div>
        <div className="pit-header__right">
          {warnings > 0 && (
            <div className="pit-badge pit-badge--warn">⚠ {warnings} cảnh báo</div>
          )}
          {successes > 0 && (
            <div className="pit-badge pit-badge--good">★ {successes} gợi ý tốt</div>
          )}
          <button className="pit-toggle-btn" type="button"
            onClick={() => setExpanded(v => !v)}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {visible.length === 0 ? (
            <div className="pit-all-good">
              <span>✅</span>
              <div>
                <strong>Lịch hoạt động của bạn đã được tối ưu!</strong>
                <span>Không phát hiện pattern AQI bất lợi nào trong 30 ngày qua.</span>
              </div>
            </div>
          ) : (
            <div className="pit-cards">
              {visible.map(ins => (
                <InsightCard
                  key={ins.id}
                  insight={ins}
                  stats={stats}
                  schedule={schedules.find(s => s.id === ins.scheduleId)}
                  onApply={() => handleApply(ins)}
                  onDismiss={() => handleDismiss(ins.id)}
                  applying={applyingId === ins.id}
                />
              ))}
            </div>
          )}

          {insights.filter(i => i.dismissed).length > 0 && (
            <div className="pit-dismissed-note">
              {insights.filter(i => i.dismissed).length} gợi ý đã bị ẩn ·{" "}
              <button type="button" className="pit-reset-btn"
                onClick={() => {
                  localStorage.removeItem("airsafenet_dismissed_insights");
                  setInsights(prev => prev.map(i => ({ ...i, dismissed: false })));
                }}>
                Hiện lại tất cả
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}