import { useEffect, useState } from "react";
import { http } from "../../api/http";


type HistoryPoint = {
  time: string;
  pm25: number;
  aqi:  number;
  risk: string;
};

type ActivitySchedule = {
  id:              number;
  name:            string;
  icon:            string;
  hourOfDay:       number;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  daysOfWeek?:     string;   
  groupMultiplier: number;
  intensityMultiplier: number;
};

type DayStats = {
  dayOfWeek: number;  
  avgAqi:    number;
  avgPm25:   number;
  count:     number;   
};

type CellData = {
  riskScore: number;
  avgAqi:    number;
  avgPm25:   number;
  hasData:   boolean;
  scheduled: boolean; 
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; 
const DAY_LABELS: Record<number, { short: string; long: string }> = {
  0: { short: "CN",  long: "Chủ nhật"  },
  1: { short: "T2",  long: "Thứ 2"     },
  2: { short: "T3",  long: "Thứ 3"     },
  3: { short: "T4",  long: "Thứ 4"     },
  4: { short: "T5",  long: "Thứ 5"     },
  5: { short: "T6",  long: "Thứ 6"     },
  6: { short: "T7",  long: "Thứ 7"     },
};

function jsToDb(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function aqiToBase(aqi: number): number {
  if (aqi <= 50)  return aqi * 0.4;
  if (aqi <= 100) return 20 + (aqi - 50)  * 0.4;
  if (aqi <= 150) return 40 + (aqi - 100) * 0.4;
  if (aqi <= 200) return 60 + (aqi - 150) * 0.3;
  if (aqi <= 300) return 75 + (aqi - 200) * 0.15;
  return Math.min(100, 90 + (aqi - 300) * 0.1);
}

function calcRiskScore(
  aqi: number,
  groupMult: number,
  intensMult: number,
  isOutdoor: boolean,
): number {
  return Math.min(100,
    aqiToBase(aqi) * groupMult * intensMult * (isOutdoor ? 1.0 : 0.3)
  );
}

function scoreToColor(score: number): string {
  if (score <= 20) return "#22c55e";
  if (score <= 40) return "#86efac";
  if (score <= 55) return "#eab308";
  if (score <= 70) return "#f97316";
  if (score <= 85) return "#ef4444";
  return "#a855f7";
}

function scoreToLabel(score: number): string {
  if (score <= 20) return "Tốt";
  if (score <= 40) return "Khá";
  if (score <= 55) return "Trung bình";
  if (score <= 70) return "Kém";
  if (score <= 85) return "Xấu";
  return "Nguy hiểm";
}

function scoreAlpha(score: number): number {
  return 0.08 + (score / 100) * 0.28;
}

type TooltipData = {
  actName: string;
  actIcon: string;
  dayLong: string;
  score:   number;
  avgAqi:  number;
  avgPm25: number;
  scheduled: boolean;
  x: number; y: number;
};

type Props = {
  activities:      ActivitySchedule[];   
};

export default function WeeklyRiskMatrix({ activities }: Props) {
  const [dayStats,  setDayStats]  = useState<DayStats[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [tooltip,   setTooltip]   = useState<TooltipData | null>(null);
  const [viewMode,  setViewMode]  = useState<"matrix" | "chart">("matrix");

  const outdoorActs = activities.filter(a => a.isOutdoor);
  const allActs     = activities;
  const displayActs = viewMode === "matrix" ? allActs : outdoorActs;

  useEffect(() => {
    let cancelled = false;
    async function doFetch() {
      try {
        setLoading(true);
        const data = await http<{ history: HistoryPoint[] }>(
          "/api/air/history?days=30",
          { method: "GET", auth: true }
        );
        if (cancelled) return;

        const pts = data.history ?? [];

        const groups: Record<number, { aqi: number[]; pm25: number[] }> = {};
        for (let d = 0; d < 7; d++) groups[d] = { aqi: [], pm25: [] };

        pts.forEach(p => {
          const dow = new Date(p.time).getDay(); // 0=Sun
          if (typeof p.aqi  === "number" && !isNaN(p.aqi))  groups[dow].aqi.push(p.aqi);
          if (typeof p.pm25 === "number" && !isNaN(p.pm25)) groups[dow].pm25.push(p.pm25);
        });

        const stats: DayStats[] = Object.entries(groups).map(([dow, g]) => ({
          dayOfWeek: Number(dow),
          avgAqi:    g.aqi.length  ? Math.round(g.aqi.reduce((a,b)=>a+b,0)  / g.aqi.length)  : 75,
          avgPm25:   g.pm25.length ? +(g.pm25.reduce((a,b)=>a+b,0) / g.pm25.length).toFixed(1) : 25,
          count:     g.aqi.length,
        }));

        setDayStats(stats);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi tải history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doFetch();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="wrm-card">
        <div className="wrm-loading">
          <div className="wrm-spinner" />
          <span>Đang phân tích 30 ngày lịch sử AQI...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrm-card">
        <div className="wrm-error">⚠️ {error}</div>
      </div>
    );
  }

  if (displayActs.length === 0) {
    return (
      <div className="wrm-card">
        <div className="wrm-empty">
          📊 Thêm hoạt động để xem ma trận so sánh theo ngày trong tuần.
        </div>
      </div>
    );
  }

  const matrix: CellData[][] = displayActs.map(act => {
    return WEEK_ORDER.map(dow => {
      const stat     = dayStats.find(s => s.dayOfWeek === dow);
      const scheduled = (act.daysOfWeek ?? "")
        .split(",").map(Number).filter(Boolean).includes(jsToDb(dow));

      if (!stat || stat.count === 0) {
        return { riskScore: 0, avgAqi: 0, avgPm25: 0, hasData: false, scheduled };
      }

      return {
        riskScore: calcRiskScore(stat.avgAqi, act.groupMultiplier, act.intensityMultiplier, act.isOutdoor),
        avgAqi:    stat.avgAqi,
        avgPm25:   stat.avgPm25,
        hasData:   true,
        scheduled,
      };
    });
  });

  const bestDayPerAct: number[] = matrix.map(row => {
    let bestIdx = 0, bestScore = Infinity;
    row.forEach((cell, i) => {
      if (cell.hasData && cell.riskScore < bestScore) {
        bestScore = cell.riskScore;
        bestIdx   = i;
      }
    });
    return bestIdx;
  });

  const worstDayPerAct: number[] = matrix.map(row => {
    let worstIdx = 0, worstScore = -Infinity;
    row.forEach((cell, i) => {
      if (cell.hasData && cell.riskScore > worstScore) {
        worstScore = cell.riskScore;
        worstIdx   = i;
      }
    });
    return worstIdx;
  });

  const dayAvgRisk: number[] = WEEK_ORDER.map((_, di) => {
    const outdoorRows = matrix.filter((_, ai) => displayActs[ai].isOutdoor);
    if (!outdoorRows.length) return 50;
    const scores = outdoorRows.map(row => row[di].riskScore).filter(s => s > 0);
    return scores.length ? scores.reduce((a,b)=>a+b,0) / scores.length : 50;
  });
  const overallBestDayIdx  = dayAvgRisk.indexOf(Math.min(...dayAvgRisk));
  const overallWorstDayIdx = dayAvgRisk.indexOf(Math.max(...dayAvgRisk));

  const bestDayLabel  = DAY_LABELS[WEEK_ORDER[overallBestDayIdx]].long;
  const worstDayLabel = DAY_LABELS[WEEK_ORDER[overallWorstDayIdx]].long;
  const bestAqi       = dayStats.find(s => s.dayOfWeek === WEEK_ORDER[overallBestDayIdx])?.avgAqi ?? 0;
  const worstAqi      = dayStats.find(s => s.dayOfWeek === WEEK_ORDER[overallWorstDayIdx])?.avgAqi ?? 0;

  const maxAqi = Math.max(...dayStats.map(s => s.avgAqi), 1);

  return (
    <div className="wrm-card" onMouseLeave={() => setTooltip(null)}>

      <div className="wrm-header">
        <div className="wrm-header__left">
          <div className="wrm-header__eyebrow">📊 Phân tích 30 ngày lịch sử</div>
          <h3 className="wrm-header__title">So sánh rủi ro theo ngày trong tuần</h3>
          <p className="wrm-header__sub">
            AQI trung bình theo ngày × cường độ + nhóm người dùng của từng hoạt động
          </p>
        </div>
        <div className="wrm-header__right">
          <button className={`wrm-view-btn ${viewMode==="matrix"?"active":""}`}
            type="button" onClick={()=>setViewMode("matrix")}>Ma trận</button>
          <button className={`wrm-view-btn ${viewMode==="chart"?"active":""}`}
            type="button" onClick={()=>setViewMode("chart")}>Biểu đồ</button>
        </div>
      </div>

      <div className="wrm-insight">
        <div className="wrm-insight__item wrm-insight__item--good">
          <span className="wrm-insight__icon">✅</span>
          <div>
            <strong>{bestDayLabel}</strong>
            <span>AQI trung bình {bestAqi} — ngày tốt nhất cho hoạt động ngoài trời</span>
          </div>
        </div>
        <div className="wrm-insight__item wrm-insight__item--bad">
          <span className="wrm-insight__icon">⚠️</span>
          <div>
            <strong>{worstDayLabel}</strong>
            <span>AQI trung bình {worstAqi} — nên hạn chế hoạt động mạnh ngày này</span>
          </div>
        </div>
      </div>

      {viewMode === "matrix" ? (
        <div className="wrm-matrix-wrap">
          <table className="wrm-table">
            <thead>
              <tr>
                <th className="wrm-th wrm-th--act">Hoạt động</th>
                {WEEK_ORDER.map((dow, di) => (
                  <th key={dow}
                    className={[
                      "wrm-th",
                      di === overallBestDayIdx  ? "wrm-th--best"  : "",
                      di === overallWorstDayIdx ? "wrm-th--worst" : "",
                    ].filter(Boolean).join(" ")}>
                    <div className="wrm-th__content">
                      <span className="wrm-th__label">{DAY_LABELS[dow].short}</span>
                      {di === overallBestDayIdx  && <span className="wrm-th__badge wrm-th__badge--good">★</span>}
                      {di === overallWorstDayIdx && <span className="wrm-th__badge wrm-th__badge--bad">↓</span>}
                    </div>
                    <span className="wrm-th__aqi">
                      {dayStats.find(s=>s.dayOfWeek===dow)?.avgAqi ?? "--"}
                    </span>
                  </th>
                ))}
                <th className="wrm-th wrm-th--best-day">Ngày tốt nhất</th>
              </tr>
            </thead>
            <tbody>
              {displayActs.map((act, ai) => (
                <tr key={act.id} className="wrm-row">
                  <td className="wrm-td wrm-td--act">
                    <span className="wrm-act__icon">{act.icon}</span>
                    <div className="wrm-act__info">
                      <strong>{act.name}</strong>
                      <span>{act.isOutdoor ? "🌤 Ngoài trời" : "🏠 Trong nhà"}</span>
                    </div>
                  </td>

                  {matrix[ai].map((cell, di) => {
                    const dow       = WEEK_ORDER[di];
                    const isBest    = di === bestDayPerAct[ai];
                    const isWorst   = di === worstDayPerAct[ai];
                    const isSchd    = cell.scheduled;
                    const color     = cell.hasData ? scoreToColor(cell.riskScore) : "#475569";
                    const alpha     = cell.hasData ? scoreAlpha(cell.riskScore) : 0.04;

                    return (
                      <td key={dow}
                        className={[
                          "wrm-td wrm-td--cell",
                          isBest  ? "wrm-cell--best"   : "",
                          isWorst ? "wrm-cell--worst"  : "",
                          isSchd  ? "wrm-cell--schd"   : "",
                        ].filter(Boolean).join(" ")}
                        style={{
                          background: `rgba(${hexToRgb(color)},${alpha})`,
                          borderColor: isSchd ? color+"60" : "transparent",
                        }}
                        onMouseEnter={e => {
                          if (!cell.hasData) return;
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setTooltip({
                            actName:   act.name,
                            actIcon:   act.icon,
                            dayLong:   DAY_LABELS[dow].long,
                            score:     Math.round(cell.riskScore),
                            avgAqi:    cell.avgAqi,
                            avgPm25:   cell.avgPm25,
                            scheduled: cell.scheduled,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {cell.hasData ? (
                          <div className="wrm-cell-inner">
                            <strong style={{ color }}>{Math.round(cell.riskScore)}</strong>
                            {isBest  && <span className="wrm-cell-badge wrm-cell-badge--best">★</span>}
                            {isWorst && <span className="wrm-cell-badge wrm-cell-badge--worst">↓</span>}
                            {isSchd  && !isBest && !isWorst && (
                              <span className="wrm-cell-badge wrm-cell-badge--schd">•</span>
                            )}
                          </div>
                        ) : (
                          <span className="wrm-cell-na">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="wrm-td wrm-td--bestday">
                    <div className="wrm-bestday">
                      <strong style={{ color: scoreToColor(matrix[ai][bestDayPerAct[ai]].riskScore) }}>
                        {DAY_LABELS[WEEK_ORDER[bestDayPerAct[ai]]].long}
                      </strong>
                      <span>Score {Math.round(matrix[ai][bestDayPerAct[ai]].riskScore)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="wrm-legend">
            <span className="wrm-legend__label">Điểm rủi ro:</span>
            {[
              {s:10,l:"Tốt"},
              {s:35,l:"Khá"},
              {s:55,l:"TB"},
              {s:72,l:"Kém"},
              {s:90,l:"Xấu"},
            ].map(({s,l}) => (
              <div key={s} className="wrm-legend__item">
                <div className="wrm-legend__swatch"
                  style={{ background: scoreToColor(s), opacity: 0.7 }} />
                <span>{s} {l}</span>
              </div>
            ))}
            <div className="wrm-legend__item wrm-legend__item--schd">
              <div className="wrm-legend__swatch wrm-legend__swatch--schd" />
              <span>Ngày đã lên lịch</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="wrm-chart-wrap">
          <div className="wrm-chart-title">AQI trung bình 30 ngày theo thứ</div>
          <div className="wrm-bars">
            {WEEK_ORDER.map((dow, di) => {
              const stat  = dayStats.find(s => s.dayOfWeek === dow);
              const aqi   = stat?.avgAqi ?? 0;
              const pct   = maxAqi > 0 ? (aqi / maxAqi) * 100 : 0;
              const color = scoreToColor(calcRiskScore(aqi, 1.0, 1.0, true));
              const isBest  = di === overallBestDayIdx;
              const isWorst = di === overallWorstDayIdx;

              return (
                <div key={dow} className="wrm-bar-col">
                  <div className="wrm-bar-aqi">{aqi || "--"}</div>
                  <div className="wrm-bar-track">
                    <div
                      className="wrm-bar-fill"
                      style={{
                        height:     `${pct}%`,
                        background: color,
                        boxShadow:  isBest ? `0 0 10px ${color}` : "none",
                      }}
                    />
                  </div>
                  <div className="wrm-bar-day">
                    {DAY_LABELS[dow].short}
                    {isBest  && <div className="wrm-bar-badge wrm-bar-badge--best">★</div>}
                    {isWorst && <div className="wrm-bar-badge wrm-bar-badge--bad">↓</div>}
                  </div>
                  <div className="wrm-bar-pm25">
                    {stat?.avgPm25 ?? "--"}<br/>µg/m³
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wrm-chart-acts">
            <div className="wrm-chart-acts__title">Ngày tốt nhất theo từng hoạt động</div>
            <div className="wrm-chart-acts__list">
              {displayActs.map((act, ai) => {
                const bestDow   = WEEK_ORDER[bestDayPerAct[ai]];
                const bestCell  = matrix[ai][bestDayPerAct[ai]];
                const color     = scoreToColor(bestCell.riskScore);
                return (
                  <div key={act.id} className="wrm-act-row">
                    <span className="wrm-act-row__icon">{act.icon}</span>
                    <span className="wrm-act-row__name">{act.name}</span>
                    <span className="wrm-act-row__arrow">→</span>
                    <strong style={{ color }}>{DAY_LABELS[bestDow].long}</strong>
                    <span className="wrm-act-row__score" style={{ color }}>
                      Score {Math.round(bestCell.riskScore)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="wrm-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="wrm-tooltip__head">
            <span>{tooltip.actIcon}</span>
            <strong>{tooltip.actName}</strong>
            <span>·</span>
            <span>{tooltip.dayLong}</span>
          </div>
          <div className="wrm-tooltip__stats">
            <div><span>AQI TB</span><strong style={{ color: scoreToColor(tooltip.score) }}>{tooltip.avgAqi}</strong></div>
            <div><span>PM2.5 TB</span><strong>{tooltip.avgPm25} µg/m³</strong></div>
            <div><span>Risk Score</span><strong style={{ color: scoreToColor(tooltip.score) }}>{tooltip.score}/100 — {scoreToLabel(tooltip.score)}</strong></div>
          </div>
          {tooltip.scheduled && (
            <div className="wrm-tooltip__schd">✓ Đã lên lịch ngày này</div>
          )}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}