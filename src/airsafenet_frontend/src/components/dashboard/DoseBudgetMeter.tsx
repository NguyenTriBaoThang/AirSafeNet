/**
 *
 * "Calorie counter" cho PM2.5 — hiện trực tiếp trong modal thêm/sửa hoạt động.
 *
 * Input: form state (duration, intensity, isOutdoor) + currentAqi/Pm25 dự báo
 *        + danh sách hoạt động đã có hôm nay (để tính budget còn lại)
 *
 * Output:
 *   - Dose của hoạt động đang thêm/sửa (µg)
 *   - Budget đã dùng hôm nay (µg) từ lịch hiện tại
 *   - Budget còn lại sau khi thêm
 *   - Progress arc (circular) và bar linear
 *   - Đổi màu + cảnh báo khi vượt ngưỡng
 *
 * Công thức (đồng bộ ExposureScoreWidget & ExposureLogWidget):
 *   dose = PM2.5 × (dur/60) × ventilation × location_factor
 *   WHO  = 225 µg/ngày (15 µg/m³ × 24h × 0.625 m³/h avg breathing)
 */

import { useMemo } from "react";

export type DoseBudgetActivity = {
  id:              number;
  durationMinutes: number;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  forecastPm25:    number;
  daysOfWeek?:     string;
};

type Props = {
  formDuration:  number;
  formIntensity: "low" | "moderate" | "high";
  formIsOutdoor: boolean;
  formPm25:      number;   

  todayActivities: DoseBudgetActivity[];

  editingId?: number;

  compact?: boolean;
};

const VENTILATION: Record<string, number> = {
  low:      0.50,
  moderate: 1.00,
  high:     1.80,
};
const INDOOR_IO  = 0.50;
const WHO_DAILY  = 225;    
const WHO_PM25   = 15;    

function calcDose(
  pm25:      number,
  durMins:   number,
  intensity: string,
  isOutdoor: boolean,
): number {
  const vent   = VENTILATION[intensity] ?? VENTILATION.low;
  const factor = isOutdoor ? 1.0 : INDOOR_IO;
  return pm25 * (durMins / 60) * vent * factor;
}

function fmtMicro(v: number, decimals = 0): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2)} mg`;
  return `${decimals ? v.toFixed(decimals) : Math.round(v)} µg`;
}

function statusColor(pct: number): string {
  if (pct <=  60) return "#22c55e";
  if (pct <=  85) return "#eab308";
  if (pct <= 100) return "#f97316";
  if (pct <= 140) return "#ef4444";
  return "#a855f7";
}

function statusLabel(pct: number): string {
  if (pct <=  60) return "An toàn";
  if (pct <=  85) return "Chú ý";
  if (pct <= 100) return "Đạt ngưỡng";
  if (pct <= 140) return "Vượt ngưỡng";
  return "Nguy hiểm";
}

function arcPath(pct: number, r = 30): string {
  const capped = Math.min(100, pct);
  const angle  = (capped / 100) * 270 - 135; 
  const rad    = (angle * Math.PI) / 180;
  const cx = 40, cy = 44;
  const x  = cx + r * Math.cos(rad);
  const y  = cy + r * Math.sin(rad);
  const large = capped > 50 ? 1 : 0;
  return `M ${cx + r * Math.cos(-135 * Math.PI / 180)} ${cy + r * Math.sin(-135 * Math.PI / 180)} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
}

function BudgetRow({ label, dose, pct, color, isNew }: {
  label: string; dose: number; pct: number; color: string; isNew?: boolean;
}) {
  return (
    <div className={`ddb-row ${isNew ? "ddb-row--new" : ""}`}>
      <div className="ddb-row__label">{label}</div>
      <div className="ddb-row__bar-wrap">
        <div className="ddb-row__bar">
          <div
            className={`ddb-row__fill ${isNew ? "ddb-row__fill--new" : ""}`}
            style={{ width: `${Math.min(100, pct)}%`, background: color }}
          />
        </div>
      </div>
      <div className="ddb-row__val" style={{ color }}>
        {fmtMicro(dose)}
        <span>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function DoseBudgetMeter({
  formDuration, formIntensity, formIsOutdoor, formPm25,
  todayActivities, editingId, compact = false,
}: Props) {

  const result = useMemo(() => {
    const newDose = calcDose(formPm25, formDuration, formIntensity, formIsOutdoor);

    const existingDose = todayActivities
      .filter(a => a.id !== editingId)
      .reduce((sum, a) => sum + calcDose(a.forecastPm25, a.durationMinutes, a.intensity, a.isOutdoor), 0);

    const totalAfter    = existingDose + newDose;
    const remaining     = Math.max(0, WHO_DAILY - totalAfter);
    const pctExisting   = (existingDose / WHO_DAILY) * 100;
    const pctNew        = (newDose / WHO_DAILY) * 100;
    const pctTotalAfter = (totalAfter / WHO_DAILY) * 100;
    const isOver        = totalAfter > WHO_DAILY;
    const overBy        = Math.max(0, totalAfter - WHO_DAILY);

    return {
      newDose, existingDose, totalAfter, remaining,
      pctExisting, pctNew, pctTotalAfter, isOver, overBy,
    };
  }, [formDuration, formIntensity, formIsOutdoor, formPm25, todayActivities, editingId]);

  const mainColor = statusColor(result.pctTotalAfter);

  if (compact) {
    return (
      <div className="ddb-compact" style={{ borderColor: mainColor + "40" }}>
        <div className="ddb-compact__left">
          <span className="ddb-compact__dose" style={{ color: mainColor }}>
            {fmtMicro(result.newDose, 1)}
          </span>
          <span className="ddb-compact__label">cho hoạt động này</span>
        </div>
        <div className="ddb-compact__divider" />
        <div className="ddb-compact__budget">
          {result.isOver ? (
            <span style={{ color: "#ef4444" }}>
              ⚠ Vượt {fmtMicro(result.overBy)} ngưỡng WHO
            </span>
          ) : (
            <span>
              Còn lại{" "}
              <strong style={{ color: mainColor }}>{fmtMicro(result.remaining)}</strong>
              {" "}/ {WHO_DAILY} µg WHO
            </span>
          )}
        </div>
        <div className="ddb-compact__bar">
          <div
            className="ddb-compact__bar-existing"
            style={{ width: `${Math.min(100, result.pctExisting)}%` }}
          />
          <div
            className="ddb-compact__bar-new"
            style={{
              left:  `${Math.min(100, result.pctExisting)}%`,
              width: `${Math.min(100 - result.pctExisting, result.pctNew)}%`,
              background: mainColor,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ddb-card">
      <div className="ddb-header">
        <div className="ddb-header__left">
          <div className="ddb-header__eyebrow">💨 WHO Dose Budget</div>
          <div className="ddb-header__sub">
            Ngưỡng phơi nhiễm an toàn · PM2.5 ≤ {WHO_PM25} µg/m³ · {WHO_DAILY} µg/ngày
          </div>
        </div>
        <div className="ddb-header__status"
          style={{ color: mainColor, borderColor: mainColor + "40", background: mainColor + "10" }}>
          {statusLabel(result.pctTotalAfter)}
        </div>
      </div>

      <div className="ddb-body">
        <div className="ddb-gauge-wrap">
          <svg viewBox="0 0 80 70" className="ddb-gauge-svg">
            <path
              d={arcPath(100)}
              fill="none" stroke="rgba(255,255,255,.07)"
              strokeWidth="7" strokeLinecap="round"
            />
            {result.pctExisting > 0 && (
              <path
                d={arcPath(result.pctExisting)}
                fill="none" stroke="rgba(255,255,255,.25)"
                strokeWidth="7" strokeLinecap="round"
              />
            )}
            <path
              d={arcPath(result.pctTotalAfter)}
              fill="none" stroke={mainColor}
              strokeWidth="7" strokeLinecap="round"
              style={{ transition: "d .4s ease, stroke .3s" }}
            />
            <text x="40" y="38" textAnchor="middle"
              fill={mainColor} fontSize="13" fontWeight="900" fontFamily="system-ui">
              {Math.round(result.pctTotalAfter)}%
            </text>
            <text x="40" y="50" textAnchor="middle"
              fill="rgba(255,255,255,.3)" fontSize="6.5" fontFamily="system-ui">
              WHO Budget
            </text>
          </svg>

          <div className="ddb-gauge-nums">
            <div className="ddb-num">
              <strong style={{ color: mainColor }}>{fmtMicro(result.newDose, 1)}</strong>
              <span>hoạt động này</span>
            </div>
            <div className="ddb-num-divider">+</div>
            <div className="ddb-num">
              <strong>{fmtMicro(result.existingDose)}</strong>
              <span>đã có hôm nay</span>
            </div>
            <div className="ddb-num-divider">=</div>
            <div className="ddb-num">
              <strong style={{ color: mainColor }}>{fmtMicro(result.totalAfter)}</strong>
              <span>/ {WHO_DAILY} µg</span>
            </div>
          </div>
        </div>

        <div className="ddb-breakdown">
          {result.existingDose > 0 && (
            <BudgetRow
              label="Lịch hiện có"
              dose={result.existingDose}
              pct={result.pctExisting}
              color="rgba(255,255,255,.35)"
            />
          )}
          <BudgetRow
            label={`Hoạt động này`}
            dose={result.newDose}
            pct={result.pctNew}
            color={mainColor}
            isNew
          />
          <div className="ddb-who-line">
            <span>Ngưỡng WHO/ngày</span>
            <strong>{WHO_DAILY} µg</strong>
          </div>
        </div>
      </div>

      <div className="ddb-footer" style={{
        background: mainColor + "0d",
        borderColor: mainColor + "30",
      }}>
        {result.isOver ? (
          <div className="ddb-footer__over">
            <span className="ddb-footer__over-icon">⚠️</span>
            <div>
              <strong style={{ color: "#ef4444" }}>
                Vượt ngưỡng WHO {fmtMicro(result.overBy)}
              </strong>
              <span>
                Cân nhắc giảm thời lượng hoặc chuyển hoạt động vào trong nhà
                để giảm phơi nhiễm.
              </span>
            </div>
          </div>
        ) : (
          <div className="ddb-footer__ok">
            <div className="ddb-footer__remaining">
              <span>Còn lại trong ngày</span>
              <strong style={{ color: mainColor }}>{fmtMicro(result.remaining)}</strong>
            </div>
            <div className="ddb-remaining-bar">
              <div style={{
                width: `${100 - Math.min(100, result.pctTotalAfter)}%`,
                background: mainColor,
              }} />
            </div>
            {result.pctTotalAfter > 75 && (
              <span className="ddb-footer__tip">
                💡 Budget còn ít — ưu tiên hoạt động nhẹ nhàng trong nhà cho phần còn lại.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Formula note */}
      <div className="ddb-formula">
        dose = PM2.5 ({formPm25} µg/m³) × {(formDuration/60).toFixed(2)}h ×{" "}
        {VENTILATION[formIntensity]} m³/h × {formIsOutdoor ? "1.0" : "0.5"} =
        <strong> {fmtMicro(result.newDose, 2)}</strong>
      </div>
    </div>
  );
}
