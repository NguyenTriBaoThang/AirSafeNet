/**
 *
 * Gamification layer cho trang Activity:
 *   - Streak: đếm ngày liên tiếp toàn bộ hoạt động nằm trong ngưỡng WHO
 *   - Badges: huy hiệu mở khóa theo điều kiện cụ thể
 *   - Calendar heatmap 30 ngày mini để thấy "ngày xanh / đỏ"
 *
 * Data source: reuse cache "airsafenet_exposure_log" từ ExposureLogWidget
 *   → không fetch thêm API, chạy hoàn toàn từ localStorage
 *   → nếu cache chưa có → tự fetch /api/air/history?days=30
 *
 * ─────────────────────────────────────────────────────────────
 * BADGE DEFINITIONS
 * ─────────────────────────────────────────────────────────────
 *  first_green      Ngày xanh đầu tiên (dose < WHO)
 *  streak_3         3 ngày xanh liên tiếp
 *  streak_7         7 ngày xanh liên tiếp          "7 Ngày Xanh"
 *  streak_14        14 ngày xanh liên tiếp         "Tuần Vàng"
 *  streak_30        30 ngày xanh liên tiếp         "30 Ngày An Toàn"
 *  active_week      Có hoạt động ≥5 ngày/tuần
 *  dry_season       30 ngày tháng 3 hoặc 4 vẫn có hoạt động + dose < WHO
 *                   "Chiến Binh Mùa Khô"
 *  indoor_hero      3 ngày liên tiếp đổi outdoor → indoor khi AQI > 100
 *  early_bird       5 ngày hoạt động trước 7h sáng
 *  night_owl        5 ngày hoạt động sau 19h mà vẫn safe
 *  perfectionist    7 ngày dose < 50% WHO liên tiếp
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { http } from "../../api/http";

type Schedule = {
  id:              number;
  name:            string;
  icon:            string;
  hourOfDay:       number;
  durationMinutes: number;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  daysOfWeek:      string;
};

type HistoryPoint = { time: string; pm25: number; aqi: number };

type DaySummary = {
  date:       string;      
  jsDay:      number;      
  month:      number;     
  totalDose:  number;     
  whoPercent: number;    
  isGreen:    boolean;     
  isPerfect:  boolean;
  hasActivity:boolean;     
  hasData:    boolean;     
  aqi:        number;     
  hadHighAqi: boolean; 
  earlyBird:  boolean;     
  nightOwl:   boolean;     
};

type Badge = {
  id:          string;
  emoji:       string;
  name:        string;
  description: string;
  unlocked:    boolean;
  unlockedAt?: string;
  rarity:      "common" | "uncommon" | "rare" | "legendary";
  progress?:   number;     
  target?:     number;    
  current?:    number;     
};

type Props = {
  schedules: Schedule[];
};

const VENT: Record<string, number> = { low: 0.50, moderate: 1.00, high: 1.80 };
const INDOOR_IO  = 0.50;
const WHO_DAILY  = 225;

const LOG_CACHE_KEY   = "airsafenet_exposure_log";   
const BADGE_CACHE_KEY = "airsafenet_badges";

function calcDose(pm25: number, dur: number, intensity: string, outdoor: boolean): number {
  return pm25 * (dur / 60) * (VENT[intensity] ?? 0.5) * (outdoor ? 1.0 : INDOOR_IO);
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function dbToJs(db: number): number { return db === 7 ? 0 : db; }

function runsOnDay(s: Schedule, jsDay: number): boolean {
  return (s.daysOfWeek ?? "").split(",").map(Number).filter(Boolean)
    .map(dbToJs).includes(jsDay);
}

function buildDaySummaries(history: HistoryPoint[], schedules: Schedule[]): DaySummary[] {
  const pmIdx: Record<string, { sumPm25: number; sumAqi: number; n: number }> = {};
  history.forEach(p => {
    if (!p.time) return;
    const dt  = new Date(p.time);
    const key = `${dateStr(dt)}_${dt.getHours()}`;
    if (!pmIdx[key]) pmIdx[key] = { sumPm25: 0, sumAqi: 0, n: 0 };
    pmIdx[key].sumPm25 += p.pm25 || 0;
    pmIdx[key].sumAqi  += p.aqi  || 0;
    pmIdx[key].n       += 1;
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const days: DaySummary[] = [];

  for (let i = 29; i >= 0; i--) {
    const d    = new Date(today); d.setDate(d.getDate() - i);
    const dStr = dateStr(d);
    const jsDay = d.getDay();

    let totalDose   = 0;
    let hasActivity = false;
    let hasData     = false;
    let hadHighAqi  = false;
    let earlyBird   = false;
    let nightOwl    = false;
    let aqiSum      = 0;
    let aqiCount    = 0;

    schedules.forEach(s => {
      if (!runsOnDay(s, jsDay)) return;
      const key  = `${dStr}_${s.hourOfDay}`;
      const slot = pmIdx[key];
      if (!slot) return;

      const pm25 = slot.sumPm25 / slot.n;
      const aqi  = slot.sumAqi  / slot.n;
      const dose = calcDose(pm25, s.durationMinutes, s.intensity, s.isOutdoor);

      totalDose   += dose;
      hasActivity  = true;
      hasData      = true;
      aqiSum      += aqi;
      aqiCount    += 1;

      if (aqi > 100) hadHighAqi = true;
      if (s.hourOfDay < 7)  earlyBird = true;
      if (s.hourOfDay >= 19) nightOwl = true;
    });

    const avgAqi   = aqiCount > 0 ? aqiSum / aqiCount : 0;
    const pct      = (totalDose / WHO_DAILY) * 100;
    const isGreen  = hasData && pct < 100;
    const isPerfect= hasData && pct < 50;

    days.push({
      date:    dStr,
      jsDay,
      month:   d.getMonth(),
      totalDose,
      whoPercent: pct,
      isGreen,
      isPerfect,
      hasActivity,
      hasData,
      aqi:    avgAqi,
      hadHighAqi,
      earlyBird,
      nightOwl: nightOwl && isGreen,
    });
  }

  return days;
}

function calcStreak(days: DaySummary[]): { current: number; best: number } {
  const sorted = [...days]; 
  let current = 0;
  let best    = 0;
  let run     = 0;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i];
    if (!d.hasData) {
      if (current === 0) { run = 0; continue; }
      break;
    }
    if (d.isGreen) {
      run++;
      best = Math.max(best, run);
      if (i === sorted.length - 1 || sorted.slice(i+1).every(x => !x.hasData || x.isGreen)) {
        current = run;
      }
    } else {
      if (current === 0) run = 0;
      else break;
    }
  }

  return { current, best };
}

function evalBadges(days: DaySummary[], streak: { current: number; best: number }): Badge[] {
  const sorted   = [...days]; // oldest first
  const daysWithData    = sorted.filter(d => d.hasData);
  const greenDays       = daysWithData.filter(d => d.isGreen);
  //const perfectDays     = daysWithData.filter(d => d.isPerfect);

  let perfStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].hasData && sorted[i].isPerfect) perfStreak++;
    else break;
  }

  const last7       = sorted.slice(-7);
  const activeLast7 = last7.filter(d => d.hasActivity).length;

  const earlyBirdDays = daysWithData.filter(d => d.earlyBird && d.isGreen).length;

  const nightOwlDays = daysWithData.filter(d => d.nightOwl).length;

  const dryDays = daysWithData.filter(d => (d.month === 2 || d.month === 3) && d.isGreen && d.hasActivity);

  let indoorRun = 0, bestIndoor = 0;
  sorted.forEach(d => {
    if (d.hasData && d.hadHighAqi && d.isGreen) { indoorRun++; bestIndoor = Math.max(bestIndoor, indoorRun); }
    else indoorRun = 0;
  });

  const best = streak.best;
  const cur  = streak.current;

  const badges: Badge[] = [
    {
      id: "first_green", emoji: "🌱", name: "Bước Đầu Xanh", rarity: "common",
      description: "Ngày xanh đầu tiên — toàn bộ hoạt động trong ngưỡng WHO.",
      unlocked: greenDays.length >= 1,
      progress: Math.min(100, greenDays.length >= 1 ? 100 : 0),
    },
    {
      id: "streak_3", emoji: "🔥", name: "Bộ 3 Xanh", rarity: "common",
      description: "3 ngày xanh liên tiếp.",
      unlocked: best >= 3,
      target: 3, current: Math.min(3, cur),
      progress: Math.min(100, (cur / 3) * 100),
    },
    {
      id: "streak_7", emoji: "💚", name: "7 Ngày Xanh", rarity: "uncommon",
      description: "7 ngày xanh liên tiếp — một tuần lành mạnh hoàn toàn.",
      unlocked: best >= 7,
      target: 7, current: Math.min(7, cur),
      progress: Math.min(100, (cur / 7) * 100),
    },
    {
      id: "streak_14", emoji: "🏅", name: "Tuần Vàng", rarity: "uncommon",
      description: "14 ngày xanh liên tiếp — hai tuần không vượt ngưỡng WHO.",
      unlocked: best >= 14,
      target: 14, current: Math.min(14, cur),
      progress: Math.min(100, (cur / 14) * 100),
    },
    {
      id: "streak_30", emoji: "🏆", name: "30 Ngày An Toàn", rarity: "rare",
      description: "30 ngày xanh liên tiếp. Thành tích đặc biệt!",
      unlocked: best >= 30,
      target: 30, current: Math.min(30, cur),
      progress: Math.min(100, (cur / 30) * 100),
    },
    {
      id: "perfectionist", emoji: "⭐", name: "Hoàn Hảo", rarity: "rare",
      description: "7 ngày liên tiếp dưới 50% ngưỡng WHO — kiểm soát xuất sắc.",
      unlocked: perfStreak >= 7,
      target: 7, current: Math.min(7, perfStreak),
      progress: Math.min(100, (perfStreak / 7) * 100),
    },
    {
      id: "active_week", emoji: "💪", name: "Tuần Siêng Năng", rarity: "common",
      description: "Có hoạt động ≥5 ngày trong tuần vừa qua.",
      unlocked: activeLast7 >= 5,
      target: 5, current: activeLast7,
      progress: Math.min(100, (activeLast7 / 5) * 100),
    },
    {
      id: "dry_season", emoji: "🌞", name: "Chiến Binh Mùa Khô", rarity: "legendary",
      description: "Duy trì hoạt động an toàn trong tháng 3-4 — mùa ô nhiễm nặng nhất TPHCM.",
      unlocked: dryDays.length >= 10,
      target: 10, current: Math.min(10, dryDays.length),
      progress: Math.min(100, (dryDays.length / 10) * 100),
    },
    {
      id: "early_bird", emoji: "🌅", name: "Chim Sơn Ca", rarity: "uncommon",
      description: "5 ngày hoạt động trước 7 giờ sáng và vẫn trong ngưỡng an toàn.",
      unlocked: earlyBirdDays >= 5,
      target: 5, current: Math.min(5, earlyBirdDays),
      progress: Math.min(100, (earlyBirdDays / 5) * 100),
    },
    {
      id: "night_owl", emoji: "🌙", name: "Cú Đêm Lành Mạnh", rarity: "uncommon",
      description: "5 ngày hoạt động sau 19h mà vẫn an toàn.",
      unlocked: nightOwlDays >= 5,
      target: 5, current: Math.min(5, nightOwlDays),
      progress: Math.min(100, (nightOwlDays / 5) * 100),
    },
    {
      id: "indoor_hero", emoji: "🏠", name: "Anh Hùng Trong Nhà", rarity: "uncommon",
      description: "3 ngày liên tiếp AQI cao nhưng vẫn an toàn nhờ chuyển hoạt động vào trong nhà.",
      unlocked: bestIndoor >= 3,
      target: 3, current: Math.min(3, bestIndoor),
      progress: Math.min(100, (bestIndoor / 3) * 100),
    },
  ];

  return badges;
}

function StreakFlame({ count }: { count: number }) {
  const size = count === 0 ? 0 : Math.min(1.5, 0.7 + count / 20);
  const opacity = count === 0 ? 0.2 : 1;
  return (
    <div className="ssk-flame" style={{ transform: `scale(${size})`, opacity }}>
      {count >= 7  ? "🔥" :
       count >= 3  ? "🟢" :
       count >= 1  ? "✅" : "⬜"}
    </div>
  );
}

function MiniCalendar({ days }: { days: DaySummary[] }) {
  const DAY_LABELS = ["CN","T2","T3","T4","T5","T6","T7"];
  return (
    <div className="ssk-cal">
      {DAY_LABELS.map(l => (
        <div key={l} className="ssk-cal__header">{l}</div>
      ))}
      {/* Pad empty cells before first day */}
      {Array.from({ length: (days[0]?.jsDay === 0 ? 6 : days[0]?.jsDay - 1) || 0 }, (_, i) => (
        <div key={`pad-${i}`} className="ssk-cal__cell ssk-cal__cell--empty" />
      ))}
      {days.map((d, i) => {
        const bg =
          !d.hasData    ? "rgba(255,255,255,.04)" :
          d.isPerfect   ? "rgba(34,197,94,.6)"    :
          d.isGreen     ? "rgba(34,197,94,.3)"    :
          d.whoPercent > 150 ? "rgba(168,85,247,.5)"  :
          d.whoPercent > 100 ? "rgba(239,68,68,.45)"  :
          "rgba(249,115,22,.4)";

        return (
          <div
            key={i}
            className={`ssk-cal__cell ${d.hasData ? "ssk-cal__cell--data" : ""}`}
            style={{ background: bg }}
            title={`${d.date} · ${d.hasData ? `${Math.round(d.whoPercent)}% WHO` : "Không có data"}`}
          >
            {d.hasActivity && d.hasData && (
              <div className="ssk-cal__dot" style={{
                background: d.isGreen ? "#22c55e" : "#ef4444",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BadgeCard({ badge, isNew }: { badge: Badge; isNew?: boolean }) {
  const rarityColor: Record<string, string> = {
    common:    "rgba(255,255,255,.15)",
    uncommon:  "rgba(59,130,246,.35)",
    rare:      "rgba(168,85,247,.4)",
    legendary: "rgba(245,158,11,.45)",
  };
  const rarityBg: Record<string, string> = {
    common:    "rgba(255,255,255,.03)",
    uncommon:  "rgba(59,130,246,.07)",
    rare:      "rgba(168,85,247,.08)",
    legendary: "rgba(245,158,11,.1)",
  };
  const rarityLabel: Record<string, string> = {
    common: "Phổ thông", uncommon: "Hiếm", rare: "Quý hiếm", legendary: "Huyền thoại",
  };

  return (
    <div className={`ssk-badge ${badge.unlocked ? "ssk-badge--on" : "ssk-badge--off"} ${isNew ? "ssk-badge--new" : ""}`}
      style={{ borderColor: badge.unlocked ? rarityColor[badge.rarity] : "rgba(255,255,255,.07)", background: badge.unlocked ? rarityBg[badge.rarity] : "transparent" }}>

      <div className="ssk-badge__emoji" style={{ opacity: badge.unlocked ? 1 : 0.25 }}>
        {badge.emoji}
      </div>
      <div className="ssk-badge__info">
        <div className="ssk-badge__name" style={{ color: badge.unlocked ? "#f0f6ff" : "#475569" }}>
          {badge.name}
          {isNew && <span className="ssk-badge__new-chip">Mới!</span>}
        </div>
        <div className="ssk-badge__rarity"
          style={{ color: badge.unlocked ? rarityColor[badge.rarity].replace("0.", "0.8") : "#374151" }}>
          {rarityLabel[badge.rarity]}
        </div>
        <div className="ssk-badge__desc">{badge.description}</div>

        {!badge.unlocked && badge.target !== undefined && (
          <div className="ssk-badge__progress">
            <div className="ssk-badge__progress-bar">
              <div style={{ width: `${badge.progress ?? 0}%` }} />
            </div>
            <span>{badge.current ?? 0}/{badge.target}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SafetyStreakWidget({ schedules }: Props) {
  const [days,       setDays]       = useState<DaySummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<"streak"|"badges"|"calendar">("streak");
  const [newBadges,  setNewBadges]  = useState<string[]>([]);
  const prevBadges = useRef<string[]>([]);

  useEffect(() => {
    if (schedules.length === 0) { setLoading(false); return; }
    let cancelled = false;

    async function doLoad() {
      try {
        setLoading(true);
        let history: HistoryPoint[] | null = null;

        try {
          const raw = localStorage.getItem(LOG_CACHE_KEY);
          if (raw) {
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts < 24 * 60 * 60 * 1000) history = data;
          }
        } catch { /* ignore */ }

        if (!history) {
          const res = await http<{ history: HistoryPoint[] }>(
            "/api/air/history?days=30",
            { method: "GET", auth: true }
          );
          if (cancelled) return;
          history = res.history ?? [];
          try {
            localStorage.setItem(LOG_CACHE_KEY, JSON.stringify({ data: history, ts: Date.now() }));
          } catch { /* ignore */ }
        }

        if (cancelled) return;
        const built = buildDaySummaries(history, schedules);
        setDays(built);
      } catch (e) {
        console.error("SafetyStreak load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doLoad();
    return () => { cancelled = true; };
  }, [schedules]);

  const streak = useMemo(() => calcStreak(days), [days]);
  const badges = useMemo(() => evalBadges(days, streak), [days, streak]);

  useEffect(() => {
    if (badges.length === 0) return;
    const unlocked    = badges.filter(b => b.unlocked).map(b => b.id);
    const prev        = prevBadges.current;
    const justUnlocked = unlocked.filter(id => !prev.includes(id));

    try {
      const saved = JSON.parse(localStorage.getItem(BADGE_CACHE_KEY) ?? "[]") as string[];
      const brandNew = unlocked.filter(id => !saved.includes(id));
      if (brandNew.length > 0) {
        setNewBadges(brandNew);
        localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify(unlocked));
      }
    } catch { /* ignore */ }

    prevBadges.current = unlocked;
    void justUnlocked;
  }, [badges]);

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const greenCount    = days.filter(d => d.hasData && d.isGreen).length;

  if (loading) return (
    <div className="ssk-card">
      <div className="ssk-loading">
        <div className="ssk-spin" />
        <span>Đang tính streak & badges...</span>
      </div>
    </div>
  );

  return (
    <div className="ssk-card">
      <div className="ssk-header">
        <div>
          <div className="ssk-header__eyebrow">🎯 Safety Gamification</div>
          <h3 className="ssk-header__title">Streak & Huy Hiệu</h3>
          <p className="ssk-header__sub">
            {greenCount} ngày xanh trong 30 ngày qua · {unlockedCount}/{badges.length} huy hiệu
          </p>
        </div>
        <div className="ssk-header__streak-chip">
          <StreakFlame count={streak.current} />
          <div>
            <strong>{streak.current}</strong>
            <span>ngày liên tiếp</span>
          </div>
        </div>
      </div>

      {newBadges.length > 0 && (
        <div className="ssk-new-toast">
          🎉 Mở khóa huy hiệu mới:{" "}
          {newBadges.map(id => badges.find(b => b.id === id)?.name).filter(Boolean).join(", ")}!
        </div>
      )}

      <div className="ssk-tabs">
        {(["streak", "badges", "calendar"] as const).map(t => (
          <button key={t} className={`ssk-tab ${tab === t ? "on" : ""}`}
            type="button" onClick={() => setTab(t)}>
            {t === "streak"   ? "🔥 Streak" :
             t === "badges"   ? `🏅 Huy hiệu (${unlockedCount})` :
             "📅 Lịch sử"}
          </button>
        ))}
      </div>

      {tab === "streak" && (
        <div className="ssk-streak-panel">
          {/* Big streak number */}
          <div className="ssk-streak-hero">
            <div className="ssk-streak-hero__num" style={{
              color: streak.current >= 7 ? "#22c55e" :
                     streak.current >= 3 ? "#86efac" :
                     streak.current >= 1 ? "#eab308" : "#475569",
            }}>
              {streak.current}
            </div>
            <div className="ssk-streak-hero__label">ngày xanh liên tiếp</div>
            <div className="ssk-streak-hero__sub">
              Tốt nhất: <strong>{streak.best} ngày</strong>
            </div>
          </div>

          <div className="ssk-milestones">
            {[
              { n: 1,  emoji: "✅", label: "Bắt đầu" },
              { n: 3,  emoji: "🔥", label: "3 ngày"  },
              { n: 7,  emoji: "💚", label: "7 ngày"  },
              { n: 14, emoji: "🏅", label: "14 ngày" },
              { n: 30, emoji: "🏆", label: "30 ngày" },
            ].map(m => {
              const reached = streak.current >= m.n;
              const next    = !reached && streak.current < m.n &&
                (m.n === 1 || streak.current >= [0,1,3,7,14][([1,3,7,14,30].indexOf(m.n))]);
              return (
                <div key={m.n}
                  className={`ssk-milestone ${reached ? "ssk-milestone--on" : ""} ${next ? "ssk-milestone--next" : ""}`}>
                  <div className="ssk-milestone__emoji">{m.emoji}</div>
                  <div className="ssk-milestone__label">{m.label}</div>
                  {reached && <div className="ssk-milestone__check">✓</div>}
                  {next && <div className="ssk-milestone__left">{m.n - streak.current}d</div>}
                </div>
              );
            })}
          </div>

          <div className="ssk-stats">
            <div className="ssk-stat">
              <strong style={{ color: "#22c55e" }}>{greenCount}</strong>
              <span>Ngày xanh</span>
            </div>
            <div className="ssk-stat">
              <strong style={{ color: "#ef4444" }}>{days.filter(d=>d.hasData&&!d.isGreen).length}</strong>
              <span>Ngày đỏ</span>
            </div>
            <div className="ssk-stat">
              <strong style={{ color: "#eab308" }}>{days.filter(d=>!d.hasData).length}</strong>
              <span>Không có data</span>
            </div>
            <div className="ssk-stat">
              <strong style={{ color: "#a78bfa" }}>{days.filter(d=>d.isPerfect).length}</strong>
              <span>Ngày hoàn hảo</span>
            </div>
          </div>

          <div className="ssk-motivation">
            {streak.current === 0 && (
              <><span>🌱</span><span>Hôm nay là ngày tốt để bắt đầu chuỗi xanh đầu tiên!</span></>
            )}
            {streak.current >= 1 && streak.current < 3 && (
              <><span>🔥</span><span>Tốt lắm! Còn {3 - streak.current} ngày nữa để nhận huy hiệu "Bộ 3 Xanh".</span></>
            )}
            {streak.current >= 3 && streak.current < 7 && (
              <><span>💪</span><span>Xuất sắc! Còn {7 - streak.current} ngày để đạt "7 Ngày Xanh".</span></>
            )}
            {streak.current >= 7 && streak.current < 14 && (
              <><span>🌟</span><span>Ấn tượng! {streak.current} ngày xanh — còn {14 - streak.current} ngày đến "Tuần Vàng".</span></>
            )}
            {streak.current >= 14 && streak.current < 30 && (
              <><span>🏅</span><span>Phi thường! Còn {30 - streak.current} ngày đến mốc "30 Ngày An Toàn" huyền thoại.</span></>
            )}
            {streak.current >= 30 && (
              <><span>🏆</span><span>Bạn đã đạt thành tích tối thượng! {streak.current} ngày xanh liên tiếp.</span></>
            )}
          </div>
        </div>
      )}

      {tab === "badges" && (
        <div className="ssk-badges-panel">
          <div className="ssk-badges-grid">
            {/* Unlocked first */}
            {badges.filter(b => b.unlocked).map(b => (
              <BadgeCard key={b.id} badge={b} isNew={newBadges.includes(b.id)} />
            ))}
            {badges.filter(b => !b.unlocked).map(b => (
              <BadgeCard key={b.id} badge={b} />
            ))}
          </div>
        </div>
      )}

      {tab === "calendar" && (
        <div className="ssk-cal-panel">
          <div className="ssk-cal-legend">
            {[
              { color: "rgba(34,197,94,.6)",   label: "< 50% WHO (hoàn hảo)" },
              { color: "rgba(34,197,94,.3)",   label: "< 100% WHO (xanh)"    },
              { color: "rgba(249,115,22,.4)",  label: "> 100% WHO (vượt)"    },
              { color: "rgba(239,68,68,.45)",  label: "> 150% WHO (đỏ)"      },
              { color: "rgba(255,255,255,.04)", label: "Không có data"        },
            ].map(({ color, label }) => (
              <div key={label} className="ssk-cal-legend__item">
                <div style={{ background: color, width: 12, height: 12, borderRadius: 3, flexShrink: 0 }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <MiniCalendar days={days} />
          <p className="ssk-cal-note">
            Chấm nhỏ = có hoạt động trong ngày đó.
            Ô sáng xanh = hoàn hảo (&lt;50% WHO).
          </p>
        </div>
      )}
    </div>
  );
}
