import { Link } from "react-router-dom";

export default function Home() {
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
              <strong>68</strong>
            </div>
            <div className="mock-stat">
              <span>PM2.5</span>
              <strong>20.3</strong>
            </div>
            <div className="mock-stat">
              <span>Dự báo 3 ngày</span>
              <strong>Theo giờ</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Dữ liệu môi trường theo giờ</h3>
          <p>
            Hệ thống kết hợp dữ liệu chất lượng không khí và thời tiết để hỗ trợ
            phân tích xu hướng ô nhiễm chính xác hơn.
          </p>
        </div>
        <div className="feature-card">
          <h3>Dự báo nhiều mốc thời gian</h3>
          <p>
            Người dùng có thể xem forecast 1 ngày, 3 ngày, 7 ngày hoặc xem lại
            dữ liệu history để so sánh và đánh giá biến động.
          </p>
        </div>
        <div className="feature-card">
          <h3>Khuyến nghị dễ hiểu</h3>
          <p>
            Mọi dữ liệu phức tạp được chuyển thành mức độ rủi ro và khuyến nghị
            trực quan, dễ tiếp cận với người dùng phổ thông.
          </p>
        </div>
      </section>
    </div>
  );
}