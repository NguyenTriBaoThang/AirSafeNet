import { HCMC_DISTRICT_BOUNDARIES } from "./hcmcDistrictBoundaries";
import type { DistrictBoundaryGeometry } from "./hcmcDistrictBoundaries";

export type WardBoundaryGeometry = {
  type: "Polygon";
  coordinates: number[][][];
} | {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type WardSeed = {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  area: string;
  lat: number;
  lon: number;
  geometry: WardBoundaryGeometry;
  schools: number;
  hospitals: number;
  residentialBlocks: number;
  trafficWeight: number;
  greenScore: number;
  roadNotes: string[];
  aliases: string[];
};

type WardGroup = {
  id: string;
  parentName: string;
  area: string;
  lat: number;
  lon: number;
  spreadLon: number;
  spreadLat: number;
  wards: string[];
};

export const HCMC_WARD_LAYER_SOURCE =
  "Lớp demo 168 phường/xã/đặc khu được chia từ ranh quận/huyện OSM và district AQI cache; thay bằng GeoJSON cấp xã chính thức khi có dữ liệu mở.";

const WARD_GROUPS: WardGroup[] = [
  {
    id: "q1",
    parentName: "Quận 1 cũ",
    area: "Trung tâm",
    lat: 10.7769,
    lon: 106.7009,
    spreadLon: 0.022,
    spreadLat: 0.019,
    wards: ["Sài Gòn", "Bến Thành", "Cầu Ông Lãnh", "Tân Định"],
  },
  {
    id: "q3",
    parentName: "Quận 3 cũ",
    area: "Trung tâm",
    lat: 10.7849,
    lon: 106.6898,
    spreadLon: 0.020,
    spreadLat: 0.018,
    wards: ["Bàn Cờ", "Xuân Hòa", "Nhiêu Lộc"],
  },
  {
    id: "q4",
    parentName: "Quận 4 cũ",
    area: "Nam trung tâm",
    lat: 10.758,
    lon: 106.7047,
    spreadLon: 0.018,
    spreadLat: 0.016,
    wards: ["Vĩnh Hội", "Khánh Hội", "Xóm Chiếu"],
  },
  {
    id: "q5",
    parentName: "Quận 5 cũ",
    area: "Tây trung tâm",
    lat: 10.7537,
    lon: 106.66,
    spreadLon: 0.019,
    spreadLat: 0.016,
    wards: ["Chợ Quán", "An Đông", "Chợ Lớn"],
  },
  {
    id: "q6",
    parentName: "Quận 6 cũ",
    area: "Tây",
    lat: 10.7485,
    lon: 106.6328,
    spreadLon: 0.024,
    spreadLat: 0.018,
    wards: ["Bình Tây", "Bình Phú", "Phú Lâm"],
  },
  {
    id: "q8",
    parentName: "Quận 8 cũ",
    area: "Tây Nam",
    lat: 10.7236,
    lon: 106.6333,
    spreadLon: 0.052,
    spreadLat: 0.032,
    wards: ["Chánh Hưng", "Bình Đông", "Phú Định", "Rạch Ông", "Hưng Phú"],
  },
  {
    id: "q10",
    parentName: "Quận 10 cũ",
    area: "Trung tâm",
    lat: 10.7746,
    lon: 106.6676,
    spreadLon: 0.019,
    spreadLat: 0.016,
    wards: ["Hòa Hưng", "Diên Hồng", "Vườn Lài"],
  },
  {
    id: "q11",
    parentName: "Quận 11 cũ",
    area: "Tây trung tâm",
    lat: 10.7631,
    lon: 106.6519,
    spreadLon: 0.021,
    spreadLat: 0.016,
    wards: ["Phú Thọ", "Bình Thới", "Minh Phụng"],
  },
  {
    id: "q_pn",
    parentName: "Phú Nhuận cũ",
    area: "Bắc trung tâm",
    lat: 10.7986,
    lon: 106.68,
    spreadLon: 0.019,
    spreadLat: 0.016,
    wards: ["Phú Nhuận", "Đức Nhuận", "Cầu Kiệu"],
  },
  {
    id: "q_bt",
    parentName: "Bình Thạnh cũ",
    area: "Đông Bắc trung tâm",
    lat: 10.8127,
    lon: 106.7081,
    spreadLon: 0.042,
    spreadLat: 0.036,
    wards: ["Gia Định", "Bình Thạnh", "Bình Lợi Trung", "Thạnh Mỹ Tây", "Bình Quới"],
  },
  {
    id: "q7",
    parentName: "Quận 7 cũ",
    area: "Nam",
    lat: 10.7322,
    lon: 106.7224,
    spreadLon: 0.044,
    spreadLat: 0.032,
    wards: ["Tân Mỹ", "Tân Thuận", "Phú Thuận"],
  },
  {
    id: "q9",
    parentName: "Quận 9 cũ",
    area: "Đông",
    lat: 10.842,
    lon: 106.7864,
    spreadLon: 0.078,
    spreadLat: 0.058,
    wards: ["Long Bình", "Tăng Nhơn Phú", "Phước Long", "Long Phước", "Long Trường", "Phú Hữu"],
  },
  {
    id: "q12",
    parentName: "Quận 12 cũ",
    area: "Bắc",
    lat: 10.8631,
    lon: 106.6476,
    spreadLon: 0.056,
    spreadLat: 0.046,
    wards: ["An Phú Đông", "Đông Hưng Thuận", "Trung Mỹ Tây", "Tân Thới Hiệp", "Thới An"],
  },
  {
    id: "q_gv",
    parentName: "Gò Vấp cũ",
    area: "Bắc trung tâm",
    lat: 10.8384,
    lon: 106.6651,
    spreadLon: 0.040,
    spreadLat: 0.034,
    wards: ["Gò Vấp", "Hạnh Thông", "An Nhơn", "Thông Tây Hội", "An Hội"],
  },
  {
    id: "q_tb",
    parentName: "Tân Bình cũ",
    area: "Tây Bắc trung tâm",
    lat: 10.8015,
    lon: 106.6517,
    spreadLon: 0.040,
    spreadLat: 0.030,
    wards: ["Tân Sơn Nhất", "Tân Sơn Hòa", "Bảy Hiền", "Tân Bình", "Tân Hòa"],
  },
  {
    id: "q_tp",
    parentName: "Tân Phú cũ",
    area: "Tây",
    lat: 10.7893,
    lon: 106.6286,
    spreadLon: 0.038,
    spreadLat: 0.030,
    wards: ["Tân Phú", "Phú Thạnh", "Hòa Thạnh", "Tây Thạnh"],
  },
  {
    id: "q_btn",
    parentName: "Bình Tân cũ",
    area: "Tây",
    lat: 10.7657,
    lon: 106.6017,
    spreadLon: 0.052,
    spreadLat: 0.036,
    wards: ["Bình Tân", "Bình Trị Đông", "An Lạc", "Tân Tạo", "Bình Hưng Hòa"],
  },
  {
    id: "q_td",
    parentName: "Thủ Đức cũ",
    area: "Đông",
    lat: 10.8561,
    lon: 106.7729,
    spreadLon: 0.090,
    spreadLat: 0.070,
    wards: [
      "Thủ Đức",
      "Linh Xuân",
      "Linh Trung",
      "Hiệp Bình",
      "Tam Bình",
      "Bình Chiểu",
      "An Khánh",
      "Thảo Điền",
      "Cát Lái",
      "An Phú",
      "Hiệp Phú",
      "Trường Thọ",
      "Long Thạnh Mỹ",
      "Bình Trưng",
      "Tân Phú Đông",
    ],
  },
  {
    id: "h_bc",
    parentName: "Bình Chánh cũ",
    area: "Tây Nam",
    lat: 10.6866,
    lon: 106.5673,
    spreadLon: 0.105,
    spreadLat: 0.072,
    wards: ["Bình Chánh", "Bình Hưng", "Phong Phú", "Tân Kiên", "Vĩnh Lộc", "Hưng Long", "An Phú Tây"],
  },
  {
    id: "h_hm",
    parentName: "Hóc Môn cũ",
    area: "Tây Bắc",
    lat: 10.8911,
    lon: 106.5965,
    spreadLon: 0.072,
    spreadLat: 0.054,
    wards: ["Hóc Môn", "Bà Điểm", "Xuân Thới Sơn", "Đông Thạnh", "Tân Hiệp"],
  },
  {
    id: "h_nb",
    parentName: "Nhà Bè cũ",
    area: "Nam",
    lat: 10.6928,
    lon: 106.7374,
    spreadLon: 0.064,
    spreadLat: 0.052,
    wards: ["Nhà Bè", "Phước Kiển", "Phú Xuân", "Long Thới"],
  },
  {
    id: "h_cc",
    parentName: "Củ Chi cũ",
    area: "Bắc",
    lat: 11.0128,
    lon: 106.4938,
    spreadLon: 0.150,
    spreadLat: 0.095,
    wards: ["Củ Chi", "Tân An Hội", "Tân Phú Trung", "Bình Mỹ", "Trung Lập", "Phước Vĩnh An", "An Nhơn Tây", "Nhuận Đức", "Phú Hòa Đông"],
  },
  {
    id: "h_cn",
    parentName: "Cần Giờ cũ",
    area: "Nam biển",
    lat: 10.41,
    lon: 106.96,
    spreadLon: 0.130,
    spreadLat: 0.105,
    wards: ["Cần Giờ", "Bình Khánh", "An Thới Đông", "Lý Nhơn", "Thạnh An"],
  },
];

const EXTRA_ADMIN_UNITS: Record<string, string[]> = {
  q_td: ["Trường Thạnh", "Phước Bình", "Linh Tây", "Linh Chiểu", "Linh Đông", "Bình Thọ", "Bình Trưng Đông", "Bình Trưng Tây", "Thủ Thiêm", "An Lợi Đông"],
  q12: ["Tân Chánh Hiệp", "Hiệp Thành", "Tân Hưng Thuận"],
  q_gv: ["Thông Tây", "Tân Sơn"],
  h_bc: ["Tân Nhựt", "Lê Minh Xuân", "Bình Lợi", "Quy Đức", "Đa Phước", "Tân Túc", "Phạm Văn Hai", "Bình Chánh Đông", "Bình Chánh Tây", "Vĩnh Lộc A", "Vĩnh Lộc B", "Tân Quý Tây"],
  h_hm: ["Thới Tam Thôn", "Nhị Bình", "Tân Xuân", "Trung Chánh", "Tân Thới Nhì", "Xuân Thới Đông", "Xuân Thới Thượng", "Thới Tứ"],
  h_nb: ["Hiệp Phước", "Nhơn Đức", "Phước Lộc", "Phú Xuân Nam"],
  h_cc: ["Tân Thạnh Đông", "Tân Thạnh Tây", "Tân Thông Hội", "Phước Hiệp", "Phước Thạnh", "Thái Mỹ", "Hòa Phú", "Trung An", "Phạm Văn Cội", "Tân Thạnh", "An Phú", "Tân Phú"],
  h_cn: ["Long Hòa", "Tam Thôn Hiệp", "Cần Thạnh", "Đồng Tranh"],
};
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashText(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function geometryPolygons(geometry: DistrictBoundaryGeometry): number[][][][] {
  return geometry.type === "Polygon" ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
}

function closeRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function ringArea(ring: number[][]): number {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function clipHalfPlane(ring: number[][], inside: (point: number[]) => boolean, intersect: (a: number[], b: number[]) => number[]): number[][] {
  if (ring.length === 0) return [];
  const source = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
  const output: number[][] = [];
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const previous = source[(index + source.length - 1) % source.length];
    const currentInside = inside(current);
    const previousInside = inside(previous);
    if (currentInside) {
      if (!previousInside) output.push(intersect(previous, current));
      output.push(current);
    } else if (previousInside) {
      output.push(intersect(previous, current));
    }
  }
  return closeRing(output);
}

function clipRingByLongitude(ring: number[][], minLon: number, maxLon: number): number[][] {
  const left = clipHalfPlane(
    ring,
    ([lon]) => lon >= minLon,
    ([ax, ay], [bx, by]) => {
      const t = (minLon - ax) / (bx - ax || 1);
      return [minLon, ay + (by - ay) * t];
    },
  );
  const right = clipHalfPlane(
    left,
    ([lon]) => lon <= maxLon,
    ([ax, ay], [bx, by]) => {
      const t = (maxLon - ax) / (bx - ax || 1);
      return [maxLon, ay + (by - ay) * t];
    },
  );
  return closeRing(right.map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]));
}

function geometryBounds(geometry: DistrictBoundaryGeometry): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const polygon of geometryPolygons(geometry)) {
    for (const [lon, lat] of polygon[0] ?? []) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

function fallbackPolygon(lon: number, lat: number, radiusLon: number, radiusLat: number): WardBoundaryGeometry {
  const ring = closeRing([
    [Number((lon - radiusLon).toFixed(5)), Number((lat - radiusLat).toFixed(5))],
    [Number((lon + radiusLon).toFixed(5)), Number((lat - radiusLat).toFixed(5))],
    [Number((lon + radiusLon).toFixed(5)), Number((lat + radiusLat).toFixed(5))],
    [Number((lon - radiusLon).toFixed(5)), Number((lat + radiusLat).toFixed(5))],
  ]);
  return { type: "Polygon", coordinates: [ring] };
}

function slicedGeometry(group: WardGroup, index: number, count: number): WardBoundaryGeometry {
  const boundary = HCMC_DISTRICT_BOUNDARIES.find((item) => item.id === group.id);
  if (!boundary) return fallbackPolygon(group.lon, group.lat, group.spreadLon / Math.max(3, count), group.spreadLat / Math.max(3, count));

  const bounds = geometryBounds(boundary.geometry);
  const step = (bounds.maxLon - bounds.minLon) / Math.max(1, count);
  const minLon = bounds.minLon + step * index - step * 0.001;
  const maxLon = index === count - 1 ? bounds.maxLon + step * 0.001 : bounds.minLon + step * (index + 1) + step * 0.001;
  const polygons: number[][][][] = [];

  for (const polygon of geometryPolygons(boundary.geometry)) {
    const clipped = clipRingByLongitude(polygon[0] ?? [], minLon, maxLon);
    if (clipped.length >= 4 && ringArea(clipped) > 0.0000001) polygons.push([clipped]);
  }

  if (polygons.length === 0) {
    const lon = bounds.minLon + step * (index + 0.5);
    const lat = (bounds.minLat + bounds.maxLat) / 2;
    return fallbackPolygon(lon, lat, step * 0.42, (bounds.maxLat - bounds.minLat) / Math.max(4, count * 2));
  }

  return polygons.length === 1 ? { type: "Polygon", coordinates: polygons[0] } : { type: "MultiPolygon", coordinates: polygons };
}

function geometryCenter(geometry: WardBoundaryGeometry): { lon: number; lat: number } {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let lonSum = 0;
  let latSum = 0;
  let count = 0;
  for (const polygon of polygons) {
    for (const [lon, lat] of (polygon[0] ?? []).slice(0, -1)) {
      lonSum += lon;
      latSum += lat;
      count += 1;
    }
  }
  return count > 0 ? { lon: lonSum / count, lat: latSum / count } : { lon: 0, lat: 0 };
}
function createWardSeeds(): WardSeed[] {
  const wards: WardSeed[] = [];

  for (const group of WARD_GROUPS) {
    const names = [...group.wards, ...(EXTRA_ADMIN_UNITS[group.id] ?? [])];
    const count = names.length;

    names.forEach((name, index) => {
      const hash = hashText(`${group.id}-${name}`);
      const geometry = slicedGeometry(group, index, count);
      const center = geometryCenter(geometry);
      const trafficWeight = Number((0.42 + (hash % 52) / 100).toFixed(2));
      const greenScore = Number((0.18 + ((hash >> 4) % 70) / 100).toFixed(2));
      const roadNotes = [
        trafficWeight > 0.82 ? "Trục đường lớn/giờ cao điểm dễ tích bụi" : "Mật độ xe mức vừa",
        greenScore > 0.68 ? "Có hành lang xanh/kênh/công viên hỗ trợ thoáng khí" : "Ít vùng đệm xanh rõ rệt",
      ];

      wards.push({
        id: `${group.id}_${slugify(name)}`,
        name,
        parentId: group.id,
        parentName: group.parentName,
        area: group.area,
        lon: Number(center.lon.toFixed(5)),
        lat: Number(center.lat.toFixed(5)),
        geometry,
        schools: 1 + (hash % 5),
        hospitals: (hash >> 3) % 3,
        residentialBlocks: 4 + ((hash >> 5) % 12),
        trafficWeight,
        greenScore,
        roadNotes,
        aliases: [
          name,
          `Phường ${name}`,
          `Xã ${name}`,
          group.parentName,
          group.area,
        ],
      });
    });
  }

  return wards;
}

export const HCMC_WARD_SEEDS: WardSeed[] = createWardSeeds();

export const HCMC_WARD_COUNT = HCMC_WARD_SEEDS.length;