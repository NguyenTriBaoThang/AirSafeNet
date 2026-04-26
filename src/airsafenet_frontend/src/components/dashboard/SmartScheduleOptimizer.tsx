import { useEffect, useRef, useState } from "react";
import { http } from "../../api/http";

type ForecastPoint = {
  hour:  number;
  aqi:   number;
  pm25:  number;
  risk:  string;
  recommendation: string;
};

type ExistingSchedule = {
  id:              number;
  name:            string;
  icon:            string;
  hourOfDay:       number;
  minute:          number;
  durationMinutes: number;
  daysOfWeek?:     string;
};

type Suggestion = {
  rank:            number;
  hour:            number;
  minute:          number;
  aqi:             number;
  pm25:            number;
  riskScore:       number;
  riskLabel:       string;
  riskColor:       string;
  riskRec:         string;
  conflictWith:    string[];  
  hasConflict:     boolean;
  scoreDiff:       number;    
};

type FormInput = {
  name:            string;
  icon:            string;
  durationMinutes: number;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  daysOfWeek:      string;
};

type ApplyPayload = FormInput & {
  hourOfDay: number;
  minute:    number;
};

type Props = {
  existingSchedules: ExistingSchedule[];
  onApply:           (payload: ApplyPayload) => void;
  groupMultiplier:   number;  
};

const ICONS_SPORT = ["🏃","🚴","🧘","🏊","⚽","🎾","🌅","🌿","💼","🛒","👶","🌙","🏫","🚗","📅"];

const INTENSITY_MULT: Record<string, number> = {
  low:      1.0,
  moderate: 1.15,
  high:     1.40,
};

const QUICK_PRESETS = [
  { name:"Chạy bộ",       icon:"🏃", duration:30,  outdoor:true,  intensity:"high"     as const },
  { name:"Đi bộ",         icon:"🌅", duration:30,  outdoor:true,  intensity:"moderate" as const },
  { name:"Đạp xe",        icon:"🚴", duration:45,  outdoor:true,  intensity:"high"     as const },
  { name:"Yoga",          icon:"🧘", duration:60,  outdoor:false, intensity:"low"      as const },
  { name:"Đi chợ",        icon:"🛒", duration:30,  outdoor:true,  intensity:"low"      as const },
  { name:"Đón con",       icon:"👶", duration:20,  outdoor:true,  intensity:"low"      as const },
  { name:"Tập gym",       icon:"💪", duration:60,  outdoor:false, intensity:"high"     as const },
  { name:"Tưới cây",      icon:"🌿", duration:20,  outdoor:true,  intensity:"low"      as const },
];

const DAYS_OF_WEEK = [
  {n:1,l:"T2"},{n:2,l:"T3"},{n:3,l:"T4"},
  {n:4,l:"T5"},{n:5,l:"T6"},{n:6,l:"T7"},{n:7,l:"CN"},
];

function aqiToBase(aqi: number): number {
  if (aqi <=  50) return aqi * 0.4;
  if (aqi <= 100) return 20 + (aqi - 50)  * 0.4;
  if (aqi <= 150) return 40 + (aqi - 100) * 0.4;
  if (aqi <= 200) return 60 + (aqi - 150) * 0.3;
  if (aqi <= 300) return 75 + (aqi - 200) * 0.15;
  return Math.min(100, 90 + (aqi - 300) * 0.1);
}

function calcScore(aqi: number, groupMult: number, intensMult: number, outdoor: boolean): number {
  return Math.min(100, aqiToBase(aqi) * groupMult * intensMult * (outdoor ? 1.0 : 0.3));
}

function scoreColor(s: number): string {
  if (s <= 20) return "#22c55e";
  if (s <= 40) return "#86efac";
  if (s <= 55) return "#eab308";
  if (s <= 70) return "#f97316";
  if (s <= 85) return "#ef4444";
  return "#a855f7";
}

function scoreLabel(s: number): string {
  if (s <= 20) return "Tuyệt vời";
  if (s <= 40) return "Tốt";
  if (s <= 55) return "Trung bình";
  if (s <= 70) return "Chú ý";
  if (s <= 85) return "Kém";
  return "Nguy hiểm";
}

function fmt2(n: number) { return String(n).padStart(2, "0"); }

function fmtHour(h: number, m = 0) { return `${fmt2(h)}:${fmt2(m)}`; }

function timeUntil(h: number): string {
  const now  = new Date();
  const diff = h * 60 - (now.getHours() * 60 + now.getMinutes());
  if (diff < 0) return "Đã qua";
  if (diff === 0) return "Ngay bây giờ";
  if (diff < 60) return `${diff} phút nữa`;
  return `${Math.floor(diff / 60)}h ${diff % 60 > 0 ? `${diff % 60}p ` : ""}nữa`;
}

function fmtDur(m: number) {
  return m >= 60 ? `${Math.floor(m/60)}h${m%60?`${m%60}p`:""}` : `${m}p`;
}

function hasOverlap(
  newStart: number, 
  newDur:   number,
  existing: ExistingSchedule,
  buffer = 15,
): boolean {
  const exStart = existing.hourOfDay * 60 + existing.minute;
  const exEnd   = exStart + existing.durationMinutes;
  const nStart  = newStart - buffer;
  const nEnd    = newStart + newDur + buffer;
  return nStart < exEnd && nEnd > exStart;
}

function SuggestionCard({
  s, selected, onSelect, rank,
}: {
  s: Suggestion; selected: boolean; onSelect: () => void; rank: number;
}) {
  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

  return (
    <button
      className={`sso-card ${selected ? "sso-card--sel" : ""} ${s.hasConflict ? "sso-card--conflict" : ""}`}
      type="button"
      onClick={onSelect}
      style={{ "--card-color": s.riskColor } as React.CSSProperties}
    >
      <div className="sso-card__rank">{rankEmoji}</div>

      <div className="sso-card__time">
        <strong style={{ color: s.hasConflict ? "#94a3b8" : s.riskColor }}>
          {fmtHour(s.hour, s.minute)}
        </strong>
        <span className="sso-card__rel">{timeUntil(s.hour)}</span>
      </div>

      <div className="sso-ring-wrap">
        <svg viewBox="0 0 44 44" className="sso-ring-svg">
          <circle cx="22" cy="22" r="18" fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth="4"/>
          <circle cx="22" cy="22" r="18" fill="none"
            stroke={s.hasConflict ? "#475569" : s.riskColor}
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${(s.riskScore / 100) * 113.1} 113.1`}
            transform="rotate(-90 22 22)"
          />
        </svg>
        <strong style={{ color: s.hasConflict ? "#475569" : s.riskColor }}>
          {Math.round(s.riskScore)}
        </strong>
      </div>

      <div className="sso-card__info">
        <span className="sso-card__label"
          style={{ color: s.hasConflict ? "#64748b" : s.riskColor }}>
          {s.hasConflict ? "⚠ Xung đột" : s.riskLabel}
        </span>
        {s.hasConflict && (
          <span className="sso-card__conflict-note">
            Trùng với: {s.conflictWith.join(", ")}
          </span>
        )}
        {!s.hasConflict && (
          <span className="sso-card__aqi">AQI {s.aqi} · PM2.5 {s.pm25}</span>
        )}
      </div>

      {selected && <div className="sso-card__check">✓</div>}
    </button>
  );
}

export default function SmartScheduleOptimizer({ existingSchedules, onApply, groupMultiplier }: Props) {
  const [open,        setOpen]        = useState(false);
  const [forecast,    setForecast]    = useState<ForecastPoint[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [computing,   setComputing]   = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [showIcons,   setShowIcons]   = useState(false);
  const [applied,     setApplied]     = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormInput>({
    name:            "",
    icon:            "🏃",
    durationMinutes: 30,
    isOutdoor:       true,
    intensity:       "moderate",
    daysOfWeek:      "1,2,3,4,5",
  });

  const activeDays = form.daysOfWeek.split(",").map(Number).filter(Boolean);

  useEffect(() => {
    if (!open || forecast.length > 0) return;

    let cancelled = false;
    async function doFetch() {
      try {
        setLoading(true);
        const data = await http<{
          forecast: Array<{ time: string; aqi: number; pm25: number; risk: string; recommendation: string }>;
        }>("/api/air/forecast?days=1", { method: "GET", auth: true });
        if (cancelled) return;

        const pts: ForecastPoint[] = (data.forecast ?? []).map(f => ({
          hour:  new Date(f.time).getHours(),
          aqi:   f.aqi,
          pm25:  Math.round(f.pm25 * 10) / 10,
          risk:  f.risk,
          recommendation: f.recommendation,
        }));

        const filled: ForecastPoint[] = [];
        for (let h = 0; h < 24; h++) {
          const found = pts.find(p => p.hour === h);
          filled.push(found ?? { hour: h, aqi: 75, pm25: 25, risk: "MODERATE", recommendation: "" });
        }
        setForecast(filled);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doFetch();
    return () => { cancelled = true; };
  }, [open, forecast.length]);

  function computeSuggestions() {
    if (!form.name.trim() || forecast.length === 0) return;
    setComputing(true);
    setSelected(null);
    setApplied(false);

    const now     = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const intensMult = INTENSITY_MULT[form.intensity] ?? 1.0;

    const scored = forecast.map(pt => {
      const startMins = pt.hour * 60;

      if (startMins < nowMins - 10) return null;

      if (pt.hour < 5 || pt.hour > 22) return null;

      const score = calcScore(pt.aqi, groupMultiplier, intensMult, form.isOutdoor);

      const conflicts = existingSchedules.filter(s =>
        hasOverlap(startMins, form.durationMinutes, s, 15)
      );

      return {
        hour:         pt.hour,
        minute:       0,
        aqi:          pt.aqi,
        pm25:         pt.pm25,
        riskScore:    score,
        riskLabel:    scoreLabel(score),
        riskColor:    scoreColor(score),
        riskRec:      pt.recommendation,
        conflictWith: conflicts.map(c => c.name),
        hasConflict:  conflicts.length > 0,
      };
    }).filter(Boolean) as Omit<Suggestion, "rank" | "scoreDiff">[];

    scored.sort((a, b) => {
      if (a.hasConflict !== b.hasConflict) return a.hasConflict ? 1 : -1;
      return a.riskScore - b.riskScore;
    });

    const top3 = scored.slice(0, 3).map((s, i) => ({
      ...s,
      rank:      i + 1,
      scoreDiff: 0,
    }));

    setSuggestions(top3);
    setComputing(false);
  }

  function handleApply() {
    if (selected === null) return;
    const s = suggestions[selected];
    onApply({
      ...form,
      hourOfDay: s.hour,
      minute:    s.minute,
    });
    setApplied(true);
    setTimeout(() => {
      setOpen(false);
      setSuggestions([]);
      setSelected(null);
      setApplied(false);
      setForm({
        name: "", icon: "🏃", durationMinutes: 30,
        isOutdoor: true, intensity: "moderate", daysOfWeek: "1,2,3,4,5",
      });
    }, 1200);
  }

  function toggleDay(n: number) {
    const cur  = activeDays;
    const next = cur.includes(n) ? cur.filter(d => d !== n) : [...cur, n];
    setForm(f => ({ ...f, daysOfWeek: next.sort().join(",") || "1" }));
  }

  const canCompute = form.name.trim().length > 0 && !loading && forecast.length > 0;
  const bestSugg   = suggestions.find(s => !s.hasConflict) ?? suggestions[0];

  return (
    <>
      <button className="sso-trigger" type="button" onClick={() => setOpen(true)}>
        <span className="sso-trigger__icon">✨</span>
        <div className="sso-trigger__text">
          <strong>Smart Schedule Optimizer</strong>
          <span>AI đề xuất giờ tốt nhất cho hoạt động của bạn</span>
        </div>
        <span className="sso-trigger__arrow">→</span>
      </button>

      {open && (
        <div className="sso-overlay" onClick={() => setOpen(false)}>
          <div className="sso-panel" onClick={e => e.stopPropagation()}>

            <div className="sso-header">
              <div>
                <div className="sso-header__eyebrow">✨ AI Schedule Optimizer</div>
                <h3 className="sso-header__title">Tìm giờ tốt nhất cho hoạt động</h3>
                <p className="sso-header__sub">
                  Phân tích forecast AQI 24h · Tránh xung đột lịch · Tối ưu theo nhóm người dùng
                </p>
              </div>
              <button className="sso-close" type="button" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="sso-form">
              <div className="sso-presets">
                <div className="sso-presets__label">Chọn nhanh:</div>
                <div className="sso-presets__grid">
                  {QUICK_PRESETS.map((p, i) => (
                    <button key={i} className="sso-preset" type="button"
                      onClick={() => setForm(f => ({
                        ...f, name: p.name, icon: p.icon,
                        durationMinutes: p.duration,
                        isOutdoor: p.outdoor, intensity: p.intensity,
                      }))}>
                      {p.icon} {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sso-row">
                <div className="sso-field" style={{ position: "relative", flexShrink: 0 }}>
                  <label>Icon</label>
                  <div ref={iconRef}>
                    <button className="sso-icon-btn" type="button"
                      onClick={() => setShowIcons(v => !v)}>
                      <span style={{ fontSize: 22 }}>{form.icon}</span>
                    </button>
                    {showIcons && (
                      <div className="sso-icon-picker">
                        {ICONS_SPORT.map(ic => (
                          <button key={ic}
                            className={`sso-icon-opt ${form.icon === ic ? "active" : ""}`}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, icon: ic })); setShowIcons(false); }}>
                            {ic}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="sso-field" style={{ flex: 1 }}>
                  <label>Tôi muốn...</label>
                  <input
                    className="sso-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder='VD: "chạy bộ", "đi chợ", "tập yoga"...'
                    onKeyDown={e => e.key === "Enter" && canCompute && computeSuggestions()}
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="sso-row">
                <div className="sso-field">
                  <label>Thời lượng</label>
                  <select className="sso-select" value={form.durationMinutes}
                    onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}>
                    {[10,15,20,30,45,60,90,120,180].map(v => (
                      <option key={v} value={v}>{fmtDur(v)}</option>
                    ))}
                  </select>
                </div>
                <div className="sso-field">
                  <label>Cường độ</label>
                  <div className="sso-toggles">
                    {(["low","moderate","high"] as const).map(v => (
                      <button key={v}
                        className={`sso-tgl ${form.intensity === v ? "on" : ""}`}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, intensity: v }))}>
                        {v === "low" ? "Nhẹ" : v === "moderate" ? "Vừa" : "Mạnh"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sso-field">
                  <label>Vị trí</label>
                  <div className="sso-toggles">
                    <button className={`sso-tgl ${form.isOutdoor ? "on" : ""}`} type="button"
                      onClick={() => setForm(f => ({ ...f, isOutdoor: true }))}>🌤 Ngoài</button>
                    <button className={`sso-tgl ${!form.isOutdoor ? "on" : ""}`} type="button"
                      onClick={() => setForm(f => ({ ...f, isOutdoor: false }))}>🏠 Trong</button>
                  </div>
                </div>
              </div>

              <div className="sso-field">
                <label>Các ngày</label>
                <div className="sso-days">
                  {DAYS_OF_WEEK.map(d => (
                    <button key={d.n}
                      className={`sso-day ${activeDays.includes(d.n) ? "on" : ""}`}
                      type="button" onClick={() => toggleDay(d.n)}>{d.l}</button>
                  ))}
                </div>
              </div>

              <button
                className={`sso-compute-btn ${computing ? "sso-compute-btn--loading" : ""}`}
                type="button"
                disabled={!canCompute || computing}
                onClick={computeSuggestions}
              >
                {loading ? (
                  <><div className="sso-spin" /> Đang tải forecast...</>
                ) : computing ? (
                  <><div className="sso-spin" /> Đang phân tích...</>
                ) : (
                  <>✨ Tìm giờ tốt nhất cho "{form.name || "hoạt động"}"</>
                )}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="sso-results">
                <div className="sso-results__header">
                  <div className="sso-results__title">
                    3 khung giờ tốt nhất cho <strong>{form.icon} {form.name}</strong>{" "}
                    ({fmtDur(form.durationMinutes)} · {form.isOutdoor ? "Ngoài trời" : "Trong nhà"})
                  </div>
                  {bestSugg && !bestSugg.hasConflict && (
                    <div className="sso-results__best"
                      style={{ color: bestSugg.riskColor }}>
                      Tốt nhất: {fmtHour(bestSugg.hour)} — {bestSugg.riskLabel}
                    </div>
                  )}
                </div>

                <div className="sso-cards">
                  {suggestions.map((s, i) => (
                    <SuggestionCard
                      key={i}
                      s={s}
                      rank={i + 1}
                      selected={selected === i}
                      onSelect={() => setSelected(i)}
                    />
                  ))}
                </div>

                {selected !== null && suggestions[selected] && (
                  <div className="sso-reco-box"
                    style={{ borderColor: suggestions[selected].riskColor + "40" }}>
                    <div className="sso-reco-box__time"
                      style={{ color: suggestions[selected].riskColor }}>
                      {form.icon} {fmtHour(suggestions[selected].hour)}
                      {" — "}{fmtDur(form.durationMinutes)}
                    </div>
                    {suggestions[selected].riskRec && (
                      <p className="sso-reco-box__text">
                        {suggestions[selected].riskRec}
                      </p>
                    )}
                    {suggestions[selected].hasConflict && (
                      <p className="sso-reco-box__conflict">
                        ⚠️ Giờ này trùng với: <strong>{suggestions[selected].conflictWith.join(", ")}</strong>.
                        Bạn vẫn có thể thêm vào lịch nhưng sẽ có xung đột thời gian.
                      </p>
                    )}
                  </div>
                )}

                <div className="sso-actions">
                  <button className="btn btn-secondary" type="button"
                    onClick={() => { setSuggestions([]); setSelected(null); }}>
                    ← Thay đổi
                  </button>
                  <button
                    className={`btn btn-primary ${applied ? "sso-btn--applied" : ""}`}
                    type="button"
                    disabled={selected === null || applied}
                    onClick={handleApply}
                  >
                    {applied
                      ? "✓ Đã thêm vào lịch!"
                      : selected !== null
                        ? `Thêm lịch ${fmtHour(suggestions[selected].hour)} vào lịch`
                        : "Chọn một khung giờ"}
                  </button>
                </div>
              </div>
            )}

            {existingSchedules.length > 0 && suggestions.length === 0 && (
              <div className="sso-existing">
                <div className="sso-existing__title">📅 Lịch hiện tại ({existingSchedules.length} hoạt động)</div>
                <div className="sso-existing__list">
                  {existingSchedules.map(s => (
                    <div key={s.id} className="sso-existing__item">
                      <span>{s.icon}</span>
                      <span>{s.name}</span>
                      <span className="sso-existing__time">
                        {fmt2(s.hourOfDay)}:{fmt2(s.minute)} · {fmtDur(s.durationMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}