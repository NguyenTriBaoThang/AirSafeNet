import { useEffect, useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

// Tỉ lệ HCMC / tổng dân số VN theo UN World Urbanization Prospects 2025
// HCMC: ~9.816 triệu / VN: ~100.99 triệu = 9.72%
const HCMC_RATIO = 0.0972;

// Cache key + TTL (24 giờ)
const CACHE_KEY = "airsafenet_population_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// World Bank API — miễn phí, không cần key, CORS enabled
// Indicators:
//   SP.POP.TOTL       = Tổng dân số
//   SP.POP.0014.TO.ZS = % dân số 0-14 tuổi
//   SP.POP.65UP.TO.ZS = % dân số 65+ tuổi
const WB_BASE = "https://api.worldbank.org/v2/country/VN/indicator";
const WB_PARAMS = "?format=json&mrv=1&per_page=1";

// ── Types ────────────────────────────────────────────────────────────────────

export type PopulationData = {
  hcmcTotal: number;
  children: number;       // 0-14 tuổi
  elderly: number;        // 65+
  respiratory: number;    // ước tính 5% — không có API, theo WHO VN report
  pregnant: number;       // ước tính 1%
  outdoor_workers: number;// ước tính 16% theo ILO VN
  dataYear: number;
  source: string;
  isReal: boolean;        // true = lấy từ API, false = fallback
};

type CacheEntry = {
  data: PopulationData;
  cachedAt: number;
};

// ── Fallback (dùng khi API lỗi) ──────────────────────────────────────────────

const FALLBACK_DATA: PopulationData = {
  hcmcTotal:       9_816_000,
  children:        1_846_000,
  elderly:           812_000,
  respiratory:       491_000,
  pregnant:           98_000,
  outdoor_workers: 1_571_000,
  dataYear: 2024,
  source: "UN World Urbanization Prospects 2025 (offline fallback)",
  isReal: false,
};

// ── World Bank fetch helper ───────────────────────────────────────────────────

async function fetchWBIndicator(indicator: string): Promise<number | null> {
  try {
    const res = await fetch(`${WB_BASE}/${indicator}${WB_PARAMS}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    // World Bank trả về [metadata, [dataArray]]
    const dataArray = json?.[1];
    if (!Array.isArray(dataArray) || dataArray.length === 0) return null;

    return dataArray[0]?.value ?? null;
  } catch {
    return null;
  }
}

// ── Build PopulationData từ WB response ──────────────────────────────────────

function buildFromWB(
  totalVN: number,
  pctChildren: number,   // % 0-14
  pctElderly: number,    // % 65+
  year: number
): PopulationData {
  const hcmcTotal = Math.round(totalVN * HCMC_RATIO);

  return {
    hcmcTotal,
    children:        Math.round(hcmcTotal * (pctChildren / 100)),
    elderly:         Math.round(hcmcTotal * (pctElderly / 100)),
    respiratory:     Math.round(hcmcTotal * 0.05),   // WHO VN chronic resp. ~5%
    pregnant:        Math.round(hcmcTotal * 0.01),   // ~1%
    outdoor_workers: Math.round(hcmcTotal * 0.16),   // ILO VN outdoor labor ~16%
    dataYear: year,
    source: `World Bank Development Indicators ${year} + UN Urban Prospects 2025`,
    isReal: true,
  };
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function readCache(): PopulationData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: PopulationData) {
  try {
    const entry: CacheEntry = { data, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

type UsePopulationResult = {
  population: PopulationData;
  loading: boolean;
  error: string | null;
};

export function usePopulationData(): UsePopulationResult {
  const [population, setPopulation] = useState<PopulationData>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Thử đọc cache trước
      const cached = readCache();
      if (cached) {
        if (!cancelled) {
          setPopulation(cached);
          setLoading(false);
        }
        return;
      }

      // 2. Gọi World Bank API song song
      try {
        const [totalVN, pctChildren, pctElderly] = await Promise.all([
          fetchWBIndicator("SP.POP.TOTL"),
          fetchWBIndicator("SP.POP.0014.TO.ZS"),
          fetchWBIndicator("SP.POP.65UP.TO.ZS"),
        ]);

        if (cancelled) return;

        if (
          totalVN !== null &&
          pctChildren !== null &&
          pctElderly !== null
        ) {
          // World Bank data year — thường là năm trước
          const year = new Date().getFullYear() - 1;
          const data = buildFromWB(totalVN, pctChildren, pctElderly, year);
          writeCache(data);
          setPopulation(data);
          setError(null);
        } else {
          // Một số indicator null → dùng fallback
          setPopulation(FALLBACK_DATA);
          setError("Không lấy được đủ dữ liệu từ World Bank — dùng dữ liệu UN 2025");
        }
      } catch (e) {
        if (!cancelled) {
          setPopulation(FALLBACK_DATA);
          setError("Lỗi kết nối World Bank API — dùng dữ liệu UN 2025: " + e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { population, loading, error };
}
