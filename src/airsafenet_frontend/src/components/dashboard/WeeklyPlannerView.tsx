import { useEffect, useRef, useState } from "react";
import { http } from "../../api/http";

type ForecastCell = {
  dayIndex: number;   
  hour:     number;   
  aqi:      number;
  pm25:     number;
  risk:     string;
  date:     Date;
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

type DragState = {
  scheduleId:  number;
  originDay:   number;
  originHour:  number;
  offsetY:     number;   
};

type HoverCell = { dayIndex: number; hour: number } | null;

type Props = {
  schedules:  Schedule[];
  onUpdate:   (id: number, hourOfDay: number, daysOfWeek: string) => Promise<void>;
  onQuickAdd: (dayIndex: number, hour: number) => void;
  onDelete:   (id: number) => void;
};

const HOURS        = Array.from({ length: 24 }, (_, i) => i);
const CELL_H       = 40;   // px per hour row
const DAY_LABELS   = ["CN","T2","T3","T4","T5","T6","T7"];
const DAY_FULL     = ["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];

function jsToDb(jsDay: number): number { return jsDay === 0 ? 7 : jsDay; }

function aqiBg(aqi: number): string {
  const alpha = 0.13 + Math.min(aqi, 300) / 300 * 0.22;
  if (aqi <=  50) return `rgba(34,197,94,${alpha})`;
  if (aqi <= 100) return `rgba(234,179,8,${alpha})`;
  if (aqi <= 150) return `rgba(249,115,22,${alpha})`;
  if (aqi <= 200) return `rgba(239,68,68,${alpha})`;
  if (aqi <= 300) return `rgba(168,85,247,${alpha})`;
  return `rgba(127,29,29,${alpha})`;
}
function aqiColor(aqi: number): string {
  if (aqi <=  50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}
function aqiLabel(aqi: number): string {
  if (aqi <=  50) return "Tốt";
  if (aqi <= 100) return "TB";
  if (aqi <= 150) return "Nhạy cảm";
  if (aqi <= 200) return "Kém";
  if (aqi <= 300) return "Rất kém";
  return "Nguy hiểm";
}

function intensityColor(i: string): string {
  return i === "high" ? "#f97316" : i === "moderate" ? "#3b82f6" : "#22c55e";
}

function fmtDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth()+1}`;
}
function fmt2(n: number) { return String(n).padStart(2,"0"); }

function runsOnDay(s: Schedule, jsDay: number): boolean {
  const dbDay = jsToDb(jsDay);
  return (s.daysOfWeek ?? "").split(",").map(Number).includes(dbDay);
}

function CellTooltip({ cell, x, y }: { cell: ForecastCell; x: number; y: number }) {
  return (
    <div className="wplanner-tip" style={{ left: x, top: y }}>
      <div className="wplanner-tip__head">
        {DAY_FULL[cell.date.getDay()]} {fmtDate(cell.date)} · {fmt2(cell.hour)}:00
      </div>
      <div className="wplanner-tip__row">
        <span>AQI</span>
        <strong style={{ color: aqiColor(cell.aqi) }}>{cell.aqi} — {aqiLabel(cell.aqi)}</strong>
      </div>
      <div className="wplanner-tip__row">
        <span>PM2.5</span><strong>{cell.pm25} µg/m³</strong>
      </div>
    </div>
  );
}

function ActivityBlock({
  schedule, dayIndex, cellHeight,
  onDragStart, onDelete,
}: {
  schedule:   Schedule;
  dayIndex:   number;
  cellHeight: number;
  onDragStart: (e: React.MouseEvent, s: Schedule, dayIndex: number) => void;
  onDelete:    (id: number) => void;
}) {
  const heightPx = Math.max(cellHeight * (schedule.durationMinutes / 60), 20);
  const topPx    = schedule.hourOfDay * cellHeight + (schedule.minute / 60) * cellHeight;
  const iColor   = intensityColor(schedule.intensity);

  return (
    <div
      className="wplanner-block"
      style={{
        top:       topPx,
        height:    heightPx,
        "--blk-color": iColor,
      } as React.CSSProperties}
      onMouseDown={e => onDragStart(e, schedule, dayIndex)}
      title={`${schedule.name} ${fmt2(schedule.hourOfDay)}:${fmt2(schedule.minute)}`}
    >
      <div className="wplanner-block__stripe" style={{ background: iColor }} />
      <div className="wplanner-block__body">
        <div className="wplanner-block__name">
          <span>{schedule.icon}</span>
          {heightPx > 28 && <span>{schedule.name}</span>}
        </div>
        {heightPx > 44 && (
          <div className="wplanner-block__time">
            {fmt2(schedule.hourOfDay)}:{fmt2(schedule.minute)}
          </div>
        )}
      </div>
      <button
        className="wplanner-block__del"
        type="button"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete(schedule.id); }}
        title="Xóa"
      >✕</button>
    </div>
  );
}

export default function WeeklyPlannerView({ schedules, onUpdate, onQuickAdd, onDelete }: Props) {
  const [forecast,   setForecast]   = useState<ForecastCell[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [drag,       setDrag]       = useState<DragState | null>(null);
  const [dragPos,    setDragPos]    = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState<{ dayIndex: number; hour: number } | null>(null);
  const [hover,      setHover]      = useState<HoverCell>(null);
  const [hoverXY,    setHoverXY]    = useState({ x: 0, y: 0 });
  const [saving,     setSaving]     = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i); return d;
  });

  useEffect(() => {
    let cancelled = false;
    async function doFetch() {
      try {
        setLoading(true);
        const data = await http<{
          forecast: Array<{ time: string; aqi: number; pm25: number; risk: string }>;
        }>("/api/air/forecast?days=7", { method: "GET", auth: true });
        if (cancelled) return;

        const cells: ForecastCell[] = [];
        (data.forecast ?? []).forEach(f => {
          const dt  = new Date(f.time);
          const dayOffset = Math.round((dt.getTime() - today.getTime()) / 86400000);
          if (dayOffset < 0 || dayOffset >= 7) return;
          cells.push({
            dayIndex: dayOffset,
            hour:     dt.getHours(),
            aqi:      f.aqi,
            pm25:     Math.round(f.pm25 * 10) / 10,
            risk:     f.risk,
            date:     days[dayOffset],
          });
        });
        setForecast(cells);
      } catch {/* silent */}
      finally { if (!cancelled) setLoading(false); }
    }
    doFetch();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragStart(e: React.MouseEvent, s: Schedule, dayIndex: number) {
    e.preventDefault();
    setDrag({ scheduleId: s.id, originDay: dayIndex, originHour: s.hourOfDay, offsetY: 0 });
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!drag) return;

    function onMove(e: MouseEvent) {
      setDragPos({ x: e.clientX, y: e.clientY });

      if (!gridRef.current) return;
      const rect    = gridRef.current.getBoundingClientRect();
      const relX    = e.clientX - rect.left;
      const relY    = e.clientY - rect.top;
      const colW    = rect.width / 7;
      const dayIdx  = Math.max(0, Math.min(6, Math.floor(relX / colW)));
      const hour    = Math.max(0, Math.min(23, Math.floor(relY / CELL_H)));
      setDropTarget({ dayIndex: dayIdx, hour });
    }

    function onUp() {
      if (drag && dropTarget) {
        const s = schedules.find(sc => sc.id === drag.scheduleId);
        if (s && (dropTarget.hour !== drag.originHour || dropTarget.dayIndex !== drag.originDay)) {
          const targetJsDay  = days[dropTarget.dayIndex].getDay();
          const originJsDay  = days[drag.originDay].getDay();
          const originDb     = jsToDb(originJsDay);
          const targetDb     = jsToDb(targetJsDay);
          let days_db        = (s.daysOfWeek ?? "").split(",").map(Number).filter(Boolean);

          if (drag.originDay === dropTarget.dayIndex) {
            setSaving(true);
            onUpdate(s.id, dropTarget.hour, s.daysOfWeek).finally(() => setSaving(false));
          } else {
            days_db = days_db.filter(d => d !== originDb);
            if (!days_db.includes(targetDb)) days_db.push(targetDb);
            days_db.sort();
            setSaving(true);
            onUpdate(s.id, dropTarget.hour, days_db.join(",")).finally(() => setSaving(false));
          }
        }
      }
      setDrag(null);
      setDropTarget(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, dropTarget, schedules, days, onUpdate]);

  function getCell(dayIndex: number, hour: number): ForecastCell | undefined {
    return forecast.find(c => c.dayIndex === dayIndex && c.hour === hour);
  }

  const draggingSchedule = drag ? schedules.find(s => s.id === drag.scheduleId) : null;

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const nowHour = new Date().getHours();

  return (
    <div className="wplanner-card">
      <div className="wplanner-header">
        <div>
          <div className="wplanner-header__eyebrow">📅 Lịch tuần</div>
          <h3 className="wplanner-header__title">Weekly Planner — 7 ngày × 24 giờ</h3>
          <p className="wplanner-header__sub">
            Kéo thả hoạt động để thay đổi giờ · Click ô trống để thêm mới
          </p>
        </div>
        <div className="wplanner-header__legend">
          {[50,100,150,200].map(aqi => (
            <div key={aqi} className="wplanner-legend-item">
              <div className="wplanner-legend-dot" style={{ background: aqiColor(aqi) }} />
              <span>{aqiLabel(aqi)}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="wplanner-loading">
          <div className="wplanner-spin" />
          <span>Đang tải forecast 7 ngày...</span>
        </div>
      ) : (
        <div className="wplanner-wrap">
          <div className="wplanner-timeaxis">
            {HOURS.map(h => (
              <div key={h} className="wplanner-timeaxis__cell"
                style={{ height: CELL_H }}>
                {h % 3 === 0 ? `${fmt2(h)}h` : ""}
              </div>
            ))}
          </div>

          <div className="wplanner-grid" ref={gridRef}
            style={{ cursor: drag ? "grabbing" : "default" }}>

            {days.map((day, di) => {
              const jsDay   = day.getDay();
              const dayLabel = DAY_LABELS[jsDay];
              const todayFlag = isToday(day);

              const daySchedules = schedules.filter(s => runsOnDay(s, jsDay));

              return (
                <div key={di} className={`wplanner-col ${todayFlag ? "wplanner-col--today" : ""}`}>
                  <div className={`wplanner-col__header ${todayFlag ? "wplanner-col__header--today" : ""}`}>
                    <strong>{dayLabel}</strong>
                    <span>{fmtDate(day)}</span>
                    {todayFlag && <span className="wplanner-today-badge">Hôm nay</span>}
                  </div>

                  <div className="wplanner-col__body" style={{ position: "relative" }}>
                    {HOURS.map(h => {
                      const cell  = getCell(di, h);
                      const isNow = todayFlag && h === nowHour;
                      const isDrop = dropTarget?.dayIndex === di && dropTarget?.hour === h;

                      return (
                        <div
                          key={h}
                          className={[
                            "wplanner-cell",
                            isNow  ? "wplanner-cell--now"  : "",
                            isDrop ? "wplanner-cell--drop" : "",
                          ].filter(Boolean).join(" ")}
                          style={{
                            height:     CELL_H,
                            background: cell ? aqiBg(cell.aqi) : "rgba(255,255,255,.025)",
                          }}
                          onClick={() => !drag && onQuickAdd(di, h)}
                          onMouseEnter={e => {
                            if (cell && !drag) {
                              setHover({ dayIndex: di, hour: h });
                              setHoverXY({ x: e.clientX + 10, y: e.clientY - 40 });
                            }
                          }}
                          onMouseLeave={() => setHover(null)}
                        >
                          {isNow && <div className="wplanner-cell__now-line" />}
                          {cell && h % 6 === 0 && (
                            <span className="wplanner-cell__aqi-label"
                              style={{ color: aqiColor(cell.aqi) }}>
                              {cell.aqi}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {daySchedules.map(s => (
                      <ActivityBlock
                        key={s.id}
                        schedule={s}
                        dayIndex={di}
                        cellHeight={CELL_H}
                        onDragStart={handleDragStart}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {saving && (
        <div className="wplanner-saving">
          <div className="wplanner-spin" /> Đang lưu...
        </div>
      )}

      {drag && draggingSchedule && (
        <div
          className="wplanner-ghost"
          style={{ left: dragPos.x + 8, top: dragPos.y - 14 }}
        >
          <span>{draggingSchedule.icon}</span>
          <span>{draggingSchedule.name}</span>
          {dropTarget && (
            <span className="wplanner-ghost__target">
              → {DAY_LABELS[days[dropTarget.dayIndex].getDay()]} {fmt2(dropTarget.hour)}:00
            </span>
          )}
        </div>
      )}

      {hover && (() => {
        const cell = getCell(hover.dayIndex, hover.hour);
        return cell ? <CellTooltip cell={cell} x={hoverXY.x} y={hoverXY.y} /> : null;
      })()}
    </div>
  );
}