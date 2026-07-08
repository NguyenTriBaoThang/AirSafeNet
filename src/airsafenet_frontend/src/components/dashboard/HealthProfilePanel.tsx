import { getUserProfileRule, type UserProfileRule } from "../../data/userProfileRules";

export type UserGroup = string;

type Activity = {
  name: string;
  icon: string;
  isOutdoor: boolean;
  intensity: "low" | "moderate" | "high";
  durationMinutes: number;
  forecastAqi: number;
  forecastPm25: number;
  riskScore: number;
};

type BorgResult = {
  score: number;
  label: string;
  color: string;
  description: string;
};

type MaskRec = {
  label: string;
  emoji: string;
  reason: string;
  color: string;
  fitFactor: string;
  notes?: string;
};

type MaxTimeResult = {
  minutes: number;
  label: string;
  color: string;
  withMask: number;
  notes: string;
};

type Warning = { icon: string; text: string; severity: "critical" | "warning" | "info" };

const BORG_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Không cảm nhận", color: "#22c55e" },
  1: { label: "Rất nhẹ", color: "#86efac" },
  2: { label: "Nhẹ", color: "#bef264" },
  3: { label: "Vừa phải", color: "#eab308" },
  4: { label: "Hơi nặng", color: "#fbbf24" },
  5: { label: "Nặng", color: "#f97316" },
  6: { label: "Nặng hơn", color: "#fb923c" },
  7: { label: "Rất nặng", color: "#ef4444" },
  8: { label: "Rất nặng ++", color: "#dc2626" },
  9: { label: "Cực kỳ nặng", color: "#b91c1c" },
  10: { label: "Tối đa", color: "#7f1d1d" },
};

function riskFromAqi(aqi: number): "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "VERY_UNHEALTHY" {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY_SENSITIVE";
  if (aqi <= 200) return "UNHEALTHY";
  return "VERY_UNHEALTHY";
}

function profileColor(rule: UserProfileRule): string {
  switch (rule.id) {
    case "child_school": return "#f59e0b";
    case "elderly": return "#8b5cf6";
    case "asthma": return "#ef4444";
    case "outdoor_athlete": return "#06b6d4";
    case "motorbike_commuter": return "#3b82f6";
    case "pregnant": return "#ec4899";
    default: return "#3b82f6";
  }
}

function profileIcon(rule: UserProfileRule): string {
  switch (rule.id) {
    case "child_school": return "🏫";
    case "elderly": return "🧓";
    case "asthma": return "🫁";
    case "outdoor_athlete": return "🏃";
    case "motorbike_commuter": return "🛵";
    case "pregnant": return "🤰";
    default: return "👤";
  }
}

function calcBorgScore(
  aqi: number,
  intensity: string,
  userGroup: UserGroup,
): BorgResult {
  const rule = getUserProfileRule(userGroup);
  const baseRpe: Record<string, number> = { low: 2, moderate: 4, high: 6.5 };
  let score = baseRpe[intensity] ?? 4;

  if (aqi > 50) score += (aqi - 50) / 50 * 0.6;
  if (aqi > 100) score += (aqi - 100) / 50 * 0.5;
  if (aqi > 150) score += (aqi - 150) / 50 * 0.6;
  if (aqi > 200) score += (aqi - 200) / 50 * 0.8;

  score *= rule.sensitivityMultiplier;
  if (rule.id === "outdoor_athlete" && intensity === "high") score += 0.7;
  if (rule.id === "motorbike_commuter") score += 0.35;
  score = Math.min(10, Math.max(0, Math.round(score * 10) / 10));

  const roundedScore = Math.min(10, Math.round(score));
  const borg = BORG_LABELS[roundedScore];
  return {
    score,
    label: borg.label,
    color: borg.color,
    description: getBorgDescription(roundedScore, rule),
  };
}

function getBorgDescription(score: number, rule: UserProfileRule): string {
  if (score >= 7) return `${rule.shortLabel}: ${rule.outdoorRule}`;
  if (score >= 5) return `${rule.shortLabel}: giảm cường độ, rút ngắn thời lượng và theo dõi triệu chứng.`;
  if (score >= 3) return `${rule.shortLabel}: ${rule.activityAdvice}`;
  return `${rule.shortLabel}: mức gắng sức phù hợp, vẫn ưu tiên khung AQI thấp.`;
}

function getMaskRecommendation(
  aqi: number,
  userGroup: UserGroup,
  outdoor: boolean,
  intensity: string,
): MaskRec {
  const rule = getUserProfileRule(userGroup);
  const color = profileColor(rule);

  if (!outdoor) {
    return {
      label: "Không cần đặc biệt",
      emoji: "✓",
      reason: "Hoạt động trong nhà giảm phơi nhiễm trực tiếp PM2.5.",
      color: "#22c55e",
      fitFactor: "-",
    };
  }

  if (aqi >= 150 || rule.id === "asthma" || rule.id === "motorbike_commuter") {
    return {
      label: rule.id === "outdoor_athlete" && intensity === "high" ? "Nên đổi giờ" : "N95 / KN95",
      emoji: "😷",
      reason: rule.maskRule,
      color: aqi >= 150 ? "#ef4444" : color,
      fitFactor: "≥95%",
      notes: rule.id === "outdoor_athlete" ? "Không nên tập nặng ở mức AQI buộc phải đeo N95." : undefined,
    };
  }

  if (aqi >= rule.recommendedNotifyThreshold || aqi > 100) {
    return {
      label: "KF94 / N95",
      emoji: "😷",
      reason: rule.maskRule,
      color: "#f97316",
      fitFactor: "≥94-95%",
    };
  }

  if (aqi > 50 || rule.sensitivityMultiplier > 1) {
    return {
      label: "Mang theo dự phòng",
      emoji: "😷",
      reason: rule.outdoorRule,
      color: "#eab308",
      fitFactor: "tùy loại",
    };
  }

  return {
    label: "Không bắt buộc",
    emoji: "✓",
    reason: "AQI tốt, không cần bảo hộ hô hấp đặc biệt.",
    color: "#22c55e",
    fitFactor: "-",
  };
}

function getMaxOutdoorTime(
  aqi: number,
  userGroup: UserGroup,
  intensity: string,
): MaxTimeResult {
  const rule = getUserProfileRule(userGroup);
  const risk = riskFromAqi(aqi);
  let minutes = risk === "GOOD"
    ? rule.maxOutdoorGoodMinutes
    : risk === "MODERATE"
      ? rule.maxOutdoorModerateMinutes
      : risk === "UNHEALTHY_SENSITIVE"
        ? rule.maxOutdoorSensitiveMinutes
        : risk === "UNHEALTHY"
          ? rule.maxOutdoorUnhealthyMinutes
          : rule.maxOutdoorVeryUnhealthyMinutes;

  if (intensity === "high") minutes = Math.round(minutes * 0.6);
  if (rule.id === "outdoor_athlete" && intensity === "high" && aqi > 100) minutes = Math.min(minutes, 30);
  if (rule.id === "motorbike_commuter" && aqi > 100) minutes = Math.min(minutes, 30);

  const withMask = minutes <= 0 ? 0 : Math.round(Math.min(minutes * 1.4, rule.maxOutdoorModerateMinutes));
  const color = minutes <= 0 ? "#7f1d1d" : minutes <= 15 ? "#ef4444" : minutes <= 30 ? "#f97316" : minutes <= 60 ? "#eab308" : "#22c55e";
  const label = minutes <= 0 ? "Không nên ra ngoài" : minutes >= 120 ? "Không hạn chế nhiều" : `Tối đa ${minutes} phút`;

  return {
    minutes,
    label,
    color,
    withMask,
    notes: rule.outdoorRule,
  };
}

function getGroupWarnings(userGroup: UserGroup, aqi: number, activity: Activity): Warning[] {
  const rule = getUserProfileRule(userGroup);
  const warnings: Warning[] = [];

  if (aqi >= rule.recommendedNotifyThreshold) {
    warnings.push({ icon: "⚠️", severity: "warning", text: rule.alertRule });
  }

  if (rule.id === "child_school") {
    warnings.push({ icon: "🏫", severity: aqi > 100 ? "warning" : "info", text: "Giảm ra chơi/thể dục ngoài trời, ưu tiên đi thẳng vào lớp." });
  }
  if (rule.id === "asthma") {
    warnings.push({ icon: "💊", severity: aqi > 100 ? "critical" : "info", text: "Mang thuốc theo chỉ định; dừng hoạt động nếu khò khè, khó thở hoặc tức ngực." });
  }
  if (rule.id === "outdoor_athlete" && activity.intensity === "high") {
    warnings.push({ icon: "🏃", severity: aqi > 100 ? "warning" : "info", text: "Nếu AQI tăng, giảm còn 30 phút hoặc chuyển indoor." });
  }
  if (rule.id === "motorbike_commuter") {
    warnings.push({ icon: "🛵", severity: aqi > 90 ? "warning" : "info", text: "Đeo N95/KN95 ôm kín, tránh tuyến kẹt xe và đứng lâu sau xe tải/xe buýt." });
  }
  if (rule.id === "pregnant") {
    warnings.push({ icon: "🤰", severity: aqi > 100 ? "warning" : "info", text: "Ưu tiên hoạt động trong nhà, dời lịch ra ngoài sang khung AQI thấp." });
  }
  if (rule.id === "elderly") {
    warnings.push({ icon: "💧", severity: aqi > 100 ? "warning" : "info", text: "Đi chậm, nghỉ giữa chặng và vào trong nhà nếu chóng mặt, tức ngực hoặc khó thở." });
  }

  return warnings;
}

function BorgScaleBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="hpanel-borg">
      <div className="hpanel-borg__track">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className="hpanel-borg__seg"
            style={{
              background: i <= Math.round(score)
                ? BORG_LABELS[i]?.color ?? color
                : "rgba(255,255,255,.07)",
              opacity: i === Math.round(score) ? 1 : i < Math.round(score) ? 0.6 : 0.25,
            }}
          />
        ))}
      </div>
      <div className="hpanel-borg__labels">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}

type PanelProps = {
  activity: Activity;
  userGroup: UserGroup;
};

export function HealthProfilePanel({ activity, userGroup }: PanelProps) {
  const rule = getUserProfileRule(userGroup);
  const borg = calcBorgScore(activity.forecastAqi, activity.intensity, rule.id);
  const mask = getMaskRecommendation(activity.forecastAqi, rule.id, activity.isOutdoor, activity.intensity);
  const maxTime = getMaxOutdoorTime(activity.forecastAqi, rule.id, activity.intensity);
  const warnings = getGroupWarnings(rule.id, activity.forecastAqi, activity);

  return (
    <div className="hpanel">
      <div className="hpanel__header">
        <span className="hpanel__badge">
          🏥 Phân tích sức khỏe · {rule.shortLabel}
        </span>
      </div>

      <div className="hpanel__grid">
        <div className="hpanel__block">
          <div className="hpanel__block-title">🫁 Borg CR-10 — độ khó thở dự kiến</div>
          <div className="hpanel__borg-score">
            <strong style={{ color: borg.color }}>{borg.score.toFixed(1)}</strong>
            <span style={{ color: borg.color }}>{borg.label}</span>
          </div>
          <BorgScaleBar score={borg.score} color={borg.color} />
          <p className="hpanel__desc">{borg.description}</p>
        </div>

        <div className="hpanel__block">
          <div className="hpanel__block-title">😷 Khẩu trang khuyến nghị</div>
          <div className="hpanel__mask">
            <div className="hpanel__mask-main">
              <span className="hpanel__mask-emoji">{mask.emoji}</span>
              <div>
                <strong style={{ color: mask.color }}>{mask.label}</strong>
                <div className="hpanel__mask-ff">Lọc {mask.fitFactor}</div>
              </div>
            </div>
            <p className="hpanel__desc">{mask.reason}</p>
            {mask.notes && <div className="hpanel__mask-note">💡 {mask.notes}</div>}
          </div>
        </div>

        {activity.isOutdoor && (
          <div className="hpanel__block">
            <div className="hpanel__block-title">⏱ Thời gian tối đa ngoài trời</div>
            <div className="hpanel__maxtime">
              <strong style={{ color: maxTime.color }}>{maxTime.label}</strong>
              {maxTime.minutes > 0 && <div className="hpanel__maxtime-mask">Với N95: tối đa {maxTime.withMask} phút</div>}
            </div>
            <div className="hpanel__maxtime-bar-track">
              <div
                className="hpanel__maxtime-bar-fill"
                style={{
                  width: `${Math.min(100, (maxTime.minutes / Math.max(1, rule.maxOutdoorGoodMinutes)) * 100)}%`,
                  background: maxTime.color,
                }}
              />
              <div
                className="hpanel__maxtime-marker"
                style={{ left: `${Math.min(99, (activity.durationMinutes / Math.max(1, rule.maxOutdoorGoodMinutes)) * 100)}%` }}
                title={`Thời lượng hoạt động: ${activity.durationMinutes}p`}
              />
            </div>
            <div className="hpanel__maxtime-legend">
              <span>0</span>
              <span style={{ left: `${Math.min(99, (activity.durationMinutes / Math.max(1, rule.maxOutdoorGoodMinutes)) * 100)}%`, color: maxTime.color }}>
                {activity.durationMinutes}p
              </span>
              <span>{rule.maxOutdoorGoodMinutes}p</span>
            </div>
            <p className="hpanel__desc">{maxTime.notes}</p>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="hpanel__warnings">
          {warnings.map((warning, index) => (
            <div key={`${warning.text}-${index}`} className={`hpanel__warning hpanel__warning--${warning.severity}`}>
              <span className="hpanel__warning-icon">{warning.icon}</span>
              <span>{warning.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type SummaryProps = {
  userGroup: UserGroup;
  currentAqi: number;
  activities: Activity[];
};

export function HealthProfileSummary({ userGroup, currentAqi, activities }: SummaryProps) {
  const rule = getUserProfileRule(userGroup);
  const color = profileColor(rule);
  const dominantMask = getMaskRecommendation(currentAqi, rule.id, true, "moderate");
  const maxTime = getMaxOutdoorTime(currentAqi, rule.id, "moderate");
  const outdoorCount = activities.filter((activity) => activity.isOutdoor).length;

  return (
    <div className="hpsummary" style={{ background: `${color}1f`, borderColor: `${color}4d` }}>
      <div className="hpsummary__left">
        <span className="hpsummary__icon" style={{ color }}>{profileIcon(rule)}</span>
        <div>
          <div className="hpsummary__label" style={{ color }}>{rule.label}</div>
          <div className="hpsummary__chips">
            <div className="hpsummary__chip" style={{ borderColor: `${dominantMask.color}50`, color: dominantMask.color }}>
              {dominantMask.emoji} {dominantMask.label}
            </div>
            {outdoorCount > 0 && (
              <div className="hpsummary__chip" style={{ borderColor: `${maxTime.color}50`, color: maxTime.color }}>
                ⏱ {maxTime.label}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="hpsummary__tip" style={{ color: `${color}cc` }}>
        {currentAqi >= rule.recommendedNotifyThreshold ? rule.alertRule : rule.activityAdvice}
      </div>
    </div>
  );
}