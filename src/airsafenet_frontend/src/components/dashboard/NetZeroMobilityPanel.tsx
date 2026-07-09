import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  DashboardChartPointResponse,
  DashboardSummaryResponse,
} from "../../types/dashboard";
import { getUserProfileRule, USER_PROFILE_RULES } from "../../data/userProfileRules";
import {
  clamp,
  formatHour,
  pm25ToAqi,
  riskColor,
  sampleForecastAt,
} from "./airQualityDecisionUtils";

type Props = {
  summary: DashboardSummaryResponse;
  points: DashboardChartPointResponse[];
};

type VehicleId = "motorbike" | "car" | "bus" | "walk" | "bicycle" | "carpool";

type Vehicle = {
  id: VehicleId;
  label: string;
  speedKmh: number;
  co2KgPerKm: number;
  exposureFactor: number;
  breathingFactor: number;
  note: string;
};

type Option = {
  vehicle: Vehicle;
  minutes: number;
  co2Kg: number;
  pm25Exposure: number;
  aqi: number;
  healthRisk: number;
  netZeroScore: number;
  balancedScore: number;
  recommendation: string;
};

const VEHICLES: Vehicle[] = [
  { id: "motorbike", label: "Xe máy", speedKmh: 24, co2KgPerKm: 0.085, exposureFactor: 1.18, breathingFactor: 1, note: "Nhanh nhưng hít bụi trực tiếp." },
  { id: "car", label: "Ô tô", speedKmh: 22, co2KgPerKm: 0.18, exposureFactor: 0.62, breathingFactor: 0.78, note: "Phơi nhiễm thấp hơn, phát thải cao." },
  { id: "bus", label: "Xe buýt", speedKmh: 18, co2KgPerKm: 0.035, exposureFactor: 0.78, breathingFactor: 0.86, note: "CO₂/người thấp, phơi nhiễm vừa phải." },
  { id: "walk", label: "Đi bộ", speedKmh: 4.8, co2KgPerKm: 0, exposureFactor: 1.28, breathingFactor: 1.16, note: "Không phát thải nhưng ngoài trời lâu hơn." },
  { id: "bicycle", label: "Xe đạp", speedKmh: 13, co2KgPerKm: 0, exposureFactor: 1.42, breathingFactor: 1.35, note: "CO₂ gần 0, cần tránh khi AQI cao." },
  { id: "carpool", label: "Đi chung xe", speedKmh: 22, co2KgPerKm: 0.07, exposureFactor: 0.64, breathingFactor: 0.78, note: "Giảm CO₂/người so với ô tô cá nhân." },
];

function timeValueToDate(value: string): Date {
  const [hourRaw, minuteRaw] = value.split(":");
  const date = new Date();
  date.setHours(Number(hourRaw) || 0, Number(minuteRaw) || 0, 0, 0);
  if (date.getTime() < Date.now() - 30 * 60_000) date.setDate(date.getDate() + 1);
  return date;
}

function rushFactor(date: Date): number {
  const minute = date.getHours() * 60 + date.getMinutes();
  if (minute >= 7 * 60 && minute <= 9 * 60) return 1.18;
  if (minute >= 16 * 60 + 30 && minute <= 18 * 60 + 30) return 1.2;
  if (minute >= 6 * 60 && minute <= 7 * 60) return 1.08;
  return 1;
}

function buildOption(
  vehicle: Vehicle,
  distanceKm: number,
  departAt: Date,
  profileId: string,
  points: DashboardChartPointResponse[],
  summary: DashboardSummaryResponse,
): Option {
  const sample = sampleForecastAt(points, departAt, summary);
  const profile = getUserProfileRule(profileId);
  const traffic = rushFactor(departAt);
  const minutes = Math.max(4, (distanceKm / vehicle.speedKmh) * 60 * traffic);
  const adjustedPm25 = sample.pm25 * vehicle.exposureFactor * traffic;
  const aqi = pm25ToAqi(adjustedPm25);
  const pm25Exposure = adjustedPm25 * (minutes / 60) * vehicle.breathingFactor * profile.sensitivityMultiplier;
  const co2Kg = distanceKm * vehicle.co2KgPerKm;
  const healthRisk = clamp((aqi / 2.2) + pm25Exposure * 0.85 + (profile.sensitivityMultiplier - 1) * 18, 0, 100);
  const netZeroScore = clamp(100 - co2Kg * 28, 0, 100);
  const balancedScore = clamp(100 - healthRisk * 0.62 - co2Kg * 10 - minutes * 0.09, 0, 100);

  let recommendation = vehicle.note;
  if ((vehicle.id === "bicycle" || vehicle.id === "walk") && aqi > 100) {
    recommendation = "Giảm CO₂ rất tốt, nhưng AQI đang cao. Nên dời giờ hoặc chọn xe buýt.";
  } else if (vehicle.id === "bus" && aqi > 100) {
    recommendation = "Phương án cân bằng: CO₂ thấp hơn, nên đeo N95/KF94 khi chờ xe.";
  } else if (vehicle.id === "car" && co2Kg > 1) {
    recommendation = "Phơi nhiễm thấp nhưng phát thải cao. Nếu có thể, đi chung xe hoặc xe buýt.";
  }

  return {
    vehicle,
    minutes,
    co2Kg,
    pm25Exposure,
    aqi,
    healthRisk,
    netZeroScore,
    balancedScore,
    recommendation,
  };
}

export default function NetZeroMobilityPanel({ summary, points }: Props) {
  const [distanceKm, setDistanceKm] = useState(6);
  const [departTime, setDepartTime] = useState("07:00");
  const [profileId, setProfileId] = useState(summary.userGroup);

  const model = useMemo(() => {
    const departAt = timeValueToDate(departTime);
    const options = VEHICLES
      .map((vehicle) => buildOption(vehicle, distanceKm, departAt, profileId, points, summary))
      .sort((a, b) => b.balancedScore - a.balancedScore);
    const bestBalanced = options[0];
    const zeroBest = [...options].sort((a, b) => b.netZeroScore - a.netZeroScore || a.healthRisk - b.healthRisk)[0];
    const healthBest = [...options].sort((a, b) => a.healthRisk - b.healthRisk || b.netZeroScore - a.netZeroScore)[0];
    const bike = options.find((option) => option.vehicle.id === "bicycle");
    const bus = options.find((option) => option.vehicle.id === "bus");
    const shiftTarget = new Date(departAt.getTime() + 90 * 60_000);
    const shiftSample = sampleForecastAt(points, shiftTarget, summary);
    const shiftDrop = Math.max(0, Math.round(((sampleForecastAt(points, departAt, summary).pm25 - shiftSample.pm25) / Math.max(1, sampleForecastAt(points, departAt, summary).pm25)) * 100));

    return { departAt, options, bestBalanced, zeroBest, healthBest, bike, bus, shiftTarget, shiftDrop };
  }, [departTime, distanceKm, points, profileId, summary]);

  return (
    <section className="netzero-panel">
      <div className="netzero-panel__head">
        <div>
          <span>Net Zero & giảm phát thải</span>
          <h3>So sánh rủi ro sức khỏe và CO₂ theo phương tiện</h3>
          <p>
            AirSafeNet không chỉ khuyên đi đường nào sạch hơn, mà còn cân bằng giữa phơi nhiễm PM2.5,
            thời gian di chuyển và phát thải giao thông.
          </p>
        </div>
        <strong>{model.bestBalanced.vehicle.label} là phương án cân bằng</strong>
      </div>

      <div className="netzero-controls">
        <label>
          Quãng đường
          <input
            type="number"
            min={0.5}
            max={60}
            step={0.5}
            value={distanceKm}
            onChange={(event) => setDistanceKm(Math.max(0.5, Number(event.target.value) || 0.5))}
          />
          <span>km</span>
        </label>
        <label>
          Giờ xuất phát
          <input type="time" value={departTime} onChange={(event) => setDepartTime(event.target.value)} />
          <span>{formatHour(model.departAt)}</span>
        </label>
        <label>
          Hồ sơ sức khỏe
          <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
            {USER_PROFILE_RULES.map((rule) => <option key={rule.id} value={rule.id}>{rule.shortLabel}</option>)}
          </select>
          <span>ảnh hưởng điểm sức khỏe</span>
        </label>
      </div>

      <div className="netzero-choice-grid">
        <div className="netzero-choice">
          <span>Ít CO₂ nhất</span>
          <strong>{model.zeroBest.vehicle.label}</strong>
          <p>{model.zeroBest.co2Kg.toFixed(2)} kg CO₂ · risk {Math.round(model.zeroBest.healthRisk)}</p>
        </div>
        <div className="netzero-choice">
          <span>Tốt cho sức khỏe nhất</span>
          <strong>{model.healthBest.vehicle.label}</strong>
          <p>AQI {model.healthBest.aqi} · exposure {model.healthBest.pm25Exposure.toFixed(1)}</p>
        </div>
        <div className="netzero-choice netzero-choice--primary">
          <span>Cân bằng nhất</span>
          <strong>{model.bestBalanced.vehicle.label}</strong>
          <p>Score {Math.round(model.bestBalanced.balancedScore)} · {model.bestBalanced.recommendation}</p>
        </div>
      </div>

      <div className="netzero-table">
        {model.options.map((option) => (
          <div key={option.vehicle.id} className="netzero-row" style={{ "--row-color": riskColor(option.aqi) } as CSSProperties}>
            <div>
              <strong>{option.vehicle.label}</strong>
              <span>{option.vehicle.note}</span>
            </div>
            <span>{Math.round(option.minutes)} phút</span>
            <span>AQI {option.aqi}</span>
            <span>{option.pm25Exposure.toFixed(1)} exposure</span>
            <span>{option.co2Kg.toFixed(2)} kg CO₂</span>
            <strong>{Math.round(option.balancedScore)}</strong>
          </div>
        ))}
      </div>

      <div className="netzero-recommendation">
        <strong>Gợi ý hành động</strong>
        <p>
          {model.bike && model.bike.aqi > 100 && model.bus
            ? `Đi xe đạp giúp giảm CO₂, nhưng AQI lúc ${formatHour(model.departAt)} đang cao. Gợi ý dời sang ${formatHour(model.shiftTarget)}${model.shiftDrop > 0 ? `, PM2.5 có thể giảm khoảng ${model.shiftDrop}%` : ""}, hoặc dùng xe buýt và đeo N95 khi chờ xe.`
            : `${model.bestBalanced.vehicle.label} đang là lựa chọn cân bằng giữa sức khỏe và phát thải. Nếu linh hoạt, kiểm tra lại forecast trước khi xuất phát 30 phút.`}
        </p>
      </div>
    </section>
  );
}
