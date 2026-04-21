type Props = {
  currentAqi: number;
  currentRisk: string;
  warningCount: number;
  dangerCount: number;
  days: number;
};

function calcScore(aqi: number, warningCount: number, dangerCount: number): number {
  let score = 100;

  if (aqi <= 50)       score = 100;
  else if (aqi <= 100) score = Math.round(100 - ((aqi - 50) / 50) * 30);   // 100→70
  else if (aqi <= 150) score = Math.round(70  - ((aqi - 100) / 50) * 25);  // 70→45
  else if (aqi <= 200) score = Math.round(45  - ((aqi - 150) / 50) * 25);  // 45→20
  else if (aqi <= 300) score = Math.round(20  - ((aqi - 200) / 100) * 15); // 20→5
  else                 score = 5;

  score -= Math.min(dangerCount * 2, 15);
  score -= Math.min(warningCount, 10);

  return Math.max(0, Math.min(100, score));
}

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#22c55e";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Rất tốt";
  if (score >= 60) return "Tốt";
  if (score >= 40) return "Trung bình";
  if (score >= 20) return "Kém";
  return "Nguy hiểm";
}

function scoreAdvice(score: number): string {
  if (score >= 80) return "Chất lượng không khí tốt, phù hợp mọi hoạt động ngoài trời.";
  if (score >= 60) return "Điều kiện khá tốt. Nhóm nhạy cảm nên hạn chế vận động mạnh.";
  if (score >= 40) return "Chất lượng không khí ở mức trung bình. Hạn chế ra ngoài giờ cao điểm.";
  if (score >= 20) return "Không khí kém, nên đeo khẩu trang và hạn chế thời gian ngoài trời.";
  return "Không khí nguy hiểm. Ở trong nhà, đóng cửa sổ, dùng máy lọc không khí.";
}

export default function HealthScoreWidget({ currentAqi, currentRisk, warningCount, dangerCount, days }: Props) {
  const score    = calcScore(currentAqi, warningCount, dangerCount);
  const color    = scoreColor(score);
  const label    = scoreLabel(score);
  const advice   = scoreAdvice(score);

  const R  = 30;
  const C  = 2 * Math.PI * R;
  const fill = (score / 100) * C;

  const factors = [
    { label: `AQI ${currentAqi}`,       ok: currentAqi <= 100 },
    { label: `${warningCount} giờ warning`, ok: warningCount === 0 },
    { label: `${dangerCount} giờ danger`,  ok: dangerCount === 0 },
  ];

  return (
    <div className="health-score-card">
      <div className="health-score-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${fill} ${C}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="health-score-ring__value" style={{ color }}>
          {score}
          <span className="health-score-ring__label">/ 100</span>
        </div>
      </div>

      <div className="health-score-info">
        <h4>Điểm sức khỏe {days === 1 ? "hôm nay" : `${days} ngày gần đây`} — <span style={{ color }}>{label}</span></h4>
        <p>Mức rủi ro: <b>{currentRisk}</b></p>
        <p>{advice}</p>
        <div className="health-score-factors">
          {factors.map((f, i) => (
            <span
              key={i}
              className="health-factor-chip"
              style={{
                background: f.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                borderColor: f.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
                color: f.ok ? "#86efac" : "#fca5a5",
              }}
            >
              {f.ok ? "✓" : "✕"} {f.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}