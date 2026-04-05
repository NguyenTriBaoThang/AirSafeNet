import { Link } from "react-router-dom";
import HeroStats from "../components/home/HeroStats";
import ArchitectureFlow from "../components/home/ArchitectureFlow";
import BenefitCard from "../components/home/BenefitCard";
import AppFooter from "../components/home/AppFooter";

export default function Home() {
  return (
    <div className="premium-home">
      <section className="premium-hero">
        <div className="premium-hero__content">
          <div className="premium-badge">
            AirSafeNet • AI & Big Data for Clean Air
          </div>

          <h1>
            Hệ thống dự báo và cảnh báo
            <br />
            chất lượng không khí thông minh
            <br />
            cho TP.HCM
          </h1>

          <p className="premium-hero__desc">
            AirSafeNet giúp theo dõi PM2.5, AQI, dự báo 24 giờ và cung cấp
            khuyến nghị sức khỏe theo từng nhóm người dùng như trẻ em, người cao tuổi
            và người có bệnh hô hấp. Hệ thống kết hợp dữ liệu thời gian thực,
            AI forecasting và dashboard trực quan để hỗ trợ ra quyết định.
          </p>

          <div className="premium-hero__actions">
            <Link to="/dashboard" className="btn btn-primary">
              Xem Dashboard
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Bắt đầu sử dụng
            </Link>
          </div>

          <HeroStats />
        </div>

        <div className="premium-hero__visual">
          <div className="hero-visual-card hero-visual-card--main">
            <div className="hero-visual-card__top">
              <span>AQI hiện tại</span>
              <span className="status-dot"></span>
            </div>
            <strong>88</strong>
            <p>Mức độ: Trung bình</p>
          </div>

          <div className="hero-floating-grid">
            <div className="hero-visual-card">
              <span>PM2.5</span>
              <strong>31.2</strong>
              <p>µg/m³</p>
            </div>

            <div className="hero-visual-card">
              <span>Dự báo 24h</span>
              <strong>151</strong>
              <p>Đỉnh AQI dự kiến</p>
            </div>

            <div className="hero-visual-card">
              <span>Nhóm người dùng</span>
              <strong>Child</strong>
              <p>Cảnh báo nhạy hơn</p>
            </div>

            <div className="hero-visual-card">
              <span>Khuyến nghị</span>
              <strong>Hạn chế</strong>
              <p>Hoạt động ngoài trời</p>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-section">
        <div className="section-heading">
          <div className="section-heading__eyebrow">TỔNG QUAN HỆ THỐNG</div>
          <h2>Kiến trúc kết hợp dữ liệu thời gian thực, AI Server và dashboard</h2>
          <p>
            AirSafeNet được thiết kế theo hướng tách lớp rõ ràng, dễ mở rộng và phù hợp
            để phát triển thành một hệ thống cảnh báo chất lượng không khí thực tế.
          </p>
        </div>

        <ArchitectureFlow />
      </section>

      <section className="premium-section">
        <div className="section-heading">
          <div className="section-heading__eyebrow">GIÁ TRỊ MANG LẠI</div>
          <h2>Lợi ích rõ ràng cho người dùng, nhà trường và cộng đồng</h2>
          <p>
            Không chỉ hiển thị dữ liệu, AirSafeNet hướng đến việc giúp người dùng hiểu rủi ro,
            chủ động hơn trong sinh hoạt và hỗ trợ ra quyết định dựa trên dữ liệu.
          </p>
        </div>

        <div className="benefit-grid">
          <BenefitCard
            title="Dự báo sớm"
            description="Dự báo AQI và PM2.5 trong 24 giờ tới để người dùng chủ động sắp xếp hoạt động."
          />
          <BenefitCard
            title="Khuyến nghị cá nhân hóa"
            description="Cảnh báo được điều chỉnh theo từng nhóm người dùng như trẻ em, người già hoặc người có bệnh hô hấp."
          />
          <BenefitCard
            title="Trực quan, dễ hiểu"
            description="Dashboard hiển thị biểu đồ, mức độ rủi ro và khuyến nghị bằng ngôn ngữ đơn giản, dễ tiếp cận."
          />
          <BenefitCard
            title="Dữ liệu thời gian thực"
            description="Tích hợp dữ liệu khí tượng và chất lượng không khí từ Open-Meteo để tăng tính thực tiễn."
          />
          <BenefitCard
            title="Mở rộng linh hoạt"
            description="Kiến trúc tách AI Server, backend và frontend giúp dễ triển khai tính năng mới trong tương lai."
          />
          <BenefitCard
            title="Phù hợp cuộc thi"
            description="Kết hợp AI, Big Data, dashboard trực quan và khả năng ứng dụng thực tiễn trong lĩnh vực môi trường."
          />
        </div>
      </section>

      <section className="premium-section premium-section--highlight">
        <div className="highlight-panel">
          <div className="highlight-panel__left">
            <div className="section-heading__eyebrow">TẠI SAO LÀ AIRSAFENET?</div>
            <h2>Một sản phẩm không chỉ để xem số liệu, mà để hành động đúng lúc</h2>
            <p>
              Khi người dùng biết trước thời điểm ô nhiễm tăng cao, họ có thể hạn chế
              hoạt động ngoài trời, đeo khẩu trang phù hợp, đóng cửa sổ hoặc điều chỉnh
              lịch trình cho trẻ em và người thân thuộc nhóm nhạy cảm.
            </p>
          </div>

          <div className="highlight-panel__right">
            <div className="highlight-metric">
              <span>Mô hình cốt lõi</span>
              <strong>AI Forecasting</strong>
            </div>
            <div className="highlight-metric">
              <span>Nguồn dữ liệu</span>
              <strong>Open-Meteo API</strong>
            </div>
            <div className="highlight-metric">
              <span>Nền tảng hiển thị</span>
              <strong>React Dashboard</strong>
            </div>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}