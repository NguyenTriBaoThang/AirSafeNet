import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7276";

type LiveAqi = {
  aqi: number | null;
  pm25: number | null;
  risk: string | null;
  loading: boolean;
};

function usePublicAqi() {
  const [live, setLive] = useState<LiveAqi>({ aqi: null, pm25: null, risk: null, loading: true });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/air/public/current`);
        if (!res.ok) throw new Error("no data");
        const data = await res.json();
        if (mounted) setLive({ aqi: data.aqi, pm25: data.pm25, risk: data.risk, loading: false });
      } catch {
        if (mounted) setLive({ aqi: null, pm25: null, risk: null, loading: false });
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return live;
}

function riskColor(risk: string | null): string {
  switch (risk) {
    case "GOOD":                return "#16a34a";
    case "MODERATE":            return "#eab308";
    case "UNHEALTHY_SENSITIVE": return "#f97316";
    case "UNHEALTHY":           return "#ef4444";
    case "VERY_UNHEALTHY":      return "#8b5cf6";
    case "HAZARDOUS":           return "#7f1d1d";
    default:                    return "#94a3b8";
  }
}

function riskLabel(risk: string | null): string {
  switch (risk) {
    case "GOOD":                return "Tốt";
    case "MODERATE":            return "Trung bình";
    case "UNHEALTHY_SENSITIVE": return "Nhóm nhạy cảm";
    case "UNHEALTHY":           return "Không tốt";
    case "VERY_UNHEALTHY":      return "Rất không tốt";
    case "HAZARDOUS":           return "Nguy hiểm";
    default:                    return "Đang tải...";
  }
}

export default function Home() {
  const live = usePublicAqi();

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <div className="hero__eyebrow">AirSafeNet • AI Air Quality Platform</div>
          <h1>Giám sát, dự báo và cảnh báo chất lượng không khí theo thời gian thực</h1>
          <p>
            AirSafeNet hỗ trợ theo dõi PM2.5, AQI, dự báo nhiều ngày và cung cấp
            khuyến nghị sức khỏe phù hợp cho từng nhóm người dùng như trẻ em,
            người cao tuổi và người có bệnh hô hấp.
          </p>
          <div className="hero__actions">
            <Link to="/dashboard" className="btn btn-primary">Xem Dashboard</Link>
            <Link to="/login" className="btn btn-secondary">Đăng nhập</Link>
          </div>
        </div>

        <div className="hero__panel">
          <div className="glass-card">
            <div className="glass-card__header">
              <span className="glass-card__badge">🔴 Live</span>
              <span className="glass-card__loc">TP. Hồ Chí Minh</span>
            </div>

            <div className="mock-stat mock-stat--aqi">
              <span>AQI hiện tại</span>
              {live.loading ? (
                <strong className="mock-stat__skeleton">--</strong>
              ) : (
                <strong style={{ color: riskColor(live.risk) }}>
                  {live.aqi ?? "--"}
                </strong>
              )}
              {!live.loading && live.risk && (
                <span className="mock-stat__risk" style={{ color: riskColor(live.risk) }}>
                  {riskLabel(live.risk)}
                </span>
              )}
            </div>

            <div className="mock-stat">
              <span>PM2.5</span>
              {live.loading ? (
                <strong className="mock-stat__skeleton">--</strong>
              ) : (
                <strong>{live.pm25 != null ? `${live.pm25.toFixed(1)} µg/m³` : "--"}</strong>
              )}
            </div>

            <div className="mock-stat">
              <span>Dự báo</span>
              <strong>Theo giờ · 7 ngày</strong>
            </div>

            {!live.loading && live.aqi == null && (
              <p className="glass-card__note">Dữ liệu sẽ hiển thị sau khi hệ thống khởi tạo.</p>
            )}
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Dữ liệu môi trường theo giờ</h3>
          <p>Kết hợp PM2.5, khí tượng và mô hình AI để phân tích xu hướng ô nhiễm chính xác.</p>
        </div>
        <div className="feature-card">
          <h3>Dự báo nhiều mốc thời gian</h3>
          <p>Forecast 1 ngày, 3 ngày, 7 ngày hoặc xem lại history để so sánh biến động.</p>
        </div>
        <div className="feature-card">
          <h3>Khuyến nghị cá nhân hóa</h3>
          <p>Mức độ rủi ro và khuyến nghị theo nhóm: trẻ em, người cao tuổi, bệnh hô hấp.</p>
        </div>
      </section>
    </div>
  );
}
