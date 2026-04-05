import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer__top">
        <div className="app-footer__brand">
          <div className="brand">
            <span className="brand__logo">A</span>
            <div className="brand__text">
              <strong>AirSafeNet</strong>
              <span>AI Air Quality Platform</span>
            </div>
          </div>

          <p>
            Hệ thống dự báo và cảnh báo chất lượng không khí ứng dụng AI và Big Data,
            hướng đến nâng cao nhận thức cộng đồng và hỗ trợ ra quyết định vì sức khỏe.
          </p>
        </div>

        <div className="app-footer__links">
          <div>
            <h4>Khám phá</h4>
            <Link to="/">Trang chủ</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/preferences">Tùy chỉnh</Link>
          </div>

          <div>
            <h4>Tài khoản</h4>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </div>

          <div>
            <h4>Giới thiệu</h4>
            <span>AI forecasting</span>
            <span>Open-Meteo integration</span>
            <span>ASP.NET Core + React</span>
          </div>
        </div>
      </div>

      <div className="app-footer__bottom">
        <span>© 2026 AirSafeNet. All rights reserved.</span>
        <span>Designed for smart air-quality monitoring and decision support.</span>
      </div>
    </footer>
  );
}