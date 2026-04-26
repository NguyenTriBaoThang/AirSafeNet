import { useEffect, useRef, useState } from "react";
import { http } from "../../api/http";

type ForecastPoint = {
  hour:        number;   
  time:        string;  
  aqi:         number;
  pm25:        number;
  risk:        string;
  recommendation: string;
};

type Props = {
  activityName:    string;
  activityIcon:    string;
  currentHour:     number;
  currentMinute:   number;
  groupMultiplier: number;
  intensityMultiplier: number;
  isOutdoor:       boolean;
  onSelectHour:    (hour: number) => void;
  onClose:         () => void;
};

const AQI_STOPS = [
  { max:  50,  color: "#22c55e", label: "Tốt",        bg: "rgba(34,197,94,.18)"  },
  { max: 100,  color: "#eab308", label: "Trung bình",  bg: "rgba(234,179,8,.18)"  },
  { max: 150,  color: "#f97316", label: "Nhạy cảm",    bg: "rgba(249,115,22,.18)" },
  { max: 200,  color: "#ef4444", label: "Không tốt",   bg: "rgba(239,68,68,.18)"  },
  { max: 300,  color: "#a855f7", label: "Rất kém",     bg: "rgba(168,85,247,.18)" },
  { max: 9999, color: "#7f1d1d", label: "Nguy hiểm",   bg: "rgba(127,29,29,.18)"  },
];

function getStop(aqi: number) {
  return AQI_STOPS.find(s => aqi <= s.max) ?? AQI_STOPS[AQI_STOPS.length - 1];
}

function aqiColor(aqi: number, alpha = 1): string {
  const stop = getStop(aqi);
  const r = parseInt(stop.color.slice(1,3), 16);
  const g = parseInt(stop.color.slice(3,5), 16);
  const b = parseInt(stop.color.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function riskScore(aqi: number, groupMult: number, intensMult: number, isOut: boolean): number {
  const base = aqi <= 50  ? aqi * 0.4
             : aqi <= 100 ? 20 + (aqi-50)*0.4
             : aqi <= 150 ? 40 + (aqi-100)*0.4
             : aqi <= 200 ? 60 + (aqi-150)*0.3
             : aqi <= 300 ? 75 + (aqi-200)*0.15
             : Math.min(100, 90 + (aqi-300)*0.1);
  return Math.min(100, base * groupMult * intensMult * (isOut ? 1.0 : 0.3));
}

function fmt2(n: number) { return String(n).padStart(2, "0"); }

function SkeletonBar() {
  return (
    <div className="ghp-skeleton">
      {Array.from({length: 24}).map((_, i) => (
        <div key={i} className="ghp-skeleton__cell" style={{ animationDelay: `${i * 30}ms` }} />
      ))}
    </div>
  );
}

export default function GoldenHourPicker({
  activityName, activityIcon,
  currentHour, currentMinute,
  groupMultiplier, intensityMultiplier, isOutdoor,
  onSelectHour, onClose,
}: Props) {
  const [points,   setPoints]   = useState<ForecastPoint[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(currentHour);
  const [hovered,  setHovered]  = useState<number | null>(null);
  const sliderRef  = useRef<HTMLInputElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function doFetch() {
      try {
        setLoading(true);
        const data = await http<{
          forecast: Array<{ time: string; aqi: number; pm25: number; risk: string; recommendation: string }>;
        }>("/api/air/forecast?days=1", { method: "GET", auth: true });

        if (cancelled) return;

        const pts: ForecastPoint[] = (data.forecast ?? []).map(f => ({
          hour:        new Date(f.time).getHours(),
          time:        f.time,
          aqi:         f.aqi,
          pm25:        Math.round(f.pm25 * 10) / 10,
          risk:        f.risk,
          recommendation: f.recommendation,
        }));

        const filled: ForecastPoint[] = [];
        for (let h = 0; h < 24; h++) {
          const found = pts.find(p => p.hour === h);
          if (found) { filled.push(found); }
          else {
            const fallback = pts[pts.length - 1] ?? { hour: h, time: "", aqi: 75, pm25: 25, risk: "MODERATE", recommendation: "" };
            filled.push({ ...fallback, hour: h });
          }
        }
        setPoints(filled);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lỗi tải forecast");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doFetch();
    return () => { cancelled = true; };
  }, []);

  const top3 = [...points]
    .map(p => ({ ...p, score: riskScore(p.aqi, groupMultiplier, intensityMultiplier, isOutdoor) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const selectedPt = points[selected] ?? null;
  const displayPt  = hovered !== null ? (points[hovered] ?? null) : selectedPt;
  const selectedScore = selectedPt
    ? Math.round(riskScore(selectedPt.aqi, groupMultiplier, intensityMultiplier, isOutdoor))
    : 0;
  const selectedStop = selectedPt ? getStop(selectedPt.aqi) : AQI_STOPS[0];

  useEffect(() => {
    if (!heatmapRef.current) return;
    const cells = heatmapRef.current.querySelectorAll(".ghp-cell");
    const cell  = cells[selected] as HTMLElement | undefined;
    cell?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected]);

  return (
    <div className="ghp-overlay" onClick={onClose}>
      <div className="ghp-panel" onClick={e => e.stopPropagation()}>

        <div className="ghp-header">
          <div className="ghp-header__left">
            <span className="ghp-header__icon">{activityIcon}</span>
            <div>
              <div className="ghp-header__eyebrow">Chọn giờ vàng</div>
              <h3 className="ghp-header__title">{activityName}</h3>
              <div className="ghp-header__sub">
                Giờ hiện tại: <strong>{fmt2(currentHour)}:{fmt2(currentMinute)}</strong>
                {!isOutdoor && <span className="ghp-header__indoor"> · Trong nhà (×0.3)</span>}
              </div>
            </div>
          </div>
          <button className="ghp-close" onClick={onClose} type="button">✕</button>
        </div>

        {loading ? (
          <div className="ghp-loading">
            <div className="ghp-spinner" />
            <span>Đang tải dữ liệu AQI 24h...</span>
            <SkeletonBar />
          </div>
        ) : error ? (
          <div className="ghp-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="ghp-heatmap-wrap">
              <div className="ghp-heatmap" ref={heatmapRef}>
                {points.map((p, i) => {
                  const stop  = getStop(p.aqi);
                  const score = riskScore(p.aqi, groupMultiplier, intensityMultiplier, isOutdoor);
                  const isNow = i === new Date().getHours();
                  const isSel = i === selected;
                  const isHov = i === hovered;
                  const isTop = top3.some(t => t.hour === i);

                  return (
                    <button
                      key={i}
                      className={[
                        "ghp-cell",
                        isSel ? "ghp-cell--sel" : "",
                        isHov ? "ghp-cell--hov" : "",
                        isNow ? "ghp-cell--now" : "",
                      ].filter(Boolean).join(" ")}
                      type="button"
                      onClick={() => setSelected(i)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        "--cell-color": stop.color,
                        "--cell-bg":    aqiColor(p.aqi, 0.22),
                        "--cell-h":     `${Math.max(20, Math.min(72, 72 - score * 0.5))}%`,
                      } as React.CSSProperties}
                      title={`${fmt2(i)}:00 · AQI ${p.aqi}`}
                    >
                      <div className="ghp-cell__bar" />

                      <span className="ghp-cell__hour">{fmt2(i)}</span>

                      {isTop && <span className="ghp-cell__star">★</span>}

                      {isNow && <span className="ghp-cell__now-dot" />}
                    </button>
                  );
                })}
              </div>

              <div className="ghp-legend">
                {AQI_STOPS.slice(0, 5).map(s => (
                  <div key={s.label} className="ghp-legend__item">
                    <div className="ghp-legend__dot" style={{ background: s.color }} />
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ghp-slider-wrap">
              <input
                ref={sliderRef}
                type="range"
                min={0} max={23} step={1}
                value={selected}
                onChange={e => setSelected(Number(e.target.value))}
                className="ghp-slider"
                style={{ "--thumb-color": selectedStop.color } as React.CSSProperties}
              />
              <div className="ghp-slider-labels">
                {[0, 6, 12, 18, 23].map(h => (
                  <span key={h} style={{ left: `${(h/23)*100}%` }}>{fmt2(h)}h</span>
                ))}
              </div>
            </div>

            {displayPt && (
              <div className="ghp-info-card"
                style={{ borderColor: selectedStop.color + "40", background: selectedStop.bg }}>
                <div className="ghp-info-card__left">
                  <div className="ghp-info-card__time"
                    style={{ color: selectedStop.color }}>
                    {fmt2(displayPt.hour)}:00
                  </div>
                  <div className="ghp-info-card__label" style={{ color: selectedStop.color }}>
                    {getStop(displayPt.aqi).label}
                  </div>
                </div>

                <div className="ghp-info-card__stats">
                  <div className="ghp-stat">
                    <span>AQI</span>
                    <strong style={{ color: selectedStop.color }}>{displayPt.aqi}</strong>
                  </div>
                  <div className="ghp-stat">
                    <span>PM2.5</span>
                    <strong>{displayPt.pm25} µg/m³</strong>
                  </div>
                  <div className="ghp-stat">
                    <span>Risk Score</span>
                    <strong style={{ color: selectedStop.color }}>
                      {Math.round(riskScore(displayPt.aqi, groupMultiplier, intensityMultiplier, isOutdoor))}/100
                    </strong>
                  </div>
                </div>

                {displayPt.recommendation && (
                  <div className="ghp-info-card__reco">{displayPt.recommendation}</div>
                )}
              </div>
            )}

            <div className="ghp-top3">
              <div className="ghp-top3__title">★ 3 giờ vàng hôm nay</div>
              <div className="ghp-top3__list">
                {top3.map((p, rank) => {
                  const stop = getStop(p.aqi);
                  return (
                    <button
                      key={p.hour}
                      className={`ghp-top3-item ${selected === p.hour ? "ghp-top3-item--sel" : ""}`}
                      type="button"
                      onClick={() => setSelected(p.hour)}
                      style={{
                        "--top-color": stop.color,
                        borderColor: stop.color + (selected === p.hour ? "70" : "25"),
                        background:  selected === p.hour ? stop.color + "18" : "rgba(255,255,255,0.03)",
                      } as React.CSSProperties}
                    >
                      <span className="ghp-top3-item__rank">#{rank + 1}</span>
                      <div className="ghp-top3-item__time" style={{ color: stop.color }}>
                        {fmt2(p.hour)}:00
                      </div>
                      <div className="ghp-top3-item__meta">
                        <span>AQI {p.aqi}</span>
                        <span style={{ color: stop.color }}>Score {Math.round(p.score)}</span>
                      </div>
                      <div className="ghp-top3-item__bar">
                        <div style={{
                          width:      `${100 - p.score}%`,
                          background: stop.color,
                          height:     "100%",
                          borderRadius: "999px",
                          transition: "width .4s ease",
                        }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ghp-actions">
              <div className="ghp-actions__hint">
                {selected !== currentHour ? (
                  <span>
                    Đổi từ <strong>{fmt2(currentHour)}:00</strong> →{" "}
                    <strong style={{ color: selectedStop.color }}>{fmt2(selected)}:00</strong>
                    {selectedScore < 40
                      ? " ✓ Cải thiện đáng kể"
                      : selectedScore < 60
                      ? " · Tương đương"
                      : " ⚠ Rủi ro vẫn còn cao"}
                  </span>
                ) : (
                  <span>Đang xem giờ hiện tại · Kéo heatmap hoặc thanh trượt để thay đổi</span>
                )}
              </div>
              <div className="ghp-actions__btns">
                <button className="btn btn-secondary" onClick={onClose} type="button">Hủy</button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => { onSelectHour(selected); onClose(); }}
                  disabled={selected === currentHour}
                >
                  Áp dụng {fmt2(selected)}:00
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}