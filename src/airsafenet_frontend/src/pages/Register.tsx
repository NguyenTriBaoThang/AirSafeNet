import { useState } from "react";
import { registerApi } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/common/useToast";

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await registerApi({
        fullName,
        email,
        password,
      });

      showToast("Tạo tài khoản thành công.", "success");
      navigate("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero__badge">AirSafeNet</div>
          <h1>Tạo tài khoản để sử dụng hệ thống cảnh báo chất lượng không khí</h1>
          <p>
            Theo dõi AQI, PM2.5, dự báo 24 giờ, nhận khuyến nghị sức khỏe và tùy chỉnh nhóm người dùng theo nhu cầu.
          </p>
          <Link to="/" className="btn btn-secondary">
            Về trang chủ
          </Link>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Đăng ký</h2>

          <label>Họ và tên</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyen Van A"
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <label>Xác nhận mật khẩu</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error ? <div className="form-error">{error}</div> : null}

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>

          <div className="auth-footnote">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}