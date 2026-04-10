import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutApi } from "../../api/auth";
import { useEffect, useState } from "react";
import { meApi } from "../../api/auth";
import AppIcon from "../common/AppIcon";

type MeState = {
  fullName: string;
  email: string;
  role: string;
};

type Props = {
  title?: string;
};

export default function AppHeader({ title }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<MeState | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        const result = await meApi();
        if (mounted) {
          setMe({
            fullName: result.fullName,
            email: result.email,
            role: result.role,
          });
        }
      } catch {
        // ignore
      }
    }

    loadMe();

    return () => {
      mounted = false;
    };
  }, []);

  function handleLogout() {
    logoutApi();
    navigate("/login");
  }

  function getInitials(name?: string) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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
        <div className="app-header__title">{title ?? "Không khí sạch, quyết định thông minh"}</div>
      </div>

      <div className="app-header__right">
        <nav className="top-nav">
          <Link
            to="/dashboard"
            className={location.pathname === "/dashboard" ? "top-nav__link active" : "top-nav__link"}
          >
            <AppIcon name="air" /> Dashboard
          </Link>
          <Link
            to="/assistant"
            className={`top-nav__link ${
              location.pathname === "/assistant" ? "active" : ""
            }`}
          >
            <AppIcon name="user" /> Trợ lý ảo
          </Link>
          <Link
            to="/preferences"
            className={location.pathname === "/preferences" ? "top-nav__link active" : "top-nav__link"}
          >
            <AppIcon name="settings" /> Tùy chỉnh
          </Link>
        </nav>

        {me ? (
          <div className="header-user">
            <div className="header-user__avatar">{getInitials(me.fullName)}</div>
            <div className="header-user__meta">
              <strong>{me.fullName}</strong>
              <span>{me.role}</span>
            </div>
          </div>
        ) : null}

        <button className="btn btn-secondary" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}