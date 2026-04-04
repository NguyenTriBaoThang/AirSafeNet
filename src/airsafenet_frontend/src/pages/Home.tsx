import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <div className="hero__eyebrow">AirSafeNet • AI & Big Data</div>
          <h1>Hệ thống dự báo và cảnh báo chất lượng không khí cho TP.HCM</h1>
          <p>
            Theo dõi PM2.5, AQI, dự báo 24 giờ và cung cấp khuyến nghị sức khỏe
            phù hợp với từng nhóm người dùng như trẻ em, người cao tuổi và người có bệnh hô hấp.
          </p>

          <div className="hero__actions">
            <Link to="/dashboard" className="btn btn-primary">
              Xem Dashboard
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Đăng nhập
            </Link>
          </div>
        </div>

        <div className="hero__panel">
          <div className="glass-card">
            <div className="mock-stat">
              <span>AQI hiện tại</span>
              <strong>88</strong>
            </div>
            <div className="mock-stat">
              <span>PM2.5</span>
              <strong>31.2</strong>
            </div>
            <div className="mock-stat">
              <span>Nguy cơ</span>
              <strong>Trung bình</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Dữ liệu thời gian thực</h3>
          <p>Lấy dữ liệu chất lượng không khí và thời tiết từ Open-Meteo để cập nhật liên tục.</p>
        </div>
        <div className="feature-card">
          <h3>Dự báo bằng AI</h3>
          <p>Mô hình AI hỗ trợ dự báo AQI và PM2.5, giúp người dùng chủ động hơn trước nguy cơ ô nhiễm.</p>
        </div>
        <div className="feature-card">
          <h3>Khuyến nghị cá nhân hóa</h3>
          <p>Cảnh báo và gợi ý hành động theo từng nhóm người dùng, tăng tính thực tiễn khi ứng dụng.</p>
        </div>
      </section>
    </div>
  );
}