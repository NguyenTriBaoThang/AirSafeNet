import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ComposedChart,
  Line,
} from "recharts";
import type { TooltipProps } from "recharts";
import { http } from "../../api/http";

const WHO_PM25_ANNUAL    = 5;   
const WHO_PM25_24H       = 15;  
const VIETNAM_STANDARD   = 25;  

type HistoryItem = {
  time: string;
  pm25: number;
  aqi: number;
  risk: string;
};

type DayData = {
  date: string;          
  dateISO: string;       
  avgPm25: number;       
  maxPm25: number;       
  minPm25: number;       
  exceedsWHO: boolean;   
  exceedsWHO24h: boolean;
  exceedsVN: boolean;    
  color: string;
};

type StatsInfo = {
  daysExceedWHO: number;
  daysExceedWHO24h: number;
  daysExceedVN: number;
  totalDays: number;
  avgPm25: number;
  maxPm25: number;
  maxDate: string;
};

type AirHistoryResponse = {
  history: HistoryItem[];
};

function getDayColor(avg: number): string {
  if (avg <= WHO_PM25_ANNUAL)  return "#16a34a"; 
  if (avg <= WHO_PM25_24H)     return "#eab308"; 
  if (avg <= VIETNAM_STANDARD) return "#f97316"; 
  return "#ef4444";                              
}

function aggregateByDay(items: HistoryItem[]): DayData[] {
  const map = new Map<string, number[]>();

  for (const item of items) {
    const d = new Date(item.time);
    const key = d.toISOString().slice(0, 10); 
    if (!map.has(key)) map.set(key, []);
    if (item.pm25 > 0) map.get(key)!.push(item.pm25);
  }

  const result: DayData[] = [];
  map.forEach((values, dateISO) => {
    if (values.length === 0) return;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const d   = new Date(dateISO);
    result.push({
      date:           `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`,
      dateISO,
      avgPm25:        Math.round(avg * 10) / 10,
      maxPm25:        Math.round(max * 10) / 10,
      minPm25:        Math.round(min * 10) / 10,
      exceedsWHO:     avg > WHO_PM25_ANNUAL,
      exceedsWHO24h:  avg > WHO_PM25_24H,
      exceedsVN:      avg > VIETNAM_STANDARD,
      color:          getDayColor(avg),
    });
  });

  return result.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload } = props as TooltipProps<number, string> & {
    payload?: Array<{ payload: DayData }>;
  };

  if (!active || !payload?.length) return null;

  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="who-tooltip">
      <div className="who-tooltip__date">{d.date}</div>
      <div className="who-tooltip__row">
        <span style={{ color: d.color }}>●</span>
        <span>Trung bình: <strong style={{ color: d.color }}>{d.avgPm25} µg/m³</strong></span>
      </div>
      <div className="who-tooltip__row">
        <span style={{ color: "#94a3b8" }}>↑</span>
        <span>Đỉnh: {d.maxPm25} µg/m³</span>
      </div>
      <div className="who-tooltip__row">
        <span style={{ color: "#94a3b8" }}>↓</span>
        <span>Đáy: {d.minPm25} µg/m³</span>
      </div>
      <div className="who-tooltip__divider" />
      <div className="who-tooltip__standards">
        <span style={{ color: d.exceedsWHO    ? "#ef4444" : "#16a34a" }}>
          {d.exceedsWHO    ? "✕" : "✓"} WHO năm (5)
        </span>
        <span style={{ color: d.exceedsWHO24h ? "#ef4444" : "#16a34a" }}>
          {d.exceedsWHO24h ? "✕" : "✓"} WHO 24h (15)
        </span>
        <span style={{ color: d.exceedsVN     ? "#ef4444" : "#16a34a" }}>
          {d.exceedsVN     ? "✕" : "✓"} QCVN (25)
        </span>
      </div>
    </div>
  );
}

function StatCard({
  value, total, label, sub, color, icon,
}: {
  value: number; total: number; label: string;
  sub?: string; color: string; icon: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="who-stat" style={{ borderColor: color + "40" }}>
      <div className="who-stat__top">
        <span className="who-stat__icon">{icon}</span>
        <div>
          <strong className="who-stat__value" style={{ color }}>{value}</strong>
          <span className="who-stat__total">/{total} ngày</span>
        </div>
      </div>
      <div className="who-stat__label">{label}</div>
      {sub && <div className="who-stat__sub">{sub}</div>}
      <div className="who-stat__bar-bg">
        <div
          className="who-stat__bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="who-stat__pct" style={{ color }}>{pct}% số ngày</div>
    </div>
  );
}

export default function WhoComparisonChart() {
  const [days,       setDays]    = useState<DayData[]>([]);
  const [loading,    setLoading] = useState(true);
  const [error,      setError]   = useState<string | null>(null);
  const [chartType,  setChart]   = useState<"bar" | "area">("bar");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await http<AirHistoryResponse>("/api/air/history?days=30", { method: "GET", auth: true });
      const items: HistoryItem[] = resp?.history ?? [];
      setDays(aggregateByDay(items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats: StatsInfo = useMemo(() => {
    if (days.length === 0) return {
      daysExceedWHO: 0, daysExceedWHO24h: 0, daysExceedVN: 0,
      totalDays: 0, avgPm25: 0, maxPm25: 0, maxDate: "—",
    };
    const maxDay = days.reduce((a, b) => a.avgPm25 > b.avgPm25 ? a : b);
    return {
      daysExceedWHO:    days.filter(d => d.exceedsWHO).length,
      daysExceedWHO24h: days.filter(d => d.exceedsWHO24h).length,
      daysExceedVN:     days.filter(d => d.exceedsVN).length,
      totalDays:        days.length,
      avgPm25:          Math.round(days.reduce((s, d) => s + d.avgPm25, 0) / days.length * 10) / 10,
      maxPm25:          maxDay.avgPm25,
      maxDate:          maxDay.date,
    };
  }, [days]);

  return (
    <div className="who-card card">

      <div className="who-header">
        <div className="who-header__left">
          <div className="who-header__badges">
            <span className="who-badge who-badge--who">WHO AQG 2021</span>
            <span className="who-badge who-badge--vn">QCVN 05:2023</span>
          </div>
          <h3>So sánh PM2.5 với tiêu chuẩn quốc tế — 30 ngày qua</h3>
          <p className="who-header__sub">TP. Hồ Chí Minh · Trung bình PM2.5 theo ngày</p>
        </div>
        <div className="who-header__right">
          <div className="who-chart-toggle">
            <button
              className={`who-toggle-btn ${chartType === "bar" ? "active" : ""}`}
              onClick={() => setChart("bar")} type="button"
            >Bar</button>
            <button
              className={`who-toggle-btn ${chartType === "area" ? "active" : ""}`}
              onClick={() => setChart("area")} type="button"
            >Area</button>
          </div>
          <button className="who-refresh-btn" onClick={load} type="button">↺</button>
        </div>
      </div>

      {!loading && !error && (
        <div className="who-stats">
          <StatCard
            value={stats.daysExceedWHO}
            total={stats.totalDays}
            label="Vượt WHO năm"
            sub="PM2.5 > 5 µg/m³"
            color="#ef4444"
            icon="🌍"
          />
          <StatCard
            value={stats.daysExceedWHO24h}
            total={stats.totalDays}
            label="Vượt WHO 24h"
            sub="PM2.5 > 15 µg/m³"
            color="#f97316"
            icon="⏱"
          />
          <StatCard
            value={stats.daysExceedVN}
            total={stats.totalDays}
            label="Vượt QCVN"
            sub="PM2.5 > 25 µg/m³"
            color="#eab308"
            icon="🇻🇳"
          />
          <div className="who-stat who-stat--avg">
            <div className="who-stat__top">
              <span className="who-stat__icon">📊</span>
              <div>
                <strong className="who-stat__value" style={{ color: getDayColor(stats.avgPm25) }}>
                  {stats.avgPm25}
                </strong>
                <span className="who-stat__total"> µg/m³</span>
              </div>
            </div>
            <div className="who-stat__label">TB 30 ngày</div>
            <div className="who-stat__sub">
              Cao nhất: {stats.maxPm25} µg/m³ ({stats.maxDate})
            </div>
            <div className="who-stat__sub" style={{ marginTop: 6 }}>
              = <strong>{Math.round(stats.avgPm25 / WHO_PM25_ANNUAL * 10) / 10}x</strong> tiêu chuẩn WHO năm
            </div>
          </div>
        </div>
      )}

      <div className="who-chart-wrap">
        {loading ? (
          <div className="who-loading">
            <div className="who-spinner" />
            <span>Đang tải 30 ngày dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="who-error">
            <span>⚠</span> {error}
            <button onClick={load} type="button">Thử lại</button>
          </div>
        ) : days.length === 0 ? (
          <div className="who-empty">Chưa có đủ dữ liệu lịch sử 30 ngày.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartType === "bar" ? (
              <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={10}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}`}
                  domain={[0, "auto"]}
                  width={32}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />

                {/* WHO Annual baseline */}
                <ReferenceLine
                  y={WHO_PM25_ANNUAL}
                  stroke="#22c55e"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: `WHO năm ${WHO_PM25_ANNUAL}`, position: "insideTopRight", fill: "#22c55e", fontSize: 10 }}
                />
                <ReferenceLine
                  y={WHO_PM25_24H}
                  stroke="#eab308"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: `WHO 24h ${WHO_PM25_24H}`, position: "insideTopRight", fill: "#eab308", fontSize: 10 }}
                />
                <ReferenceLine
                  y={VIETNAM_STANDARD}
                  stroke="#f97316"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: `QCVN ${VIETNAM_STANDARD}`, position: "insideTopRight", fill: "#f97316", fontSize: 10 }}
                />

                <Bar dataKey="avgPm25" name="PM2.5 TB" radius={[3,3,0,0]}>
                  {days.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            ) : (
              <ComposedChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pm25grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false} axisLine={false} minTickGap={10}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false} axisLine={false}
                  domain={[0, "auto"]} width={32}
                />
                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine y={WHO_PM25_ANNUAL} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `WHO năm ${WHO_PM25_ANNUAL}`, position: "insideTopRight", fill: "#22c55e", fontSize: 10 }} />
                <ReferenceLine y={WHO_PM25_24H} stroke="#eab308" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `WHO 24h ${WHO_PM25_24H}`, position: "insideTopRight", fill: "#eab308", fontSize: 10 }} />
                <ReferenceLine y={VIETNAM_STANDARD} stroke="#f97316" strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `QCVN ${VIETNAM_STANDARD}`, position: "insideTopRight", fill: "#f97316", fontSize: 10 }} />

                <Area
                  type="monotone" dataKey="maxPm25" name="Đỉnh"
                  stroke="rgba(239,68,68,0.25)" fill="rgba(239,68,68,0.06)"
                  strokeWidth={0} dot={false} legendType="none"
                />
                <Area
                  type="monotone" dataKey="avgPm25" name="PM2.5 TB"
                  stroke="#3b82f6" fill="url(#pm25grad)"
                  strokeWidth={2.5} dot={false}
                />
                <Line
                  type="monotone" dataKey="minPm25" name="Đáy"
                  stroke="rgba(148,163,184,0.3)" strokeWidth={1}
                  dot={false} legendType="none"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {!loading && !error && days.length > 0 && (
        <div className="who-legend">
          <div className="who-legend__standards">
            <span className="who-legend-item">
              <span style={{ background: "#22c55e" }} className="who-legend-dash" />
              WHO năm: 5 µg/m³
            </span>
            <span className="who-legend-item">
              <span style={{ background: "#eab308" }} className="who-legend-dash" />
              WHO 24h: 15 µg/m³
            </span>
            <span className="who-legend-item">
              <span style={{ background: "#f97316" }} className="who-legend-dash" />
              QCVN 05:2023: 25 µg/m³
            </span>
          </div>
          <div className="who-legend__colors">
            <span className="who-legend-item"><span style={{ background: "#16a34a" }} className="who-legend-sq" />Đạt WHO năm</span>
            <span className="who-legend-item"><span style={{ background: "#eab308" }} className="who-legend-sq" />Vượt WHO năm</span>
            <span className="who-legend-item"><span style={{ background: "#f97316" }} className="who-legend-sq" />Vượt WHO 24h</span>
            <span className="who-legend-item"><span style={{ background: "#ef4444" }} className="who-legend-sq" />Vượt QCVN</span>
          </div>
          <div className="who-source">
            Nguồn: WHO Air Quality Guidelines 2021 · QCVN 05:2023/BTNMT
          </div>
        </div>
      )}
    </div>
  );
}