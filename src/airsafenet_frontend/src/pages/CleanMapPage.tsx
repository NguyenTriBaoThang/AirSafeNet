import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEventHandler, PointerEventHandler } from "react";
import { HCMC_CITY_BOUNDARY, HCMC_WARD_COUNT, HCMC_WARD_LAYER_SOURCE, HCMC_WARD_SEEDS } from "../data/hcmcWardAirMap";
import type { WardBoundaryGeometry, WardSeed } from "../data/hcmcWardAirMap";
import { getUserProfileRule, USER_PROFILE_RULES } from "../data/userProfileRules";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const MAP_W = 860;
const MAP_H = 720;
const nf0 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const fmt = (n: number, d: 0 | 1 = 0) => (d ? nf1 : nf0).format(n);

type Risk = "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "VERY_UNHEALTHY";
type Mode = "city" | "ward" | "route";
type VehicleId = "motorbike" | "walk" | "bicycle" | "bus" | "car";
type RouteId = "fastest" | "cleanest" | "balanced";
type ForecastPoint = { hour: number; aqi: number; pm25: number };
type ParentAir = { id: string; aqi: number; pm25: number; temperature: number; humidity: number; windSpeed: number; uvIndex: number };
type DistrictApiItem = { id: string; pred_pm25: number; pred_aqi: number; temperature: number; humidity: number; wind_speed: number; uv_index: number };
type WardAir = WardSeed & {
  aqi: number; pm25: number; risk: Risk; temperature: number; humidity: number; windSpeed: number; uvIndex: number;
  confidence: number; source: string; updatedAt: string; forecast: ForecastPoint[]; cleanestHours: ForecastPoint[];
  recommendations: { children: string; asthma: string; motorbike: string };
};
type Vehicle = { id: VehicleId; label: string; speed: number; co2: number; exposure: number; penalty: number; note: string };
type Segment = { from: WardAir; to: WardAir; distance: number; minutes: number; aqi: number; pm25: number; confidence: number; kind: "avoid" | "normal" | "clean"; color: string; note: string };
type RouteOption = { id: RouteId; label: string; subtitle: string; points: WardAir[]; segments: Segment[]; distance: number; minutes: number; aqi: number; pm25: number; exposure: number; co2: number; score: number; confidence: number; recommendation: string };
type Projection = { minX: number; maxX: number; maxLat: number; lonScale: number; scale: number; ox: number; oy: number };
type MapPan = { x: number; y: number };
type ViewBoxFrame = { x: number; y: number; w: number; h: number };

const VEHICLES: Vehicle[] = [
  { id: "motorbike", label: "Xe máy", speed: 24, co2: 0.085, exposure: 1.15, penalty: 7, note: "Nhanh nhưng hít bụi trực tiếp; nên dùng N95/KF94 khi AQI cao." },
  { id: "walk", label: "Đi bộ", speed: 4.8, co2: 0, exposure: 1.35, penalty: 5, note: "Không phát thải nhưng thời gian phơi nhiễm dài." },
  { id: "bicycle", label: "Xe đạp", speed: 13, co2: 0, exposure: 1.45, penalty: 6, note: "CO₂ gần 0, nhưng không nên đạp xe khi AQI cao." },
  { id: "bus", label: "Xe buýt", speed: 18, co2: 0.035, exposure: 0.75, penalty: 3, note: "CO₂/người thấp hơn và giảm phơi nhiễm nếu ngồi trong xe." },
  { id: "car", label: "Ô tô", speed: 20, co2: 0.18, exposure: 0.55, penalty: 8, note: "Phơi nhiễm thấp hơn nhưng phát thải cao." },
];
const LANDMARKS: Record<string, string> = {
  "hutech": "Gia Định", "dai hoc hutech": "Gia Định", "ben thanh": "Bến Thành", "cho ben thanh": "Bến Thành",
  "sai gon": "Sài Gòn", "san bay": "Tân Sơn Nhất", "tan son nhat": "Tân Sơn Nhất", "suoi tien": "Long Bình",
  "thu duc": "Thủ Đức", "phu my hung": "Tân Mỹ", "nha be": "Nhà Bè", "can gio": "Cần Giờ", "cu chi": "Củ Chi", "binh chanh": "Bình Chánh",
};
const DEFAULT_MAP_PAN: MapPan = { x: 0, y: 0 };

function hashText(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h >>> 0); }
function norm(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function risk(aqi: number): Risk { return aqi <= 50 ? "GOOD" : aqi <= 100 ? "MODERATE" : aqi <= 150 ? "UNHEALTHY_SENSITIVE" : aqi <= 200 ? "UNHEALTHY" : "VERY_UNHEALTHY"; }
function color(x: Risk | number | string) { const r = typeof x === "number" ? risk(x) : x; return r === "GOOD" ? "#16a34a" : r === "MODERATE" ? "#eab308" : r === "UNHEALTHY_SENSITIVE" ? "#f97316" : r === "UNHEALTHY" ? "#ef4444" : "#7c3aed"; }
function label(r: Risk | string) { return r === "GOOD" ? "Tốt" : r === "MODERATE" ? "Trung bình" : r === "UNHEALTHY_SENSITIVE" ? "Nhạy cảm" : r === "UNHEALTHY" ? "Không tốt" : "Rất xấu"; }
function aqiToPm25(aqi: number) { if (aqi <= 50) return +(aqi / 50 * 12).toFixed(1); if (aqi <= 100) return +(12.1 + (aqi - 51) * 23.3 / 49).toFixed(1); if (aqi <= 150) return +(35.5 + (aqi - 101) * 19.9 / 49).toFixed(1); if (aqi <= 200) return +(55.5 + (aqi - 151) * 94.9 / 49).toFixed(1); return +(150.5 + (aqi - 201) * 99.9 / 99).toFixed(1); }
function pm25ToAqi(pm: number) { if (pm <= 12) return Math.round(pm / 12 * 50); if (pm <= 35.4) return Math.round(51 + (pm - 12.1) * 49 / 23.3); if (pm <= 55.4) return Math.round(101 + (pm - 35.5) * 49 / 19.9); if (pm <= 150.4) return Math.round(151 + (pm - 55.5) * 49 / 94.9); return Math.round(201 + Math.min(99, (pm - 150.5) * 99 / 99.9)); }
function peak(hour: number, w: WardSeed) { const m = Math.max(0, 1 - Math.abs(hour - 7.5) / 3.1); const e = Math.max(0, 1 - Math.abs(hour - 18) / 3.4); const noon = -Math.max(0, 1 - Math.abs(hour - 13) / 5.5) * 8; return (m * 17 + e * 14) * w.trafficWeight + noon - w.greenScore * 4; }
function forecast(w: WardSeed, baseAqi: number, basePm: number): ForecastPoint[] { const h = hashText(w.id); return Array.from({ length: 24 }, (_, hour) => { const wave = Math.sin(hour / 24 * Math.PI * 2 + (h % 8) / 4) * 5; const a = clamp(Math.round(baseAqi + peak(hour, w) + wave + ((h + hour * 13) % 9) - 4), 18, 260); const pm = +clamp(basePm * 0.45 + aqiToPm25(a) * 0.55, 4, 190).toFixed(1); return { hour, aqi: pm25ToAqi(pm), pm25: pm }; }); }
function fallbackParent(id: string): ParentAir { const h = hashText(id); const aqi = 72 + h % 64; return { id, aqi, pm25: aqiToPm25(aqi), temperature: 30 + h % 55 / 10, humidity: 58 + h % 30, windSpeed: 4 + h % 90 / 10, uvIndex: 4 + h % 55 / 10 }; }
async function fetchParents(): Promise<Map<string, ParentAir>> { const token = localStorage.getItem("airsafenet_token"); const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}; const res = await fetch(`${API_BASE}/api/air/districts`, { headers }); if (res.status === 503) throw new Error("503"); if (!res.ok) throw new Error(`HTTP ${res.status}`); const json = await res.json() as { districts?: DistrictApiItem[] }; const map = new Map<string, ParentAir>(); for (const d of json.districts ?? []) { const aqi = Math.round(d.pred_aqi ?? pm25ToAqi(d.pred_pm25 ?? 0)); map.set(d.id, { id: d.id, aqi, pm25: +(d.pred_pm25 ?? aqiToPm25(aqi)).toFixed(1), temperature: +(d.temperature ?? 0).toFixed(1), humidity: Math.round(d.humidity ?? 0), windSpeed: +(d.wind_speed ?? 0).toFixed(1), uvIndex: +(d.uv_index ?? 0).toFixed(1) }); } return map; }
async function warmDistrictCache() { const token = localStorage.getItem("airsafenet_token"); if (!token) return; try { await fetch(`${API_BASE}/api/air/districts/compute`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch { /* optional warm-up */ } }
function recs(aqi: number, pm: number): WardAir["recommendations"] { return { children: aqi <= 75 ? "Có thể đi học/ra chơi nhẹ; tránh đứng lâu gần cổng trường đông xe." : aqi <= 120 ? "Giảm ra chơi/thể dục ngoài trời; mang KF94/N95 khi đi đường." : "Nên chuyển hoạt động ngoài trời vào trong nhà.", asthma: aqi <= 50 ? "Tương đối ổn; vẫn mang thuốc/khẩu trang dự phòng." : aqi <= 100 ? "Nên đeo N95/KN95, giảm vận động mạnh và theo dõi triệu chứng." : "Tránh hoạt động ngoài trời; nếu bắt buộc đi thì rút ngắn thời gian và dùng N95.", motorbike: pm <= 25 ? "Có thể di chuyển bình thường, ưu tiên đường thoáng." : pm <= 45 ? "Đeo N95/KF94, tránh trục đường xe tải và khu kẹt xe." : "Nên đổi giờ hoặc chọn tuyến ít ô nhiễm hơn." }; }
function buildWard(seed: WardSeed, parent: ParentAir, updatedAt: string): WardAir { const h = hashText(seed.id); const baseAqi = clamp(Math.round(parent.aqi + h % 31 - 15 + seed.trafficWeight * 13 - seed.greenScore * 9), 20, 240); const basePm = clamp(parent.pm25 + (h % 18 - 8) * 0.85 + seed.trafficWeight * 4 - seed.greenScore * 3, 5, 160); const fc = forecast(seed, baseAqi, basePm); const cur = fc[new Date().getHours()] ?? fc[0]; const confidence = clamp(Math.round(89 - seed.trafficWeight * 10 + seed.greenScore * 7 - h % 9), 62, 94); return { ...seed, aqi: cur.aqi, pm25: cur.pm25, risk: risk(cur.aqi), temperature: +(parent.temperature + (h % 12 - 5) * 0.12).toFixed(1), humidity: clamp(Math.round(parent.humidity + h % 14 - 7), 38, 94), windSpeed: +clamp(parent.windSpeed + (h % 10 - 4) * 0.2, 0.5, 28).toFixed(1), uvIndex: +clamp(parent.uvIndex + (h % 8 - 3) * 0.15, 0, 12).toFixed(1), confidence, source: "AI district cache + Open-Meteo/OpenAQ estimate", updatedAt, forecast: fc, cleanestHours: [...fc].sort((a, b) => a.pm25 - b.pm25).slice(0, 3), recommendations: recs(cur.aqi, cur.pm25) }; }
function buildWards(parents: Map<string, ParentAir>, updatedAt: string) { return HCMC_WARD_SEEDS.map(s => buildWard(s, parents.get(s.parentId) ?? fallbackParent(s.parentId), updatedAt)); }
function geometryPolygons(geometry: WardBoundaryGeometry) { return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates; }
function wardPolygons(w: WardSeed) { return geometryPolygons(w.geometry); }
function coords(w: WardSeed) { return wardPolygons(w).flatMap((polygon) => polygon[0] ?? []); }
function projection(wards: WardSeed[]): Projection { let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity; for (const w of wards) for (const [lon, lat] of coords(w)) { minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); } const lonScale = Math.cos((minLat + maxLat) / 2 * Math.PI / 180); const minX = minLon * lonScale, maxX = maxLon * lonScale; const scale = Math.min((MAP_W - 52) / (maxX - minX), (MAP_H - 52) / (maxLat - minLat)); return { minX, maxX, maxLat, lonScale, scale, ox: (MAP_W - (maxX - minX) * scale) / 2, oy: (MAP_H - (maxLat - minLat) * scale) / 2 }; }
const PROJ = projection(HCMC_WARD_SEEDS);
function project(lon: number, lat: number) { const x = lon * PROJ.lonScale; return { x: PROJ.ox + (x - PROJ.minX) * PROJ.scale, y: PROJ.oy + (PROJ.maxLat - lat) * PROJ.scale }; }
function pathOfGeometry(geometry: WardBoundaryGeometry) { return geometryPolygons(geometry).flatMap((polygon) => polygon.map((ring) => ring.map(([lon, lat], i) => { const p = project(lon, lat); return `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(" ") + " Z")).join(" "); }
function pathOf(w: WardSeed) { return pathOfGeometry(w.geometry); }
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) { const r = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180, la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180; const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2; return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
function atHour(w: WardAir, hour: number) { return w.forecast[((hour % 24) + 24) % 24] ?? w.forecast[0]; }
function resolveAddress(input: string, wards: WardAir[]) { const n = norm(input); if (!n) return null; const query = norm(LANDMARKS[n] ?? input); const exact = wards.find(w => norm(w.name) === query || w.aliases.some(a => norm(a) === query)); if (exact) return exact; const contains = wards.find(w => { const hay = norm(`${w.name} ${w.parentName} ${w.area} ${w.aliases.join(" ")}`); return hay.includes(query) || query.includes(norm(w.name)); }); if (contains) return contains; const tokens = query.split(" ").filter(Boolean); return [...wards].map(w => ({ w, score: tokens.reduce((s, t) => s + (norm(`${w.name} ${w.parentName} ${w.area}`).includes(t) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score)[0]?.w ?? null; }
function segKind(aqi: number, traffic: number, green: number): Segment["kind"] { if (aqi >= 151 || traffic > 0.86) return "avoid"; if (aqi <= 100 && green > 0.58) return "clean"; return "normal"; }
function segNote(kind: Segment["kind"]) { return kind === "avoid" ? "Nên tránh đoạn này nếu có lựa chọn khác." : kind === "clean" ? "Clean corridor: AQI thấp hơn và có vùng thoáng/xanh." : "Đoạn trung tính, theo dõi AQI nếu di chuyển lâu."; }
function calcRoute(id: RouteId, labelText: string, subtitle: string, points: WardAir[], vehicle: Vehicle, profileId: string, hour: number): RouteOption { const rule = getUserProfileRule(profileId); const segments: Segment[] = []; for (let i = 0; i < points.length - 1; i += 1) { const from = points[i], to = points[i + 1]; const distance = km(from, to); const minutes = Math.max(3, distance / vehicle.speed * 60 * (id === "cleanest" ? 1.08 : id === "balanced" ? 1.03 : 1)); const f1 = atHour(from, hour + Math.round(minutes / 120)), f2 = atHour(to, hour + Math.round(minutes / 120)); const aqi = Math.round((f1.aqi + f2.aqi) / 2), pm25 = +((f1.pm25 + f2.pm25) / 2).toFixed(1); const traffic = (from.trafficWeight + to.trafficWeight) / 2, green = (from.greenScore + to.greenScore) / 2; const kind = segKind(aqi, traffic, green); segments.push({ from, to, distance, minutes, aqi, pm25, confidence: Math.round((from.confidence + to.confidence) / 2), kind, color: color(aqi), note: segNote(kind) }); }
  const minutes = segments.reduce((s, x) => s + x.minutes, 0), distance = segments.reduce((s, x) => s + x.distance, 0); const exposure = segments.reduce((s, x) => { const traffic = (x.from.trafficWeight + x.to.trafficWeight) / 2, green = (x.from.greenScore + x.to.greenScore) / 2; return s + x.pm25 * (x.minutes / 60) * vehicle.exposure * rule.sensitivityMultiplier * (1 + traffic * 0.16) * (1 - green * 0.08); }, 0); const roadPenalty = segments.reduce((s, x) => s + (x.kind === "avoid" ? 8 : x.kind === "clean" ? -4 : 2), 0) + vehicle.penalty; const avgAqi = Math.round(segments.reduce((s, x) => s + x.aqi * x.minutes, 0) / Math.max(1, minutes)); const avgPm = +(segments.reduce((s, x) => s + x.pm25 * x.minutes, 0) / Math.max(1, minutes)).toFixed(1); const confidence = Math.round(segments.reduce((s, x) => s + x.confidence * x.minutes, 0) / Math.max(1, minutes)); const cost = exposure * 1.55 + minutes * 0.18 + roadPenalty + (rule.sensitivityMultiplier - 1) * 12 + (100 - confidence) * 0.14; const score = clamp(Math.round(100 - cost), 0, 100); const avoid = segments.filter(s => s.kind === "avoid").length, clean = segments.filter(s => s.kind === "clean").length; let recommendation = "Tuyến có thể dùng, vẫn nên kiểm tra AQI trước khi xuất phát."; if (id === "cleanest") recommendation = "Ưu tiên cho trẻ em, người hen/suyễn hoặc người đi xe máy khi PM2.5 tăng."; if (id === "fastest" && avoid) recommendation = "Nhanh nhưng đi qua đoạn ô nhiễm cao; chỉ chọn khi cần tiết kiệm thời gian."; if (id === "balanced" && clean) recommendation = "Cân bằng thời gian, phơi nhiễm và phát thải; hợp đi học/đi làm hằng ngày."; if (vehicle.id === "bicycle" && avgAqi > 100) recommendation = "Xe đạp phát thải thấp nhưng AQI cao; nên đổi giờ hoặc chọn xe buýt."; return { id, label: labelText, subtitle, points, segments, distance: +distance.toFixed(1), minutes: Math.round(minutes), aqi: avgAqi, pm25: avgPm, exposure: +exposure.toFixed(1), co2: +(distance * vehicle.co2).toFixed(2), score, confidence, recommendation };
}
function mids(wards: WardAir[], start: WardAir, end: WardAir, hour: number) { const direct = km(start, end); return wards.filter(w => w.id !== start.id && w.id !== end.id).map(w => { const detour = km(start, w) + km(w, end) - direct; const f = atHour(w, hour); const pollution = f.pm25 + w.trafficWeight * 10 - w.greenScore * 9; return { w, detour, pollution, score: pollution + Math.max(0, detour) * 2.4 }; }).filter(x => x.detour < Math.max(5, direct * 0.65 + 2)).sort((a, b) => a.score - b.score); }
function routeOptions(wards: WardAir[], start: WardAir | null, end: WardAir | null, vehicleId: VehicleId, profileId: string, time: string) { if (!start || !end || start.id === end.id) return []; const vehicle = VEHICLES.find(v => v.id === vehicleId) ?? VEHICLES[0]; const hour = Number(time.split(":")[0] ?? new Date().getHours()); const candidates = mids(wards, start, end, hour); const clean = candidates.slice(0, 2).map(x => x.w); const balanced = [...candidates].sort((a, b) => a.pollution + Math.max(0, a.detour) * 4.8 - (b.pollution + Math.max(0, b.detour) * 4.8))[0]?.w; return [calcRoute("fastest", "Nhanh nhất", "Ít vòng, ưu tiên thời gian", [start, end], vehicle, profileId, hour), calcRoute("cleanest", "Ít ô nhiễm nhất", "Né vùng AQI/PM2.5 cao", [start, ...clean, end], vehicle, profileId, hour), calcRoute("balanced", "Cân bằng nhất", "Không vòng quá xa nhưng giảm phơi nhiễm", balanced ? [start, balanced, end] : [start, end], vehicle, profileId, hour)]; }
function exposureAt(route: RouteOption, vehicleId: VehicleId, profileId: string, hour: number) { const vehicle = VEHICLES.find(v => v.id === vehicleId) ?? VEHICLES[0], rule = getUserProfileRule(profileId); return +route.points.slice(0, -1).reduce((sum, p, i) => { const to = route.points[i + 1], minutes = Math.max(3, km(p, to) / vehicle.speed * 60), pm = (atHour(p, hour).pm25 + atHour(to, hour).pm25) / 2; return sum + pm * minutes / 60 * vehicle.exposure * rule.sensitivityMultiplier; }, 0).toFixed(1); }
function shiftTip(route: RouteOption | null, vehicleId: VehicleId, profileId: string, time: string) { if (!route) return null; const hour = Number(time.split(":")[0] ?? new Date().getHours()); const cur = exposureAt(route, vehicleId, profileId, hour); const best = Array.from({ length: 24 }, (_, h) => ({ hour: h, exposure: exposureAt(route, vehicleId, profileId, h) })).sort((a, b) => a.exposure - b.exposure)[0]; if (!best || cur <= 0) return null; const reduction = Math.round((cur - best.exposure) / cur * 100); return reduction >= 6 && best.hour !== hour ? { ...best, reduction } : null; }
function clampMapPan(frame: ViewBoxFrame, pan: MapPan): MapPan {
  return {
    x: clamp(pan.x, -frame.x, MAP_W - frame.w - frame.x),
    y: clamp(pan.y, -frame.y, MAP_H - frame.h - frame.y),
  };
}

function frameToViewBox(frame: ViewBoxFrame, pan: MapPan) {
  const clampedPan = clampMapPan(frame, pan);
  return `${(frame.x + clampedPan.x).toFixed(1)} ${(frame.y + clampedPan.y).toFixed(1)} ${frame.w.toFixed(1)} ${frame.h.toFixed(1)}`;
}

function baseViewBox(route: RouteOption | null, active: WardAir | null, mode: Mode, zoom: number): ViewBoxFrame {
  let pts: { x: number; y: number }[];
  if (mode === "route" && route) pts = route.points.map(w => project(w.lon, w.lat));
  else if (mode === "ward" && active) pts = coords(active).map(([lon, lat]) => project(lon, lat));
  else {
    const w = MAP_W / zoom, h = MAP_H / zoom;
    return { x: (MAP_W - w) / 2, y: (MAP_H - h) / 2, w, h };
  }
  let minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x)), minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
  const pad = mode === "route" ? 110 : 70;
  minX = clamp(minX - pad, 0, MAP_W); maxX = clamp(maxX + pad, 0, MAP_W); minY = clamp(minY - pad, 0, MAP_H); maxY = clamp(maxY + pad, 0, MAP_H);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, w = clamp((maxX - minX) / zoom, 150, MAP_W), h = clamp((maxY - minY) / zoom, 130, MAP_H);
  return { x: clamp(cx - w / 2, 0, MAP_W - w), y: clamp(cy - h / 2, 0, MAP_H - h), w, h };
}

function viewBox(route: RouteOption | null, active: WardAir | null, mode: Mode, zoom: number, pan: MapPan) {
  return frameToViewBox(baseViewBox(route, active, mode, zoom), pan);
}

function unproject(x: number, y: number) {
  const worldX = (x - PROJ.ox) / PROJ.scale + PROJ.minX;
  return {
    lon: worldX / PROJ.lonScale,
    lat: PROJ.maxLat - (y - PROJ.oy) / PROJ.scale,
  };
}
function lonToTileX(lon: number, z: number) { return Math.floor(((lon + 180) / 360) * 2 ** z); }
function latToTileY(lat: number, z: number) {
  const rad = lat * Math.PI / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}
function tileXToLon(x: number, z: number) { return (x / 2 ** z) * 360 - 180; }
function tileYToLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function tileList(viewBoxValue: string, mode: Mode) {
  const [vx, vy, vw, vh] = viewBoxValue.split(" ").map(Number);
  const padX = vw * 0.08;
  const padY = vh * 0.08;
  const nw = unproject(clamp(vx - padX, 0, MAP_W), clamp(vy - padY, 0, MAP_H));
  const se = unproject(clamp(vx + vw + padX, 0, MAP_W), clamp(vy + vh + padY, 0, MAP_H));
  const west = Math.min(nw.lon, se.lon);
  const east = Math.max(nw.lon, se.lon);
  const north = Math.max(nw.lat, se.lat);
  const south = Math.min(nw.lat, se.lat);
  let z = mode === "city" ? 11 : 13;

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
  while (tiles.length > 180 && z > 10) {
    z -= 1;
    tiles = build(z);
  }
  return tiles;
}
function TileLayer({ viewBoxValue, mode }: { viewBoxValue: string; mode: Mode }) {
  const tiles = tileList(viewBoxValue, mode);
  return <g className="cm-basemap" aria-hidden="true">{tiles.map(tile => <image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width={tile.w} height={tile.h} preserveAspectRatio="none" />)}</g>;
}
function Legend() { const levels = [{ c: "#16a34a", l: "Tốt", r: "0-50" }, { c: "#eab308", l: "Trung bình", r: "51-100" }, { c: "#f97316", l: "Nhạy cảm", r: "101-150" }, { c: "#ef4444", l: "Không tốt", r: "151-200" }, { c: "#7c3aed", l: "Rất xấu", r: "201+" }]; return <div className="cm-legend">{levels.map(x => <div key={x.r} className="cm-legend__item"><span style={{ background: x.c }} /><strong>{x.r}</strong><em>{x.l}</em></div>)}</div>; }
function WardMap({ wards, activeId, mode, zoom, pan, route, onSelect, onZoomChange, onPanChange }: { wards: WardAir[]; activeId: string | null; mode: Mode; zoom: number; pan: MapPan; route: RouteOption | null; onSelect: (id: string | null) => void; onZoomChange: (direction: -1 | 1) => void; onPanChange: (pan: MapPan) => void }) {
  const active = wards.find(w => w.id === activeId) ?? null;
  const routeIds = new Set(route?.points.map(w => w.id) ?? []);
  const vb = viewBox(route, active, mode, zoom, pan);
  const [, , viewWidth, viewHeight] = vb.split(" ").map(Number);
  const canPan = viewWidth < MAP_W || viewHeight < MAP_H;
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

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    if (event.button !== 0 || !canPan) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startPan: pan, viewWidth, viewHeight, rectWidth: rect.width, rectHeight: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();
    const moveX = event.clientX - drag.startX, moveY = event.clientY - drag.startY;
    if (Math.abs(moveX) > 3 || Math.abs(moveY) > 3) suppressClickRef.current = true;
    onPanChange({
      x: drag.startPan.x + ((drag.startX - event.clientX) * drag.viewWidth) / Math.max(1, drag.rectWidth),
      y: drag.startPan.y + ((drag.startY - event.clientY) * drag.viewHeight) / Math.max(1, drag.rectHeight),
    });
  };
  const handlePointerEnd: PointerEventHandler<SVGSVGElement> = (event) => {
    if (dragRef.current?.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };
  const handleClickCapture: MouseEventHandler<SVGSVGElement> = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return <svg className={`cm-map ${canPan ? "cm-map--draggable" : ""}`} viewBox={vb} role="img" aria-label="Bản đồ nền kiểu Google Map với lớp heatmap AQI/PM2.5 168 phường/xã/đặc khu TP.HCM" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onClickCapture={handleClickCapture} onWheel={(event) => { event.preventDefault(); onZoomChange(event.deltaY > 0 ? -1 : 1); }} onClick={() => onSelect(null)}>
    <rect x={0} y={0} width={MAP_W} height={MAP_H} rx={18} fill="#eef3f8" />
    <TileLayer viewBoxValue={vb} mode={mode} />
    <rect className="cm-map-wash" x={0} y={0} width={MAP_W} height={MAP_H} rx={18} />
    <g>{wards.map(w => {
      const isActive = activeId === w.id, inRoute = routeIds.has(w.id);
      return <path key={w.id} d={pathOf(w)} className={`cm-ward ${isActive ? "cm-ward--active" : ""} ${inRoute ? "cm-ward--route" : ""}`} fill={color(w.risk)} fillOpacity={isActive ? 0.72 : inRoute ? 0.58 : 0.42} stroke={isActive ? "#0f172a" : inRoute ? "#0369a1" : "rgba(15,23,42,0.42)"} strokeWidth={isActive ? 2.4 : inRoute ? 1.8 : 0.75} onClick={e => { e.stopPropagation(); onSelect(isActive ? null : w.id); }}><title>{`${w.name} - AQI ${w.aqi}, PM2.5 ${w.pm25} µg/m³`}</title></path>;
    })}</g>
    <g className="cm-ward-boundary-layer" aria-hidden="true">{wards.map(w => <path key={`boundary-${w.id}`} d={pathOf(w)} className="cm-ward-boundary" />)}</g>
    <g className="cm-district-boundary-layer" aria-hidden="true"><path d={pathOfGeometry(HCMC_CITY_BOUNDARY)} className="cm-district-boundary" /></g>
    {route && mode === "route" && <g className="cm-route-layer">{route.segments.map(s => { const a = project(s.from.lon, s.from.lat), b = project(s.to.lon, s.to.lat); return <line key={`${s.from.id}-${s.to.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.color} strokeWidth={s.kind === "avoid" ? 10 : s.kind === "clean" ? 8 : 7} strokeLinecap="round" strokeOpacity={0.92} strokeDasharray={s.kind === "avoid" ? "2 12" : undefined}><title>{`AQI ${s.aqi}: ${s.note}`}</title></line>; })}{route.points.map((w, i) => { const p = project(w.lon, w.lat); return <g key={`pin-${w.id}`} transform={`translate(${p.x} ${p.y})`} className="cm-route-pin"><circle r={13} fill="#020617" stroke="#f8fafc" strokeWidth={2} /><text textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={900} fill="#fff">{i === 0 ? "A" : i === route.points.length - 1 ? "B" : i}</text></g>; })}</g>}
    {mode !== "city" && active && <text x={project(active.lon, active.lat).x} y={project(active.lon, active.lat).y - 22} className="cm-map-label" textAnchor="middle">{active.name}</text>}
    <text x={MAP_W - 16} y={MAP_H - 14} className="cm-map-attribution" textAnchor="end">© OpenStreetMap · Heatmap AirSafeNet</text>
  </svg>;
}
function WardDetail({ ward }: { ward: WardAir }) { const c = color(ward.risk); return <section className="cm-detail" style={{ "--ward-color": c } as CSSProperties}><div className="cm-detail__head"><div><span>{ward.parentName} · {ward.area}</span><h3>{ward.name}</h3></div><strong style={{ color: c }}>AQI {ward.aqi}</strong></div><div className="cm-detail__metrics"><div><span>PM2.5</span><strong>{fmt(ward.pm25, 1)} µg/m³</strong></div><div><span>Mức</span><strong>{label(ward.risk)}</strong></div><div><span>Độ tin cậy</span><strong>{ward.confidence}%</strong></div><div><span>Cập nhật</span><strong>{ward.updatedAt}</strong></div></div><div className="cm-source-box"><span>Nguồn dữ liệu</span><strong>{ward.source}</strong></div><div className="cm-recommendations"><h4>Khuyến nghị theo nhóm</h4><p><strong>Trẻ em:</strong> {ward.recommendations.children}</p><p><strong>Hen/suyễn:</strong> {ward.recommendations.asthma}</p><p><strong>Đi xe máy:</strong> {ward.recommendations.motorbike}</p></div><div className="cm-clean-hours"><h4>Giờ sạch hơn trong ngày</h4><div>{ward.cleanestHours.map(p => <span key={p.hour}>{String(p.hour).padStart(2, "0")}:00 · AQI {p.aqi}</span>)}</div></div><div className="cm-forecast-strip" aria-label="Dự báo AQI 24 giờ">{ward.forecast.map(p => <span key={p.hour} title={`${String(p.hour).padStart(2, "0")}:00 · AQI ${p.aqi} · PM2.5 ${p.pm25}`} style={{ height: `${clamp(p.aqi / 2.6, 14, 78)}px`, background: color(p.aqi) }} />)}</div><div className="cm-sensitive-sites"><div><span>Trường học</span><strong>{ward.schools}</strong></div><div><span>Bệnh viện</span><strong>{ward.hospitals}</strong></div><div><span>Khu dân cư</span><strong>{ward.residentialBlocks}</strong></div></div><ul className="cm-road-notes">{ward.roadNotes.map(n => <li key={n}>{n}</li>)}</ul></section>; }
function Ranking({ wards, activeId, onSelect }: { wards: WardAir[]; activeId: string | null; onSelect: (id: string) => void }) { const best = [...wards].sort((a, b) => a.aqi - b.aqi).slice(0, 5), worst = [...wards].sort((a, b) => b.aqi - a.aqi).slice(0, 5); const col = (title: string, list: WardAir[]) => <div className="cm-ranking__col"><h3>{title}</h3>{list.map((w, i) => <button key={w.id} className={activeId === w.id ? "active" : ""} onClick={() => onSelect(w.id)}><span>{i + 1}</span><strong>{w.name}</strong><em style={{ color: color(w.risk) }}>AQI {w.aqi}</em></button>)}</div>; return <section className="cm-ranking">{col("Top 5 khu vực sạch nhất", best)}{col("Top 5 khu vực ô nhiễm cao", worst)}</section>; }
function RoutePlanner({ wards, startInput, endInput, departureTime, vehicleId, profileId, selectedRouteId, routes, startWard, endWard, onStart, onEnd, onTime, onVehicle, onProfile, onRoute }: { wards: WardAir[]; startInput: string; endInput: string; departureTime: string; vehicleId: VehicleId; profileId: string; selectedRouteId: RouteId; routes: RouteOption[]; startWard: WardAir | null; endWard: WardAir | null; onStart: (v: string) => void; onEnd: (v: string) => void; onTime: (v: string) => void; onVehicle: (v: VehicleId) => void; onProfile: (v: string) => void; onRoute: (v: RouteId) => void }) { const selected = routes.find(r => r.id === selectedRouteId) ?? routes[0] ?? null; const fastest = routes.find(r => r.id === "fastest")?.exposure ?? selected?.exposure ?? 0; const shift = shiftTip(selected, vehicleId, profileId, departureTime); const vehicle = VEHICLES.find(v => v.id === vehicleId) ?? VEHICLES[0]; return <section className="cm-route-planner"><div className="cm-route-planner__head"><div><span>Clean Route Planner</span><h3>Nhập địa chỉ A-B để tìm tuyến ít ô nhiễm hơn</h3></div><strong>{startWard && endWard ? `${startWard.name} → ${endWard.name}` : "Chọn điểm đi/đến"}</strong></div><div className="cm-route-form"><label>Điểm đi<input list="ward-options" value={startInput} onChange={e => onStart(e.target.value)} placeholder="VD: Bến Thành, HUTECH, Sân bay..." /></label><label>Điểm đến<input list="ward-options" value={endInput} onChange={e => onEnd(e.target.value)} placeholder="VD: Thủ Đức, Nhà Bè..." /></label><label>Giờ xuất phát<input type="time" value={departureTime} onChange={e => onTime(e.target.value)} /></label><label>Phương tiện<select value={vehicleId} onChange={e => onVehicle(e.target.value as VehicleId)}>{VEHICLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label><label>Hồ sơ sức khỏe<select value={profileId} onChange={e => onProfile(e.target.value)}>{USER_PROFILE_RULES.map(r => <option key={r.id} value={r.id}>{r.shortLabel}</option>)}</select></label></div><datalist id="ward-options">{wards.map(w => <option key={w.id} value={w.name} />)}</datalist><div className="cm-vehicle-note">{vehicle.note}</div>{routes.length === 0 && <div className="cm-route-empty">Nhập hai địa chỉ/phường khác nhau để AirSafeNet đề xuất 3 tuyến.</div>}{routes.length > 0 && <div className="cm-route-grid">{routes.map(r => { const reduction = fastest > 0 && r.id !== "fastest" ? Math.max(0, Math.round((fastest - r.exposure) / fastest * 100)) : 0; return <button key={r.id} type="button" className={`cm-route-card ${selectedRouteId === r.id ? "cm-route-card--active" : ""}`} onClick={() => onRoute(r.id)}><div className="cm-route-card__top"><span>{r.subtitle}</span><strong>{r.label}</strong></div><div className="cm-route-score"><strong>{r.score}</strong><span>Health Route Score</span></div><div className="cm-route-metrics"><span>{r.minutes} phút</span><span>AQI TB {r.aqi}</span><span>PM2.5 {fmt(r.pm25, 1)}</span><span>CO₂ {fmt(r.co2, 1)} kg</span></div><p>{r.recommendation}</p>{reduction > 0 && <em>Giảm exposure {reduction}% so với tuyến nhanh nhất</em>}</button>; })}</div>}{selected && <div className="cm-route-detail"><div className="cm-route-detail__summary"><div><span>PM2.5 exposure</span><strong>{fmt(selected.exposure, 1)}</strong></div><div><span>Độ tin cậy</span><strong>{selected.confidence}%</strong></div><div><span>Quãng đường</span><strong>{fmt(selected.distance, 1)} km</strong></div><div><span>Chi phí sức khỏe</span><strong>{selected.score >= 70 ? "Thấp" : selected.score >= 45 ? "Vừa" : "Cao"}</strong></div></div>{shift && <div className="cm-shift-tip">Nếu đi lúc {departureTime}, exposure cao hơn. Dời sang {String(shift.hour).padStart(2, "0")}:00 có thể giảm PM2.5 exposure khoảng {shift.reduction}%.</div>}<div className="cm-segment-list">{selected.segments.map((s, i) => <div key={`${s.from.id}-${s.to.id}`} className="cm-segment"><span style={{ background: s.color }} /><div><strong>Đoạn {i + 1}: {s.from.name} → {s.to.name}</strong><small>{s.minutes.toFixed(0)} phút · AQI {s.aqi} · {s.note}</small></div></div>)}</div></div>}</section>; }

export default function CleanMapPage() {
  const [parents, setParents] = useState<Map<string, ParentAir>>(() => new Map());
  const [lastUpdated, setLastUpdated] = useState("đang tải...");
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>("26743_ben-thanh");
  const [mode, setMode] = useState<Mode>("city");
  const [zoom, setZoom] = useState(1);
  const [mapPan, setMapPan] = useState<MapPan>(DEFAULT_MAP_PAN);
  const [startInput, setStartInput] = useState("Bến Thành");
  const [endInput, setEndInput] = useState("Thủ Đức");
  const [departureTime, setDepartureTime] = useState("07:30");
  const [vehicleId, setVehicleId] = useState<VehicleId>("motorbike");
  const [profileId, setProfileId] = useState("motorbike_commuter");
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>("balanced");
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchParents();
        setParents(data);
        setLastUpdated(new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
        setComputing(false);
      } catch (err) {
        if ((err instanceof Error ? err.message : "") === "503") { setComputing(true); await warmDistrictCache(); }
        setLastUpdated(new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
      } finally { setLoading(false); }
    }
    void load();
    refreshRef.current = setInterval(load, 60 * 60 * 1000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, []);

  const wards = useMemo(() => buildWards(parents, lastUpdated), [parents, lastUpdated]);
  const activeWard = wards.find(w => w.id === activeId) ?? null;
  const startWard = useMemo(() => resolveAddress(startInput, wards), [startInput, wards]);
  const endWard = useMemo(() => resolveAddress(endInput, wards), [endInput, wards]);
  const routes = useMemo(() => routeOptions(wards, startWard, endWard, vehicleId, profileId, departureTime), [wards, startWard, endWard, vehicleId, profileId, departureTime]);
  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0] ?? null;
  const avgAqi = Math.round(wards.reduce((s, w) => s + w.aqi, 0) / Math.max(1, wards.length));
  const best = [...wards].sort((a, b) => a.aqi - b.aqi)[0];
  const worst = [...wards].sort((a, b) => b.aqi - a.aqi)[0];

  function clampCurrentPan(nextPan: MapPan, nextZoom = zoom, nextMode = mode, nextRoute = selectedRoute, nextActive = activeWard) {
    return clampMapPan(baseViewBox(nextRoute, nextActive, nextMode, nextZoom), nextPan);
  }
  function resetMapView() { setZoom(1); setMapPan(DEFAULT_MAP_PAN); }
  function selectMode(nextMode: Mode) { setMode(nextMode); setMapPan(DEFAULT_MAP_PAN); }
  function selectWard(id: string | null) { setActiveId(id); setMapPan(DEFAULT_MAP_PAN); if (id && mode === "city") setMode("ward"); }
  function selectRoute(id: RouteId) { setSelectedRouteId(id); setMode("route"); setMapPan(DEFAULT_MAP_PAN); }
  function changeZoom(direction: -1 | 1) { setZoom(v => { const nextZoom = clamp(+(v + direction * 0.25).toFixed(2), 1, 2.8); setMapPan(current => clampCurrentPan(current, nextZoom)); return nextZoom; }); }
  function changeMapPan(nextPan: MapPan) { setMapPan(clampCurrentPan(nextPan)); }

  return <main className="cm-page"><header className="cm-header"><div><span className="cm-eyebrow">Clean Route & Ward Air Quality Map</span><h2>Bản đồ AQI/PM2.5 theo {HCMC_WARD_COUNT} phường/xã/đặc khu TP.HCM</h2><p>{computing ? "AI district cache đang được khởi tạo; bản đồ vẫn hiển thị bằng lớp ước tính để demo." : `Dữ liệu cập nhật ${lastUpdated} · ${HCMC_WARD_LAYER_SOURCE}`}</p></div><div className="cm-header__stats"><div><span>AQI trung bình</span><strong style={{ color: color(avgAqi) }}>{avgAqi}</strong></div><div><span>Sạch nhất</span><strong>{best?.name} · AQI {best?.aqi}</strong></div><div><span>Ô nhiễm cao</span><strong>{worst?.name} · AQI {worst?.aqi}</strong></div></div></header><div className="cm-toolbar"><div className="cm-mode-tabs" role="tablist" aria-label="Cấp zoom bản đồ">{[{ id: "city", text: "Cấp thành phố" }, { id: "ward", text: "Cấp phường/xã" }, { id: "route", text: "Cấp tuyến đường" }].map(x => <button key={x.id} className={mode === x.id ? "active" : ""} onClick={() => selectMode(x.id as Mode)} type="button">{x.text}</button>)}</div><div className="cm-zoom-controls"><button type="button" onClick={() => changeZoom(-1)}>-</button><span>Zoom {zoom.toFixed(2)}x</span><button type="button" onClick={() => changeZoom(1)}>+</button><button type="button" onClick={resetMapView}>Reset</button></div></div><section className="cm-layout"><div className="cm-map-panel"><WardMap wards={wards} activeId={activeId} mode={mode} zoom={zoom} pan={mapPan} route={selectedRoute} onSelect={selectWard} onZoomChange={changeZoom} onPanChange={changeMapPan} /><Legend />{loading && <div className="cm-map-loading">Đang đồng bộ dữ liệu AQI...</div>}</div><aside className="cm-side-panel">{activeWard ? <WardDetail ward={activeWard} /> : <section className="cm-empty-detail"><h3>Chọn một phường/xã trên bản đồ</h3><p>Bấm vào vùng màu để xem AQI, PM2.5, nguồn dữ liệu, confidence, khuyến nghị sức khỏe và giờ sạch hơn trong ngày.</p></section>}<Ranking wards={wards} activeId={activeId} onSelect={selectWard} /></aside></section><RoutePlanner wards={wards} startInput={startInput} endInput={endInput} departureTime={departureTime} vehicleId={vehicleId} profileId={profileId} selectedRouteId={selectedRouteId} routes={routes} startWard={startWard} endWard={endWard} onStart={setStartInput} onEnd={setEndInput} onTime={setDepartureTime} onVehicle={setVehicleId} onProfile={setProfileId} onRoute={selectRoute} /></main>;
}
