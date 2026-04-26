/**
 *
 * Nhật ký phơi nhiễm PM2.5 tích lũy 30 ngày.
 *
 * Flow:
 *   1. Fetch /api/air/history?days=30 → PM2.5 thực tế từng giờ
 *   2. Với mỗi ngày trong 30 ngày, tìm PM2.5 thực tế tại giờ của từng hoạt động
 *   3. Tính dose = PM2.5 × (duration/60) × ventilation_rate × outdoor_factor
 *   4. Aggregate theo ngày → bar chart
 *   5. Tổng tháng + so sánh WHO
 *
 * Công thức (đồng bộ với ExposureScoreWidget):
 *   dose (µg) = PM2.5 (µg/m³) × thời gian (h) × thông khí (m³/h) × vị trí_factor
 *   low=0.5, moderate=1.0, high=1.8 m³/h
 *   outdoor=1.0, indoor=0.5
 *
 */

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { http } from "../../api/http";

type HistoryPoint = {
  time:  string;
  pm25:  number;
  aqi:   number;
};

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

type DayLog = {
  date:        string;       
  label:       string;       
  dayShort:    string;       
  totalDose:   number;       
  whoPercent:  number;       
  breakdown:   ActivityDose[];
  isToday:     boolean;
  isPast:      boolean;
  hasData:     boolean;
};

type ActivityDose = {
  name:        string;
  icon:        string;
  pm25Actual:  number;       
  dose:        number;     
  hours:       number;
  isOutdoor:   boolean;
};

type MonthSummary = {
  totalDose:    number;
  outdoorDose:  number;
  avgDaily:     number;
  daysAboveWho: number;
  peakDay:      string;
  peakDose:     number;
};

const VENTILATION: Record<string, number> = {
  low:      0.50,
  moderate: 1.00,
  high:     1.80,
};
const INDOOR_IO    = 0.50;
const WHO_DAILY    = 225;   

const DAY_SHORT: Record<number, string> = {
  0:"CN",1:"T2",2:"T3",3:"T4",4:"T5",5:"T6",6:"T7",
};

const LOG_CACHE_KEY = "airsafenet_exposure_log";
const LOG_CACHE_TTL = 24 * 60 * 60 * 1000;

function dbToJs(db: number): number { return db === 7 ? 0 : db; }

function fmtMicro(v: number): string {
  return v >= 1000 ? `${(v/1000).toFixed(2)} mg` : `${Math.round(v)} µg`;
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateLabel(d: Date): string {
  return `${d.getDate()}/${d.getMonth()+1}`;
}

function runsOnDay(s: Schedule, jsDay: number): boolean {
  return (s.daysOfWeek ?? "").split(",").map(Number).filter(Boolean)
    .map(dbToJs).includes(jsDay);
}

function calcDose(pm25: number, durMins: number, intensity: string, isOutdoor: boolean): number {
  const vent   = VENTILATION[intensity] ?? VENTILATION.low;
  const factor = isOutdoor ? 1.0 : INDOOR_IO;
  return pm25 * (durMins / 60) * vent * factor;
}

function barColor(pct: number): string {
  if (pct <=  40) return "#22c55e";
  if (pct <=  70) return "#86efac";
  if (pct <= 100) return "#eab308";
  if (pct <= 140) return "#f97316";
  return "#ef4444";
}

function buildLog(history: HistoryPoint[], schedules: Schedule[]): DayLog[] {
  const idx: Record<string, number> = {};  
  const cnts: Record<string, { sum: number; n: number }> = {};

  history.forEach(p => {
    if (!p.time || isNaN(p.pm25)) return;
    const dt  = new Date(p.time);
    const key = `${dateStr(dt)}_${dt.getHours()}`;
    if (!cnts[key]) cnts[key] = { sum: 0, n: 0 };
    cnts[key].sum += p.pm25;
    cnts[key].n   += 1;
  });
  Object.entries(cnts).forEach(([k, v]) => { idx[k] = v.sum / v.n; });

  const today = new Date(); today.setHours(0,0,0,0);
  const logs: DayLog[] = [];

  for (let i = 29; i >= 0; i--) {
    const d    = new Date(today); d.setDate(d.getDate() - i);
    const dStr = dateStr(d);
    const jsDay = d.getDay();
    const isToday = i === 0;

    const breakdown: ActivityDose[] = [];

    schedules.forEach(s => {
      if (!runsOnDay(s, jsDay)) return;

      const histKey = `${dStr}_${s.hourOfDay}`;
      const pm25    = idx[histKey];

      if (pm25 === undefined || pm25 <= 0) return;

      const dose = calcDose(pm25, s.durationMinutes, s.intensity, s.isOutdoor);
      breakdown.push({
        name:       s.name,
        icon:       s.icon,
        pm25Actual: Math.round(pm25 * 10) / 10,
        dose,
        hours:      s.durationMinutes / 60,
        isOutdoor:  s.isOutdoor,
      });
    });

    const totalDose  = breakdown.reduce((s, x) => s + x.dose, 0);
    const whoPercent = (totalDose / WHO_DAILY) * 100;

    logs.push({
      date:       dStr,
      label:      dateLabel(d),
      dayShort:   DAY_SHORT[jsDay],
      totalDose,
      whoPercent,
      breakdown,
      isToday,
      isPast:     !isToday && i > 0,
      hasData:    breakdown.length > 0,
    });
  }

  return logs;
}

function buildSummary(logs: DayLog[]): MonthSummary {
  const withData = logs.filter(d => d.hasData);
  if (withData.length === 0) {
    return { totalDose:0, outdoorDose:0, avgDaily:0, daysAboveWho:0, peakDay:"—", peakDose:0 };
  }

  const totalDose   = withData.reduce((s,d) => s + d.totalDose, 0);
  const outdoorDose = withData.reduce((s,d) =>
    s + d.breakdown.filter(b=>b.isOutdoor).reduce((a,b)=>a+b.dose,0), 0);
  const avgDaily    = totalDose / withData.length;
  const daysAboveWho = withData.filter(d => d.whoPercent >= 100).length;

  const peak = withData.reduce((a, b) => a.totalDose > b.totalDose ? a : b);

  return {
    totalDose, outdoorDose, avgDaily, daysAboveWho,
    peakDay:   `${peak.dayShort} ${peak.label}`,
    peakDose:  peak.totalDose,
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{payload: DayLog}> }) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  if (!day.hasData) return (
    <div className="exlog-tip exlog-tip--empty">
      <div className="exlog-tip__date">{day.dayShort} {day.label}</div>
      <span>Không có hoạt động có dữ liệu thực tế</span>
    </div>
  );

  const color = barColor(day.whoPercent);
  return (
    <div className="exlog-tip">
      <div className="exlog-tip__date">
        {day.dayShort} {day.label}
        {day.isToday && <span className="exlog-tip__today">Hôm nay</span>}
      </div>
      <div className="exlog-tip__total" style={{ color }}>
        {fmtMicro(day.totalDose)} — {Math.round(day.whoPercent)}% WHO
      </div>
      <div className="exlog-tip__list">
        {day.breakdown.map((b, i) => (
          <div key={i} className="exlog-tip__item">
            <span>{b.icon}</span>
            <span>{b.name}</span>
            <span className="exlog-tip__pm">PM2.5 {b.pm25Actual}</span>
            <strong>{fmtMicro(b.dose)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function loadLogCache(): HistoryPoint[] | null {
  try {
    const raw = localStorage.getItem(LOG_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > LOG_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}
function saveLogCache(data: HistoryPoint[]) {
  try { localStorage.setItem(LOG_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* ignore */ }
}

type ViewMode = "chart" | "table";

type Props = {
  schedules: Schedule[];
};

export default function ExposureLogWidget({ schedules }: Props) {
  const [logs,     setLogs]     = useState<DayLog[]>([]);
  const [summary,  setSummary]  = useState<MonthSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [view,     setView]     = useState<ViewMode>("chart");
  const [selected, setSelected] = useState<DayLog | null>(null);

  useEffect(() => {
    if (schedules.length === 0) { setLoading(false); return; }

    let cancelled = false;
    async function doFetch() {
      try {
        setLoading(true);
        let history = loadLogCache();

        if (!history) {
          const data = await http<{ history: HistoryPoint[] }>(
            "/api/air/history?days=30",
            { method: "GET", auth: true }
          );
          if (cancelled) return;
          history = data.history ?? [];
          saveLogCache(history);
        }

        if (cancelled) return;

        const built = buildLog(history, schedules);
        setLogs(built);
        setSummary(buildSummary(built));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doFetch();
    return () => { cancelled = true; };
  }, [schedules]);

  if (loading) return (
    <div className="exlog-card">
      <div className="exlog-loading">
        <div className="exlog-spin" />
        <span>Đang tổng hợp nhật ký phơi nhiễm 30 ngày...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="exlog-card exlog-card--error">⚠️ {error}</div>
  );

  const daysWithData  = logs.filter(d => d.hasData).length;

  return (
    <div className="exlog-card">
      <div className="exlog-header">
        <div>
          <div className="exlog-header__eyebrow">📓 Exposure Log</div>
          <h3 className="exlog-header__title">Nhật ký phơi nhiễm PM2.5 — 30 ngày</h3>
          <p className="exlog-header__sub">
            PM2.5 thực tế × thời gian × tốc độ thở · {daysWithData} ngày có dữ liệu
          </p>
        </div>
        <div className="exlog-header__right">
          <button className={`exlog-view-btn ${view==="chart"?"active":""}`}
            type="button" onClick={()=>setView("chart")}>📊 Biểu đồ</button>
          <button className={`exlog-view-btn ${view==="table"?"active":""}`}
            type="button" onClick={()=>setView("table")}>📋 Chi tiết</button>
        </div>
      </div>

      {summary && daysWithData > 0 && (
        <div className="exlog-summary">
          <div className="exlog-stat">
            <span className="exlog-stat__icon">💨</span>
            <div>
              <strong>{fmtMicro(summary.totalDose)}</strong>
              <span>Tổng PM2.5 tháng này</span>
            </div>
          </div>
          <div className="exlog-stat">
            <span className="exlog-stat__icon">🌤</span>
            <div>
              <strong>{fmtMicro(summary.outdoorDose)}</strong>
              <span>Từ hoạt động ngoài trời</span>
            </div>
          </div>
          <div className="exlog-stat">
            <span className="exlog-stat__icon">📅</span>
            <div>
              <strong>{fmtMicro(summary.avgDaily)}</strong>
              <span>Trung bình/ngày ({Math.round(summary.avgDaily/WHO_DAILY*100)}% WHO)</span>
            </div>
          </div>
          <div className={`exlog-stat ${summary.daysAboveWho > 0 ? "exlog-stat--warn" : "exlog-stat--good"}`}>
            <span className="exlog-stat__icon">{summary.daysAboveWho > 0 ? "⚠️" : "✅"}</span>
            <div>
              <strong>{summary.daysAboveWho} ngày</strong>
              <span>Vượt ngưỡng WHO (≥{WHO_DAILY} µg)</span>
            </div>
          </div>
        </div>
      )}

      {daysWithData === 0 ? (
        <div className="exlog-empty">
          <span>📊</span>
          <div>
            <strong>Chưa có dữ liệu phơi nhiễm</strong>
            <p>
              Hệ thống cần dữ liệu PM2.5 thực tế tại đúng giờ hoạt động của bạn.
              Dữ liệu sẽ tích lũy dần theo thời gian.
            </p>
          </div>
        </div>
      ) : view === "chart" ? (
        <>
          <div className="exlog-chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={logs}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                barCategoryGap="15%"
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,.3)", fontFamily: "ui-monospace,monospace" }}
                  tickLine={false} axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,.25)" }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `${v}µg`}
                  width={38}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
                <ReferenceLine
                  y={WHO_DAILY}
                  stroke="rgba(239,68,68,.45)"
                  strokeDasharray="4 4"
                  label={{ value:"WHO", fontSize:9, fill:"rgba(239,68,68,.6)", position:"right" }}
                />
                <Bar dataKey="totalDose" radius={[4,4,0,0]} maxBarSize={22}
                  onClick={(_data, index) => setSelected(logs[index])}>
                  {logs.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.hasData ? barColor(entry.whoPercent) : "rgba(255,255,255,.06)"}
                      opacity={entry.isToday ? 1 : 0.8}
                      stroke={entry.isToday ? "#3b82f6" : "none"}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="exlog-chart__legend">
              <span>0</span>
              {[
                {c:"#22c55e",l:"≤40% WHO"},
                {c:"#eab308",l:"70-100%"},
                {c:"#f97316",l:"100-140%"},
                {c:"#ef4444",l:">140%"},
              ].map(({c,l}) => (
                <span key={l} className="exlog-legend-item">
                  <span style={{ background:c }} />
                  {l}
                </span>
              ))}
              <span className="exlog-legend-item exlog-legend-item--who">
                <span style={{ background:"rgba(239,68,68,.45)", height:2 }} />
                WHO limit
              </span>
            </div>
          </div>

          {selected && selected.hasData && (
            <div className="exlog-detail" onClick={() => setSelected(null)}>
              <div className="exlog-detail__header">
                <strong>{selected.dayShort} {selected.label}</strong>
                <span style={{ color: barColor(selected.whoPercent) }}>
                  {fmtMicro(selected.totalDose)} — {Math.round(selected.whoPercent)}% ngưỡng WHO
                </span>
                <span className="exlog-detail__close">✕</span>
              </div>
              <div className="exlog-detail__rows">
                {selected.breakdown.map((b, i) => {
                  const pct = (b.dose / WHO_DAILY) * 100;
                  return (
                    <div key={i} className="exlog-detail__row">
                      <span className="exlog-detail__row-icon">{b.icon}</span>
                      <div className="exlog-detail__row-info">
                        <strong>{b.name}</strong>
                        <span>PM2.5 {b.pm25Actual} µg/m³ · {(b.hours*60).toFixed(0)}p · {b.isOutdoor?"Ngoài trời":"Trong nhà"}</span>
                      </div>
                      <div className="exlog-detail__row-dose">
                        <strong>{fmtMicro(b.dose)}</strong>
                        <div className="exlog-detail__row-bar">
                          <div style={{ width:`${Math.min(100,pct)}%`, background: barColor(pct) }}/>
                        </div>
                        <span style={{ color: barColor(pct) }}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summary && summary.daysAboveWho > 0 && (
            <div className="exlog-peak-note">
              <span>⚠️</span>
              <span>
                Ngày cao nhất: <strong>{summary.peakDay}</strong>{" "}
                ({fmtMicro(summary.peakDose)} — {Math.round(summary.peakDose/WHO_DAILY*100)}% WHO).{" "}
                Cân nhắc điều chỉnh lịch những ngày AQI cao.
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="exlog-table-wrap">
          <table className="exlog-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Dose (µg)</th>
                <th>% WHO</th>
                <th>Hoạt động</th>
                <th>PM2.5 TB</th>
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().filter(d => d.hasData).map((d, i) => {
                const avgPm25 = d.breakdown.length
                  ? d.breakdown.reduce((s,b)=>s+b.pm25Actual,0)/d.breakdown.length
                  : 0;
                const color = barColor(d.whoPercent);
                return (
                  <tr key={i} className={d.isToday ? "exlog-table__row--today" : ""}>
                    <td>
                      <span className="exlog-table__day">{d.dayShort}</span>
                      {d.label}
                      {d.isToday && <span className="exlog-table__today-badge">Hôm nay</span>}
                    </td>
                    <td><strong style={{ color }}>{fmtMicro(d.totalDose)}</strong></td>
                    <td>
                      <div className="exlog-table__pct-wrap">
                        <div className="exlog-table__pct-bar">
                          <div style={{ width:`${Math.min(100,d.whoPercent)}%`, background:color }}/>
                        </div>
                        <span style={{ color }}>{Math.round(d.whoPercent)}%</span>
                      </div>
                    </td>
                    <td>
                      {d.breakdown.map(b=>`${b.icon}${b.name}`).join(" · ")}
                    </td>
                    <td style={{ color }}>{avgPm25.toFixed(1)} µg/m³</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="exlog-note">
        📐 Dose = PM2.5 thực tế × thời gian (h) × thông khí (0.5–1.8 m³/h) × vị trí (ngoài 1.0 / trong 0.5).
        Ngưỡng WHO = {WHO_DAILY} µg/ngày.
      </div>
    </div>
  );
}