import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEventHandler } from "react";
import { HCMC_DISTRICT_BOUNDARIES, HCMC_DISTRICT_BOUNDARY_SOURCE } from "../data/hcmcDistrictBoundaries";
import type { DistrictBoundary, DistrictBoundaryGeometry } from "../data/hcmcDistrictBoundaries";

const STATIONS = [
  { id: "q1", name: "Quận 1", lat: 10.7769, lon: 106.7009, area: "Trung tâm" },
  { id: "q3", name: "Quận 3", lat: 10.7849, lon: 106.6898, area: "Trung tâm" },
  { id: "q4", name: "Quận 4", lat: 10.758, lon: 106.7047, area: "Nam trung tâm" },
  { id: "q5", name: "Quận 5", lat: 10.7537, lon: 106.66, area: "Tây trung tâm" },
  { id: "q6", name: "Quận 6", lat: 10.7485, lon: 106.6328, area: "Tây" },
  { id: "q8", name: "Quận 8", lat: 10.7236, lon: 106.6333, area: "Tây Nam" },
  { id: "q10", name: "Quận 10", lat: 10.7746, lon: 106.6676, area: "Trung tâm" },
  { id: "q11", name: "Quận 11", lat: 10.7631, lon: 106.6519, area: "Tây trung tâm" },
  { id: "q_pn", name: "Phú Nhuận", lat: 10.7986, lon: 106.68, area: "Bắc trung tâm" },
  { id: "q_bt", name: "Bình Thạnh", lat: 10.8127, lon: 106.7081, area: "Đông Bắc trung tâm" },
  { id: "q7", name: "Quận 7", lat: 10.7322, lon: 106.7224, area: "Nam" },
  { id: "q9", name: "Quận 9", lat: 10.842, lon: 106.7864, area: "Đông" },
  { id: "q12", name: "Quận 12", lat: 10.8631, lon: 106.6476, area: "Bắc" },
  { id: "q_gv", name: "Gò Vấp", lat: 10.8384, lon: 106.6651, area: "Bắc trung tâm" },
  { id: "q_tb", name: "Tân Bình", lat: 10.8015, lon: 106.6517, area: "Tây Bắc trung tâm" },
  { id: "q_tp", name: "Tân Phú", lat: 10.7893, lon: 106.6286, area: "Tây" },
  { id: "q_btn", name: "Bình Tân", lat: 10.7657, lon: 106.6017, area: "Tây" },
  { id: "q_td", name: "Thủ Đức", lat: 10.8561, lon: 106.7729, area: "Đông" },
  { id: "h_bc", name: "Bình Chánh", lat: 10.6866, lon: 106.5673, area: "Tây Nam" },
  { id: "h_hm", name: "Hóc Môn", lat: 10.8911, lon: 106.5965, area: "Tây Bắc" },
  { id: "h_nb", name: "Nhà Bè", lat: 10.6928, lon: 106.7374, area: "Nam" },
  { id: "h_cc", name: "Củ Chi", lat: 11.0128, lon: 106.4938, area: "Bắc" },
  { id: "h_cn", name: "Cần Giờ", lat: 10.41, lon: 106.96, area: "Nam biển" },
] as const;

type StationSeed = (typeof STATIONS)[number];
type StationData = StationSeed & {
  pm25: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  aqi: number;
  risk: string;
  population?: number;
  loading: boolean;
  error: boolean;
};

type DistrictApiItem = {
  id: string;
  pred_pm25: number;
  pred_aqi: number;
  risk_general: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  uv_index: number;
  population: number;
};

type MapProjection = {
  minX: number;
  maxX: number;
  maxLat: number;
  lonScale: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const MAP_WIDTH = 620;
const MAP_HEIGHT = 760;
const MAP_PADDING = 26;
const stationSeeds = new Map<string, StationSeed>(STATIONS.map((station) => [station.id, station]));
const number0 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function fmt(value: number, digits: 0 | 1 = 0): string {
  return (digits === 0 ? number0 : number1).format(value);
}

function seedToStation(seed: StationSeed, loading = true, error = false): StationData {
  return {
    ...seed,
    pm25: 0,
    aqi: 0,
    risk: "MODERATE",
    temperature: 0,
    humidity: 0,
    windSpeed: 0,
    uvIndex: 0,
    loading,
    error,
  };
}

function normalizeDistrictItems(items: DistrictApiItem[]): StationData[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return STATIONS.map((seed) => {
    const item = byId.get(seed.id);
    if (!item) return seedToStation(seed, false, true);
    const aqi = Math.round(item.pred_aqi ?? 0);
    return {
      ...seed,
      pm25: Number((item.pred_pm25 ?? 0).toFixed(1)),
      aqi,
      risk: item.risk_general || aqiToRisk(aqi),
      temperature: Number((item.temperature ?? 0).toFixed(1)),
      humidity: Math.round(item.humidity ?? 0),
      windSpeed: Number((item.wind_speed ?? 0).toFixed(1)),
      uvIndex: Number((item.uv_index ?? 0).toFixed(1)),
      population: item.population,
      loading: false,
      error: false,
    };
  });
}

async function fetchDistrictsFromBackend(): Promise<StationData[]> {
  const token = localStorage.getItem("airsafenet_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/api/air/districts`, { headers });
  if (res.status === 503) throw new Error("503");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { districts?: DistrictApiItem[] };
  return normalizeDistrictItems(json.districts ?? []);
}

async function triggerDistrictCompute(): Promise<void> {
  const token = localStorage.getItem("airsafenet_token");
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/air/districts/compute`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Warm-up is opportunistic; retry logic handles the visible state.
  }
}

function aqiToRisk(aqi: number): string {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY_SENSITIVE";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}

function riskColor(risk: string): string {
  if (risk === "GOOD") return "#16a34a";
  if (risk === "MODERATE") return "#ca8a04";
  if (risk === "UNHEALTHY_SENSITIVE") return "#ea580c";
  if (risk === "UNHEALTHY") return "#dc2626";
  if (risk === "VERY_UNHEALTHY") return "#7c3aed";
  return "#7f1d1d";
}

function riskViet(risk: string): string {
  if (risk === "GOOD") return "Tốt";
  if (risk === "MODERATE") return "Trung bình";
  if (risk === "UNHEALTHY_SENSITIVE") return "Nhạy cảm";
  if (risk === "UNHEALTHY") return "Không tốt";
  if (risk === "VERY_UNHEALTHY") return "Rất không tốt";
  return "Nguy hiểm";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function outdoorScore(station: StationData): number {
  const aqiPenalty = Math.min(70, station.aqi * 0.38);
  const pm25Penalty = Math.min(14, Math.max(0, station.pm25 - 12) * 0.34);
  const uvPenalty = Math.min(12, station.uvIndex * 1.7);
  const heatPenalty = station.temperature > 32 ? (station.temperature - 32) * 2.8 : 0;
  const humidityPenalty = station.humidity > 76 ? (station.humidity - 76) * 0.22 : 0;
  const windAdjustment = station.windSpeed >= 5 && station.windSpeed <= 18 ? -4 : station.windSpeed < 2 ? 4 : 0;
  return clamp(Math.round(100 - aqiPenalty - pm25Penalty - uvPenalty - heatPenalty - humidityPenalty - windAdjustment), 0, 100);
}

function outdoorLabel(score: number): string {
  if (score >= 80) return "Rất phù hợp";
  if (score >= 65) return "Phù hợp";
  if (score >= 50) return "Cân nhắc";
  if (score >= 35) return "Nên rút ngắn";
  return "Nên tránh";
}

function outdoorAdvice(station: StationData): string {
  if (station.aqi > 150) return "Ưu tiên hoạt động trong nhà; nếu bắt buộc ra ngoài nên rút ngắn thời lượng và dùng khẩu trang lọc bụi.";
  if (station.aqi > 100) return "Người nhạy cảm nên giảm cường độ, tránh chạy hoặc đá bóng lâu và theo dõi triệu chứng hô hấp.";
  if (station.uvIndex >= 8) return "Không khí tạm ổn hơn, nhưng UV cao: chọn bóng râm, đội mũ và tránh nắng giữa trưa.";
  if (station.windSpeed < 2 && station.pm25 > 25) return "Gió yếu làm bụi lưu lại lâu; nên chọn khu thoáng hơn hoặc dời sang lúc gió tốt hơn.";
  return "Có thể chọn hoạt động ngoài trời mức nhẹ đến vừa, vẫn nên theo dõi AQI trước khi đi.";
}

function getGeometryPolygons(geometry: DistrictBoundaryGeometry): number[][][][] {
  return geometry.type === "Polygon" ? [geometry.coordinates as number[][][]] : (geometry.coordinates as number[][][][]);
}

function forEachCoordinate(geometry: DistrictBoundaryGeometry, callback: (coord: number[]) => void): void {
  for (const polygon of getGeometryPolygons(geometry)) {
    for (const ring of polygon) {
      for (const coord of ring) callback(coord);
    }
  }
}

function createProjection(boundaries: DistrictBoundary[]): MapProjection {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const boundary of boundaries) {
    forEachCoordinate(boundary.geometry, ([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
  }
  const lonScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const minX = minLon * lonScale;
  const maxX = maxLon * lonScale;
  const scale = Math.min((MAP_WIDTH - MAP_PADDING * 2) / (maxX - minX), (MAP_HEIGHT - MAP_PADDING * 2) / (maxLat - minLat));
  return {
    minX,
    maxX,
    maxLat,
    lonScale,
    scale,
    offsetX: (MAP_WIDTH - (maxX - minX) * scale) / 2,
    offsetY: (MAP_HEIGHT - (maxLat - minLat) * scale) / 2,
  };
}

const MAP_PROJECTION = createProjection(HCMC_DISTRICT_BOUNDARIES);

function project(lon: number, lat: number): { x: number; y: number } {
  const worldX = lon * MAP_PROJECTION.lonScale;
  return {
    x: MAP_PROJECTION.offsetX + (worldX - MAP_PROJECTION.minX) * MAP_PROJECTION.scale,
    y: MAP_PROJECTION.offsetY + (MAP_PROJECTION.maxLat - lat) * MAP_PROJECTION.scale,
  };
}

function geometryToPath(geometry: DistrictBoundaryGeometry): string {
  const paths: string[] = [];
  for (const polygon of getGeometryPolygons(geometry)) {
    for (const ring of polygon) {
      const commands = ring.map(([lon, lat], index) => {
        const p = project(lon, lat);
        return `${index === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      });
      paths.push(`${commands.join(" ")} Z`);
    }
  }
  return paths.join(" ");
}
function StationPin({
  x,
  y,
  station,
  isActive,
  isCompared,
  onClick,
}: {
  x: number;
  y: number;
  station: StationData;
  isActive: boolean;
  isCompared: boolean;
  onClick: MouseEventHandler<SVGGElement>;
}) {
  const color = station.loading ? "#64748b" : station.error ? "#475569" : riskColor(station.risk);
  const shortName = station.name.replace("Quận ", "Q.").replace("Bình ", "B. ").replace("Tân ", "T. ");
  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      className={`station-pin ${isActive ? "station-pin--active" : ""} ${isCompared ? "station-pin--compared" : ""}`}
    >
      {(isActive || isCompared) && (
        <circle
          cx={x}
          cy={y}
          r={20}
          fill="none"
          stroke={isActive ? "#ffffff" : "#38bdf8"}
          strokeWidth={isActive ? 2 : 1.5}
          opacity={isActive ? 0.58 : 0.42}
          className="station-pulse"
        />
      )}
      <circle cx={x} cy={y} r={13} fill="rgba(2,6,23,0.86)" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
      <circle cx={x} cy={y} r={9} fill={color} stroke={isActive ? "#fff" : "rgba(255,255,255,0.35)"} strokeWidth={isActive ? 2 : 1} />
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={station.loading || station.error ? 0 : 6.5}
        fontWeight="900"
        fill="#fff"
        style={{ pointerEvents: "none", fontFamily: "ui-monospace, monospace" }}
      >
        {station.loading || station.error ? "" : station.aqi > 99 ? "!" : station.aqi}
      </text>
      <text
        x={x}
        y={y + 21}
        textAnchor="middle"
        fontSize={8.5}
        fill={isActive || isCompared ? "#f8fafc" : "rgba(226,232,240,0.7)"}
        fontWeight={isActive || isCompared ? "800" : "650"}
        className="hm-station-label"
      >
        {shortName}
      </text>
    </g>
  );
}

function DistrictMap({
  stations,
  activeId,
  compareIds,
  onSelect,
}: {
  stations: StationData[];
  activeId: string | null;
  compareIds: string[];
  onSelect: (id: string | null) => void;
}) {
  const stationById = useMemo(() => new Map<string, StationData>(stations.map((station) => [station.id, station])), [stations]);
  const compared = useMemo(() => new Set(compareIds), [compareIds]);

  return (
    <>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="hm-map-svg hm-real-map-svg"
        role="img"
        aria-label="Bản đồ ranh giới quận huyện TP.HCM theo OpenStreetMap"
        onClick={() => onSelect(null)}
      >
        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} rx={18} fill="#081321" />
        <g className="hm-map-grid" aria-hidden="true">
          {[0.18, 0.34, 0.5, 0.66, 0.82].map((ratio) => (
            <line key={`h-${ratio}`} x1={28} x2={MAP_WIDTH - 28} y1={MAP_HEIGHT * ratio} y2={MAP_HEIGHT * ratio} />
          ))}
          {[0.18, 0.34, 0.5, 0.66, 0.82].map((ratio) => (
            <line key={`v-${ratio}`} x1={MAP_WIDTH * ratio} x2={MAP_WIDTH * ratio} y1={28} y2={MAP_HEIGHT - 28} />
          ))}
        </g>

        <g className="hm-district-layer">
          {HCMC_DISTRICT_BOUNDARIES.map((boundary) => {
            const station = stationById.get(boundary.id);
            const color = station && !station.error ? riskColor(station.risk) : "#64748b";
            const isActive = activeId === boundary.id;
            const isCompared = compared.has(boundary.id);
            const opacity = station?.loading ? 0.18 : isActive || isCompared ? 0.58 : 0.38;
            return (
              <path
                key={boundary.id}
                d={geometryToPath(boundary.geometry)}
                className={`hm-district-shape ${isActive ? "hm-district-shape--active" : ""} ${isCompared ? "hm-district-shape--compared" : ""}`}
                fill={color}
                fillOpacity={opacity}
                stroke={isActive ? "#ffffff" : isCompared ? "#38bdf8" : "rgba(226,232,240,0.34)"}
                strokeWidth={isActive ? 2.6 : isCompared ? 2.1 : 0.85}
                fillRule="evenodd"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(activeId === boundary.id ? null : boundary.id);
                }}
              >
                <title>{`${station?.name ?? boundary.name} - ${station ? `AQI ${station.aqi}` : "chưa có dữ liệu"}`}</title>
              </path>
            );
          })}
        </g>

        <g className="hm-station-layer">
          {stations.map((station) => {
            const point = project(station.lon, station.lat);
            return (
              <StationPin
                key={station.id}
                x={point.x}
                y={point.y}
                station={station}
                isActive={activeId === station.id}
                isCompared={compared.has(station.id)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(activeId === station.id ? null : station.id);
                }}
              />
            );
          })}
        </g>

        <g transform="translate(562,54)" className="hm-map-compass" aria-hidden="true">
          <circle cx={0} cy={0} r={18} />
          <path d="M0 -11 L5 8 L0 5 L-5 8 Z" />
          <text x={0} y={-15} textAnchor="middle">N</text>
        </g>
      </svg>

      <div className="hm-map-source">
        <span>Ranh giới: {HCMC_DISTRICT_BOUNDARY_SOURCE}</span>
        <span>Quận 9/Thủ Đức được ghép từ polygon phường OSM do relation quận cũ không còn đầy đủ.</span>
      </div>
    </>
  );
}

function StationDetail({ station, onClose }: { station: StationData; onClose: () => void }) {
  const color = riskColor(station.risk);
  const score = outdoorScore(station);
  return (
    <div className="hm-detail" style={{ "--detail-color": color } as CSSProperties}>
      <div className="hm-detail__header">
        <div>
          <div className="hm-detail__area">{station.area}</div>
          <h3 className="hm-detail__name">{station.name}</h3>
        </div>
        <button className="hm-detail__close" onClick={onClose} aria-label="Đóng chi tiết">×</button>
      </div>

      <div className="hm-detail__aqi-row">
        <div className="hm-detail__aqi-box" style={{ borderColor: `${color}50`, background: `${color}12` }}>
          <span style={{ color }}>AQI</span>
          <strong style={{ color }}>{station.aqi}</strong>
        </div>
        <div className="hm-detail__risk-box">
          <span className="hm-detail__risk-badge" style={{ background: `${color}20`, color, borderColor: `${color}40` }}>
            {riskViet(station.risk)}
          </span>
          <span className="hm-detail__pm25">PM2.5: {fmt(station.pm25, 1)} µg/m³</span>
        </div>
      </div>

      <div className="hm-detail__weather">
        {[
          { label: "Nhiệt độ", value: `${fmt(station.temperature, 1)} °C` },
          { label: "Độ ẩm", value: `${fmt(station.humidity)} %` },
          { label: "Gió", value: `${fmt(station.windSpeed, 1)} km/h` },
          { label: "UV", value: fmt(station.uvIndex, 1) },
        ].map((item) => (
          <div key={item.label} className="hm-detail__weather-item">
            <span>{item.label.slice(0, 1)}</span>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="hm-detail__who">
        <span>{fmt(station.pm25 / 5, 1)}× tiêu chuẩn PM2.5 năm của WHO · Điểm ngoài trời {score}/100</span>
        <span className="hm-detail__who-bar-bg">
          <span className="hm-detail__who-bar-fill" style={{ width: `${Math.min(100, (station.pm25 / 50) * 100)}%`, background: color }} />
        </span>
      </div>
    </div>
  );
}

function Legend() {
  const levels = [
    { color: "#16a34a", label: "Tốt", range: "0-50" },
    { color: "#ca8a04", label: "TB", range: "51-100" },
    { color: "#ea580c", label: "Nhạy cảm", range: "101-150" },
    { color: "#dc2626", label: "Kém", range: "151-200" },
    { color: "#7c3aed", label: "Rất kém", range: "201-300" },
    { color: "#7f1d1d", label: "Nguy hiểm", range: "300+" },
  ];
  return (
    <div className="hm-legend">
      {levels.map((level) => (
        <div key={level.range} className="hm-legend-item">
          <span className="hm-legend-dot" style={{ background: level.color }} />
          <span className="hm-legend-range">{level.range}</span>
          <span className="hm-legend-label">{level.label}</span>
        </div>
      ))}
    </div>
  );
}

function RankingList({
  stations,
  activeId,
  compareIds,
  onSelect,
}: {
  stations: StationData[];
  activeId: string | null;
  compareIds: string[];
  onSelect: (id: string) => void;
}) {
  const sorted = [...stations].filter((station) => !station.loading && !station.error).sort((a, b) => b.aqi - a.aqi);
  const compared = new Set(compareIds);
  return (
    <div className="hm-ranking">
      <div className="hm-ranking__title">Xếp hạng AQI</div>
      {sorted.map((station, index) => {
        const color = riskColor(station.risk);
        return (
          <button
            key={station.id}
            className={`hm-ranking-row ${activeId === station.id ? "active" : ""}`}
            onClick={() => onSelect(station.id)}
          >
            <span className="hm-ranking-row__rank" style={{ color: index === 0 ? "#ef4444" : index === 1 ? "#f97316" : "#64748b" }}>
              {index + 1}
            </span>
            <span className="hm-ranking-row__name">{station.name}</span>
            {compared.has(station.id) && <span className="hm-ranking-row__tag">So sánh</span>}
            <span className="hm-ranking-row__aqi" style={{ color }}>{station.aqi}</span>
            <span className="hm-ranking-row__bar-bg">
              <span className="hm-ranking-row__bar-fill" style={{ width: `${Math.min(100, (station.aqi / 200) * 100)}%`, background: color }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
function DistrictComparisonPanel({
  stations,
  compareIds,
  onCompareIdsChange,
  activeId,
  onSelect,
}: {
  stations: StationData[];
  compareIds: string[];
  onCompareIdsChange: (ids: string[]) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const available = [...stations]
    .filter((station) => !station.loading && !station.error)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const selected = compareIds
    .map((id) => available.find((station) => station.id === id))
    .filter((station): station is StationData => Boolean(station));
  const ranked = [...selected].sort((a, b) => outdoorScore(b) - outdoorScore(a) || a.aqi - b.aqi);
  const best = ranked[0] ?? null;
  const weakest = ranked[ranked.length - 1] ?? null;

  function toggleCompare(id: string) {
    if (compareIds.includes(id)) {
      onCompareIdsChange(compareIds.filter((selectedId) => selectedId !== id));
      return;
    }
    if (compareIds.length >= 3) return;
    onCompareIdsChange([...compareIds, id]);
  }

  return (
    <section className="hm-comparison" aria-label="So sánh quận huyện cho hoạt động ngoài trời">
      <div className="hm-comparison__header">
        <div>
          <div className="hm-comparison__eyebrow">District Comparison</div>
          <h3>Chọn 2-3 quận để so sánh hoạt động ngoài trời</h3>
          <p>Điểm ngoài trời kết hợp AQI, PM2.5, UV, nhiệt độ, độ ẩm và gió để gợi ý nơi nên chọn.</p>
        </div>
        <div className="hm-comparison__limit">{selected.length}/3 đã chọn</div>
      </div>

      <div className="hm-compare-picker">
        {available.map((station) => {
          const checked = compareIds.includes(station.id);
          const disabled = !checked && compareIds.length >= 3;
          return (
            <button
              key={station.id}
              type="button"
              className={`hm-compare-toggle ${checked ? "hm-compare-toggle--active" : ""} ${activeId === station.id ? "hm-compare-toggle--focus" : ""}`}
              disabled={disabled}
              onClick={() => toggleCompare(station.id)}
            >
              <span className="hm-compare-toggle__dot" style={{ background: riskColor(station.risk) }} />
              <strong>{station.name}</strong>
              <span>AQI {station.aqi}</span>
            </button>
          );
        })}
      </div>

      {selected.length < 2 && (
        <div className="hm-compare-empty">Chọn thêm ít nhất một quận nữa để AirSafeNet so sánh có ý nghĩa.</div>
      )}

      {selected.length >= 2 && best && weakest && (
        <div className="hm-compare-summary">
          <div>
            <span>Nên ưu tiên</span>
            <strong>{best.name}</strong>
            <small>{outdoorLabel(outdoorScore(best))} · điểm {outdoorScore(best)}/100</small>
          </div>
          <div>
            <span>Nên tránh hơn</span>
            <strong>{weakest.name}</strong>
            <small>Chênh AQI {Math.max(0, weakest.aqi - best.aqi)} · chênh điểm {Math.max(0, outdoorScore(best) - outdoorScore(weakest))}</small>
          </div>
        </div>
      )}

      <div className="hm-compare-card-grid">
        {selected.map((station, index) => {
          const color = riskColor(station.risk);
          const score = outdoorScore(station);
          return (
            <button
              type="button"
              key={station.id}
              className={`hm-compare-card ${activeId === station.id ? "hm-compare-card--active" : ""}`}
              style={{ "--compare-color": color } as CSSProperties}
              onClick={() => onSelect(station.id)}
            >
              <div className="hm-compare-card__top">
                <span>#{index + 1}</span>
                <strong>{station.name}</strong>
                <em>{outdoorLabel(score)}</em>
              </div>
              <div className="hm-compare-card__score">
                <strong>{score}</strong>
                <span>điểm ngoài trời</span>
              </div>
              <div className="hm-compare-card__bar">
                <span style={{ width: `${score}%`, background: color }} />
              </div>
              <div className="hm-compare-metrics">
                <span>AQI <strong>{station.aqi}</strong></span>
                <span>PM2.5 <strong>{fmt(station.pm25, 1)}</strong></span>
                <span>UV <strong>{fmt(station.uvIndex, 1)}</strong></span>
                <span>Gió <strong>{fmt(station.windSpeed, 1)}</strong></span>
              </div>
              <p>{outdoorAdvice(station)}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function HeatmapPage() {
  const [stations, setStations] = useState<StationData[]>(STATIONS.map((seed) => seedToStation(seed)));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>(["q1", "q7", "q_td"]);
  const [compareTouched, setCompareTouched] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [globalLoading, setGlobalLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadAll() {
      setGlobalLoading(true);
      try {
        const data = await fetchDistrictsFromBackend();
        setStations(data);
        setLastUpdated(new Date().toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
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
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              }));
            } catch {
              // Keep current state until the next refresh.
            }
            setComputing(false);
          }, 12_000);
        } else {
          setStations(STATIONS.map((seed) => seedToStation(seed, false, true)));
        }
      } finally {
        setGlobalLoading(false);
      }
    }

    void loadAll();
    refreshRef.current = setInterval(loadAll, 60 * 60 * 1000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  useEffect(() => {
    if (compareTouched) return;
    const loaded = stations.filter((station) => !station.loading && !station.error);
    if (loaded.length < 3) return;
    const safest = [...loaded]
      .sort((a, b) => outdoorScore(b) - outdoorScore(a) || a.aqi - b.aqi)
      .slice(0, 3)
      .map((station) => station.id);
    setCompareIds(safest);
  }, [compareTouched, stations]);

  const loadedStations = stations.filter((station) => !station.loading && !station.error);
  const activeStation = stations.find((station) => station.id === activeId) ?? null;
  const avgAqi = loadedStations.length > 0
    ? Math.round(loadedStations.reduce((sum, station) => sum + station.aqi, 0) / loadedStations.length)
    : 0;
  const maxStation = loadedStations.length > 0
    ? loadedStations.reduce((current, station) => (current.aqi > station.aqi ? current : station))
    : null;
  const minStation = loadedStations.length > 0
    ? loadedStations.reduce((current, station) => (current.aqi < station.aqi ? current : station))
    : null;

  function updateCompareIds(ids: string[]) {
    setCompareTouched(true);
    setCompareIds(ids.filter((id) => stationSeeds.has(id)).slice(0, 3));
  }

  return (
    <div className="hm-page">
      <div className="hm-header">
        <div className="hm-header__left">
          <div className="hm-header__eyebrow">Bản đồ ranh giới thật · Dự báo từ mô hình AI</div>
          <h2 className="hm-header__title">Chất lượng không khí TP.HCM theo quận/huyện</h2>
          <p className="hm-header__sub">
            {computing
              ? "Đang tính toán dữ liệu quận/huyện lần đầu, chờ khoảng 10-12 giây..."
              : `Model AI · district cache · cập nhật ${lastUpdated || "..."}`}
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
                <strong style={{ color: riskColor(maxStation.risk) }}>{maxStation.name} {maxStation.aqi}</strong>
              </div>
            )}
            {minStation && (
              <div className="hm-header__stat">
                <span>Tốt nhất</span>
                <strong style={{ color: riskColor(minStation.risk) }}>{minStation.name} {minStation.aqi}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hm-layout">
        <div className="hm-main-column">
          <div className="hm-map-wrap">
            <DistrictMap stations={stations} activeId={activeId} compareIds={compareIds} onSelect={setActiveId} />
            <Legend />
            {globalLoading && (
              <div className="hm-map-loading">
                <div className="hm-map-loading__spinner" />
                <span>Đang lấy dữ liệu quận/huyện...</span>
              </div>
            )}
          </div>

          <DistrictComparisonPanel
            stations={stations}
            compareIds={compareIds}
            onCompareIdsChange={updateCompareIds}
            activeId={activeId}
            onSelect={(id) => setActiveId((current) => (current === id ? null : id))}
          />
        </div>

        <div className="hm-sidebar">
          {activeStation && !activeStation.loading ? (
            <StationDetail station={activeStation} onClose={() => setActiveId(null)} />
          ) : (
            <div className="hm-sidebar__placeholder">
              <span>i</span>
              <p>Nhấn vào một vùng quận/huyện trên bản đồ để xem AQI, PM2.5 và điều kiện thời tiết.</p>
            </div>
          )}

          <RankingList
            stations={stations}
            activeId={activeId}
            compareIds={compareIds}
            onSelect={(id) => setActiveId((current) => (current === id ? null : id))}
          />
        </div>
      </div>
    </div>
  );
}