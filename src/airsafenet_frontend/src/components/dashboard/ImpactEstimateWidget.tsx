import { useMemo } from "react";
import { usePopulationData } from "../../hooks/usePopulationData";

type RiskLevel = "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "VERY_UNHEALTHY" | "HAZARDOUS";
type ImpactLevel = "none" | "low" | "medium" | "high" | "critical";
type Props = { currentRisk: string; currentAqi: number; currentPm25: number; warningCount: number; days: number; };
type GroupImpact = { groupKey: string; group: string; icon: string; population: number; impactLevel: ImpactLevel; impactLabel: string; advice: string; colorClass: string; };
type ImpactDef = { level: ImpactLevel; label: string; advice: string };

const MATRIX: Record<RiskLevel, Record<string, ImpactDef>> = {
  GOOD: {
    children:        { level: "none",     label: "Không ảnh hưởng",   advice: "Trẻ em có thể vui chơi ngoài trời thoải mái" },
    elderly:         { level: "none",     label: "Không ảnh hưởng",   advice: "Người cao tuổi có thể đi bộ, tập thể dục nhẹ" },
    respiratory:     { level: "low",      label: "Ảnh hưởng nhẹ",     advice: "Theo dõi triệu chứng nếu hoạt động mạnh" },
    pregnant:        { level: "none",     label: "Không ảnh hưởng",   advice: "An toàn để ra ngoài" },
    outdoor_workers: { level: "none",     label: "Không ảnh hưởng",   advice: "Làm việc ngoài trời bình thường" },
  },
  MODERATE: {
    children:        { level: "medium",   label: "Cần chú ý",          advice: "Hạn chế vận động mạnh, đeo khẩu trang khi ra ngoài" },
    elderly:         { level: "medium",   label: "Cần chú ý",          advice: "Hạn chế ở ngoài quá 2 tiếng, đeo khẩu trang" },
    respiratory:     { level: "high",     label: "Ảnh hưởng rõ",      advice: "Mang theo thuốc, hạn chế ra ngoài giờ cao điểm" },
    pregnant:        { level: "medium",   label: "Cần chú ý",          advice: "Hạn chế ở ngoài lâu, đặc biệt giờ kẹt xe" },
    outdoor_workers: { level: "low",      label: "Ảnh hưởng nhẹ",     advice: "Nghỉ giải lao trong nhà, uống đủ nước" },
  },
  UNHEALTHY_SENSITIVE: {
    children:        { level: "high",     label: "Ảnh hưởng rõ",      advice: "Không cho trẻ chơi ngoài trời, đóng cửa sổ" },
    elderly:         { level: "high",     label: "Ảnh hưởng rõ",      advice: "Ở trong nhà, tránh hoạt động thể chất ngoài trời" },
    respiratory:     { level: "critical", label: "Nguy cơ cao",         advice: "Ở trong nhà, dùng máy lọc không khí nếu có" },
    pregnant:        { level: "high",     label: "Ảnh hưởng rõ",      advice: "Ở trong nhà, tránh khu vực đông xe cộ" },
    outdoor_workers: { level: "medium",   label: "Cần chú ý",          advice: "Đeo khẩu trang N95, nghỉ trong nhà thường xuyên" },
  },
  UNHEALTHY: {
    children:        { level: "critical", label: "Nguy cơ cao",         advice: "Giữ trẻ trong nhà, đóng cửa sổ, tránh lọt không khí" },
    elderly:         { level: "critical", label: "Nguy cơ cao",         advice: "Ở trong nhà hoàn toàn, theo dõi sức khỏe liên tục" },
    respiratory:     { level: "critical", label: "Nguy cơ rất cao",     advice: "Không ra ngoài, sử dụng thuốc theo chỉ định bác sĩ" },
    pregnant:        { level: "critical", label: "Nguy cơ cao",         advice: "Ở trong nhà hoàn toàn, tham khảo ý kiến bác sĩ" },
    outdoor_workers: { level: "high",     label: "Ảnh hưởng rõ",      advice: "Yêu cầu thiết bị bảo hộ N95, xem xét dừng công việc" },
  },
  VERY_UNHEALTHY: {
    children:        { level: "critical", label: "Nguy cơ rất cao",     advice: "Tuyệt đối không ra ngoài" },
    elderly:         { level: "critical", label: "Nguy cơ rất cao",     advice: "Tuyệt đối không ra ngoài, gọi hỗ trợ y tế nếu cần" },
    respiratory:     { level: "critical", label: "Khẩn cấp",            advice: "Liên hệ ngay bác sĩ nếu có triệu chứng" },
    pregnant:        { level: "critical", label: "Nguy cơ rất cao",     advice: "Tuyệt đối không ra ngoài, tham khảo bác sĩ ngay" },
    outdoor_workers: { level: "critical", label: "Dừng công việc",      advice: "Dừng mọi hoạt động ngoài trời ngay lập tức" },
  },
  HAZARDOUS: {
    children:        { level: "critical", label: "Cực kỳ nguy hiểm",    advice: "Sơ tán đến nơi có không khí sạch nếu có thể" },
    elderly:         { level: "critical", label: "Cực kỳ nguy hiểm",    advice: "Theo dõi y tế ngay lập tức" },
    respiratory:     { level: "critical", label: "Cực kỳ nguy hiểm",    advice: "Cần hỗ trợ y tế ngay" },
    pregnant:        { level: "critical", label: "Cực kỳ nguy hiểm",    advice: "Đến cơ sở y tế ngay lập tức" },
    outdoor_workers: { level: "critical", label: "Dừng & sơ tán",       advice: "Dừng tất cả hoạt động, đến nơi an toàn" },
  },
};

function impactColorClass(level: ImpactLevel) {
  return { none: "impact-group--none", low: "impact-group--low", medium: "impact-group--medium", high: "impact-group--high", critical: "impact-group--critical" }[level];
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} triệu`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} nghìn`;
  return n.toLocaleString("vi-VN");
}

const RISK_LABEL: Record<RiskLevel, string> = {
  GOOD: "Tốt", MODERATE: "Trung bình", UNHEALTHY_SENSITIVE: "Không tốt cho nhóm nhạy cảm",
  UNHEALTHY: "Có hại cho sức khỏe", VERY_UNHEALTHY: "Rất có hại", HAZARDOUS: "Nguy hiểm",
};

const HEADER_CLASS: Record<RiskLevel, string> = {
  GOOD: "impact-header--good", MODERATE: "impact-header--moderate",
  UNHEALTHY_SENSITIVE: "impact-header--sensitive", UNHEALTHY: "impact-header--unhealthy",
  VERY_UNHEALTHY: "impact-header--critical", HAZARDOUS: "impact-header--critical",
};

export default function ImpactEstimateWidget({ currentRisk, currentAqi, currentPm25, warningCount, days }: Props) {
  const { population, loading: popLoading, error: popError } = usePopulationData();
  const risk = (currentRisk as RiskLevel) || "MODERATE";
  const headerClass = HEADER_CLASS[risk] ?? "impact-header--moderate";

  const groups: GroupImpact[] = useMemo(() => {
    const defs = [
      { groupKey: "children",        group: "Trẻ em dưới 15 tuổi",       icon: "🧒", pop: population.children },
      { groupKey: "elderly",         group: "Người cao tuổi (65+)",       icon: "👴", pop: population.elderly },
      { groupKey: "respiratory",     group: "Người bệnh hô hấp mãn tính", icon: "🫁", pop: population.respiratory },
      { groupKey: "pregnant",        group: "Phụ nữ mang thai",           icon: "🤰", pop: population.pregnant },
      { groupKey: "outdoor_workers", group: "Người làm việc ngoài trời",  icon: "👷", pop: population.outdoor_workers },
    ];
    return defs.map(({ groupKey, group, icon, pop }) => {
      const def = MATRIX[risk]?.[groupKey] ?? { level: "low" as ImpactLevel, label: "Theo dõi", advice: "Chú ý sức khỏe" };
      return { groupKey, group, icon, population: pop, impactLevel: def.level, impactLabel: def.label, advice: def.advice, colorClass: impactColorClass(def.level) };
    });
  }, [risk, population]);

  const totalAffected = useMemo(() => groups.filter(g => ["medium","high","critical"].includes(g.impactLevel)).reduce((s,g) => s + g.population, 0), [groups]);
  const affectedPct = ((totalAffected / population.hcmcTotal) * 100).toFixed(1);

  return (
    <div className="impact-widget">
      <div className={`impact-header ${headerClass}`}>
        <div className="impact-header__left">
          <div className="impact-header__eyebrow">
            Ước tính tác động — TP. Hồ Chí Minh
            {population.isReal
              ? <span className="impact-source-badge impact-source-badge--live">✓ World Bank {population.dataYear}</span>
              : <span className="impact-source-badge impact-source-badge--fallback">⚠ UN 2025 (offline)</span>
            }
          </div>
          <h3 className="impact-header__title">
            {popLoading ? <span className="impact-skeleton" /> : <>{formatNumber(totalAffected)}<span> người cần chú ý</span></>}
          </h3>
          <p className="impact-header__sub">
            {affectedPct}% dân số HCMC ({formatNumber(population.hcmcTotal)} người) với AQI hiện tại <strong>{currentAqi}</strong> — {RISK_LABEL[risk]}
          </p>
          {popError && <p className="impact-api-note">ℹ️ {popError}</p>}
        </div>
        <div className="impact-header__right">
          <div className="impact-kpi"><strong>{currentAqi}</strong><span>AQI</span></div>
          <div className="impact-kpi"><strong>{currentPm25.toFixed(1)}</strong><span>µg/m³</span></div>
          {warningCount > 0 && <div className="impact-kpi impact-kpi--warn"><strong>{warningCount}</strong><span>giờ cảnh báo / {days} ngày</span></div>}
        </div>
      </div>

      <div className="impact-groups">
        {groups.map((g, i) => (
          <div key={g.groupKey} className={`impact-group ${g.colorClass}`} style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="impact-group__left">
              <span className="impact-group__icon">{g.icon}</span>
              <div>
                <div className="impact-group__name">{g.group}</div>
                <div className="impact-group__pop">{popLoading ? "Đang tải..." : `${formatNumber(g.population)} người`}</div>
              </div>
            </div>
            <div className="impact-group__right">
              <span className="impact-group__badge">{g.impactLabel}</span>
              <span className="impact-group__advice">{g.advice}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="impact-progress-section">
        <div className="impact-progress-label">
          <span>Tỉ lệ dân số cần chú ý</span>
          <strong>{affectedPct}%</strong>
        </div>
        <div className="impact-progress-bar">
          <div className={`impact-progress-fill ${headerClass}`} style={{ width: `${Math.min(parseFloat(affectedPct), 100)}%` }} />
        </div>
        <div className="impact-progress-legend"><span>0%</span><span>50%</span><span>100%</span></div>
      </div>

      <div className="impact-footer">
        <span>📊</span>
        <span>{population.source} · Đánh giá rủi ro theo WHO & US EPA AQI</span>
      </div>
    </div>
  );
}
