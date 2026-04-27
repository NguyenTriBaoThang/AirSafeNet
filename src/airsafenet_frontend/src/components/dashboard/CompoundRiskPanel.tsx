/**
 *
 * Weather-AQI Compound Risk Score — tính toán rủi ro tổng hợp từ nhiều yếu tố:
 *
 * CÔNG THỨC:
 *   CompoundRisk = AQI_component × Temperature_multiplier
 *                × Humidity_multiplier × UV_multiplier
 *                × Wind_modifier × Group_sensitivity
 *
 * CÁC THÀNH PHẦN:
 *   1. AQI / PM2.5 base (0-100)
 *   2. Nhiệt độ: >32°C tăng nguy cơ heat stroke + mở rộng đường thở → hít nhiều PM2.5 hơn
 *   3. Độ ẩm: >80% làm hạt mịn hút nước, nặng hơn, chìm sâu hơn vào phổi
 *              <30% tăng bụi + kích ứng niêm mạc
 *   4. UV Index: >6 gây stress oxy hóa, tăng tác hại của ozone + PM2.5 lên tế bào
 *   5. Gió: gió mạnh phân tán PM2.5, gió nhẹ tích tụ ở mặt đất
 *   6. Áp suất thấp: tăng tích tụ ô nhiễm gần mặt đất
 *
 * Nguồn tham chiếu:
 *   - WHO 2021 Air Quality Guidelines
 *   - EPA Integrated Science Assessment for Particulate Matter (2019)
 *   - Heat-related illness + air pollution interaction studies (Lancet 2022)
 *
 * DATA: Fetch từ /api/air/explain (AiExplainResponse) — đã có weather realtime
 */

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type WeatherData = {
  temperature:  number;  
  humidity:     number; 
  uvIndex:      number;   
  windSpeed:    number;  
  windDirection:number;   
  pressure:     number;   
  cloudCover:   number;   
  predAqi:      number;
  predPm25:     number;
  generatedAt:  string;
};

type RiskFactor = {
  name:        string;
  icon:        string;
  value:       string;      
  unit:        string;
  multiplier:  number; 
  impact:      "positive" | "negative" | "neutral";
  description: string;
  color:       string;
};

type CompoundResult = {
  baseScore:       number; 
  compoundScore:   number;    
  amplification:   number;   
  factors:         RiskFactor[];
  totalMultiplier: number;
  label:           string;
  color:           string;
  summary:         string;
};

type UserGroup = "normal" | "child" | "elderly" | "respiratory" | "pregnant";

type Props = {
  userGroup: UserGroup;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";
const POLL_MS  = 10 * 60 * 1000;  // 10 phút

const GROUP_SENSITIVITY: Record<UserGroup, { temp: number; uv: number; humidity: number; label: string }> = {
  normal:      { temp: 1.00, uv: 1.00, humidity: 1.00, label: "Người bình thường" },
  child:       { temp: 1.15, uv: 1.20, humidity: 1.10, label: "Trẻ em" },
  elderly:     { temp: 1.30, uv: 1.15, humidity: 1.20, label: "Người cao tuổi" },
  respiratory: { temp: 1.10, uv: 1.10, humidity: 1.35, label: "Bệnh hô hấp" },
  pregnant:    { temp: 1.25, uv: 1.05, humidity: 1.15, label: "Thai phụ" },
};

function aqiToBaseScore(aqi: number): number {
  if (aqi <=  50) return aqi * 0.4;
  if (aqi <= 100) return 20 + (aqi -  50) * 0.4;
  if (aqi <= 150) return 40 + (aqi - 100) * 0.4;
  if (aqi <= 200) return 60 + (aqi - 150) * 0.3;
  if (aqi <= 300) return 75 + (aqi - 200) * 0.15;
  return Math.min(100, 90 + (aqi - 300) * 0.1);
}

function calcTempMultiplier(tempC: number, sensitivity: number): { mult: number; desc: string; color: string } {
  let mult = 1.0, desc = "", color = "#22c55e";

  if (tempC >= 38) {
    mult  = 1.45 * sensitivity;
    desc  = `${tempC}°C — Nguy hiểm. Nhiệt độ cực cao gây heat stroke + khuếch đại tác hại PM2.5 lên tim mạch.`;
    color = "#7f1d1d";
  } else if (tempC >= 35) {
    mult  = 1.30 * sensitivity;
    desc  = `${tempC}°C — Rất nóng. Cơ thể phải tản nhiệt mạnh hơn, hô hấp sâu hơn → hít nhiều PM2.5 hơn.`;
    color = "#ef4444";
  } else if (tempC >= 32) {
    mult  = 1.15 * sensitivity;
    desc  = `${tempC}°C — Nóng. Hoạt động ngoài trời dễ mệt nhanh, nguy cơ mất nước.`;
    color = "#f97316";
  } else if (tempC >= 28) {
    mult  = 1.05 * sensitivity;
    desc  = `${tempC}°C — Ấm. Ảnh hưởng nhẹ.`;
    color = "#eab308";
  } else if (tempC >= 18) {
    mult  = 1.00;
    desc  = `${tempC}°C — Mát mẻ, lý tưởng cho hoạt động ngoài trời.`;
    color = "#22c55e";
  } else {
    mult  = 1.08 * sensitivity;
    desc  = `${tempC}°C — Lạnh. Đường thở co lại, nhạy cảm hơn với chất kích thích.`;
    color = "#3b82f6";
  }

  return { mult: Math.round(mult * 100) / 100, desc, color };
}

function calcHumidityMultiplier(humidity: number, sensitivity: number): { mult: number; desc: string; color: string } {
  let mult = 1.0, desc = "", color = "#22c55e";

  if (humidity > 85) {
    mult  = 1.25 * sensitivity;
    desc  = `${humidity}% — Rất ẩm. Hạt PM2.5 hút nước, nặng hơn, lắng đọng sâu hơn trong phổi.`;
    color = "#a855f7";
  } else if (humidity > 70) {
    mult  = 1.12 * sensitivity;
    desc  = `${humidity}% — Ẩm. Hạt mịn có xu hướng hút ẩm, tăng kích thước hiệu dụng.`;
    color = "#8b5cf6";
  } else if (humidity >= 40) {
    mult  = 1.00;
    desc  = `${humidity}% — Độ ẩm lý tưởng, không có hiệu ứng đặc biệt.`;
    color = "#22c55e";
  } else if (humidity >= 25) {
    mult  = 1.10 * sensitivity;
    desc  = `${humidity}% — Khô. Niêm mạc mũi/họng khô hơn, giảm khả năng lọc bụi tự nhiên.`;
    color = "#f97316";
  } else {
    mult  = 1.20 * sensitivity;
    desc  = `${humidity}% — Rất khô. Nguy cơ kích ứng đường thở cao, dễ nứt niêm mạc.`;
    color = "#ef4444";
  }

  return { mult: Math.round(mult * 100) / 100, desc, color };
}

function calcUvMultiplier(uv: number, sensitivity: number): { mult: number; desc: string; color: string } {
  let mult = 1.0, desc = "", color = "#22c55e";

  if (uv >= 11) {
    mult  = 1.30 * sensitivity;
    desc  = `UV ${uv} — Cực cao. Tia UV phá vỡ NO₂ → tạo ozone mặt đất, khuếch đại tác hại PM2.5.`;
    color = "#7f1d1d";
  } else if (uv >= 8) {
    mult  = 1.18 * sensitivity;
    desc  = `UV ${uv} — Rất cao. Stress oxy hóa mạnh, tăng tổn thương tế bào khi kết hợp PM2.5.`;
    color = "#ef4444";
  } else if (uv >= 6) {
    mult  = 1.10 * sensitivity;
    desc  = `UV ${uv} — Cao. Cần kem chống nắng và bảo hộ đường hô hấp khi ra ngoài.`;
    color = "#f97316";
  } else if (uv >= 3) {
    mult  = 1.03 * sensitivity;
    desc  = `UV ${uv} — Trung bình. Ảnh hưởng nhẹ đến stress oxy hóa.`;
    color = "#eab308";
  } else {
    mult  = 1.00;
    desc  = `UV ${uv} — Thấp. Không có tác động đáng kể.`;
    color = "#22c55e";
  }

  return { mult: Math.round(mult * 100) / 100, desc, color };
}

function calcWindMultiplier(windSpeedKmh: number): { mult: number; desc: string; color: string } {
  let mult = 1.0, desc = "", color = "#22c55e";

  if (windSpeedKmh < 5) {
    mult  = 1.15;
    desc  = `${windSpeedKmh.toFixed(1)} km/h — Gần như không có gió. PM2.5 tích tụ gần mặt đất, nồng độ tăng.`;
    color = "#ef4444";
  } else if (windSpeedKmh < 15) {
    mult  = 1.05;
    desc  = `${windSpeedKmh.toFixed(1)} km/h — Gió nhẹ. PM2.5 chưa được phân tán đáng kể.`;
    color = "#eab308";
  } else if (windSpeedKmh < 30) {
    mult  = 0.90;
    desc  = `${windSpeedKmh.toFixed(1)} km/h — Gió vừa. Tốt! PM2.5 được phân tán, nồng độ thực tế thấp hơn.`;
    color = "#22c55e";
  } else {
    mult  = 0.80;
    desc  = `${windSpeedKmh.toFixed(1)} km/h — Gió mạnh. PM2.5 phân tán rất tốt, nhưng cẩn thận bụi cơ học.`;
    color = "#22c55e";
  }

  return { mult: Math.round(mult * 100) / 100, desc, color };
}

function calcPressureMultiplier(pressure: number): { mult: number; desc: string; color: string } {
  let mult = 1.0, desc = "", color = "#22c55e";

  if (pressure < 1005) {
    mult  = 1.12;
    desc  = `${pressure} hPa — Áp thấp. Xu hướng tích tụ ô nhiễm, nồng độ PM2.5 thực tế có thể cao hơn đo được.`;
    color = "#f97316";
  } else if (pressure < 1010) {
    mult  = 1.06;
    desc  = `${pressure} hPa — Hơi thấp. Phân tán khí kém hơn bình thường.`;
    color = "#eab308";
  } else if (pressure <= 1020) {
    mult  = 1.00;
    desc  = `${pressure} hPa — Áp suất bình thường, phân tán khí tốt.`;
    color = "#22c55e";
  } else {
    mult  = 0.95;
    desc  = `${pressure} hPa — Áp cao. Lớp đối lưu tốt, PM2.5 phân tán lên cao.`;
    color = "#22c55e";
  }

  return { mult: Math.round(mult * 100) / 100, desc, color };
}

function calcCompoundRisk(weather: WeatherData, userGroup: UserGroup): CompoundResult {
  const sens = GROUP_SENSITIVITY[userGroup];
  const baseScore = aqiToBaseScore(weather.predAqi);

  const windKmh = weather.windSpeed * 3.6; 

  const temp     = calcTempMultiplier    (weather.temperature, sens.temp);
  const humidity = calcHumidityMultiplier(weather.humidity,    sens.humidity);
  const uv       = calcUvMultiplier      (weather.uvIndex,     sens.uv);
  const wind     = calcWindMultiplier    (windKmh);
  const pressure = calcPressureMultiplier(weather.pressure);

  const totalMult = temp.mult * humidity.mult * uv.mult * wind.mult * pressure.mult;
  const raw       = baseScore * totalMult;
  const compound  = Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
  const amplif    = Math.round((totalMult - 1) * 100);

  const factors: RiskFactor[] = [
    {
      name: "Nhiệt độ", icon: "🌡️",
      value: `${weather.temperature.toFixed(1)}`, unit: "°C",
      multiplier: temp.mult,
      impact: temp.mult > 1.05 ? "negative" : temp.mult < 0.98 ? "negative" : "neutral",
      description: temp.desc, color: temp.color,
    },
    {
      name: "Độ ẩm", icon: "💧",
      value: `${weather.humidity.toFixed(0)}`, unit: "%",
      multiplier: humidity.mult,
      impact: humidity.mult > 1.05 ? "negative" : "neutral",
      description: humidity.desc, color: humidity.color,
    },
    {
      name: "UV Index", icon: "☀️",
      value: `${weather.uvIndex.toFixed(1)}`, unit: "",
      multiplier: uv.mult,
      impact: uv.mult > 1.05 ? "negative" : "neutral",
      description: uv.desc, color: uv.color,
    },
    {
      name: "Gió", icon: "💨",
      value: `${windKmh.toFixed(1)}`, unit: "km/h",
      multiplier: wind.mult,
      impact: wind.mult < 0.95 ? "positive" : wind.mult > 1.05 ? "negative" : "neutral",
      description: wind.desc, color: wind.color,
    },
    {
      name: "Áp suất", icon: "🌀",
      value: `${weather.pressure.toFixed(0)}`, unit: "hPa",
      multiplier: pressure.mult,
      impact: pressure.mult > 1.05 ? "negative" : pressure.mult < 0.97 ? "positive" : "neutral",
      description: pressure.desc, color: pressure.color,
    },
  ];

  let label = "", color = "";
  if (compound <= 20) { label = "Rất tốt";        color = "#22c55e"; }
  else if (compound <= 40) { label = "Tốt";        color = "#86efac"; }
  else if (compound <= 55) { label = "Trung bình"; color = "#eab308"; }
  else if (compound <= 70) { label = "Chú ý";      color = "#f97316"; }
  else if (compound <= 85) { label = "Kém";        color = "#ef4444"; }
  else                     { label = "Nguy hiểm";  color = "#a855f7"; }

  const worstFactor = factors.filter(f => f.impact === "negative")
    .sort((a,b) => b.multiplier - a.multiplier)[0];
  const bestFactor  = factors.filter(f => f.impact === "positive")[0];

  let summary = "";
  if (amplif > 30) {
    summary = `⚠️ Điều kiện thời tiết khuếch đại rủi ro PM2.5 lên ${amplif}% so với chỉ số AQI đơn thuần.`;
  } else if (amplif > 10) {
    summary = `Thời tiết làm tăng rủi ro thêm ${amplif}% so với AQI đơn thuần.`;
  } else if (amplif < -5) {
    summary = `✅ Gió tốt giúp giảm ${Math.abs(amplif)}% rủi ro so với AQI đơn thuần.`;
  } else {
    summary = `Thời tiết không ảnh hưởng đáng kể, rủi ro chủ yếu từ AQI.`;
  }

  if (worstFactor && amplif > 15) {
    summary += ` Yếu tố nguy hiểm nhất: ${worstFactor.icon} ${worstFactor.name} (×${worstFactor.multiplier}).`;
  }
  if (bestFactor) {
    summary += ` ${bestFactor.icon} ${bestFactor.name} giúp giảm nhẹ rủi ro.`;
  }

  return { baseScore, compoundScore: compound, amplification: amplif, factors, totalMultiplier: Math.round(totalMult*100)/100, label, color, summary };
}

function MultBadge({ mult }: { mult: number }) {
  const isPos  = mult < 0.97;
  const isNeg  = mult > 1.03;
  const color  = isPos ? "#22c55e" : isNeg ? "#ef4444" : "#64748b";
  const prefix = isPos ? "↓" : isNeg ? "↑" : "";

  return (
    <div className="crs-mult" style={{ color, borderColor: color + "40", background: color + "10" }}>
      {prefix}×{mult.toFixed(2)}
    </div>
  );
}

function DualScoreBar({ base, compound, compColor }: {
  base: number; compound: number; compColor: string;
}) {
  return (
    <div className="crs-dualbar">
      <div className="crs-dualbar__row">
        <span className="crs-dualbar__label">AQI đơn</span>
        <div className="crs-dualbar__track">
          <div className="crs-dualbar__fill crs-dualbar__fill--base"
            style={{ width: `${base}%` }} />
        </div>
        <span className="crs-dualbar__val">{Math.round(base)}</span>
      </div>
      <div className="crs-dualbar__row">
        <span className="crs-dualbar__label">Compound</span>
        <div className="crs-dualbar__track">
          <div className="crs-dualbar__fill"
            style={{ width: `${compound}%`, background: compColor }} />
        </div>
        <span className="crs-dualbar__val" style={{ color: compColor }}>
          {Math.round(compound)}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CompoundRiskPanel({ userGroup }: Props) {
  const [weather,  setWeather]  = useState<WeatherData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function doFetch() {
      const token = localStorage.getItem("airsafenet_token");
      if (!token) { setLoading(false); return; }

      fetch(`${API_BASE}/api/air/explain`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then((d: {
          predAqi: number; predPm25: number;
          temperature: number; humidity: number;
          uvIndex: number; windSpeed: number; windDirection: number;
          pressure: number; cloudCover: number; generatedAt: string;
        } | null) => {
          if (!d) return;
          setWeather({
            temperature:   d.temperature,
            humidity:      d.humidity,
            uvIndex:       d.uvIndex,
            windSpeed:     d.windSpeed,
            windDirection: d.windDirection,
            pressure:      d.pressure,
            cloudCover:    d.cloudCover,
            predAqi:       d.predAqi,
            predPm25:      d.predPm25,
            generatedAt:   d.generatedAt,
          });
          setError("");
        })
        .catch(() => setError("Không lấy được dữ liệu thời tiết"))
        .finally(() => setLoading(false));
    }

    doFetch();
    pollRef.current = setInterval(doFetch, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);  

  const result = weather ? calcCompoundRisk(weather, userGroup) : null;
  const sens   = GROUP_SENSITIVITY[userGroup];

  if (loading) return (
    <div className="crs-card">
      <div className="crs-loading">
        <div className="crs-spin" />
        <span>Đang tải dữ liệu thời tiết để tính Compound Risk...</span>
      </div>
    </div>
  );

  if (error || !weather || !result) return (
    <div className="crs-card crs-card--error">
      <span>🌤</span>
      <span>{error || "Chưa có dữ liệu thời tiết."}</span>
    </div>
  );

  const windKmh = (weather.windSpeed * 3.6).toFixed(1);

  return (
    <div className="crs-card">
      {/* ── Header ── */}
      <div className="crs-header">
        <div>
          <div className="crs-header__eyebrow">🌦 Weather-AQI Compound Risk</div>
          <h3 className="crs-header__title">Rủi ro tổng hợp thời tiết × PM2.5</h3>
          <p className="crs-header__sub">
            Nhóm: {sens.label} · Cập nhật: {new Date(weather.generatedAt).toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit"})}
          </p>
        </div>

        {/* Score ring */}
        <div className="crs-ring-wrap">
          <svg viewBox="0 0 80 80" className="crs-ring-svg">
            <circle cx="40" cy="40" r="32" fill="none"
              stroke="rgba(255,255,255,.07)" strokeWidth="7"/>
            {/* Base score (ghost) */}
            <circle cx="40" cy="40" r="32" fill="none"
              stroke="rgba(255,255,255,.18)" strokeWidth="7"
              strokeLinecap="round" transform="rotate(-90 40 40)"
              strokeDasharray={`${(result.baseScore/100)*201.1} 201.1`}
            />
            {/* Compound score */}
            <circle cx="40" cy="40" r="32" fill="none"
              stroke={result.color} strokeWidth="7"
              strokeLinecap="round" transform="rotate(-90 40 40)"
              strokeDasharray={`${(result.compoundScore/100)*201.1} 201.1`}
              style={{ transition: "stroke-dasharray .6s ease, stroke .3s" }}
            />
            <text x="40" y="35" textAnchor="middle"
              fill={result.color} fontSize="15" fontWeight="900" fontFamily="system-ui">
              {Math.round(result.compoundScore)}
            </text>
            <text x="40" y="47" textAnchor="middle"
              fill="rgba(255,255,255,.3)" fontSize="7" fontFamily="system-ui">
              Compound
            </text>
            <text x="40" y="57" textAnchor="middle"
              fill="rgba(255,255,255,.35)" fontSize="7.5" fontFamily="system-ui">
              ×{result.totalMultiplier}
            </text>
          </svg>
          <div className="crs-ring-label" style={{ color: result.color }}>
            {result.label}
          </div>
        </div>
      </div>

      {/* ── Weather snapshot ── */}
      <div className="crs-weather-row">
        {[
          { icon:"🌡️", val:`${weather.temperature.toFixed(1)}°C`, label:"Nhiệt độ" },
          { icon:"💧", val:`${weather.humidity.toFixed(0)}%`,      label:"Độ ẩm" },
          { icon:"☀️", val:`UV ${weather.uvIndex.toFixed(1)}`,     label:"UV Index" },
          { icon:"💨", val:`${windKmh} km/h`,                       label:"Gió" },
          { icon:"🌀", val:`${weather.pressure.toFixed(0)} hPa`,   label:"Áp suất" },
          { icon:"☁️", val:`${weather.cloudCover.toFixed(0)}%`,    label:"Mây" },
        ].map(({ icon, val, label }) => (
          <div key={label} className="crs-weather-chip">
            <span>{icon}</span>
            <div>
              <strong>{val}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Dual score bar ── */}
      <div className="crs-section">
        <div className="crs-section__title">So sánh AQI đơn vs Compound Risk</div>
        <DualScoreBar
          base={result.baseScore}
          compound={result.compoundScore}
          compColor={result.color}
        />
        <div className="crs-amplif">
          {result.amplification > 0
            ? <span style={{ color: "#ef4444" }}>▲ Thời tiết khuếch đại rủi ro thêm <strong>+{result.amplification}%</strong></span>
            : result.amplification < 0
            ? <span style={{ color: "#22c55e" }}>▼ Gió tốt giảm rủi ro <strong>{Math.abs(result.amplification)}%</strong></span>
            : <span style={{ color: "#64748b" }}>Thời tiết không ảnh hưởng đáng kể</span>
          }
          {" · "}Hệ số nhân tổng: <strong style={{ color: result.color }}>×{result.totalMultiplier}</strong>
        </div>
      </div>

      {/* ── Factor breakdown ── */}
      <div className="crs-section">
        <div className="crs-section__title">Chi tiết từng yếu tố</div>
        <div className="crs-factors">
          {result.factors.map(f => (
            <div key={f.name}
              className={`crs-factor ${expanded === f.name ? "crs-factor--open" : ""}`}
              onClick={() => setExpanded(p => p === f.name ? null : f.name)}>

              <div className="crs-factor__row">
                <span className="crs-factor__icon">{f.icon}</span>
                <div className="crs-factor__name">
                  <strong>{f.name}</strong>
                  <span style={{ color: f.color }}>{f.value}{f.unit && " "+f.unit}</span>
                </div>
                <MultBadge mult={f.multiplier} />
                <div className="crs-factor__bar-track">
                  <div className="crs-factor__bar-fill"
                    style={{
                      width:      `${Math.min(100, Math.abs((f.multiplier - 1) * 200))}%`,
                      background: f.impact === "positive" ? "#22c55e" : f.impact === "negative" ? "#ef4444" : "#64748b",
                      marginLeft: f.multiplier < 1 ? "auto" : undefined,
                    }} />
                </div>
                <span className="crs-factor__chevron">{expanded === f.name ? "▲" : "▼"}</span>
              </div>

              {expanded === f.name && (
                <div className="crs-factor__desc" style={{ borderColor: f.color + "30" }}>
                  {f.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="crs-summary" style={{
        background: result.color + "0c",
        borderColor: result.color + "30",
      }}>
        <div className="crs-summary__icon">
          {result.amplification > 30 ? "⚠️" : result.amplification < -5 ? "✅" : "ℹ️"}
        </div>
        <p>{result.summary}</p>
      </div>

      {/* ── Group sensitivity note ── */}
      {userGroup !== "normal" && (
        <div className="crs-group-note">
          <strong>{sens.label}</strong> — hệ số nhạy cảm nhiệt độ ×{sens.temp},
          UV ×{sens.uv}, độ ẩm ×{sens.humidity} so với người bình thường.
          Compound Risk phản ánh mức rủi ro thực tế cho nhóm của bạn.
        </div>
      )}
    </div>
  );
}