import { useCallback, useEffect, useState } from "react";
import { http } from "../../api/http";

type ActivitySchedule = {
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

type ActivityRisk = ActivitySchedule & {
  forecastPm25:        number;
  forecastAqi:         number;
  forecastRisk:        string;
  riskScore:           number;
  riskLevel:           string;
  recommendation:      string;
  groupMultiplier:     number;
  intensityMultiplier: number;
  bestAlternativeHour: number | null;
};

type ForecastResponse = {
  userGroup:   string;
  date:        string;
  activities:  ActivityRisk[];
  overallRisk: string;
  daySummary:  string;
};

const PRESETS = [
  { name: "Đi làm",        icon: "💼", hourOfDay: 7,  minute: 0,  durationMinutes: 30, isOutdoor: true,  intensity: "low"      as const, daysOfWeek: "1,2,3,4,5" },
  { name: "Tập thể dục",   icon: "🏃", hourOfDay: 6,  minute: 0,  durationMinutes: 45, isOutdoor: true,  intensity: "high"     as const, daysOfWeek: "1,2,3,4,5" },
  { name: "Đón con",       icon: "👶", hourOfDay: 17, minute: 0,  durationMinutes: 20, isOutdoor: true,  intensity: "low"      as const, daysOfWeek: "1,2,3,4,5" },
  { name: "Đi chợ",        icon: "🛒", hourOfDay: 8,  minute: 0,  durationMinutes: 30, isOutdoor: true,  intensity: "low"      as const, daysOfWeek: "1,2,3,4,5,6,7" },
  { name: "Đi bộ buổi tối",icon: "🌙", hourOfDay: 19, minute: 0,  durationMinutes: 30, isOutdoor: true,  intensity: "moderate" as const, daysOfWeek: "1,2,3,4,5,6,7" },
  { name: "Đạp xe",        icon: "🚴", hourOfDay: 7,  minute: 30, durationMinutes: 40, isOutdoor: true,  intensity: "high"     as const, daysOfWeek: "6,7" },
  { name: "Làm việc VP",   icon: "🖥",  hourOfDay: 8,  minute: 0,  durationMinutes: 480,isOutdoor: false, intensity: "low"      as const, daysOfWeek: "1,2,3,4,5" },
  { name: "Đưa đón trường",icon: "🏫", hourOfDay: 7,  minute: 0,  durationMinutes: 15, isOutdoor: true,  intensity: "low"      as const, daysOfWeek: "1,2,3,4,5" },
];

const ICONS = ["💼","🏃","👶","🛒","🌙","🚴","🖥","🏫","🧘","🚗","🏊","⚽","🎾","🌿","🏥","✈️","📅"];

function riskColor(r: string): string {
  return r === "GOOD"                ? "#16a34a"
       : r === "MODERATE"            ? "#ca8a04"
       : r === "UNHEALTHY_SENSITIVE" ? "#ea580c"
       : r === "UNHEALTHY"           ? "#dc2626"
       : r === "VERY_UNHEALTHY"      ? "#7c3aed"
       : "#7f1d1d";
}

function riskLabel(r: string): string {
  return r === "GOOD"                ? "Tốt"
       : r === "MODERATE"            ? "Trung bình"
       : r === "UNHEALTHY_SENSITIVE" ? "Nhạy cảm"
       : r === "UNHEALTHY"           ? "Không tốt"
       : r === "VERY_UNHEALTHY"      ? "Rất kém"
       : "Nguy hiểm";
}

function riskEmoji(r: string): string {
  return r === "GOOD" ? "✅" : r === "MODERATE" ? "🟡" : r === "UNHEALTHY_SENSITIVE" ? "🟠" : "🔴";
}

function fmtHour(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDuration(mins: number): string {
  return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}p` : ""}` : `${mins}p`;
}

function intensityLabel(i: string): string {
  return i === "high" ? "Mạnh" : i === "low" ? "Nhẹ" : "Vừa";
}

function scoreToWidth(score: number): string {
  return `${Math.min(100, score)}%`;
}

type FormState = Omit<ActivitySchedule, "id">;
const EMPTY_FORM: FormState = {
  name: "", icon: "📅", hourOfDay: 7, minute: 0,
  durationMinutes: 30, isOutdoor: true, intensity: "moderate", daysOfWeek: "1,2,3,4,5",
};

const DAYS = [
  { num: 1, label: "T2" }, { num: 2, label: "T3" }, { num: 3, label: "T4" },
  { num: 4, label: "T5" }, { num: 5, label: "T6" }, { num: 6, label: "T7" }, { num: 7, label: "CN" },
];

function ActivityForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: FormState;
  onSave: (form: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM);
  const [showIcons, setShowIcons] = useState(false);

  function toggleDay(n: number) {
    const days = form.daysOfWeek.split(",").map(Number).filter(Boolean);
    const next = days.includes(n) ? days.filter(d => d !== n) : [...days, n];
    setForm(f => ({ ...f, daysOfWeek: next.sort().join(",") || "1" }));
  }

  const activeDays = form.daysOfWeek.split(",").map(Number).filter(Boolean);

  return (
    <div className="act-form">
      <div className="act-form__presets">
        <span className="act-form__presets-label">Chọn nhanh:</span>
        <div className="act-form__preset-chips">
          {PRESETS.map((p, i) => (
            <button key={i} type="button" className="act-preset-chip"
              onClick={() => setForm({ ...p })}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="act-form__row">
        <div className="act-form__field act-form__field--icon">
          <label>Icon</label>
          <button type="button" className="act-icon-btn"
            onClick={() => setShowIcons(v => !v)}>
            {form.icon}
          </button>
          {showIcons && (
            <div className="act-icon-picker">
              {ICONS.map(ic => (
                <button key={ic} type="button" className={`act-icon-opt ${form.icon === ic ? "active" : ""}`}
                  onClick={() => { setForm(f => ({ ...f, icon: ic })); setShowIcons(false); }}>
                  {ic}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="act-form__field act-form__field--name">
          <label>Tên hoạt động</label>
          <input
            className="act-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="VD: Đi làm, Tập thể dục..."
            maxLength={100}
          />
        </div>
      </div>

      <div className="act-form__row">
        <div className="act-form__field">
          <label>Giờ bắt đầu</label>
          <div className="act-time-row">
            <select className="act-select"
              value={form.hourOfDay}
              onChange={e => setForm(f => ({ ...f, hourOfDay: Number(e.target.value) }))}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}h</option>
              ))}
            </select>
            <select className="act-select"
              value={form.minute}
              onChange={e => setForm(f => ({ ...f, minute: Number(e.target.value) }))}>
              <option value={0}>:00</option>
              <option value={30}>:30</option>
            </select>
          </div>
        </div>

        <div className="act-form__field">
          <label>Thời lượng</label>
          <select className="act-select"
            value={form.durationMinutes}
            onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}>
            {[10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 480].map(v => (
              <option key={v} value={v}>{fmtDuration(v)}</option>
            ))}
          </select>
        </div>

        <div className="act-form__field">
          <label>Địa điểm</label>
          <div className="act-toggle-row">
            <button type="button"
              className={`act-toggle ${form.isOutdoor ? "active" : ""}`}
              onClick={() => setForm(f => ({ ...f, isOutdoor: true }))}>
              🌤 Ngoài trời
            </button>
            <button type="button"
              className={`act-toggle ${!form.isOutdoor ? "active" : ""}`}
              onClick={() => setForm(f => ({ ...f, isOutdoor: false }))}>
              🏠 Trong nhà
            </button>
          </div>
        </div>

        <div className="act-form__field">
          <label>Cường độ</label>
          <div className="act-toggle-row">
            {(["low","moderate","high"] as const).map(v => (
              <button key={v} type="button"
                className={`act-toggle ${form.intensity === v ? "active" : ""}`}
                onClick={() => setForm(f => ({ ...f, intensity: v }))}>
                {intensityLabel(v)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="act-form__field">
        <label>Các ngày trong tuần</label>
        <div className="act-days-row">
          {DAYS.map(d => (
            <button key={d.num} type="button"
              className={`act-day-btn ${activeDays.includes(d.num) ? "active" : ""}`}
              onClick={() => toggleDay(d.num)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="act-form__actions">
        <button type="button" className="btn btn-primary" disabled={saving || !form.name.trim()}
          onClick={() => onSave(form)}>
          {saving ? "Đang lưu..." : "Lưu hoạt động"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Hủy</button>
      </div>
    </div>
  );
}

function ActivityRiskCard({
  activity, onEdit, onDelete,
}: {
  activity: ActivityRisk;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = riskColor(activity.riskLevel);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="act-card" style={{ borderColor: color + "30" }}>
      <div className="act-card__header">
        <div className="act-card__time-block">
          <span className="act-card__time">{fmtHour(activity.hourOfDay, activity.minute)}</span>
          <span className="act-card__duration">{fmtDuration(activity.durationMinutes)}</span>
        </div>

        <div className="act-card__info">
          <div className="act-card__name">
            <span className="act-card__icon">{activity.icon}</span>
            {activity.name}
          </div>
          <div className="act-card__badges">
            <span className="act-badge">{activity.isOutdoor ? "🌤 Ngoài trời" : "🏠 Trong nhà"}</span>
            <span className="act-badge">⚡ {intensityLabel(activity.intensity)}</span>
            <span className="act-badge">PM2.5 {activity.forecastPm25}</span>
          </div>
        </div>

        <div className="act-card__score-block">
          <div className="act-card__score-ring" style={{ "--ring-color": color } as React.CSSProperties}>
            <svg viewBox="0 0 48 48" className="act-score-svg">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
              <circle cx="24" cy="24" r="20" fill="none"
                stroke={color} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(activity.riskScore / 100) * 125.7} 125.7`}
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div className="act-score-inner">
              <strong style={{ color }}>{Math.round(activity.riskScore)}</strong>
            </div>
          </div>
          <span className="act-card__risk-label" style={{ color }}>{riskLabel(activity.riskLevel)}</span>
        </div>

        <div className="act-card__actions">
          <button className="act-card__btn" onClick={() => setShowDetail(v => !v)} type="button">
            {showDetail ? "▲" : "▼"}
          </button>
          <button className="act-card__btn" onClick={onEdit} type="button">✎</button>
          <button className="act-card__btn act-card__btn--del" onClick={onDelete} type="button">✕</button>
        </div>
      </div>

      <div className="act-card__bar-track">
        <div className="act-card__bar-fill" style={{ width: scoreToWidth(activity.riskScore), background: color }} />
      </div>

      {showDetail && (
        <div className="act-card__detail">
          <p className="act-card__reco">{activity.recommendation}</p>

          <div className="act-card__multipliers">
            <span>Nhóm người dùng: <strong>×{activity.groupMultiplier}</strong></span>
            <span>Cường độ: <strong>×{activity.intensityMultiplier}</strong></span>
            {!activity.isOutdoor && <span>Trong nhà: <strong>×0.3</strong></span>}
          </div>

          {activity.bestAlternativeHour != null && activity.riskLevel !== "GOOD" && (
            <div className="act-card__alternative">
              💡 Giờ thay thế tốt hơn:{" "}
              <strong>{String(activity.bestAlternativeHour).padStart(2, "0")}:00</strong>
              {" "}(AQI thấp nhất trong ngày)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActivitySchedulerWidget() {
  const [schedules,    setSchedules]    = useState<ActivitySchedule[]>([]);
  const [forecast,     setForecast]     = useState<ForecastResponse | null>(null);
  const [loadingSched, setLoadingSched] = useState(true);
  const [loadingFore,  setLoadingFore]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<ActivitySchedule | null>(null);
  const [activeTab,    setTab]          = useState<"schedule" | "today">("today");

  const loadSchedules = useCallback(async () => {
    try {
      setLoadingSched(true);
      const data = await http<ActivitySchedule[]>("/api/activity", { method: "GET", auth: true });
      setSchedules(data ?? []);
    } catch { /* silent */ }
    finally { setLoadingSched(false); }
  }, []);

  const loadForecast = useCallback(async () => {
    try {
      setLoadingFore(true);
      const data = await http<ForecastResponse>("/api/activity/forecast", { method: "GET", auth: true });
      setForecast(data);
    } catch { /* silent */ }
    finally { setLoadingFore(false); }
  }, []);

  useEffect(() => {
    loadSchedules();
    loadForecast();
  }, [loadSchedules, loadForecast]);

  async function handleSave(form: Omit<ActivitySchedule, "id">) {
    try {
      setSaving(true);
      if (editTarget) {
        await http(`/api/activity/${editTarget.id}`, { method: "PUT",  auth: true, body: form });
      } else {
        await http("/api/activity",                  { method: "POST", auth: true, body: form });
      }
      setShowForm(false);
      setEditTarget(null);
      await loadSchedules();
      await loadForecast();
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    try {
      await http(`/api/activity/${id}`, { method: "DELETE", auth: true });
      await loadSchedules();
      await loadForecast();
    } catch { /* silent */ }
  }

  const overallColor = riskColor(forecast?.overallRisk ?? "GOOD");

  return (
    <div className="act-widget">
      <div className="act-header">
        <div className="act-header__left">
          <div className="act-header__eyebrow">🗓 Lịch hoạt động cá nhân</div>
          <h3 className="act-header__title">Dự báo rủi ro theo lịch của bạn</h3>
          {forecast && (
            <p className="act-header__sub">
              {forecast.date} · Nhóm:{" "}
              <span className="act-header__group">{forecast.userGroup}</span>
            </p>
          )}
        </div>

        <div className="act-header__right">
          {forecast?.overallRisk && (
            <div className="act-overall-risk"
              style={{ background: overallColor + "18", borderColor: overallColor + "40" }}>
              <span style={{ color: overallColor }}>{riskEmoji(forecast.overallRisk)}</span>
              <div>
                <span style={{ color: overallColor }}>Tổng thể hôm nay</span>
                <strong style={{ color: overallColor }}>{riskLabel(forecast.overallRisk)}</strong>
              </div>
            </div>
          )}
          <button className="btn btn-primary act-add-btn"
            onClick={() => { setEditTarget(null); setShowForm(true); setTab("schedule"); }}
            type="button">
            + Thêm hoạt động
          </button>
        </div>
      </div>

      {forecast?.daySummary && (
        <div className="act-summary-bar">
          <span>💡</span>
          <span>{forecast.daySummary}</span>
        </div>
      )}

      <div className="act-tabs">
        <button className={`act-tab ${activeTab === "today" ? "active" : ""}`}
          onClick={() => setTab("today")} type="button">
          📊 Hôm nay ({forecast?.activities.length ?? 0})
        </button>
        <button className={`act-tab ${activeTab === "schedule" ? "active" : ""}`}
          onClick={() => setTab("schedule")} type="button">
          ⚙️ Quản lý lịch ({schedules.length})
        </button>
      </div>

      {showForm && (
        <ActivityForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(null); }}
          saving={saving}
        />
      )}

      {activeTab === "today" && (
        <div className="act-list">
          {loadingFore ? (
            <div className="act-loading">
              <div className="act-loading__spinner" />
              <span>Đang tính rủi ro theo forecast...</span>
            </div>
          ) : !forecast?.activities.length ? (
            <div className="act-empty">
              <span>📅</span>
              <p>Chưa có hoạt động nào hôm nay.<br />
                Nhấn "Thêm hoạt động" để bắt đầu.</p>
            </div>
          ) : (
            forecast.activities.map(a => (
              <ActivityRiskCard
                key={a.id}
                activity={a}
                onEdit={() => {
                  setEditTarget(a);
                  setShowForm(true);
                  setTab("schedule");
                }}
                onDelete={() => handleDelete(a.id)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="act-list">
          {loadingSched ? (
            <div className="act-loading">
              <div className="act-loading__spinner" />
              <span>Đang tải lịch...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="act-empty">
              <span>🗓</span>
              <p>Chưa có lịch hoạt động nào.<br />Thêm lịch để nhận dự báo rủi ro cá nhân.</p>
            </div>
          ) : (
            schedules.map(s => (
              <div key={s.id} className="act-sched-row">
                <span className="act-sched-icon">{s.icon}</span>
                <div className="act-sched-info">
                  <strong>{s.name}</strong>
                  <span>
                    {fmtHour(s.hourOfDay, s.minute)} · {fmtDuration(s.durationMinutes)} ·{" "}
                    {s.isOutdoor ? "Ngoài trời" : "Trong nhà"} · {intensityLabel(s.intensity)}
                  </span>
                  <span className="act-sched-days">
                    {s.daysOfWeek.split(",").map(Number).filter(Boolean)
                      .map(n => DAYS.find(d => d.num === n)?.label ?? "").join(" ")}
                  </span>
                </div>
                <div className="act-sched-actions">
                  <button className="act-card__btn" type="button"
                    onClick={() => { setEditTarget(s); setShowForm(true); }}>✎</button>
                  <button className="act-card__btn act-card__btn--del" type="button"
                    onClick={() => handleDelete(s.id)}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}