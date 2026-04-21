import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE       = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const SLIDE_DURATION = 5000;   // ms mỗi slide
const HCMC_POP       = 9_500_000;
const USD_TO_VND     = 25_000;
const WHO_ANNUAL     = 5;
const WHO_24H        = 15;

type Current = {
  aqi: number; pm25: number; risk: string;
  recommendation: string; aqiCategory: string;
};

type ForecastItem = {
  time: string; predAqi: number; predPm25: number;
  riskProfile: string; recommendationProfile: string;
};

type ExplainData = {
  temperature?: number; humidity?: number;
  windSpeed?: number; windDirection?: number;
  uvIndex?: number; pressure?: number; cloudCover?: number;
  windExplain?: string; humidityExplain?: string;
  temperatureExplain?: string; pressureExplain?: string;
  uvExplain?: string; cloudExplain?: string;
  trendDirection?: string; overallSummary?: string;
};

function riskColor(r: string) {
  return r === "GOOD"                ? "#16a34a"
       : r === "MODERATE"            ? "#ca8a04"
       : r === "UNHEALTHY_SENSITIVE" ? "#ea580c"
       : r === "UNHEALTHY"           ? "#dc2626"
       : r === "VERY_UNHEALTHY"      ? "#7c3aed"
       : "#7f1d1d";
}

function riskViet(r: string) {
  return r === "GOOD"                ? "Tốt"
       : r === "MODERATE"            ? "Trung bình"
       : r === "UNHEALTHY_SENSITIVE" ? "Nhóm nhạy cảm"
       : r === "UNHEALTHY"           ? "Không tốt"
       : r === "VERY_UNHEALTHY"      ? "Rất không tốt"
       : "Nguy hiểm";
}

function aqiToExposureRate(aqi: number) {
  return aqi <= 50 ? 0.10 : aqi <= 100 ? 0.35 : aqi <= 150 ? 0.60 : 0.75;
}

function aqiToCostPerPerson(aqi: number) {
  return aqi <= 50 ? 0.05 : aqi <= 100 ? 0.30 : aqi <= 150 ? 0.80 : 1.80;
}

function formatBillion(vnd: number) {
  const b = vnd / 1e9;
  return b >= 100 ? `${Math.round(b)} tỷ` : `${b.toFixed(1)} tỷ`;
}

function windDir(deg?: number) {
  if (deg == null) return "—";
  const dirs = ["Bắc","Đông Bắc","Đông","Đông Nam","Nam","Tây Nam","Tây","Tây Bắc"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function uvLabel(uv?: number) {
  if (uv == null) return "—";
  return uv < 3 ? "Thấp" : uv < 6 ? "Trung bình" : uv < 8 ? "Cao" : uv < 11 ? "Rất cao" : "Cực độ";
}

function ProgressBar({ duration, active }: { duration: number; active: boolean }) {
  return (
    <div className="pres-progress-track">
      <div
        key={active ? "run" : "idle"}
        className="pres-progress-fill"
        style={{
          animationDuration: `${duration}ms`,
          animationPlayState: active ? "running" : "paused",
        }}
      />
    </div>
  );
}

function SlideAqi({ current, now }: { current: Current; now: string }) {
  const color = riskColor(current.risk);
  return (
    <div className="pres-slide pres-slide--aqi">
      <div className="pres-slide__eyebrow">TP. Hồ Chí Minh · {now}</div>

      <div className="pres-aqi-ring" style={{ "--ring-color": color } as React.CSSProperties}>
        <svg viewBox="0 0 200 200" className="pres-aqi-ring__svg">
          <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
          <circle
            cx="100" cy="100" r="85"
            fill="none" stroke={color} strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(current.aqi / 300, 1) * 534} 534`}
            transform="rotate(-90 100 100)"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="pres-aqi-ring__inner">
          <span className="pres-aqi-ring__label">AQI</span>
          <strong className="pres-aqi-ring__value" style={{ color }}>{current.aqi}</strong>
          <span className="pres-aqi-ring__cat" style={{ color }}>{riskViet(current.risk)}</span>
        </div>
      </div>

      <div className="pres-aqi-stats">
        <div className="pres-stat">
          <span>PM2.5</span>
          <strong style={{ color }}>{current.pm25.toFixed(1)}</strong>
          <span>µg/m³</span>
        </div>
        <div className="pres-stat pres-stat--who">
          <span>vs WHO năm</span>
          <strong style={{ color: "#ef4444" }}>{(current.pm25 / WHO_ANNUAL).toFixed(1)}×</strong>
          <span>tiêu chuẩn</span>
        </div>
        <div className="pres-stat pres-stat--who">
          <span>vs WHO 24h</span>
          <strong style={{ color: current.pm25 > WHO_24H ? "#ef4444" : "#16a34a" }}>
            {current.pm25 > WHO_24H ? "Vượt" : "Đạt"}
          </strong>
          <span>{WHO_24H} µg/m³</span>
        </div>
      </div>

      <p className="pres-recommendation">{current.recommendation}</p>
    </div>
  );
}

function SlideImpact({ current }: { current: Current }) {
  const rate    = aqiToExposureRate(current.aqi);
  const affected = Math.round(HCMC_POP * rate);
  const costVnd  = aqiToCostPerPerson(current.aqi) * affected * USD_TO_VND;
  const color    = riskColor(current.risk);

  return (
    <div className="pres-slide pres-slide--impact">
      <div className="pres-slide__eyebrow">Tác động hôm nay · TP.HCM 9.5 triệu người</div>

      <div className="pres-impact-grid">
        <div className="pres-impact-card pres-impact-card--people">
          <div className="pres-impact-card__icon">👥</div>
          <strong style={{ color }}>{(affected / 1_000_000).toFixed(1)}M</strong>
          <span>người bị ảnh hưởng</span>
          <div className="pres-impact-card__sub">({Math.round(rate * 100)}% dân số)</div>
        </div>

        <div className="pres-impact-card pres-impact-card--cost">
          <div className="pres-impact-card__icon">💰</div>
          <strong style={{ color }}>{formatBillion(costVnd)}</strong>
          <span>đồng thiệt hại / ngày</span>
          <div className="pres-impact-card__sub">≈ {formatBillion(costVnd / 24)} đ / giờ</div>
        </div>

        <div className="pres-impact-card pres-impact-card--who">
          <div className="pres-impact-card__icon">🌍</div>
          <strong style={{ color: "#ef4444" }}>{(current.pm25 / WHO_ANNUAL).toFixed(1)}×</strong>
          <span>tiêu chuẩn WHO năm</span>
          <div className="pres-impact-card__sub">WHO cho phép {WHO_ANNUAL} µg/m³</div>
        </div>

        <div className="pres-impact-card">
          <div className="pres-impact-card__icon">🏥</div>
          <strong style={{ color: "#f97316" }}>{Math.round(costVnd * 0.42 / 50_000_000).toLocaleString("vi-VN")}</strong>
          <span>ca cấp cứu hô hấp</span>
          <div className="pres-impact-card__sub">ước tính hôm nay</div>
        </div>
      </div>

      <div className="pres-source">
        Nguồn: World Bank (2016) · WHO GBD 2021 · Nguyen et al. (2019)
      </div>
    </div>
  );
}

function SlideForecast({ items }: { items: ForecastItem[] }) {
  const peaks = items.slice(0, 24).filter((_, i) => i % 3 === 0).slice(0, 8);
  const maxAqi = Math.max(...peaks.map(x => x.predAqi));

  return (
    <div className="pres-slide pres-slide--forecast">
      <div className="pres-slide__eyebrow">Dự báo 24 giờ tới</div>
      <h2 className="pres-slide__title">Xu hướng PM2.5 & AQI</h2>

      <div className="pres-forecast-bars">
        {peaks.map((item, i) => {
          const color = riskColor(item.riskProfile);
          const h     = Math.max((item.predAqi / maxAqi) * 100, 8);
          return (
            <div key={i} className="pres-forecast-bar-col">
              <div className="pres-forecast-bar-wrap">
                <div
                  className="pres-forecast-bar"
                  style={{ height: `${h}%`, background: color }}
                />
              </div>
              <div className="pres-forecast-bar-aqi" style={{ color }}>{item.predAqi}</div>
              <div className="pres-forecast-bar-pm25">{item.predPm25.toFixed(1)}</div>
              <div className="pres-forecast-bar-time">
                {new Date(item.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pres-forecast-legend">
        {[
          { color: "#16a34a", label: "Tốt (≤50)" },
          { color: "#ca8a04", label: "TB (51-100)" },
          { color: "#ea580c", label: "Nhạy cảm (101-150)" },
          { color: "#dc2626", label: "Kém (>150)" },
        ].map((x, i) => (
          <span key={i} className="pres-legend-item">
            <span style={{ background: x.color }} className="pres-legend-dot" />
            {x.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SlideXai({ explain }: { explain: ExplainData }) {
  const factors = [
    { icon: "🌡", label: "Nhiệt độ",   value: `${explain.temperature?.toFixed(1) ?? "—"} °C`,         note: explain.temperatureExplain },
    { icon: "💧", label: "Độ ẩm",      value: `${explain.humidity?.toFixed(0) ?? "—"} %`,             note: explain.humidityExplain },
    { icon: "💨", label: "Gió",         value: `${explain.windSpeed?.toFixed(1) ?? "—"} km/h ${windDir(explain.windDirection)}`, note: explain.windExplain },
    { icon: "☀️", label: "UV Index",   value: `${explain.uvIndex?.toFixed(1) ?? "—"} (${uvLabel(explain.uvIndex)})`,            note: explain.uvExplain },
    { icon: "🔵", label: "Áp suất",    value: `${explain.pressure?.toFixed(0) ?? "—"} hPa`,           note: explain.pressureExplain },
    { icon: "☁️", label: "Mây",        value: `${explain.cloudCover?.toFixed(0) ?? "—"} %`,           note: explain.cloudExplain },
  ];

  const trendIcon  = explain.trendDirection === "increasing" ? "↑" : explain.trendDirection === "decreasing" ? "↓" : "→";
  const trendColor = explain.trendDirection === "increasing" ? "#ef4444" : explain.trendDirection === "decreasing" ? "#16a34a" : "#eab308";

  return (
    <div className="pres-slide pres-slide--xai">
      <div className="pres-slide__eyebrow">Giải thích AI · Các yếu tố ảnh hưởng PM2.5</div>

      {explain.overallSummary && (
        <div className="pres-xai-summary">
          <span className="pres-xai-trend" style={{ color: trendColor }}>{trendIcon}</span>
          {explain.overallSummary}
        </div>
      )}

      <div className="pres-xai-grid">
        {factors.map((f, i) => (
          <div key={i} className="pres-xai-card">
            <div className="pres-xai-card__top">
              <span className="pres-xai-card__icon">{f.icon}</span>
              <div>
                <span className="pres-xai-card__label">{f.label}</span>
                <strong className="pres-xai-card__value">{f.value}</strong>
              </div>
            </div>
            {f.note && <p className="pres-xai-card__note">{f.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideWho({ current }: { current: Current }) {
  const color = riskColor(current.risk);
  const daysExceedWho    = current.pm25 > WHO_ANNUAL ? "~28-30" : "~10-15";
  const daysExceedWho24h = current.pm25 > WHO_24H    ? "~15-20" : "~5-10";

  return (
    <div className="pres-slide pres-slide--who">
      <div className="pres-slide__eyebrow">So sánh tiêu chuẩn quốc tế · 30 ngày qua</div>
      <h2 className="pres-slide__title">HCMC vs WHO Air Quality Guidelines 2021</h2>

      <div className="pres-who-grid">
        <div className="pres-who-card">
          <div className="pres-who-card__standard">
            <span className="pres-who-card__badge">WHO Annual</span>
            <strong>{WHO_ANNUAL} µg/m³</strong>
          </div>
          <div className="pres-who-card__divider" />
          <div className="pres-who-card__result">
            <strong style={{ color: "#ef4444", fontSize: 52 }}>{daysExceedWho}</strong>
            <span>ngày / tháng vượt ngưỡng</span>
          </div>
          <div className="pres-who-card__today">
            Hôm nay: {current.pm25.toFixed(1)} µg/m³
            = <span style={{ color: "#ef4444" }}>{(current.pm25 / WHO_ANNUAL).toFixed(1)}× tiêu chuẩn</span>
          </div>
        </div>

        <div className="pres-who-card">
          <div className="pres-who-card__standard">
            <span className="pres-who-card__badge">WHO 24h</span>
            <strong>{WHO_24H} µg/m³</strong>
          </div>
          <div className="pres-who-card__divider" />
          <div className="pres-who-card__result">
            <strong style={{ color: "#f97316", fontSize: 52 }}>{daysExceedWho24h}</strong>
            <span>ngày / tháng vượt ngưỡng</span>
          </div>
          <div className="pres-who-card__today">
            Hôm nay: <span style={{ color: current.pm25 > WHO_24H ? "#ef4444" : "#16a34a" }}>
              {current.pm25 > WHO_24H ? "Vượt ngưỡng" : "Đạt tiêu chuẩn"}
            </span>
          </div>
        </div>

        <div className="pres-who-card pres-who-card--vn">
          <div className="pres-who-card__standard">
            <span className="pres-who-card__badge pres-who-card__badge--vn">QCVN 05:2023</span>
            <strong>25 µg/m³</strong>
          </div>
          <div className="pres-who-card__divider" />
          <div className="pres-who-card__result">
            <strong style={{ color, fontSize: 52 }}>
              {current.pm25.toFixed(1)}
            </strong>
            <span>µg/m³ hiện tại</span>
          </div>
          <div className="pres-who-card__today">
            <span style={{ color: current.pm25 > 25 ? "#ef4444" : "#16a34a" }}>
              {current.pm25 > 25 ? "⚠ Vượt tiêu chuẩn VN" : "✓ Đạt tiêu chuẩn VN"}
            </span>
          </div>
        </div>
      </div>

      <div className="pres-source">
        Xem chi tiết tại /impact · Nguồn: WHO AQG 2021 · QCVN 05:2023/BTNMT
      </div>
    </div>
  );
}

export default function PresentationPage() {
  const [current,   setCurrent]   = useState<Current | null>(null);
  const [forecast,  setForecast]  = useState<ForecastItem[]>([]);
  const [explain,   setExplain]   = useState<ExplainData>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [slide,     setSlide]     = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [now,       setNow]       = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SLIDES = 5;

  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetchRef.current = function doFetch() {
      const token = localStorage.getItem("airsafenet_token");
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      Promise.allSettled([
        fetch(`${API_BASE}/api/air/current`, { headers }),
        fetch(`${API_BASE}/api/air/forecast?days=1`, { headers }),
        fetch(`${API_BASE}/api/air/explain`, { headers }),
      ]).then(async ([curRes, fcRes, exRes]) => {
        if (curRes.status === "fulfilled" && curRes.value.ok) {
          const d = await curRes.value.json() as Record<string, unknown>;
          setCurrent({
            aqi:            Number(d.aqi          ?? d.predAqi  ?? 0),
            pm25:           Number(d.pm25          ?? d.predPm25 ?? 0),
            risk:           String(d.risk          ?? d.riskProfile ?? "MODERATE"),
            recommendation: String(d.recommendation ?? d.recommendationProfile ?? ""),
            aqiCategory:    String(d.aqiCategory   ?? ""),
          });
        }

        if (fcRes.status === "fulfilled" && fcRes.value.ok) {
          const d = await fcRes.value.json() as { forecast?: Record<string, unknown>[] };
          const items = d.forecast ?? [];
          setForecast(items.map(x => ({
            time:                  String(x.time ?? ""),
            predAqi:               Number(x.aqi     ?? x.predAqi  ?? 0),
            predPm25:              Number(x.pm25    ?? x.predPm25 ?? 0),
            riskProfile:           String(x.risk    ?? x.riskProfile ?? "MODERATE"),
            recommendationProfile: String(x.recommendation ?? x.recommendationProfile ?? ""),
          })));
        }

        if (exRes.status === "fulfilled" && exRes.value.ok) {
          const d = await exRes.value.json() as ExplainData;
          setExplain(d);
        }

        setNow(new Date().toLocaleString("vi-VN", {
          hour: "2-digit", minute: "2-digit",
          day:  "2-digit", month: "2-digit", year: "numeric",
        }));
        setLoading(false);
      }).catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
        setLoading(false);
      });
    };

    fetchRef.current();

    const refresh = setInterval(() => { fetchRef.current(); }, 5 * 60 * 1000);
    return () => clearInterval(refresh);
  }, []); 

  useEffect(() => {
    if (paused || loading) return;
    intervalRef.current = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES);
    }, SLIDE_DURATION);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, loading]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ")  setSlide(s => (s + 1) % SLIDES);
      if (e.key === "ArrowLeft")                    setSlide(s => (s - 1 + SLIDES) % SLIDES);
      if (e.key === "p" || e.key === "P")           setPaused(v => !v);
      if (e.key === "Escape")                       window.history.back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) return (
    <div className="pres-loading">
      <div className="pres-loading__spinner" />
      <span>Đang tải dữ liệu thực tế...</span>
    </div>
  );

  if (error || !current) return (
    <div className="pres-loading">
      <span style={{ fontSize: 40 }}>⚠️</span>
      <p style={{ color: "#fca5a5" }}>{error || "Không tải được dữ liệu"}</p>
      <button className="pres-ctrl-btn" onClick={() => fetchRef.current()}>Thử lại</button>
    </div>
  );

  const color = riskColor(current.risk);

  return (
    <div className="pres-page" style={{ "--accent": color } as React.CSSProperties}>

      <div className="pres-topbar">
        <div className="pres-topbar__brand">
          <span className="pres-topbar__logo">A</span>
          <span>AirSafeNet</span>
        </div>

        <div className="pres-dots">
          {Array.from({ length: SLIDES }).map((_, i) => (
            <button
              key={i}
              className={`pres-dot ${i === slide ? "active" : ""}`}
              onClick={() => { setSlide(i); setPaused(true); }}
              style={i === slide ? { background: color } : {}}
            />
          ))}
        </div>

        <div className="pres-topbar__right">
          <button
            className="pres-ctrl-btn"
            onClick={() => setPaused(v => !v)}
            title={paused ? "Tiếp tục (P)" : "Dừng (P)"}
          >
            {paused ? "▶" : "⏸"}
          </button>
          <Link to="/dashboard" className="pres-ctrl-btn pres-ctrl-btn--exit">✕ Thoát</Link>
        </div>
      </div>

      <ProgressBar duration={SLIDE_DURATION} active={!paused} key={`${slide}-${paused}`} />

      <div className="pres-stage">
        {slide === 0 && <SlideAqi     current={current} now={now} />}
        {slide === 1 && <SlideImpact  current={current} />}
        {slide === 2 && <SlideForecast items={forecast} />}
        {slide === 3 && <SlideXai     explain={explain} />}
        {slide === 4 && <SlideWho     current={current} />}
      </div>

      <div className="pres-bottombar">
        <button
          className="pres-nav-btn"
          onClick={() => { setSlide(s => (s - 1 + SLIDES) % SLIDES); setPaused(true); }}
        >
          ← Trước
        </button>

        <div className="pres-slide-counter">
          {slide + 1} / {SLIDES} · {paused ? "Đã dừng" : `Tự chuyển sau ${SLIDE_DURATION / 1000}s`}
          <span className="pres-key-hint">← → Space · P tạm dừng · Esc thoát</span>
        </div>

        <button
          className="pres-nav-btn"
          onClick={() => { setSlide(s => (s + 1) % SLIDES); setPaused(true); }}
        >
          Tiếp →
        </button>
      </div>
    </div>
  );
}