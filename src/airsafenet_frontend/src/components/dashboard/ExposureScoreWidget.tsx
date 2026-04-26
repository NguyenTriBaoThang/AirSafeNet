import { useState } from "react";

type ActivityRisk = {
  id:              number;
  name:            string;
  icon:            string;
  hourOfDay:       number;
  durationMinutes: number;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  forecastPm25:    number;
  forecastAqi:     number;
  riskLevel:       string;
};

type Props = {
  activities:    ActivityRisk[];
  backgroundPm25: number;   
};

const VENTILATION: Record<string, number> = {
  low:      0.50,   
  moderate: 1.00,   
  high:     1.80,   
};

const BACKGROUND_RATE   = 0.38;  
const INDOOR_IO_RATIO   = 0.50;  
const INDOOR_BG_RATIO   = 0.35; 

const WHO_PM25_24H      = 15.0;   
const AVG_BREATHING     = 0.625; 
const WHO_DAILY_DOSE    = WHO_PM25_24H * 24 * AVG_BREATHING; 

function pctColor(pct: number): string {
  if (pct <= 40)  return "#22c55e";
  if (pct <= 70)  return "#eab308";
  if (pct <= 100) return "#f97316";
  if (pct <= 150) return "#ef4444";
  return "#a855f7";
}

function pctLabel(pct: number): string {
  if (pct <= 40)  return "An toàn";
  if (pct <= 70)  return "Chú ý";
  if (pct <= 100) return "Đạt ngưỡng";
  if (pct <= 150) return "Vượt ngưỡng";
  return "Nguy hiểm";
}

function fmtMicro(v: number): string {
  return v >= 1000 ? `${(v/1000).toFixed(2)} mg` : `${v.toFixed(1)} µg`;
}

type ExposureItem = {
  id:          number;
  name:        string;
  icon:        string;
  pm25:        number;
  hours:       number;
  ventilation: number;
  factor:      number;
  dose:        number;   
  pctOfWho:   number;
  isOutdoor:   boolean;
  intensity:   string;
};

type ExposureResult = {
  items:          ExposureItem[];
  activityDose:   number; 
  backgroundDose: number;  
  totalDose:      number;
  whoPercent:     number;  
  activityHours:  number; 
  backgroundHours:number;
};

function calcExposure(activities: ActivityRisk[], bgPm25: number): ExposureResult {
  const items: ExposureItem[] = activities.map(a => {
    const hours  = a.durationMinutes / 60;
    const vent   = VENTILATION[a.intensity] ?? VENTILATION.low;
    const factor = a.isOutdoor ? 1.0 : INDOOR_IO_RATIO;
    const dose   = a.forecastPm25 * hours * vent * factor;
    return {
      id: a.id, name: a.name, icon: a.icon,
      pm25: a.forecastPm25, hours,
      ventilation: vent, factor, dose,
      pctOfWho: (dose / WHO_DAILY_DOSE) * 100,
      isOutdoor: a.isOutdoor, intensity: a.intensity,
    };
  });

  const activityDose  = items.reduce((s, x) => s + x.dose, 0);
  const activityHours = items.reduce((s, x) => s + x.hours, 0);
  const backgroundHours = Math.max(0, 24 - activityHours);

  const backgroundDose = bgPm25 * backgroundHours * BACKGROUND_RATE * INDOOR_BG_RATIO;

  const totalDose  = activityDose + backgroundDose;
  const whoPercent = (totalDose / WHO_DAILY_DOSE) * 100;

  return { items, activityDose, backgroundDose, totalDose, whoPercent, activityHours, backgroundHours };
}

export default function ExposureScoreWidget({ activities, backgroundPm25 }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const bg  = backgroundPm25 > 0 ? backgroundPm25 : 25;
  const exp = calcExposure(activities, bg);

  const pct   = exp.whoPercent;
  const color = pctColor(pct);
  const label = pctLabel(pct);

  const barPct  = Math.min(200, pct);
  const bar100  = Math.min(100, pct);       
  const barOver = Math.max(0, Math.min(100, pct - 100));

  return (
    <div className="exp-card">

      <div className="exp-header">
        <div className="exp-header__left">
          <div className="exp-header__eyebrow">🫁 Phơi nhiễm tích lũy hôm nay</div>
          <h3 className="exp-header__title">Cumulative PM2.5 Exposure</h3>
          <p className="exp-header__sub">
            Dựa trên lịch hoạt động · Mô hình hô hấp EPA · Ngưỡng WHO 24h = 15 µg/m³
          </p>
        </div>
        <div className="exp-header__score" style={{ color }}>
          <strong>{Math.round(pct)}</strong>
          <span>%</span>
          <div className="exp-header__label" style={{ color }}>{label}</div>
        </div>
      </div>

      <div className="exp-bar-section">
        <div className="exp-bar-track">
          <div className="exp-bar-who-marker" />
          <div className="exp-bar-who-label">WHO</div>

          <div className="exp-bar-fill exp-bar-fill--safe"
            style={{ width: `${bar100 / 2}%` }} />

          {barOver > 0 && (
            <div className="exp-bar-fill exp-bar-fill--over"
              style={{ left: "50%", width: `${barOver / 2}%` }} />
          )}

          <div className="exp-bar-thumb"
            style={{ left: `${Math.min(99, barPct / 2)}%`, background: color }}>
            <span style={{ color }}>{Math.round(pct)}%</span>
          </div>
        </div>

        <div className="exp-bar-labels">
          <span>0</span>
          <span style={{ color: "#22c55e" }}>WHO 15 µg/m³</span>
          <span style={{ color: "#ef4444" }}>2× WHO</span>
        </div>
      </div>

      <div className="exp-summary">
        <div className="exp-stat">
          <span className="exp-stat__icon">💨</span>
          <div>
            <strong style={{ color }}>{fmtMicro(exp.totalDose)}</strong>
            <span>Tổng PM2.5 đã hít</span>
          </div>
        </div>
        <div className="exp-stat">
          <span className="exp-stat__icon">🏃</span>
          <div>
            <strong>{fmtMicro(exp.activityDose)}</strong>
            <span>Từ {activities.length} hoạt động ({exp.activityHours.toFixed(1)}h)</span>
          </div>
        </div>
        <div className="exp-stat">
          <span className="exp-stat__icon">🏠</span>
          <div>
            <strong>{fmtMicro(exp.backgroundDose)}</strong>
            <span>Background ({exp.backgroundHours.toFixed(1)}h còn lại)</span>
          </div>
        </div>
        <div className="exp-stat exp-stat--who">
          <span className="exp-stat__icon">📋</span>
          <div>
            <strong>{fmtMicro(WHO_DAILY_DOSE)}</strong>
            <span>Ngưỡng WHO/ngày (100%)</span>
          </div>
        </div>
      </div>

      <div className="exp-insight" style={{
        background: color + "10",
        borderColor: color + "35",
      }}>
        {pct <= 40 && (
          <><span>✅</span><span>Hôm nay lịch hoạt động của bạn <strong>an toàn</strong> — phơi nhiễm PM2.5 thấp hơn 40% ngưỡng WHO.</span></>
        )}
        {pct > 40 && pct <= 70 && (
          <><span>🟡</span><span>Phơi nhiễm <strong>vừa phải</strong>. Cân nhắc giảm thời gian hoặc cường độ hoạt động ngoài trời.</span></>
        )}
        {pct > 70 && pct <= 100 && (
          <><span>🟠</span> <span>Sắp đạt ngưỡng WHO. Hạn chế hoạt động cường độ cao ngoài trời, ưu tiên trong nhà.</span></>
        )}
        {pct > 100 && pct <= 150 && (
          <><span>🔴</span><span><strong>Vượt ngưỡng WHO {Math.round(pct - 100)}%.</strong> Đeo N95 khi ra ngoài, cân nhắc hoãn hoạt động ngoài trời.</span></>
        )}
        {pct > 150 && (
          <><span>⚠️</span><span><strong>Vượt ngưỡng WHO {Math.round(pct - 100)}%.</strong> Hạn chế tối đa ra ngoài, đặc biệt nhóm nhạy cảm.</span></>
        )}
      </div>

      <button className="exp-toggle" type="button"
        onClick={() => setShowDetail(v => !v)}>
        {showDetail ? "▲ Ẩn chi tiết" : "▼ Xem chi tiết từng hoạt động"}
      </button>

      {showDetail && (
        <div className="exp-detail">
          <div className="exp-detail__formula">
            <span className="exp-detail__formula-title">📐 Công thức tính:</span>
            <code>Dose (µg) = PM2.5 × Thời gian (h) × Thông khí (m³/h) × Hệ số vị trí</code>
            <div className="exp-detail__rates">
              <span>Nhẹ = 0.5 m³/h</span>
              <span>Vừa = 1.0 m³/h</span>
              <span>Mạnh = 1.8 m³/h</span>
              <span>Trong nhà ×0.5</span>
            </div>
          </div>

          <div className="exp-rows">
            {exp.items.map(item => (
              <div key={item.id} className="exp-row">
                <span className="exp-row__icon">{item.icon}</span>
                <div className="exp-row__info">
                  <strong>{item.name}</strong>
                  <span>
                    {item.pm25} µg/m³ × {item.hours.toFixed(1)}h ×{" "}
                    {item.ventilation} m³/h × {item.factor}
                    {!item.isOutdoor && " (trong nhà)"}
                  </span>
                </div>
                <div className="exp-row__dose">
                  <strong>{fmtMicro(item.dose)}</strong>
                  <div className="exp-row__mini-bar">
                    <div style={{
                      width: `${Math.min(100, item.pctOfWho)}%`,
                      background: pctColor(item.pctOfWho),
                    }} />
                  </div>
                  <span style={{ color: pctColor(item.pctOfWho) }}>
                    {item.pctOfWho.toFixed(1)}% WHO
                  </span>
                </div>
              </div>
            ))}

            <div className="exp-row exp-row--bg">
              <span className="exp-row__icon">🌙</span>
              <div className="exp-row__info">
                <strong>Nền (ngủ + trong nhà)</strong>
                <span>
                  {bg} µg/m³ × {exp.backgroundHours.toFixed(1)}h ×{" "}
                  {BACKGROUND_RATE} m³/h × {INDOOR_BG_RATIO}
                </span>
              </div>
              <div className="exp-row__dose">
                <strong>{fmtMicro(exp.backgroundDose)}</strong>
                <div className="exp-row__mini-bar">
                  <div style={{
                    width: `${Math.min(100, (exp.backgroundDose/WHO_DAILY_DOSE)*100)}%`,
                    background: "#64748b",
                  }} />
                </div>
                <span style={{ color: "#64748b" }}>
                  {((exp.backgroundDose/WHO_DAILY_DOSE)*100).toFixed(1)}% WHO
                </span>
              </div>
            </div>
          </div>

          <div className="exp-who-table">
            <div className="exp-who-table__title">📊 Tham chiếu tiêu chuẩn WHO</div>
            <div className="exp-who-rows">
              <div className="exp-who-row">
                <span>WHO 24h PM2.5</span><strong>15 µg/m³</strong>
              </div>
              <div className="exp-who-row">
                <span>Ngưỡng dose/ngày</span><strong>{fmtMicro(WHO_DAILY_DOSE)}</strong>
              </div>
              <div className="exp-who-row">
                <span>Dose của bạn hôm nay</span>
                <strong style={{ color }}>{fmtMicro(exp.totalDose)}</strong>
              </div>
              <div className="exp-who-row">
                <span>Tỷ lệ</span>
                <strong style={{ color }}>{Math.round(pct)}% ngưỡng WHO</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}