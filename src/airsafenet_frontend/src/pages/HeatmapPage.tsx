import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEventHandler, PointerEventHandler } from "react";
import { HCMC_CITY_BOUNDARY, HCMC_WARD_COUNT, HCMC_WARD_LAYER_SOURCE, HCMC_WARD_SEEDS } from "../data/hcmcWardAirMap";
import type { WardBoundaryGeometry, WardSeed } from "../data/hcmcWardAirMap";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const MAP_WIDTH = 620;
const MAP_HEIGHT = 760;
const MAP_PADDING = 26;
const HEATMAP_MIN_ZOOM = 1;
const HEATMAP_MAX_ZOOM = 6.0;
const HEATMAP_ZOOM_STEP = 0.25;
const number0 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

type Risk = "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "VERY_UNHEALTHY" | "HAZARDOUS";

type ParentAir = {
  id: string;
  aqi: number;
  pm25: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  population?: number;
};

type WardStation = WardSeed & {
  pm25: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  aqi: number;
  risk: Risk;
  population?: number;
  confidence: number;
  source: string;
  loading: boolean;
  error: boolean;
};

type DistrictApiItem = {
  id: string;
  pred_pm25: number;
  pred_aqi: number;
  risk_general?: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  uv_index: number;
  population?: number;
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

type MapPan = { x: number; y: number };

const wardSeeds = new Map<string, WardSeed>(HCMC_WARD_SEEDS.map((ward) => [ward.id, ward]));
const DEFAULT_MAP_PAN: MapPan = { x: 0, y: 0 };

function fmt(value: number, digits: 0 | 1 = 0): string {
  return (digits === 0 ? number0 : number1).format(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampHeatmapPan(zoom: number, pan: MapPan): MapPan {
  const width = MAP_WIDTH / zoom;
  const height = MAP_HEIGHT / zoom;
  const baseX = (MAP_WIDTH - width) / 2;
  const baseY = (MAP_HEIGHT - height) / 2;
  return {
    x: clamp(pan.x, -baseX, MAP_WIDTH - width - baseX),
    y: clamp(pan.y, -baseY, MAP_HEIGHT - height - baseY),
  };
}

function heatmapViewBox(zoom: number, pan: MapPan): string {
  const width = MAP_WIDTH / zoom;
  const height = MAP_HEIGHT / zoom;
  const baseX = (MAP_WIDTH - width) / 2;
  const baseY = (MAP_HEIGHT - height) / 2;
  const clampedPan = clampHeatmapPan(zoom, pan);
  return `${(baseX + clampedPan.x).toFixed(1)} ${(baseY + clampedPan.y).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
}

function hashText(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function aqiToRisk(aqi: number): Risk {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY_SENSITIVE";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}

function aqiToPm25(aqi: number): number {
  if (aqi <= 50) return Number(((aqi / 50) * 12).toFixed(1));
  if (aqi <= 100) return Number((12.1 + ((aqi - 51) * 23.3) / 49).toFixed(1));
  if (aqi <= 150) return Number((35.5 + ((aqi - 101) * 19.9) / 49).toFixed(1));
  if (aqi <= 200) return Number((55.5 + ((aqi - 151) * 94.9) / 49).toFixed(1));
  return Number((150.5 + Math.min(99.9, ((aqi - 201) * 99.9) / 99)).toFixed(1));
}

function pm25ToAqi(pm25: number): number {
  if (pm25 <= 12) return Math.round((pm25 / 12) * 50);
  if (pm25 <= 35.4) return Math.round(51 + ((pm25 - 12.1) * 49) / 23.3);
  if (pm25 <= 55.4) return Math.round(101 + ((pm25 - 35.5) * 49) / 19.9);
  if (pm25 <= 150.4) return Math.round(151 + ((pm25 - 55.5) * 49) / 94.9);
  return Math.round(201 + Math.min(99, ((pm25 - 150.5) * 99) / 99.9));
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
  if (risk === "VERY_UNHEALTHY") return "Rất xấu";
  return "Nguy hiểm";
}

function seedToWard(seed: WardSeed, loading = true, error = false): WardStation {
  return {
    ...seed,
    pm25: 0,
    aqi: 0,
    risk: "MODERATE",
    temperature: 0,
    humidity: 0,
    windSpeed: 0,
    uvIndex: 0,
    population: undefined,
    confidence: 0,
    source: HCMC_WARD_LAYER_SOURCE,
    loading,
    error,
  };
}

function fallbackParent(id: string): ParentAir {
  const hash = hashText(id);
  const aqi = 72 + (hash % 64);
  return {
    id,
    aqi,
    pm25: aqiToPm25(aqi),
    temperature: 30 + (hash % 55) / 10,
    humidity: 58 + (hash % 30),
    windSpeed: 4 + (hash % 90) / 10,
    uvIndex: 4 + (hash % 55) / 10,
  };
}

function buildWardStation(seed: WardSeed, parent: ParentAir, error = false): WardStation {
  const hash = hashText(seed.id);
  const rushHour = new Date().getHours() <= 9 || new Date().getHours() >= 17 ? 1 : 0;
  const localAqi = clamp(
    Math.round(parent.aqi + (hash % 33) - 16 + seed.trafficWeight * 14 - seed.greenScore * 10 + rushHour * seed.trafficWeight * 6),
    18,
    260,
  );
  const localPm25 = clamp(
    parent.pm25 + ((hash % 19) - 9) * 0.85 + seed.trafficWeight * 4.8 - seed.greenScore * 3.4 + rushHour * 1.2,
    4,
    180,
  );
  const pm25 = Number(((localPm25 + aqiToPm25(localAqi)) / 2).toFixed(1));
  const aqi = pm25ToAqi(pm25);
  const confidence = clamp(Math.round(88 - seed.trafficWeight * 10 + seed.greenScore * 8 - (hash % 7)), 62, 94);

  return {
    ...seed,
    pm25,
    aqi,
    risk: aqiToRisk(aqi),
    temperature: Number((parent.temperature + ((hash % 12) - 5) * 0.12).toFixed(1)),
    humidity: clamp(Math.round(parent.humidity + (hash % 14) - 7), 38, 94),
    windSpeed: Number(clamp(parent.windSpeed + ((hash % 10) - 4) * 0.2, 0.5, 28).toFixed(1)),
    uvIndex: Number(clamp(parent.uvIndex + ((hash % 8) - 3) * 0.15, 0, 12).toFixed(1)),
    population: parent.population,
    confidence,
    source: "District AQI cache + nội suy phường theo giao thông/cây xanh",
    loading: false,
    error,
  };
}

function buildWardsFromParents(parents: Map<string, ParentAir>, error = false): WardStation[] {
  return HCMC_WARD_SEEDS.map((seed) => buildWardStation(seed, parents.get(seed.parentId) ?? fallbackParent(seed.parentId), error));
}

async function fetchParentsFromBackend(): Promise<Map<string, ParentAir>> {
  const token = localStorage.getItem("airsafenet_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/api/air/districts`, { headers });
  if (res.status === 503) throw new Error("503");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { districts?: DistrictApiItem[] };
  const parents = new Map<string, ParentAir>();

  for (const item of json.districts ?? []) {
    const aqi = Math.round(item.pred_aqi ?? pm25ToAqi(item.pred_pm25 ?? 0));
    parents.set(item.id, {
      id: item.id,
      aqi,
      pm25: Number((item.pred_pm25 ?? aqiToPm25(aqi)).toFixed(1)),
      temperature: Number((item.temperature ?? 0).toFixed(1)),
      humidity: Math.round(item.humidity ?? 0),
      windSpeed: Number((item.wind_speed ?? 0).toFixed(1)),
      uvIndex: Number((item.uv_index ?? 0).toFixed(1)),
      population: item.population,
    });
  }

  return parents;
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
function outdoorScore(station: WardStation): number {
  const aqiPenalty = Math.min(70, station.aqi * 0.38);
  const pm25Penalty = Math.min(14, Math.max(0, station.pm25 - 12) * 0.34);
  const uvPenalty = Math.min(12, station.uvIndex * 1.7);
  const heatPenalty = station.temperature > 32 ? (station.temperature - 32) * 2.8 : 0;
  const humidityPenalty = station.humidity > 76 ? (station.humidity - 76) * 0.22 : 0;
  const roadPenalty = station.trafficWeight > 0.82 ? 4 : station.trafficWeight > 0.68 ? 2 : 0;
  const greenBonus = station.greenScore > 0.68 ? 4 : station.greenScore > 0.5 ? 2 : 0;
  const windAdjustment = station.windSpeed >= 5 && station.windSpeed <= 18 ? -4 : station.windSpeed < 2 ? 4 : 0;
  return clamp(Math.round(100 - aqiPenalty - pm25Penalty - uvPenalty - heatPenalty - humidityPenalty - roadPenalty + greenBonus - windAdjustment), 0, 100);
}

function outdoorLabel(score: number): string {
  if (score >= 80) return "Rất phù hợp";
  if (score >= 65) return "Phù hợp";
  if (score >= 50) return "Cân nhắc";
  if (score >= 35) return "Nên rút ngắn";
  return "Nên tránh";
}

function outdoorAdvice(station: WardStation): string {
  if (station.aqi > 150) return "Ưu tiên hoạt động trong nhà; nếu bắt buộc ra ngoài nên rút ngắn thời lượng và dùng khẩu trang lọc bụi.";
  if (station.aqi > 100) return "Người nhạy cảm nên giảm cường độ, tránh chạy hoặc đá bóng lâu và theo dõi triệu chứng hô hấp.";
  if (station.uvIndex >= 8) return "Không khí tạm ổn hơn, nhưng UV cao: chọn bóng râm, đội mũ và tránh nắng giữa trưa.";
  if (station.windSpeed < 2 && station.pm25 > 25) return "Gió yếu làm bụi lưu lại lâu; nên chọn khu thoáng hơn hoặc dời sang lúc gió tốt hơn.";
  return "Có thể chọn hoạt động ngoài trời mức nhẹ đến vừa, vẫn nên theo dõi AQI trước khi đi.";
}

function getGeometryPolygons(geometry: WardBoundaryGeometry): number[][][][] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function forEachCoordinate(geometry: WardBoundaryGeometry, callback: (coord: number[]) => void): void {
  for (const polygon of getGeometryPolygons(geometry)) {
    for (const ring of polygon) {
      for (const coord of ring) callback(coord);
    }
  }
}

function createProjection(wards: WardSeed[]): MapProjection {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ward of wards) {
    forEachCoordinate(ward.geometry, ([lon, lat]) => {
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

const MAP_PROJECTION = createProjection(HCMC_WARD_SEEDS);

function project(lon: number, lat: number): { x: number; y: number } {
  const worldX = lon * MAP_PROJECTION.lonScale;
  return {
    x: MAP_PROJECTION.offsetX + (worldX - MAP_PROJECTION.minX) * MAP_PROJECTION.scale,
    y: MAP_PROJECTION.offsetY + (MAP_PROJECTION.maxLat - lat) * MAP_PROJECTION.scale,
  };
}

function unproject(x: number, y: number): { lon: number; lat: number } {
  const worldX = (x - MAP_PROJECTION.offsetX) / MAP_PROJECTION.scale + MAP_PROJECTION.minX;
  return {
    lon: worldX / MAP_PROJECTION.lonScale,
    lat: MAP_PROJECTION.maxLat - (y - MAP_PROJECTION.offsetY) / MAP_PROJECTION.scale,
  };
}

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

function tileXToLon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function heatmapTileList(viewBoxValue: string) {
  const [vx, vy, vw, vh] = viewBoxValue.split(" ").map(Number);
  const padX = vw * 0.08;
  const padY = vh * 0.08;
  const nw = unproject(clamp(vx - padX, 0, MAP_WIDTH), clamp(vy - padY, 0, MAP_HEIGHT));
  const se = unproject(clamp(vx + vw + padX, 0, MAP_WIDTH), clamp(vy + vh + padY, 0, MAP_HEIGHT));
  const west = Math.min(nw.lon, se.lon);
  const east = Math.max(nw.lon, se.lon);
  const north = Math.max(nw.lat, se.lat);
  const south = Math.min(nw.lat, se.lat);
  let z = vw < MAP_WIDTH / 2 ? 12 : 11;

  function build(zoom: number) {
    const minX = clamp(lonToTileX(west, zoom), 0, 2 ** zoom - 1);
    const maxX = clamp(lonToTileX(east, zoom), 0, 2 ** zoom - 1);
    const minY = clamp(latToTileY(north, zoom), 0, 2 ** zoom - 1);
    const maxY = clamp(latToTileY(south, zoom), 0, 2 ** zoom - 1);
    const tiles: Array<{ key: string; url: string; x: number; y: number; w: number; h: number }> = [];
    for (let tx = minX; tx <= maxX; tx += 1) {
      for (let ty = minY; ty <= maxY; ty += 1) {
        const leftLon = tileXToLon(tx, zoom);
        const rightLon = tileXToLon(tx + 1, zoom);
        const topLat = tileYToLat(ty, zoom);
        const bottomLat = tileYToLat(ty + 1, zoom);
        const p1 = project(leftLon, topLat);
        const p2 = project(rightLon, bottomLat);
        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          w: Math.abs(p2.x - p1.x) + 0.5,
          h: Math.abs(p2.y - p1.y) + 0.5,
        });
      }
    }
    return tiles;
  }

  let tiles = build(z);
  while (tiles.length > 72 && z > 10) {
    z -= 1;
    tiles = build(z);
  }
  return tiles;
}

function HeatmapTileLayer({ viewBoxValue }: { viewBoxValue: string }) {
  const tiles = heatmapTileList(viewBoxValue);
  return (
    <g className="hm-gis-basemap" aria-hidden="true">
      {tiles.map((tile) => (
        <image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width={tile.w} height={tile.h} preserveAspectRatio="none" />
      ))}
    </g>
  );
}

function geometryToPath(geometry: WardBoundaryGeometry): string {
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

function pointInRing(point: { x: number; y: number }, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const pi = project(ring[i][0], ring[i][1]);
    const pj = project(ring[j][0], ring[j][1]);
    const intersects = (pi.y > point.y) !== (pj.y > point.y) && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / Math.max(0.000001, pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point: { x: number; y: number }, geometry: WardBoundaryGeometry): boolean {
  for (const polygon of getGeometryPolygons(geometry)) {
    const [outer, ...holes] = polygon;
    if (outer && pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole))) return true;
  }
  return false;
}

function eventToSvgPoint(event: { currentTarget: SVGSVGElement; clientX: number; clientY: number }, viewBoxValue: string) {
  const rect = event.currentTarget.getBoundingClientRect();
  const [vx, vy, vw, vh] = viewBoxValue.split(" ").map(Number);
  return {
    x: vx + ((event.clientX - rect.left) / Math.max(1, rect.width)) * vw,
    y: vy + ((event.clientY - rect.top) / Math.max(1, rect.height)) * vh,
  };
}


function shortWardName(station: WardStation): string {
  return station.name
    .replace("Phường ", "P. ")
    .replace("Bình ", "B. ")
    .replace("Tân ", "T. ")
    .replace("Thạnh ", "Th. ");
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
  station: WardStation;
  isActive: boolean;
  isCompared: boolean;
  onClick: MouseEventHandler<SVGGElement>;
}) {
  const color = station.loading ? "#64748b" : station.error ? "#475569" : riskColor(station.risk);
  const showLabel = isActive || isCompared;
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
          r={18}
          fill="none"
          stroke={isActive ? "#ffffff" : "#38bdf8"}
          strokeWidth={isActive ? 2 : 1.5}
          opacity={isActive ? 0.58 : 0.42}
          className="station-pulse"
        />
      )}
      <circle cx={x} cy={y} r={showLabel ? 8 : 4.2} fill="rgba(2,6,23,0.8)" stroke="rgba(255,255,255,0.38)" strokeWidth={0.8} />
      <circle cx={x} cy={y} r={showLabel ? 5.8 : 2.8} fill={color} stroke={isActive ? "#fff" : "rgba(255,255,255,0.25)"} strokeWidth={isActive ? 1.4 : 0.65} />
      {showLabel && (
        <>
          <text
            x={x}
            y={y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={5.8}
            fontWeight="900"
            fill="#fff"
            style={{ pointerEvents: "none", fontFamily: "ui-monospace, monospace" }}
          >
            {station.loading || station.error ? "" : station.aqi > 99 ? "!" : station.aqi}
          </text>
          <text
            x={x}
            y={y + 19}
            textAnchor="middle"
            fontSize={8}
            fill="#f8fafc"
            fontWeight="800"
            className="hm-station-label"
          >
            {shortWardName(station)}
          </text>
        </>
      )}
    </g>
  );
}

function WardHeatmap({
  stations,
  activeId,
  compareIds,
  compareMode,
  zoom,
  pan,
  onSelect,
  onCompareToggle,
  onZoomChange,
  onPanChange,
  onZoomReset,
}: {
  stations: WardStation[];
  activeId: string | null;
  compareIds: string[];
  compareMode: boolean;
  zoom: number;
  pan: MapPan;
  onSelect: (id: string | null) => void;
  onCompareToggle: (id: string) => void;
  onZoomChange: (direction: -1 | 1) => void;
  onPanChange: (pan: MapPan) => void;
  onZoomReset: () => void;
}) {
  const stationById = useMemo(() => new Map<string, WardStation>(stations.map((station) => [station.id, station])), [stations]);
  const compared = useMemo(() => new Set(compareIds), [compareIds]);
  const viewBoxValue = heatmapViewBox(zoom, pan);
  const canPan = zoom > HEATMAP_MIN_ZOOM;
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPan: MapPan;
    viewWidth: number;
    viewHeight: number;
    rectWidth: number;
    rectHeight: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const panFrameRef = useRef<number | null>(null);
  const pendingPanRef = useRef<MapPan | null>(null);

  function pickWard(id: string) {
    if (compareMode) {
      onCompareToggle(id);
      return;
    }
    onSelect(id);
  }

  function schedulePanChange(nextPan: MapPan) {
    pendingPanRef.current = nextPan;
    if (panFrameRef.current !== null) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      const pending = pendingPanRef.current;
      pendingPanRef.current = null;
      if (pending) onPanChange(pending);
    });
  }

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    suppressClickRef.current = false;
    if (event.button !== 0 || !canPan) return;
    const [, , viewWidth, viewHeight] = viewBoxValue.split(" ").map(Number);
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: pan,
      viewWidth,
      viewHeight,
      rectWidth: rect.width,
      rectHeight: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    const moveX = event.clientX - drag.startX;
    const moveY = event.clientY - drag.startY;
    if (Math.abs(moveX) > 8 || Math.abs(moveY) > 8) suppressClickRef.current = true;
    schedulePanChange(clampHeatmapPan(zoom, {
      x: drag.startPan.x + ((drag.startX - event.clientX) * drag.viewWidth) / Math.max(1, drag.rectWidth),
      y: drag.startPan.y + ((drag.startY - event.clientY) * drag.viewHeight) / Math.max(1, drag.rectHeight),
    }));
  };

  const handlePointerEnd: PointerEventHandler<SVGSVGElement> = (event) => {
    if (dragRef.current?.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const handleClickCapture: MouseEventHandler<SVGSVGElement> = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMapClick: MouseEventHandler<SVGSVGElement> = (event) => {
    const point = eventToSvgPoint(event, viewBoxValue);
    const ward = HCMC_WARD_SEEDS.find((seed) => pointInGeometry(point, seed.geometry));
    if (ward) pickWard(ward.id);
  };

  return (
    <>
      <div className="hm-zoom-controls" role="toolbar" aria-label="Dieu khien zoom ban do nhiet">
        <button type="button" onClick={() => onZoomChange(-1)} aria-label="Thu nho ban do">-</button>
        <span>Zoom {zoom.toFixed(2)}x</span>
        <button type="button" onClick={() => onZoomChange(1)} aria-label="Phong to ban do">+</button>
        <button type="button" onClick={onZoomReset}>Reset</button>
      </div>
      <svg
        viewBox={viewBoxValue}
        className={`hm-map-svg hm-real-map-svg ${canPan ? "hm-map-svg--draggable" : ""}`}
        role="img"
        aria-label={`Bản đồ nhiệt AQI/PM2.5 theo ${HCMC_WARD_COUNT} phường/xã/đặc khu TP.HCM`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
        onClick={handleMapClick}
        onWheel={(event) => {
          event.preventDefault();
          onZoomChange(event.deltaY > 0 ? -1 : 1);
        }}
      >
        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} rx={18} fill="#081321" />
        <HeatmapTileLayer viewBoxValue={viewBoxValue} />
        <rect className="hm-map-wash" x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} rx={18} />
        <g className="hm-map-grid" aria-hidden="true">
          {[0.18, 0.34, 0.5, 0.66, 0.82].map((ratio) => (
            <line key={`h-${ratio}`} x1={28} x2={MAP_WIDTH - 28} y1={MAP_HEIGHT * ratio} y2={MAP_HEIGHT * ratio} />
          ))}
          {[0.18, 0.34, 0.5, 0.66, 0.82].map((ratio) => (
            <line key={`v-${ratio}`} x1={MAP_WIDTH * ratio} x2={MAP_WIDTH * ratio} y1={28} y2={MAP_HEIGHT - 28} />
          ))}
        </g>

        <g className="hm-district-layer">
          {HCMC_WARD_SEEDS.map((ward) => {
            const station = stationById.get(ward.id);
            const color = station && !station.error ? riskColor(station.risk) : "#64748b";
            const isActive = activeId === ward.id;
            const isCompared = compared.has(ward.id);
            const opacity = station?.loading ? 0.18 : isActive || isCompared ? 0.68 : 0.44;
            return (
              <path
                key={ward.id}
                d={geometryToPath(ward.geometry)}
                className={`hm-district-shape ${isActive ? "hm-district-shape--active" : ""} ${isCompared ? "hm-district-shape--compared" : ""}`}
                fill={color}
                fillOpacity={opacity}
                stroke={isActive ? "#ffffff" : isCompared ? "#38bdf8" : "rgba(226,232,240,0.3)"}
                strokeWidth={isActive ? 2.4 : isCompared ? 2 : 0.62}
                fillRule="evenodd"
                onClick={(event) => {
                  event.stopPropagation();
                  pickWard(ward.id);
                }}
              >
                <title>{`${station?.name ?? ward.name} - ${station ? `AQI ${station.aqi}, PM2.5 ${station.pm25}` : "chưa có dữ liệu"}`}</title>
              </path>
            );
          })}
        </g>

        <g className="hm-ward-boundary-layer" aria-hidden="true">
          {HCMC_WARD_SEEDS.map((ward) => (
            <path key={`boundary-${ward.id}`} d={geometryToPath(ward.geometry)} className="hm-ward-boundary" />
          ))}
        </g>

        <g className="hm-district-boundary-layer" aria-hidden="true">
          <path d={geometryToPath(HCMC_CITY_BOUNDARY)} className="hm-district-boundary" />
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
                  pickWard(station.id);
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
        <span>Ranh giới: {HCMC_WARD_COUNT} phường/xã/đặc khu TP.HCM</span>
        <span>{HCMC_WARD_LAYER_SOURCE}</span>
      </div>
    </>
  );
}
function StationDetail({ station, onClose }: { station: WardStation; onClose?: () => void }) {
  const color = riskColor(station.risk);
  const score = outdoorScore(station);
  return (
    <div className="hm-detail" style={{ "--detail-color": color } as CSSProperties}>
      <div className="hm-detail__header">
        <div>
          <div className="hm-detail__area">{station.parentName} · {station.area}</div>
          <h3 className="hm-detail__name">{station.name}</h3>
        </div>
        {onClose && <button className="hm-detail__close" onClick={onClose} aria-label="Dong chi tiet">x</button>}
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
          { label: "Tin cậy", value: `${station.confidence}%` },
          { label: "Cây xanh", value: `${fmt(station.greenScore * 100)}%` },
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

      <div className="hm-detail__who">
        <span>Nguồn: {station.source}</span>
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
    { color: "#7c3aed", label: "Rất xấu", range: "201-300" },
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
  stations: WardStation[];
  activeId: string | null;
  compareIds: string[];
  onSelect: (id: string) => void;
}) {
  const sorted = [...stations].filter((station) => !station.loading && !station.error).sort((a, b) => b.aqi - a.aqi);
  const compared = new Set(compareIds);
  return (
    <div className="hm-ranking">
      <div className="hm-ranking__title">Xếp hạng AQI theo phường</div>
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
function WardComparisonPanel({
  stations,
  compareIds,
  onCompareIdsChange,
  activeId,
  onSelect,
}: {
  stations: WardStation[];
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
    .filter((station): station is WardStation => Boolean(station));
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
    <section className="hm-comparison" aria-label="So sánh phường cho hoạt động ngoài trời">
      <div className="hm-comparison__header">
        <div>
          <div className="hm-comparison__eyebrow">Ward Comparison</div>
          <h3>Chọn 2-3 phường để so sánh hoạt động ngoài trời</h3>
          <p>Điểm ngoài trời kết hợp AQI, PM2.5, UV, nhiệt độ, độ ẩm, gió, mật độ đường và vùng xanh.</p>
        </div>
        <div className="hm-comparison__limit">{selected.length}/3 đã chọn</div>
      </div>

      <div className="hm-compare-picker hm-compare-picker--wards">
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
        <div className="hm-compare-empty">Chọn thêm ít nhất một phường nữa để AirSafeNet so sánh có ý nghĩa.</div>
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
  const [stations, setStations] = useState<WardStation[]>(HCMC_WARD_SEEDS.map((seed) => seedToWard(seed)));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState<MapPan>(DEFAULT_MAP_PAN);
  const [mapCompareMode, setMapCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>(["q1_ben-thanh", "q7_tan-my", "q_bt_gia-dinh"]);
  const [compareTouched, setCompareTouched] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [globalLoading, setGlobalLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadAll() {
      setGlobalLoading(true);
      try {
        const parents = await fetchParentsFromBackend();
        setStations(buildWardsFromParents(parents));
        setLastUpdated(new Date().toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        }));
        setComputing(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "503") {
          setComputing(true);
          await triggerDistrictCompute();
          setStations(buildWardsFromParents(new Map()));
          setLastUpdated(new Date().toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }));
        } else {
          setStations(buildWardsFromParents(new Map(), true));
          setLastUpdated(new Date().toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }));
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

  function changeMapZoom(direction: -1 | 1) {
    setMapZoom((value) => {
      const nextZoom = clamp(+(value + direction * HEATMAP_ZOOM_STEP).toFixed(2), HEATMAP_MIN_ZOOM, HEATMAP_MAX_ZOOM);
      setMapPan((current) => clampHeatmapPan(nextZoom, current));
      return nextZoom;
    });
  }

  function changeMapPan(nextPan: MapPan) {
    setMapPan(clampHeatmapPan(mapZoom, nextPan));
  }

  function resetMapView() {
    setMapZoom(HEATMAP_MIN_ZOOM);
    setMapPan(DEFAULT_MAP_PAN);
  }

  function toggleMapCompare(id: string) {
    if (!wardSeeds.has(id)) return;
    setCompareTouched(true);
    setActiveId(id);
    setCompareIds((current) => {
      if (current.includes(id)) {
        return current.filter((selectedId) => selectedId !== id);
      }
      if (current.length >= 3) {
        return [...current.slice(1), id];
      }
      return [...current, id];
    });
  }

  function updateCompareIds(ids: string[]) {
    setCompareTouched(true);
    setCompareIds(ids.filter((id) => wardSeeds.has(id)).slice(0, 3));
  }

  return (
    <div className="hm-page">
      <div className="hm-header">
        <div className="hm-header__left">
          <div className="hm-header__eyebrow">Bản đồ nhiệt 168 phường/xã/đặc khu · Dự báo từ mô hình AI</div>
          <h2 className="hm-header__title">Chất lượng không khí TP.HCM theo {HCMC_WARD_COUNT} phường/xã</h2>
          <p className="hm-header__sub">
            {computing
              ? "District cache đang được khởi tạo; heatmap đang dùng lớp nội suy demo để không bị trống dữ liệu."
              : `Model AI · ward heatmap · cập nhật ${lastUpdated || "..."}`}
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
            <WardHeatmap
              stations={stations}
              activeId={activeId}
              compareIds={compareIds}
              compareMode={mapCompareMode}
              zoom={mapZoom}
              pan={mapPan}
              onSelect={setActiveId}
              onCompareToggle={toggleMapCompare}
              onZoomChange={changeMapZoom}
              onPanChange={changeMapPan}
              onZoomReset={resetMapView}
            />
            <button
              type="button"
              className={`hm-map-compare-toggle ${mapCompareMode ? "hm-map-compare-toggle--active" : ""}`}
              onClick={() => setMapCompareMode((value) => !value)}
            >
              {mapCompareMode ? `Đang chọn ${compareIds.length}/3` : "Chọn 2-3 phường"}
            </button>
            <Legend />
            {globalLoading && (
              <div className="hm-map-loading">
                <div className="hm-map-loading__spinner" />
                <span>Đang lấy dữ liệu 168 phường/xã...</span>
              </div>
            )}
          </div>

          <WardComparisonPanel
            stations={stations}
            compareIds={compareIds}
            onCompareIdsChange={updateCompareIds}
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
          />
        </div>

        <div className="hm-sidebar">
          {activeStation && !activeStation.loading ? (
            <StationDetail station={activeStation} />
          ) : (
            <div className="hm-sidebar__placeholder">
              <span>i</span>
              <p>Nhấn vào một vùng phường trên bản đồ để xem AQI, PM2.5, độ tin cậy và điều kiện thời tiết.</p>
            </div>
          )}

          <RankingList
            stations={stations}
            activeId={activeId}
            compareIds={compareIds}
            onSelect={(id) => setActiveId(id)}
          />
        </div>
      </div>
    </div>
  );
}