import { Link, useLocation } from "react-router-dom";

export default function SidebarNav() {
  const location = useLocation();

  const items = [
    { to: "/dashboard", label: "Tổng quan" },
    { to: "/assistant", label: "Trợ lý ảo" },
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