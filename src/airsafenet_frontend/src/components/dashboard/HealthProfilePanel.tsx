/**
 *
 * Hiển thị thông tin sức khỏe chuyên sâu theo userGroup:
 *
 * Tính năng:
 *   1. Borg Scale (CR-10) — thang đo khó thở 0-10 dự kiến theo AQI + cường độ
 *      Dựa trên: AQI → predicted RPE (Rating of Perceived Exertion)
 *      Nguồn: WHO 2021 Air Quality Guidelines + Exercise Physiology literature
 *
 *   2. Mask Recommendation — N95 vs KF94 vs surgical vs none
 *      Dựa trên: AQI + nhóm người dùng + loại hoạt động
 *
 *   3. Max Outdoor Time — thời gian tối đa được ở ngoài theo AQI + nhóm
 *      Dựa trên: WHO exposure limits + sensitive group multipliers
 *
 *   4. Personalized warnings per group:
 *      - respiratory: peak flow warning, bronchodilator reminder
 *      - child:       playground guidance, parent alert threshold
 *      - elderly:     cardiac strain, rest frequency
 *      - pregnant:    fetal protection, trim-specific advice
 *
 */

export type UserGroup = "normal" | "child" | "elderly" | "respiratory" | "pregnant";

type Activity = {
  name:            string;
  icon:            string;
  isOutdoor:       boolean;
  intensity:       "low" | "moderate" | "high";
  durationMinutes: number;
  forecastAqi:     number;
  forecastPm25:    number;
  riskScore:       number;
};

type BorgResult = {
  score:       number;   
  label:       string;
  color:       string;
  description: string;
};

const BORG_LABELS: Record<number, { label: string; color: string }> = {
  0:  { label: "Không cảm nhận", color: "#22c55e" },
  1:  { label: "Rất nhẹ",        color: "#86efac" },
  2:  { label: "Nhẹ",            color: "#bef264" },
  3:  { label: "Vừa phải",       color: "#eab308" },
  4:  { label: "Hơi nặng",       color: "#fbbf24" },
  5:  { label: "Nặng",           color: "#f97316" },
  6:  { label: "Nặng hơn",       color: "#fb923c" },
  7:  { label: "Rất nặng",       color: "#ef4444" },
  8:  { label: "Rất nặng ++",    color: "#dc2626" },
  9:  { label: "Cực kỳ nặng",    color: "#b91c1c" },
  10: { label: "Tối đa",         color: "#7f1d1d" },
};

function calcBorgScore(
  aqi:       number,
  intensity: string,
  group:     UserGroup,
): BorgResult {
  const baseRpe: Record<string, number> = { low: 2, moderate: 4, high: 6.5 };
  let score = baseRpe[intensity] ?? 4;

  if (aqi > 50)  score += (aqi - 50)  / 50 * 0.6;
  if (aqi > 100) score += (aqi - 100) / 50 * 0.5;
  if (aqi > 150) score += (aqi - 150) / 50 * 0.6;
  if (aqi > 200) score += (aqi - 200) / 50 * 0.8;

  const groupMult: Record<UserGroup, number> = {
    normal:      1.0,
    child:       1.1,   
    elderly:     1.25,  
    respiratory: 1.45,  
    pregnant:    1.2,   
  };
  score *= groupMult[group] ?? 1.0;
  score = Math.min(10, Math.max(0, Math.round(score * 10) / 10));

  const roundedScore = Math.round(score);
  const bLabel = BORG_LABELS[Math.min(10, roundedScore)];

  return {
    score,
    label:       bLabel.label,
    color:       bLabel.color,
    description: getBorgDescription(roundedScore, group),
  };
}

function getBorgDescription(score: number, group: UserGroup): string {
  if (group === "respiratory") {
    if (score >= 7) return "Nguy cơ co thắt phế quản cao. Chuẩn bị thuốc giãn phế quản, dừng hoạt động nếu khó thở.";
    if (score >= 5) return "Có thể cảm thấy khó thở và thở khò khè. Giảm cường độ, thở bằng mũi.";
    if (score >= 3) return "Thở hơi nặng hơn bình thường. Theo dõi triệu chứng hen suyễn.";
    return "Mức độ khó thở chấp nhận được. Vẫn cần để ý triệu chứng.";
  }
  if (group === "elderly") {
    if (score >= 7) return "Gánh nặng tim mạch cao. Ngừng hoạt động ngay nếu đau ngực, chóng mặt.";
    if (score >= 5) return "Tim đập nhanh hơn đáng kể. Nghỉ 5 phút mỗi 15 phút hoạt động.";
    if (score >= 3) return "Hơi mệt — bình thường với người cao tuổi. Uống nước đầy đủ.";
    return "Mức độ gắng sức nhẹ, phù hợp.";
  }
  if (group === "child") {
    if (score >= 7) return "Trẻ có thể không nhận ra mức độ nguy hiểm. Người lớn cần chủ động giới hạn thời gian.";
    if (score >= 5) return "Trẻ đang hoạt động mạnh trong không khí kém. Gọi trẻ vào trong sau 15 phút.";
    if (score >= 3) return "Nhịp thở trẻ nhanh hơn người lớn — hấp thụ PM2.5 nhiều hơn. Chú ý.";
    return "Mức độ phù hợp cho trẻ.";
  }
  if (group === "pregnant") {
    if (score >= 6) return "Nhu cầu oxy của thai nhi tăng cao khi bạn gắng sức. Hạn chế hoạt động cường độ cao.";
    if (score >= 4) return "Hơi khó thở do cơ hoành bị ép. Nghỉ ngơi thường xuyên hơn.";
    if (score >= 2) return "Mức độ phù hợp với thai kỳ. Tránh vận động quá sức.";
    return "Mức độ nhẹ nhàng, an toàn.";
  }
  if (score >= 8) return "Gắng sức gần tối đa — không khuyến khích trong điều kiện AQI này.";
  if (score >= 6) return "Gắng sức cao, có thể gây mệt mỏi nhanh hơn bình thường.";
  if (score >= 4) return "Hơi nặng. Nhịp thở tăng rõ rệt.";
  return "Mức gắng sức nhẹ, cơ thể thích nghi tốt.";
}

type MaskType = "none" | "surgical" | "KF94" | "N95" | "N99";

type MaskRec = {
  type:        MaskType;
  label:       string;
  emoji:       string;
  reason:      string;
  color:       string;
  fitFactor:   string;
  notes?:      string;
};

function getMaskRecommendation(
  aqi:      number,
  group:    UserGroup,
  outdoor:  boolean,
  intensity:string,
): MaskRec {
  if (!outdoor) {
    return {
      type: "none", label: "Không cần khẩu trang", emoji: "✓",
      reason: "Trong nhà — PM2.5 thấp hơn ngoài trời ~50%.",
      color: "#22c55e", fitFactor: "—",
    };
  }

  if (group === "respiratory") {
    if (aqi > 150 || (aqi > 100 && intensity === "high")) return {
      type: "N99", label: "N99 / P100", emoji: "😷",
      reason: "Bệnh hô hấp + AQI cao + cường độ mạnh — cần lọc ≥99%.",
      color: "#a855f7", fitFactor: "≥99%",
      notes: "Kiểm tra dây đeo kín mít. Dùng valve thở nếu nóng bức.",
    };
    if (aqi > 100) return {
      type: "N95", label: "N95 / KN95", emoji: "😷",
      reason: "Bệnh hô hấp — bảo vệ cao (lọc ≥95%) khi AQI không tốt.",
      color: "#ef4444", fitFactor: "≥95%",
      notes: "Đeo đúng cách: áp sát mặt, kiểm tra seal bằng cách thở mạnh.",
    };
    if (aqi > 50) return {
      type: "KF94", label: "KF94", emoji: "😷",
      reason: "Bệnh hô hấp — KF94 vừa bảo vệ tốt (≥94%) vừa thoải mái hơn N95.",
      color: "#f97316", fitFactor: "≥94%",
      notes: "Dạng boat-shape tạo không gian thở tốt hơn.",
    };
    return {
      type: "surgical", label: "Khẩu trang y tế", emoji: "😷",
      reason: "Người bệnh hô hấp nên đeo khẩu trang kể cả AQI tốt.",
      color: "#eab308", fitFactor: "~60%",
    };
  }

  if (aqi > 200) return {
    type: "N95", label: "N95 / KN95 bắt buộc", emoji: "😷",
    reason: "AQI rất xấu — N95 là lựa chọn tối thiểu khi bắt buộc ra ngoài.",
    color: "#ef4444", fitFactor: "≥95%",
    notes: "Nếu có thể, hãy ở trong nhà. Thay khẩu trang sau 4h sử dụng.",
  };
  if (aqi > 150) return {
    type: "N95", label: "N95 hoặc KF94", emoji: "😷",
    reason: "AQI kém — cần khẩu trang lọc hạt mịn để bảo vệ đường hô hấp.",
    color: "#ef4444", fitFactor: "≥94-95%",
    notes: group === "child"
      ? "Khó tìm N95 size trẻ em — dùng KF94 hoặc giảm thời gian ngoài trời."
      : undefined,
  };
  if (aqi > 100) return {
    type: "KF94", label: "KF94 khuyến nghị", emoji: "😷",
    reason: "AQI ở mức nhạy cảm — KF94 cân bằng tốt giữa bảo vệ và thoải mái.",
    color: "#f97316", fitFactor: "≥94%",
    notes: group === "elderly" ? "Tránh khẩu trang N95 khi đứng lâu — có thể tăng gánh nặng tim." : undefined,
  };
  if (aqi > 50 && (group !== "normal" || intensity === "high")) return {
    type: "surgical", label: "Khẩu trang y tế", emoji: "😷",
    reason: "AQI trung bình — nhóm nhạy cảm hoặc cường độ cao nên đeo khẩu trang.",
    color: "#eab308", fitFactor: "~60%",
  };
  return {
    type: "none", label: "Không cần khẩu trang", emoji: "✓",
    reason: "AQI tốt — không cần bảo hộ hô hấp đặc biệt.",
    color: "#22c55e", fitFactor: "—",
  };
}

type MaxTimeResult = {
  minutes:    number;     
  label:      string;
  color:      string;
  withMask:   number;     
  notes:      string;
};

function getMaxOutdoorTime(
  aqi:      number,
  group:    UserGroup,
  intensity:string,
): MaxTimeResult {
  let base = 0;
  if (aqi <=  50) base = 480;  
  else if (aqi <= 100) base = 240;  
  else if (aqi <= 150) base = 90;
  else if (aqi <= 200) base = 30;   
  else if (aqi <= 300) base = 15; 
  else base = 0;                

  const intensityFactor: Record<string, number> = { low: 1.0, moderate: 0.7, high: 0.45 };
  base = Math.round(base * (intensityFactor[intensity] ?? 1.0));

  const groupFactor: Record<UserGroup, number> = {
    normal:      1.0,
    child:       0.6,
    elderly:     0.65,
    respiratory: 0.45,
    pregnant:    0.7,
  };
  const minutes    = Math.round(base * (groupFactor[group] ?? 1.0));
  const withMask   = Math.min(minutes * 1.6, base); 

  let label = "";
  let color = "";
  if (minutes === 0)       { label = "Không nên ra ngoài";        color = "#7f1d1d"; }
  else if (minutes <= 15)  { label = `Tối đa ${minutes} phút`;    color = "#b91c1c"; }
  else if (minutes <= 30)  { label = `Tối đa ${minutes} phút`;    color = "#ef4444"; }
  else if (minutes <= 90)  { label = `Tối đa ${minutes} phút`;    color = "#f97316"; }
  else if (minutes <= 240) { label = `Tối đa ${Math.round(minutes/60*10)/10}h`; color = "#eab308"; }
  else                     { label = "Không hạn chế";             color = "#22c55e"; }

  const notes = getMaxTimeNotes(minutes, group, aqi);

  return { minutes, label, color, withMask: Math.round(withMask), notes };
}

function getMaxTimeNotes(minutes: number, group: UserGroup, aqi: number): string {
  if (group === "respiratory") {
    if (minutes === 0) return "Người bệnh hô hấp không nên ra ngoài khi AQI >300. Mọi hoạt động nên thực hiện trong nhà.";
    if (minutes <= 30) return "Mang theo thuốc giãn phế quản. Ra ngoài chỉ khi thực sự cần thiết.";
    if (aqi > 100) return "Hạn chế thời gian liên tục. Vào trong nhà nghỉ nếu cảm thấy khó thở.";
    return "Theo dõi triệu chứng: khó thở, thở khò khè, tức ngực → vào trong ngay.";
  }
  if (group === "child") {
    if (minutes === 0) return "Trẻ không nên ra ngoài. Hủy giờ chơi sân/thể dục ngoài trời.";
    if (minutes <= 30) return "Giám sát chặt. Trẻ chạy nhảy thở gấp hơn → hấp thụ nhiều PM2.5. Giới hạn nghiêm ngặt.";
    return "Nhắc trẻ không chạy nhảy quá mức. Uống nước sau khi vào trong.";
  }
  if (group === "elderly") {
    if (minutes === 0) return "Người cao tuổi không nên ra ngoài. Rủi ro tim mạch và hô hấp rất cao.";
    if (minutes <= 30) return "Đi cùng người thân. Tránh đi bộ nhanh. Nghỉ ngay nếu đau ngực, khó thở.";
    return "Tránh giờ nắng gắt kết hợp ô nhiễm. Uống nước đều đặn.";
  }
  if (group === "pregnant") {
    if (minutes === 0) return "Thai kỳ nhạy cảm — không nên ra ngoài khi AQI nguy hiểm.";
    if (minutes <= 30) return "Hạn chế tối đa. PM2.5 có thể xuyên qua nhau thai ảnh hưởng thai nhi.";
    return "Tránh giờ cao điểm giao thông. Vào trong ngay khi cảm thấy mệt, chóng mặt.";
  }
  if (minutes === 0) return "AQI ở mức nguy hiểm. Tất cả mọi người nên ở trong nhà.";
  return "";
}

type Warning = { icon: string; text: string; severity: "critical" | "warning" | "info" };

function getGroupWarnings(group: UserGroup, aqi: number, activity: Activity): Warning[] {
  const warnings: Warning[] = [];

  if (group === "respiratory") {
    if (aqi > 100) warnings.push({
      icon: "💊", severity: "critical",
      text: "Mang theo thuốc giãn phế quản (inhaler) khi ra ngoài. Sử dụng trước hoạt động 15 phút nếu có chỉ định.",
    });
    if (activity.intensity === "high") warnings.push({
      icon: "🫁", severity: "warning",
      text: "Cường độ cao kết hợp ô nhiễm có thể gây co thắt phế quản do tập luyện (EIB). Khởi động chậm ≥10 phút.",
    });
    warnings.push({
      icon: "📊", severity: "info",
      text: "Đo Peak Flow trước và sau hoạt động. Nếu giảm >20% → dừng và dùng thuốc cắt cơn.",
    });
    if (aqi > 150) warnings.push({
      icon: "🏠", severity: "critical",
      text: "AQI >150 là ngưỡng nguy hiểm cho bệnh hô hấp. Chuyển toàn bộ hoạt động vào trong nhà.",
    });
  }

  if (group === "child") {
    warnings.push({
      icon: "👀", severity: "info",
      text: `Trẻ em hít thở nhiều hơn người lớn 50% theo cân nặng — phơi nhiễm PM2.5 cao hơn thực tế.`,
    });
    if (aqi > 100) warnings.push({
      icon: "🏫", severity: "warning",
      text: "Thông báo giáo viên/nhà trường: không tổ chức thể dục/hoạt động ngoài trời khi AQI >100.",
    });
    if (activity.durationMinutes > 30 && aqi > 75) warnings.push({
      icon: "⏱", severity: "warning",
      text: `Hoạt động ${activity.durationMinutes}p quá dài trong điều kiện này. Khuyến nghị tối đa 20 phút rồi vào trong nghỉ.`,
    });
  }

  if (group === "elderly") {
    if (activity.intensity === "high" && aqi > 75) warnings.push({
      icon: "❤️", severity: "critical",
      text: "Ô nhiễm + cường độ cao tăng gánh nặng tim đáng kể. Người có bệnh tim mạch nên tránh hoàn toàn.",
    });
    warnings.push({
      icon: "💧", severity: "info",
      text: "Uống 200ml nước trước khi ra ngoài. Người cao tuổi dễ mất nước và không cảm nhận rõ khát.",
    });
    if (aqi > 100) warnings.push({
      icon: "🩺", severity: "warning",
      text: "Người có bệnh tim/phổi mãn tính: tham khảo bác sĩ về kế hoạch hoạt động trong đợt ô nhiễm cao.",
    });
  }

  if (group === "pregnant") {
    warnings.push({
      icon: "🤰", severity: "info",
      text: "PM2.5 có thể xuyên qua nhau thai. Phơi nhiễm cao trong thai kỳ liên quan đến sinh non và nhẹ cân.",
    });
    if (aqi > 100) warnings.push({
      icon: "🏠", severity: "critical",
      text: "3 tháng đầu và 3 tháng cuối thai kỳ: hạn chế tối đa ra ngoài khi AQI >100.",
    });
    if (activity.intensity === "high") warnings.push({
      icon: "💓", severity: "warning",
      text: "Tránh hoạt động cường độ cao trong thai kỳ bất kể AQI. Giới hạn nhịp tim < 140 bpm.",
    });
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
  activity:  Activity;
  userGroup: UserGroup;
};

export function HealthProfilePanel({ activity, userGroup }: PanelProps) {
  const borg    = calcBorgScore(activity.forecastAqi, activity.intensity, userGroup);
  const mask    = getMaskRecommendation(activity.forecastAqi, userGroup, activity.isOutdoor, activity.intensity);
  const maxTime = getMaxOutdoorTime(activity.forecastAqi, userGroup, activity.intensity);
  const warnings= getGroupWarnings(userGroup, activity.forecastAqi, activity);

  const groupLabel: Record<UserGroup, string> = {
    normal: "Phổ thông", child: "Trẻ em", elderly: "Người cao tuổi",
    respiratory: "Bệnh hô hấp", pregnant: "Thai phụ",
  };

  return (
    <div className="hpanel">
      <div className="hpanel__header">
        <span className="hpanel__badge">
          🏥 Phân tích sức khỏe · {groupLabel[userGroup]}
        </span>
      </div>

      <div className="hpanel__grid">
        <div className="hpanel__block">
          <div className="hpanel__block-title">
            🫁 Borg CR-10 — Độ khó thở dự kiến
          </div>
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
                <div className="hpanel__mask-ff">Lọc lọc {mask.fitFactor}</div>
              </div>
            </div>
            <p className="hpanel__desc">{mask.reason}</p>
            {mask.notes && (
              <div className="hpanel__mask-note">💡 {mask.notes}</div>
            )}
          </div>
        </div>

        {activity.isOutdoor && (
          <div className="hpanel__block">
            <div className="hpanel__block-title">⏱ Thời gian tối đa ngoài trời</div>
            <div className="hpanel__maxtime">
              <strong style={{ color: maxTime.color }}>{maxTime.label}</strong>
              {maxTime.minutes > 0 && (
                <div className="hpanel__maxtime-mask">
                  Với N95: tối đa {maxTime.withMask} phút
                </div>
              )}
            </div>
            <div className="hpanel__maxtime-bar-track">
              <div
                className="hpanel__maxtime-bar-fill"
                style={{
                  width: `${Math.min(100, (maxTime.minutes / 480) * 100)}%`,
                  background: maxTime.color,
                }}
              />
              <div
                className="hpanel__maxtime-marker"
                style={{
                  left: `${Math.min(99, (activity.durationMinutes / 480) * 100)}%`,
                }}
                title={`Thời lượng hoạt động: ${activity.durationMinutes}p`}
              />
            </div>
            <div className="hpanel__maxtime-legend">
              <span>0</span>
              <span style={{ left: `${Math.min(99, (activity.durationMinutes/480)*100)}%`, color: maxTime.color }}>
                {activity.durationMinutes}p
              </span>
              <span>8h</span>
            </div>
            {maxTime.notes && <p className="hpanel__desc">{maxTime.notes}</p>}
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="hpanel__warnings">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`hpanel__warning hpanel__warning--${w.severity}`}
            >
              <span className="hpanel__warning-icon">{w.icon}</span>
              <span>{w.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type SummaryProps = {
  userGroup:    UserGroup;
  currentAqi:   number;
  activities:   Activity[];
};

export function HealthProfileSummary({ userGroup, currentAqi, activities }: SummaryProps) {
  const groupConfig: Record<UserGroup, { label: string; icon: string; color: string; accent: string }> = {
    normal:      { label:"Người dùng phổ thông", icon:"👤", color:"#3b82f6", accent:"rgba(59,130,246,.12)" },
    child:       { label:"Trẻ em",               icon:"👶", color:"#f59e0b", accent:"rgba(245,158,11,.12)" },
    elderly:     { label:"Người cao tuổi",        icon:"🧓", color:"#8b5cf6", accent:"rgba(139,92,246,.12)" },
    respiratory: { label:"Bệnh hô hấp",           icon:"🫁", color:"#ef4444", accent:"rgba(239,68,68,.10)" },
    pregnant:    { label:"Thai phụ",              icon:"🤰", color:"#ec4899", accent:"rgba(236,72,153,.10)" },
  };

  const cfg = groupConfig[userGroup] ?? groupConfig.normal;

  const dominantMask = getMaskRecommendation(currentAqi, userGroup, true, "moderate");
  const maxTime      = getMaxOutdoorTime(currentAqi, userGroup, "moderate");

  const outdoorCount = activities.filter(a => a.isOutdoor).length;

  return (
    <div className="hpsummary" style={{ background: cfg.accent, borderColor: cfg.color + "30" }}>
      <div className="hpsummary__left">
        <span className="hpsummary__icon" style={{ color: cfg.color }}>{cfg.icon}</span>
        <div>
          <div className="hpsummary__label" style={{ color: cfg.color }}>{cfg.label}</div>
          <div className="hpsummary__chips">
            <div className="hpsummary__chip"
              style={{ borderColor: dominantMask.color + "50", color: dominantMask.color }}>
              {dominantMask.emoji} {dominantMask.label}
            </div>
            {outdoorCount > 0 && (
              <div className="hpsummary__chip"
                style={{ borderColor: maxTime.color + "50", color: maxTime.color }}>
                ⏱ {maxTime.label}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="hpsummary__tip" style={{ color: cfg.color + "cc" }}>
        {userGroup === "respiratory" && currentAqi > 100 && "⚠️ Mang inhaler khi ra ngoài"}
        {userGroup === "respiratory" && currentAqi <= 100 && "💊 Theo dõi peak flow hằng ngày"}
        {userGroup === "child" && "👀 Giám sát thời gian ngoài trời"}
        {userGroup === "elderly" && "💧 Uống nước đầy đủ trước khi ra ngoài"}
        {userGroup === "pregnant" && "🏠 Ưu tiên hoạt động trong nhà"}
        {userGroup === "normal" && currentAqi > 100 && "😷 Đeo KF94 khi ra ngoài"}
      </div>
    </div>
  );
}
