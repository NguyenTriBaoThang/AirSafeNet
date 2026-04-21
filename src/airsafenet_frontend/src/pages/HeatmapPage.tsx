import { useEffect, useRef, useState } from "react";

const STATIONS = [
  { id: "q1",       name: "Quận 1",          lat: 10.7769, lon: 106.7009, area: "Trung tâm" },
  { id: "q3",       name: "Quận 3",          lat: 10.7850, lon: 106.6889, area: "Trung tâm" },
  { id: "q7",       name: "Quận 7",          lat: 10.7322, lon: 106.7224, area: "Nam" },
  { id: "binh_tan", name: "Bình Tân",        lat: 10.7657, lon: 106.6017, area: "Tây" },
  { id: "go_vap",   name: "Gò Vấp",          lat: 10.8384, lon: 106.6651, area: "Bắc" },
  { id: "thu_duc",  name: "Thủ Đức",         lat: 10.8561, lon: 106.7729, area: "Đông" },
  { id: "binh_chanh", name: "Bình Chánh",   lat: 10.6866, lon: 106.5673, area: "Tây Nam" },
  { id: "hoc_mon",  name: "Hóc Môn",         lat: 10.8911, lon: 106.5965, area: "Tây Bắc" },
  { id: "nha_be",   name: "Nhà Bè",          lat: 10.6928, lon: 106.7374, area: "Nam" },
  { id: "cu_chi",   name: "Củ Chi",          lat: 11.0128, lon: 106.4938, area: "Bắc" },
] as const;

const STATION_PIXELS: Record<string, { x: number; y: number }> = {
  q1:         { x: 290, y: 300 },
  q3:         { x: 265, y: 275 },
  q7:         { x: 305, y: 370 },
  binh_tan:   { x: 170, y: 295 },
  go_vap:     { x: 240, y: 215 },
  thu_duc:    { x: 355, y: 205 },
  binh_chanh: { x: 145, y: 395 },
  hoc_mon:    { x: 155, y: 165 },
  nha_be:     { x: 305, y: 430 },
  cu_chi:     { x: 130, y:  90 },
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
  loading:     boolean;
  error:       boolean;
};

function pm25ToAqi(pm: number): number {
  if (pm <=  12.0) return Math.round((50  / 12.0)  * pm);
  if (pm <=  35.4) return Math.round(50  + (50  / 23.4)  * (pm - 12.0));
  if (pm <=  55.4) return Math.round(100 + (50  / 19.9)  * (pm - 35.4));
  if (pm <= 150.4) return Math.round(150 + (50  / 94.9)  * (pm - 55.4));
  if (pm <= 250.4) return Math.round(200 + (100 / 99.9)  * (pm - 150.4));
  return Math.min(500, Math.round(300 + (200 / 149.9) * (pm - 250.4)));
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

async function fetchStation(
  id: string, lat: number, lon: number
): Promise<Partial<StationData>> {
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality`
    + `?latitude=${lat}&longitude=${lon}`
    + `&current=pm2_5,us_aqi`
    + `&timezone=Asia%2FBangkok`;

  const wxUrl = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index`
    + `&timezone=Asia%2FBangkok&wind_speed_unit=kmh`;

  const [aqRes, wxRes] = await Promise.all([
    fetch(aqUrl, { signal: AbortSignal.timeout(10_000) }),
    fetch(wxUrl, { signal: AbortSignal.timeout(10_000) }),
  ]);

  if (!aqRes.ok || !wxRes.ok) throw new Error(`HTTP ${aqRes.status}/${wxRes.status}`);

  const aq = await aqRes.json() as {
    current?: { pm2_5?: number; us_aqi?: number };
  };
  const wx = await wxRes.json() as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
      uv_index?: number;
    };
  };

  const pm25 = aq.current?.pm2_5 ?? 0;
  const aqi  = aq.current?.us_aqi ?? pm25ToAqi(pm25);

  return {
    id,
    pm25:        Math.round(pm25 * 10) / 10,
    aqi:         Math.round(aqi),
    risk:        aqiToRisk(aqi),
    temperature: Math.round((wx.current?.temperature_2m ?? 0) * 10) / 10,
    humidity:    Math.round(wx.current?.relative_humidity_2m ?? 0),
    windSpeed:   Math.round((wx.current?.wind_speed_10m ?? 0) * 10) / 10,
    uvIndex:     Math.round((wx.current?.uv_index ?? 0) * 10) / 10,
  };
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
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [globalLoading, setGlobalLoading] = useState(true);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadAll() {
      setGlobalLoading(true);

      const results = await Promise.allSettled(
        STATIONS.map(s => fetchStation(s.id, s.lat, s.lon))
      );

      setStations(prev => prev.map((station, i) => {
        const result = results[i];
        if (result.status === "fulfilled") {
          return { ...station, ...result.value, loading: false, error: false };
        }
        return { ...station, loading: false, error: true };
      }));

      setLastUpdated(new Date().toLocaleString("vi-VN", {
        hour: "2-digit", minute: "2-digit",
        day: "2-digit",  month: "2-digit",
      }));
      setGlobalLoading(false);
    }

    loadAll();

    refreshRef.current = setInterval(loadAll, 15 * 60 * 1000);
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
          <div className="hm-header__eyebrow">🗺 Bản đồ nhiệt</div>
          <h2 className="hm-header__title">Chất lượng không khí TP.HCM</h2>
          <p className="hm-header__sub">
            10 điểm đo · Open-Meteo Air Quality API · Cập nhật {lastUpdated || "..."}
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
            viewBox="0 0 500 580"
            className="hm-map-svg"
            onClick={() => setActiveId(null)}
          >
            <rect x={0} y={0} width={500} height={580}
              rx={16} fill="#0a1628" />

            <polygon
              points="130,60 210,40 290,50 360,80 420,140 440,220 420,310 390,380 360,450 310,500 260,530 210,520 160,490 120,440 90,380 75,300 80,220 100,150 120,90"
              fill="rgba(37,99,235,0.06)"
              stroke="rgba(37,99,235,0.2)"
              strokeWidth={1.5}
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