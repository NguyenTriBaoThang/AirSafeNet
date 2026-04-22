import { useEffect, useRef, useState } from "react";

// ══════════════════════════════════════════════════════════════════════════════
//  22 QUẬN/HUYỆN TP.HCM — khớp với districts.py
// ══════════════════════════════════════════════════════════════════════════════
const STATIONS = [
  { id: "q1",   name: "Quận 1",     lat: 10.7769, lon: 106.7009, area: "Trung tâm"   },
  { id: "q3",   name: "Quận 3",     lat: 10.7849, lon: 106.6898, area: "Trung tâm"   },
  { id: "q4",   name: "Quận 4",     lat: 10.7580, lon: 106.7047, area: "Nam TT"      },
  { id: "q5",   name: "Quận 5",     lat: 10.7537, lon: 106.6600, area: "Tây TT"      },
  { id: "q6",   name: "Quận 6",     lat: 10.7485, lon: 106.6328, area: "Tây"         },
  { id: "q8",   name: "Quận 8",     lat: 10.7236, lon: 106.6333, area: "Tây Nam"     },
  { id: "q10",  name: "Quận 10",    lat: 10.7746, lon: 106.6676, area: "Trung tâm"   },
  { id: "q11",  name: "Quận 11",    lat: 10.7631, lon: 106.6519, area: "Tây TT"      },
  { id: "q_pn", name: "Phú Nhuận",  lat: 10.7986, lon: 106.6800, area: "Bắc TT"     },
  { id: "q_bt", name: "Bình Thạnh", lat: 10.8127, lon: 106.7081, area: "Đông Bắc TT"},
  { id: "q7",   name: "Quận 7",     lat: 10.7322, lon: 106.7224, area: "Nam"         },
  { id: "q9",   name: "Quận 9",     lat: 10.8420, lon: 106.7864, area: "Đông"        },
  { id: "q12",  name: "Quận 12",    lat: 10.8631, lon: 106.6476, area: "Bắc"         },
  { id: "q_gv", name: "Gò Vấp",     lat: 10.8384, lon: 106.6651, area: "Bắc TT"     },
  { id: "q_tb", name: "Tân Bình",   lat: 10.8015, lon: 106.6517, area: "Tây Bắc TT" },
  { id: "q_tp", name: "Tân Phú",    lat: 10.7893, lon: 106.6286, area: "Tây"         },
  { id: "q_btn",name: "Bình Tân",   lat: 10.7657, lon: 106.6017, area: "Tây"         },
  { id: "q_td", name: "Thủ Đức",    lat: 10.8561, lon: 106.7729, area: "Đông"        },
  { id: "h_bc", name: "Bình Chánh", lat: 10.6866, lon: 106.5673, area: "Tây Nam"     },
  { id: "h_hm", name: "Hóc Môn",    lat: 10.8911, lon: 106.5965, area: "Tây Bắc"    },
  { id: "h_nb", name: "Nhà Bè",     lat: 10.6928, lon: 106.7374, area: "Nam"         },
  { id: "h_cc", name: "Củ Chi",     lat: 11.0128, lon: 106.4938, area: "Bắc"         },
  { id: "h_cn", name: "Cần Giờ",    lat: 10.4100, lon: 106.9600, area: "Nam biển"    },
] as const;

// ══════════════════════════════════════════════════════════════════════════════
//  PIXEL MAP — viewBox 0 0 520 660 — phủ toàn HCMC kể cả Cần Giờ
// ══════════════════════════════════════════════════════════════════════════════
const STATION_PIXELS: Record<string, { x: number; y: number }> = {
  // Nội thành
  q1:    { x: 305, y: 295 }, q3:    { x: 280, y: 275 },
  q4:    { x: 300, y: 335 }, q5:    { x: 265, y: 320 },
  q6:    { x: 235, y: 335 }, q8:    { x: 225, y: 370 },
  q10:   { x: 270, y: 285 }, q11:   { x: 248, y: 305 },
  q_pn:  { x: 278, y: 255 }, q_bt:  { x: 315, y: 240 },
  q7:    { x: 316, y: 370 }, q9:    { x: 368, y: 225 },
  q12:   { x: 253, y: 195 }, q_gv:  { x: 255, y: 225 },
  q_tb:  { x: 248, y: 255 }, q_tp:  { x: 218, y: 268 },
  q_btn: { x: 190, y: 308 }, q_td:  { x: 368, y: 205 },
  // Ngoại thành
  h_bc:  { x: 165, y: 395 }, h_hm:  { x: 168, y: 168 },
  h_nb:  { x: 315, y: 430 }, h_cc:  { x: 138, y:  95 },
  h_cn:  { x: 365, y: 570 },
};

type StationData = {
  id:          string;
  name:        string;
  area:        string;
  lat:         number;
  lon:         number;
  pm25:        number;
  temperature: number;
  humidity:    number;
  windSpeed:   number;
  uvIndex:     number;
  aqi:         number;
  risk:        string;
  population?: number;
  loading:     boolean;
  error:       boolean;
};

type DistrictApiItem = {
  id: string; name: string; area: string;
  lat: number; lon: number; population: number;
  pred_pm25: number; pred_aqi: number;
  aqi_category: string; risk_general: string;
  temperature: number; humidity: number;
  wind_speed: number; uv_index: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";

async function fetchDistrictsFromBackend(): Promise<StationData[]> {
  const token = localStorage.getItem("airsafenet_token");
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(`${API_BASE}/api/air/districts`, { headers });

  if (res.status === 503) {
    throw new Error("503");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json() as { districts?: DistrictApiItem[] };
  const items = json.districts ?? [];

  return items.map(d => ({
    id:          d.id,
    name:        d.name,
    area:        d.area,
    lat:         d.lat,
    lon:         d.lon,
    pm25:        d.pred_pm25,
    aqi:         d.pred_aqi,
    risk:        d.risk_general,
    temperature: d.temperature,
    humidity:    d.humidity,
    windSpeed:   d.wind_speed,
    uvIndex:     d.uv_index,
    population:  d.population,
    loading:     false,
    error:       false,
  }));
}

async function triggerDistrictCompute(): Promise<void> {
  const token = localStorage.getItem("airsafenet_token");
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/air/districts/compute`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch { /* ignore */ }
}

function aqiToRisk(aqi: number): string {
  if (aqi <= 50)  return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY_SENSITIVE";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}

function riskColor(risk: string): string {
  return risk === "GOOD"                ? "#16a34a"
       : risk === "MODERATE"            ? "#ca8a04"
       : risk === "UNHEALTHY_SENSITIVE" ? "#ea580c"
       : risk === "UNHEALTHY"           ? "#dc2626"
       : risk === "VERY_UNHEALTHY"      ? "#7c3aed"
       : "#7f1d1d";
}

function riskViet(risk: string): string {
  return risk === "GOOD"                ? "Tốt"
       : risk === "MODERATE"            ? "Trung bình"
       : risk === "UNHEALTHY_SENSITIVE" ? "Nhạy cảm"
       : risk === "UNHEALTHY"           ? "Không tốt"
       : risk === "VERY_UNHEALTHY"      ? "Rất không tốt"
       : "Nguy hiểm";
}

function HeatBlob({
  x, y, aqi, risk, radius = 90,
}: {
  x: number; y: number; aqi: number; risk: string; radius?: number;
}) {
  const color   = riskColor(risk);
  const opacity = Math.min(0.55, 0.15 + (aqi / 300) * 0.4);
  const id      = `blob-${x}-${y}`;

  return (
    <g>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={color} stopOpacity={opacity} />
          <stop offset="60%"  stopColor={color} stopOpacity={opacity * 0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse
        cx={x} cy={y}
        rx={radius} ry={radius * 0.85}
        fill={`url(#${id})`}
        style={{ filter: "blur(2px)" }}
      />
    </g>
  );
}

function StationPin({
  x, y, station, isActive, onClick,
}: {
  x: number; y: number;
  station: StationData;
  isActive: boolean;
  onClick: React.MouseEventHandler<SVGGElement>;
}) {
  const color = station.loading ? "#64748b"
              : station.error   ? "#475569"
              : riskColor(station.risk);

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      className={`station-pin ${isActive ? "station-pin--active" : ""}`}
    >
      {isActive && (
        <circle cx={x} cy={y} r={22} fill="none"
          stroke={color} strokeWidth={1.5} opacity={0.4}
          className="station-pulse"
        />
      )}
      <circle cx={x} cy={y} r={16} fill={color} opacity={0.15} />
      <circle cx={x} cy={y} r={11}
        fill={color}
        stroke={isActive ? "#fff" : "rgba(255,255,255,0.3)"}
        strokeWidth={isActive ? 2 : 1}
        className="station-pin__dot"
      />
      <text x={x} y={y + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={station.loading ? 0 : 7}
        fontWeight="800"
        fill="#fff"
        style={{ pointerEvents: "none", fontFamily: "ui-monospace, monospace" }}
      >
        {station.loading ? "" : station.aqi > 99 ? "!" : station.aqi}
      </text>
      <text x={x} y={y + 22}
        textAnchor="middle"
        fontSize={9}
        fill={isActive ? "#fff" : "rgba(255,255,255,0.55)"}
        fontWeight={isActive ? "700" : "500"}
        style={{ pointerEvents: "none", fontFamily: "system-ui" }}
      >
        {station.name}
      </text>
    </g>
  );
}

function StationDetail({ station, onClose }: { station: StationData; onClose: () => void }) {
  const color = riskColor(station.risk);
  return (
    <div className="hm-detail" style={{ "--detail-color": color } as React.CSSProperties}>
      <div className="hm-detail__header">
        <div>
          <div className="hm-detail__area">{station.area}</div>
          <h3 className="hm-detail__name">{station.name}</h3>
        </div>
        <button className="hm-detail__close" onClick={onClose}>✕</button>
      </div>

      <div className="hm-detail__aqi-row">
        <div className="hm-detail__aqi-box" style={{ borderColor: color + "50", background: color + "12" }}>
          <span style={{ color }}>AQI</span>
          <strong style={{ color }}>{station.aqi}</strong>
        </div>
        <div className="hm-detail__risk-box">
          <span className="hm-detail__risk-badge" style={{ background: color + "20", color, borderColor: color + "40" }}>
            {riskViet(station.risk)}
          </span>
          <span className="hm-detail__pm25">PM2.5: {station.pm25} µg/m³</span>
        </div>
      </div>

      <div className="hm-detail__weather">
        {[
          { icon: "🌡", label: "Nhiệt độ",  value: `${station.temperature} °C` },
          { icon: "💧", label: "Độ ẩm",     value: `${station.humidity} %` },
          { icon: "💨", label: "Gió",        value: `${station.windSpeed} km/h` },
          { icon: "☀️", label: "UV",         value: `${station.uvIndex}` },
        ].map((w, i) => (
          <div key={i} className="hm-detail__weather-item">
            <span>{w.icon}</span>
            <div>
              <span>{w.label}</span>
              <strong>{w.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="hm-detail__who">
        <span>{(station.pm25 / 5).toFixed(1)}× tiêu chuẩn WHO năm</span>
        <span className="hm-detail__who-bar-bg">
          <span
            className="hm-detail__who-bar-fill"
            style={{ width: `${Math.min(100, (station.pm25 / 50) * 100)}%`, background: color }}
          />
        </span>
      </div>
    </div>
  );
}

function Legend() {
  const levels = [
    { color: "#16a34a", label: "Tốt",       range: "0–50" },
    { color: "#ca8a04", label: "TB",        range: "51–100" },
    { color: "#ea580c", label: "Nhạy cảm", range: "101–150" },
    { color: "#dc2626", label: "Kém",       range: "151–200" },
    { color: "#7c3aed", label: "Rất kém",  range: "201–300" },
    { color: "#7f1d1d", label: "Nguy hiểm", range: "300+" },
  ];
  return (
    <div className="hm-legend">
      {levels.map((l, i) => (
        <div key={i} className="hm-legend-item">
          <span className="hm-legend-dot" style={{ background: l.color }} />
          <span className="hm-legend-range">{l.range}</span>
          <span className="hm-legend-label">{l.label}</span>
        </div>
      ))}
    </div>
  );
}

function RankingList({
  stations, activeId, onSelect,
}: {
  stations: StationData[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...stations]
    .filter(s => !s.loading && !s.error)
    .sort((a, b) => b.aqi - a.aqi);

  return (
    <div className="hm-ranking">
      <div className="hm-ranking__title">Xếp hạng AQI</div>
      {sorted.map((s, i) => {
        const color = riskColor(s.risk);
        return (
          <button
            key={s.id}
            className={`hm-ranking-row ${activeId === s.id ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="hm-ranking-row__rank"
              style={{ color: i === 0 ? "#ef4444" : i === 1 ? "#f97316" : "#64748b" }}>
              {i + 1}
            </span>
            <span className="hm-ranking-row__name">{s.name}</span>
            <span className="hm-ranking-row__aqi" style={{ color }}>{s.aqi}</span>
            <span className="hm-ranking-row__bar-bg">
              <span
                className="hm-ranking-row__bar-fill"
                style={{
                  width: `${Math.min(100, (s.aqi / 200) * 100)}%`,
                  background: color,
                }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function HeatmapPage() {
  const [stations, setStations] = useState<StationData[]>(
    STATIONS.map(s => ({
      ...s,
      pm25: 0, aqi: 0, risk: "MODERATE",
      temperature: 0, humidity: 0, windSpeed: 0, uvIndex: 0,
      loading: true, error: false,
    }))
  );
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [lastUpdated,   setLastUpdated]   = useState<string>("");
  const [globalLoading, setGlobalLoading] = useState(true);
  const [computing,     setComputing]     = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadAll() {
      setGlobalLoading(true);
      try {
        const data = await fetchDistrictsFromBackend();
        setStations(data);
        setLastUpdated(new Date().toLocaleString("vi-VN", {
          hour: "2-digit", minute: "2-digit",
          day:  "2-digit", month: "2-digit",
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "503") {
          setComputing(true);
          await triggerDistrictCompute();
          setTimeout(async () => {
            try {
              const data = await fetchDistrictsFromBackend();
              setStations(data);
              setLastUpdated(new Date().toLocaleString("vi-VN", {
                hour: "2-digit", minute: "2-digit",
                day:  "2-digit", month: "2-digit",
              }));
            } catch { /* ignore retry error */ }
            setComputing(false);
          }, 12_000);
        } else {
          setStations(prev => prev.map(s => ({ ...s, loading: false, error: true })));
        }
      } finally {
        setGlobalLoading(false);
      }
    }

    loadAll();
    refreshRef.current = setInterval(loadAll, 60 * 60 * 1000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, []);

  const activeStation = stations.find(s => s.id === activeId) ?? null;
  const loadedStations = stations.filter(s => !s.loading && !s.error);
  const avgAqi  = loadedStations.length > 0
    ? Math.round(loadedStations.reduce((s, x) => s + x.aqi, 0) / loadedStations.length)
    : 0;
  const maxStation = loadedStations.reduce((a, b) => a.aqi > b.aqi ? a : b, loadedStations[0]);
  const minStation = loadedStations.reduce((a, b) => a.aqi < b.aqi ? a : b, loadedStations[0]);

  return (
    <div className="hm-page">

      <div className="hm-header">
        <div className="hm-header__left">
          <div className="hm-header__eyebrow">🗺 Bản đồ nhiệt · Dự báo từ mô hình AI</div>
          <h2 className="hm-header__title">Chất lượng không khí TP.HCM — 22 quận/huyện</h2>
          <p className="hm-header__sub">
            {computing
              ? "⏳ Đang tính toán lần đầu (~10s)..."
              : `Model AI · district_cache.csv · Cập nhật ${lastUpdated || "..."}`}
          </p>
        </div>

        {!globalLoading && loadedStations.length > 0 && (
          <div className="hm-header__stats">
            <div className="hm-header__stat">
              <span>TB toàn thành</span>
              <strong style={{ color: riskColor(aqiToRisk(avgAqi)) }}>{avgAqi}</strong>
            </div>
            {maxStation && (
              <div className="hm-header__stat">
                <span>Cao nhất</span>
                <strong style={{ color: riskColor(maxStation.risk) }}>
                  {maxStation.name} {maxStation.aqi}
                </strong>
              </div>
            )}
            {minStation && (
              <div className="hm-header__stat">
                <span>Tốt nhất</span>
                <strong style={{ color: riskColor(minStation.risk) }}>
                  {minStation.name} {minStation.aqi}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hm-layout">

        <div className="hm-map-wrap">
          <svg
            viewBox="0 0 520 660"
            className="hm-map-svg"
            onClick={() => setActiveId(null)}
          >
            <rect x={0} y={0} width={500} height={580}
              rx={16} fill="#0a1628" />

            <polygon
              points="138,60 215,38 295,48 365,78 425,138 445,218 428,312 395,382 362,452 330,510 290,548 258,570 215,568 162,540 118,498 90,428 72,348 68,268 80,188 105,120 125,82"
              fill="rgba(37,99,235,0.06)"
              stroke="rgba(37,99,235,0.2)"
              strokeWidth={1.5}
            />
            <polygon
              points="318,510 345,530 368,560 378,600 360,630 335,640 308,628 292,600 295,568 310,545"
              fill="rgba(6,182,212,0.05)"
              stroke="rgba(6,182,212,0.15)"
              strokeWidth={1}
            />

            <line x1={230} y1={200} x2={320} y2={200} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <line x1={180} y1={280} x2={380} y2={280} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <line x1={230} y1={200} x2={230} y2={420} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <line x1={320} y1={200} x2={320} y2={420} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

            <path
              d="M 370 80 Q 380 180 360 280 Q 340 360 330 440"
              fill="none"
              stroke="rgba(6,182,212,0.18)"
              strokeWidth={8}
              strokeLinecap="round"
            />
            <text x={378} y={200} fontSize={8} fill="rgba(6,182,212,0.4)"
              transform="rotate(15 378 200)" style={{ fontFamily: "system-ui" }}>
              Sông Sài Gòn
            </text>

            {stations.filter(s => !s.loading && !s.error).map(s => {
              const px = STATION_PIXELS[s.id];
              if (!px) return null;
              return (
                <HeatBlob
                  key={s.id}
                  x={px.x} y={px.y}
                  aqi={s.aqi}
                  risk={s.risk}
                  radius={s.id === "cu_chi" || s.id === "binh_chanh" ? 110 : 85}
                />
              );
            })}

            {stations.map(s => {
              const px = STATION_PIXELS[s.id];
              if (!px) return null;
              return (
                <StationPin
                  key={s.id}
                  x={px.x} y={px.y}
                  station={s}
                  isActive={activeId === s.id}
                  onClick={e => {
                    e.stopPropagation();
                    setActiveId(prev => prev === s.id ? null : s.id);
                  }}
                />
              );
            })}

            <g transform="translate(460,50)">
              <circle cx={0} cy={0} r={16} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
              <text x={0} y={-6} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.5)" fontWeight="700">N</text>
              <line x1={0} y1={-3} x2={0} y2={3} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            </g>

            <g transform="translate(30,555)">
              <line x1={0} y1={0} x2={40} y2={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeLinecap="round" />
              <line x1={0} y1={-3} x2={0}  y2={3} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
              <line x1={40} y1={-3} x2={40} y2={3} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
              <text x={20} y={-5} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.35)">~10 km</text>
            </g>
          </svg>

          <Legend />

          {globalLoading && (
            <div className="hm-map-loading">
              <div className="hm-map-loading__spinner" />
              <span>Đang lấy dữ liệu 10 điểm đo...</span>
            </div>
          )}
        </div>

        <div className="hm-sidebar">
          {activeStation && !activeStation.loading ? (
            <StationDetail
              station={activeStation}
              onClose={() => setActiveId(null)}
            />
          ) : (
            <div className="hm-sidebar__placeholder">
              <span>👆</span>
              <p>Nhấn vào điểm đo trên bản đồ để xem chi tiết</p>
            </div>
          )}

          <RankingList
            stations={stations}
            activeId={activeId}
            onSelect={id => setActiveId(prev => prev === id ? null : id)}
          />
        </div>
      </div>
    </div>
  );
}