import { useEffect, useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

// Tỉ lệ dân số các thành phố / tổng dân số VN (ước tính based on GSO/WB)
const CITY_RATIOS: Record<string, number> = {
  "Hà Nội": 0.086,         // ~8.6tr / 100tr
  "TP. Hồ Chí Minh": 0.094, // ~9.4tr / 100tr
  "Đà Nẵng": 0.012,        // ~1.2tr
  "Hải Phòng": 0.021,      // ~2.1tr
  "Cần Thơ": 0.013,        // ~1.3tr
  "Huế": 0.007,            // ~0.7tr
  "Nha Trang": 0.006,      // ~0.6tr
};

const DEFAULT_RATIO = 0.086; // Mặc định Hà Nội

// TTL (24 giờ)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// World Bank API
const WB_BASE = "https://api.worldbank.org/v2/country/VN/indicator";
const WB_PARAMS = "?format=json&mrv=1&per_page=1";

// ── Types ────────────────────────────────────────────────────────────────────

export type PopulationData = {
  cityName: string;
  total: number;
  children: number;       // 0-14 tuổi
  elderly: number;        // 65+
  respiratory: number;    // ước tính 5%
  pregnant: number;       // ước tính 1%
  outdoor_workers: number;// ước tính 16%
  dataYear: number;
  source: string;
  isReal: boolean;
};

type CacheEntry = {
  data: PopulationData;
  cachedAt: number;
};

// ── Build PopulationData helper ──────────────────────────────────────────────

function buildPopulation(
  cityName: string,
  totalVN: number,
  pctChildren: number,
  pctElderly: number,
  year: number,
  isReal: boolean
): PopulationData {
  const cityRatio = CITY_RATIOS[cityName] || DEFAULT_RATIO;
  const total = Math.round(totalVN * cityRatio);

  return {
    cityName,
    total,
    children:        Math.round(total * (pctChildren / 100)),
    elderly:         Math.round(total * (pctElderly / 100)),
    respiratory:     Math.round(total * 0.05),
    pregnant:        Math.round(total * 0.01),
    outdoor_workers: Math.round(total * 0.16),
    dataYear: year,
    source: isReal 
      ? `World Bank Indicators ${year} (Dynamic Ratio: ${cityName})`
      : `Internal Offline Stats 2024 (${cityName})`,
    isReal,
  };
}

// ── Offline Fallback ─────────────────────────────────────────────────────────

const getFallback = (cityName: string) => buildPopulation(cityName, 100_000_000, 23, 8.5, 2024, false);

// ── World Bank fetch helper ───────────────────────────────────────────────────

async function fetchWBIndicator(indicator: string): Promise<number | null> {
  try {
    const res = await fetch(`${WB_BASE}/${indicator}${WB_PARAMS}`);
    if (!res.ok) return null;
    const json = await res.json();
    const val = json?.[1]?.[0]?.value;
    return val ?? null;
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

type UsePopulationResult = {
  population: PopulationData;
  loading: boolean;
  error: string | null;
};

export function usePopulationData(cityName: string = "Hà Nội"): UsePopulationResult {
  const [population, setPopulation] = useState<PopulationData>(() => getFallback(cityName));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `airsafenet_pop_v3_${cityName.replace(/\s/g, "_")}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1. Cache Check
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const entry: CacheEntry = JSON.parse(raw);
          if (Date.now() - entry.cachedAt < CACHE_TTL_MS) {
            setPopulation(entry.data);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // 2. Fetch API
      try {
        const [totalVN, pctChildren, pctElderly] = await Promise.all([
          fetchWBIndicator("SP.POP.TOTL"),
          fetchWBIndicator("SP.POP.0014.TO.ZS"),
          fetchWBIndicator("SP.POP.65UP.TO.ZS"),
        ]);

        if (cancelled) return;

        if (totalVN && pctChildren && pctElderly) {
          const year = new Date().getFullYear() - 1;
          const data = buildPopulation(cityName, totalVN, pctChildren, pctElderly, year, true);
          
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }));
          } catch {}

          setPopulation(data);
          setError(null);
        } else {
          setPopulation(getFallback(cityName));
          setError("World Bank API partial failure - fallback applied.");
        }
      } catch (e) {
        if (!cancelled) {
          setPopulation(getFallback(cityName));
          setError("Network error fetching population data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [cityName]);

  return { population, loading, error };
}
