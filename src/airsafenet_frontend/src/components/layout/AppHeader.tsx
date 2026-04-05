import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutApi } from "../../api/auth";

type Props = {
  title?: string;
};

export default function AppHeader({ title }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logoutApi();
    navigate("/login");
  }

  return (
    <header className="app-header">
      <div className="app-header__left">
        <Link to="/" className="brand">
          <span className="brand__logo">A</span>
          <div className="brand__text">
            <strong>AirSafeNet</strong>
            <span>AI Air Quality Platform</span>
          </div>
        </Link>
      </div>

      <div className="app-header__center">
        <div className="header-page-title">{title ?? "Dashboard"}</div>
      </div>

      <div className="app-header__right">
        <nav className="top-nav">
          <Link
            to="/dashboard"
            className={location.pathname === "/dashboard" ? "top-nav__link active" : "top-nav__link"}
          >
            Dashboard
          </Link>
          <Link
            to="/preferences"
            className={location.pathname === "/preferences" ? "top-nav__link active" : "top-nav__link"}
          >
            Tùy chỉnh
          </Link>
        </nav>

        <button className="btn btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}