import { useMemo } from "react";
import type { DashboardChartPointResponse } from "../../types/dashboard";

type Props = {
  points: DashboardChartPointResponse[];
};

type GoldenSlot = {
  hour: number;
  timeLabel: string;
  aqi: number;
  pm25: number;
  risk: string;
  activity: string;
  activityIcon: string;
  colorClass: string;
};

// AQI → màu + label ngắn
function getRiskMeta(risk: string): {
  colorClass: string;
  label: string;
  dot: string;
} {
  switch (risk) {
    case "GOOD":
      return { colorClass: "golden-slot--good", label: "Tốt", dot: "#22c55e" };
    case "MODERATE":
      return { colorClass: "golden-slot--moderate", label: "Trung bình", dot: "#eab308" };
    case "UNHEALTHY_SENSITIVE":
      return { colorClass: "golden-slot--sensitive", label: "Nhạy cảm", dot: "#f97316" };
    default:
      return { colorClass: "golden-slot--moderate", label: "Chấp nhận", dot: "#eab308" };
  }
}

// Gợi ý hoạt động theo giờ trong ngày + mức AQI
function getActivity(hour: number, risk: string): { text: string; icon: string } {
  const isGoodAir = risk === "GOOD";

  if (hour >= 5 && hour < 8) {
    return {
      icon: "🏃",
      text: isGoodAir ? "Lý tưởng để chạy bộ sáng sớm" : "Đi bộ nhẹ, tránh vận động mạnh",
    };
  }
  if (hour >= 8 && hour < 11) {
    return {
      icon: "🚴",
      text: isGoodAir ? "Tốt để đạp xe hoặc đi bộ" : "Hạn chế hoạt động ngoài trời lâu",
    };
  }
  if (hour >= 11 && hour < 14) {
    return {
      icon: "☀️",
      text: isGoodAir ? "Phù hợp hoạt động ngoài trời" : "Nên nghỉ trong nhà buổi trưa",
    };
  }
  if (hour >= 14 && hour < 17) {
    return {
      icon: "🧒",
      text: isGoodAir ? "Phù hợp đưa trẻ ra công viên" : "Cho trẻ chơi trong nhà",
    };
  }
  if (hour >= 17 && hour < 20) {
    return {
      icon: "🌆",
      text: isGoodAir ? "Tốt để tập thể dục buổi tối" : "Hạn chế ra ngoài giờ cao điểm",
    };
  }
  return {
    icon: "🌙",
    text: "Không khí về đêm — hạn chế hoạt động ngoài trời",
  };
}

function getTopGoldenSlots(points: DashboardChartPointResponse[]): GoldenSlot[] {
  const now = new Date();

  const upcoming = points.filter((p) => {
    const t = new Date(p.time);
    return t >= now && ["GOOD", "MODERATE", "UNHEALTHY_SENSITIVE"].includes(p.risk);
  });

  if (upcoming.length === 0) return [];

  const sorted = [...upcoming].sort((a, b) => a.aqi - b.aqi);

  const selected: DashboardChartPointResponse[] = [];
  for (const point of sorted) {
    if (selected.length >= 3) break;

    const t = new Date(point.time);
    const tooClose = selected.some((s) => {
      const diff = Math.abs(new Date(s.time).getTime() - t.getTime());
      return diff < 2 * 60 * 60 * 1000; // 2 giờ
    });

    if (!tooClose) {
      selected.push(point);
    }
  }

  return selected.map((p) => {
    const t = new Date(p.time);
    const hour = t.getHours();
    const { colorClass } = getRiskMeta(p.risk);
    const { text, icon } = getActivity(hour, p.risk);

    const timeLabel = t.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      day: "2-digit",
      month: "2-digit",
    });

    return {
      hour,
      timeLabel,
      aqi: p.aqi,
      pm25: p.pm25,
      risk: p.risk,
      activity: text,
      activityIcon: icon,
      colorClass,
    };
  });
}

export default function GoldenHoursWidget({ points }: Props) {
  const slots = useMemo(() => getTopGoldenSlots(points), [points]);

  if (slots.length === 0) {
    return (
      <div className="golden-hours-widget golden-hours-widget--empty">
        <div className="golden-hours__header">
          <span className="golden-hours__icon">🌤️</span>
          <div>
            <h3>Khung giờ vàng ra ngoài</h3>
            <p>Không tìm thấy khung giờ phù hợp trong dự báo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="golden-hours-widget">
      {/* Header */}
      <div className="golden-hours__header">
        <span className="golden-hours__icon">✨</span>
        <div>
          <h3>Khung giờ vàng ra ngoài</h3>
          <p>Top {slots.length} thời điểm tốt nhất dựa trên dự báo AI</p>
        </div>
      </div>

      {/* Slots */}
      <div className="golden-hours__slots">
        {slots.map((slot, index) => {
          const { label, dot } = getRiskMeta(slot.risk);
          return (
            <div
              key={slot.timeLabel}
              className={`golden-slot ${slot.colorClass}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Rank badge */}
              <div className="golden-slot__rank">#{index + 1}</div>

              {/* Activity icon */}
              <div className="golden-slot__activity-icon">{slot.activityIcon}</div>

              {/* Main info */}
              <div className="golden-slot__main">
                <div className="golden-slot__time">{slot.timeLabel}</div>
                <div className="golden-slot__activity">{slot.activity}</div>
              </div>

              {/* Stats */}
              <div className="golden-slot__stats">
                <div className="golden-slot__aqi">
                  <span
                    className="golden-slot__dot"
                    style={{ background: dot }}
                  />
                  <strong>{slot.aqi}</strong>
                  <span>AQI</span>
                </div>
                <div className="golden-slot__pm25">
                  <span>{slot.pm25.toFixed(1)}</span>
                  <span>µg/m³</span>
                </div>
                <div className="golden-slot__risk-label">{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="golden-hours__footer">
        <span>⚡</span>
        <span>Cập nhật theo dự báo AI mỗi lần làm mới dashboard</span>
      </div>
    </div>
  );
}
