import { useMemo, useState } from "react";

// ══════════════════════════════════════════════════════════════════════════════
//  NGUỒN & PHƯƠNG PHÁP TÍNH
//  [1] World Bank (2016): "The Cost of Air Pollution" — chi phí phúc lợi toàn cầu
//  [2] WHO Global Burden of Disease 2021 — tương quan PM2.5 và bệnh tật
//  [3] Nguyen et al. (2019) Environmental Research — chi phí y tế tại VN
//  [4] Dân số TP.HCM: 9.5 triệu người (Cục Thống kê 2024)
//  [5] Tỷ giá: 1 USD = 25,000 VNĐ
// ══════════════════════════════════════════════════════════════════════════════

const HCMC_POPULATION = 9_500_000;
const USD_TO_VND      = 25_000;

function getCostPerPersonUsd(aqi: number): number {
  if (aqi <= 50)  return 0.05;
  if (aqi <= 100) return 0.30;
  if (aqi <= 150) return 0.80;
  if (aqi <= 200) return 1.80;
  if (aqi <= 300) return 3.50;
  return 7.00;
}

function getExposureRate(aqi: number): number {
  if (aqi <= 50)  return 0.10;
  if (aqi <= 100) return 0.35;
  if (aqi <= 150) return 0.60;
  if (aqi <= 200) return 0.75;
  return 0.80;
}

function getBreakdown(totalUsd: number) {
  return [
    { label: "Điều trị y tế trực tiếp",  pct: 0.42, icon: "🏥", color: "#ef4444" },
    { label: "Năng suất lao động mất",    pct: 0.31, icon: "💼", color: "#f97316" },
    { label: "Chi phí phòng ngừa",        pct: 0.16, icon: "😷", color: "#eab308" },
    { label: "Chi phí xã hội dài hạn",   pct: 0.11, icon: "📉", color: "#8b5cf6" },
  ].map(item => ({
    ...item,
    amountVnd: totalUsd * item.pct * USD_TO_VND,
  }));
}

function formatBillion(vnd: number): string {
  const b = vnd / 1_000_000_000;
  if (b >= 1000) return `${(b / 1000).toFixed(1)} nghìn tỷ`;
  if (b >= 100)  return `${Math.round(b)} tỷ`;
  if (b >= 10)   return `${b.toFixed(1)} tỷ`;
  return `${b.toFixed(2)} tỷ`;
}

function formatMillion(vnd: number): string {
  return `${Math.round(vnd / 1_000_000).toLocaleString("vi-VN")} triệu`;
}

type Props = {
  currentRisk:  string;
  currentAqi:   number;
  currentPm25:  number;
  warningCount: number;
  days:         number;
};

export default function ImpactEstimateWidget({ currentRisk, currentAqi, currentPm25, warningCount, days }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  const calc = useMemo(() => {
    const costPerPerson  = getCostPerPersonUsd(currentAqi);
    const exposureRate   = getExposureRate(currentAqi);
    const affectedPeople = Math.round(HCMC_POPULATION * exposureRate);
    const riskMultiplier = warningCount > 3 ? 1.2 : 1;
    const totalUsd       = costPerPerson * affectedPeople * riskMultiplier;
    const totalVnd       = totalUsd * USD_TO_VND;

    return {
      costPerPerson,
      exposureRate,
      affectedPeople,
      totalUsd,
      totalVnd,
      periodVnd:      totalVnd * days,
      costPerHourVnd: totalVnd / 24,
      whoMultiple:    currentPm25 > 0 ? (currentPm25 / 5).toFixed(1) : "—",
      breakdown:      getBreakdown(totalUsd),
    };
  }, [currentAqi, currentPm25, days]);

  const rc = currentRisk === "GOOD"                ? "#16a34a"
    : currentRisk === "MODERATE"                   ? "#ca8a04"
    : currentRisk === "UNHEALTHY_SENSITIVE"         ? "#ea580c"
    : currentRisk === "UNHEALTHY"                   ? "#dc2626"
    : currentRisk === "VERY_UNHEALTHY"              ? "#7c3aed"
    : "#7f1d1d";

  return (
    <div className="impact-widget">

      <div className="impact-header">
        <div>
          <div className="impact-eyebrow">💰 Chi phí y tế ước tính</div>
          <h3 className="impact-title">
            Ô nhiễm không khí hôm nay gây thiệt hại cho TP.HCM
          </h3>
        </div>
        <div className="impact-tags">
          <span className="impact-tag" style={{ color: rc, background: rc + "18", borderColor: rc + "35" }}>
            AQI {currentAqi}
          </span>
          <span className="impact-tag">
            ⚠ {warningCount} ngày cảnh báo
          </span>
          <span className="impact-tag">PM2.5 {currentPm25.toFixed(1)} µg/m³</span>
          <span className="impact-tag">{(calc.affectedPeople / 1_000_000).toFixed(1)}M người</span>
        </div>
      </div>

      <div className="impact-hero">
        <div className="impact-hero__left">
          <div className="impact-hero__eyebrow">ƯỚC TÍNH MỖI NGÀY</div>
          <div className="impact-hero__number" style={{ color: rc }}>
            {formatBillion(calc.totalVnd)}
            <span className="impact-hero__unit"> đồng</span>
          </div>
          <div className="impact-hero__usd">
            ≈ {(calc.totalUsd / 1_000_000).toFixed(2)} triệu USD
          </div>
        </div>

        <div className="impact-hero__right">
          <div className="impact-kpi">
            <span className="impact-kpi__icon">⏱</span>
            <div>
              <strong>{formatMillion(calc.costPerHourVnd)} đ</strong>
              <span>thiệt hại mỗi giờ</span>
            </div>
          </div>
          <div className="impact-kpi">
            <span className="impact-kpi__icon">📅</span>
            <div>
              <strong>{formatBillion(calc.periodVnd)} đ</strong>
              <span>trong {days} ngày dự báo</span>
            </div>
          </div>
          <div className="impact-kpi impact-kpi--who">
            <span className="impact-kpi__icon">🌍</span>
            <div>
              <strong style={{ color: "#ef4444" }}>{calc.whoMultiple}×</strong>
              <span>tiêu chuẩn WHO năm</span>
            </div>
          </div>
        </div>
      </div>

      <div className="impact-breakdown">
        <div className="impact-section-label">Cơ cấu thiệt hại theo nhóm</div>
        {calc.breakdown.map((item, i) => (
          <div key={i} className="impact-br-row">
            <span className="impact-br-row__icon">{item.icon}</span>
            <div className="impact-br-row__body">
              <div className="impact-br-row__top">
                <span>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>
                  {formatBillion(item.amountVnd)} đ
                </span>
              </div>
              <div className="impact-br-row__track">
                <div
                  className="impact-br-row__fill"
                  style={{ width: `${item.pct * 100}%`, background: item.color }}
                />
              </div>
            </div>
            <span className="impact-br-row__pct" style={{ color: item.color }}>
              {Math.round(item.pct * 100)}%
            </span>
          </div>
        ))}
      </div>

      <div className="impact-context">
        <div className="impact-section-label">🔍 Con số này tương đương...</div>
        <div className="impact-context-grid">
          <div className="impact-ctx-card">
            <span>🏫</span>
            <strong>{Math.round(calc.totalVnd / 2_000_000_000).toLocaleString("vi-VN")}</strong>
            <span>trường tiểu học xây mới</span>
          </div>
          <div className="impact-ctx-card">
            <span>🚑</span>
            <strong>{Math.round(calc.totalVnd / 50_000_000).toLocaleString("vi-VN")}</strong>
            <span>ca cấp cứu hô hấp</span>
          </div>
          <div className="impact-ctx-card">
            <span>💊</span>
            <strong>{Math.round(calc.totalVnd / 200_000).toLocaleString("vi-VN")}</strong>
            <span>đơn thuốc hô hấp</span>
          </div>
          <div className="impact-ctx-card">
            <span>👤</span>
            <strong>{(calc.costPerPerson * USD_TO_VND).toLocaleString("vi-VN")} đ</strong>
            <span>chi phí / người / ngày</span>
          </div>
        </div>
      </div>

      <div className="impact-method">
        <button
          className="impact-method__btn"
          onClick={() => setShowMethodology(v => !v)}
          type="button"
        >
          {showMethodology ? "▲" : "▼"} Phương pháp & nguồn tài liệu
        </button>

        {showMethodology && (
          <div className="impact-method__body">
            <p>
              Mô hình tính toán theo framework <strong>World Bank (2016)</strong> và nghiên cứu
              tác động y tế tại Việt Nam <strong>(Nguyen et al., 2019)</strong>.
            </p>
            <div className="impact-formula">
              <code>Chi phí / ngày  =  Chi phí / người / ngày  ×  Dân số bị ảnh hưởng</code>
              <code>Dân số bị ảnh hưởng  =  {HCMC_POPULATION.toLocaleString("vi-VN")} người  ×  {(calc.exposureRate * 100).toFixed(0)}%  (tỷ lệ tiếp xúc khi AQI = {currentAqi})</code>
              <code>Chi phí / người / ngày  =  {calc.costPerPerson.toFixed(2)} USD  (AQI {currentAqi})</code>
            </div>
            <p className="impact-method__note">
              ⚠ Đây là <strong>ước tính thống kê</strong>, không phải số đo thực tế. Con số thực tế
              thường cao hơn khi tính đầy đủ chi phí dài hạn (ung thư phổi, tuổi thọ giảm).
            </p>
            <div className="impact-method__sources">
              <strong>Nguồn tham khảo:</strong>
              <ul>
                <li>World Bank (2016): <em>The Cost of Air Pollution: Strengthening the Economic Case for Action</em></li>
                <li>WHO Global Burden of Disease Study 2021</li>
                <li>Nguyen T.T. et al. (2019): <em>Health and economic impacts of air pollution in Vietnam</em> — Environmental Research</li>
                <li>Cục Thống kê TP.HCM (2024): Dân số 9.5 triệu người</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
