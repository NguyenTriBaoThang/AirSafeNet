import { Link, useLocation } from "react-router-dom";
import { getAccessToken } from "../../api/http";

function getRole(): string {
  const token = getAccessToken();
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
      ?? payload["role"]
      ?? ""
    );
  } catch {
    return "";
  }
}

export default function SidebarNav() {
  const location = useLocation();
  const isAdmin = getRole() === "Admin";

  const items = [
    { to: "/dashboard",   label: "Tổng quan" },
    { to: "/heatmap",     label: "Bản đồ nhiệt" },
    { to: "/impact",      label: "Chi phí & WHO" },
    { to: "/activity",    label: "Lịch hoạt động" },
    { to: "/assistant",   label: "Trợ lý ảo" },
    { to: "/preferences", label: "Cài đặt người dùng" },
  ];

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-nav__section">
        <div className="sidebar-nav__label">Điều hướng</div>

        <div className="sidebar-nav__items">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                location.pathname === item.to
                  ? "sidebar-nav__item active"
                  : "sidebar-nav__item"
              }
            >
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/admin"
              className={
                location.pathname === "/admin"
                  ? "sidebar-nav__item sidebar-nav__item--admin active"
                  : "sidebar-nav__item sidebar-nav__item--admin"
              }
            >
              <span className="sidebar-nav__admin-dot" />
              Quản trị cache
            </Link>
          )}
        </div>
      </div>

      <div className="sidebar-nav__section">
        <div className="sidebar-nav__label">Thông tin nhanh</div>
        <div className="sidebar-note">
          Theo dõi AQI, PM2.5 và dự báo 24 giờ để chủ động bảo vệ sức khỏe.
        </div>
      </div>
    </aside>
  );
}
