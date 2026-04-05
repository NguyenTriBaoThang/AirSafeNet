import { useState } from "react";
import { loginApi } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      await loginApi({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero__badge">AirSafeNet</div>
          <h1>Đăng nhập để theo dõi chất lượng không khí thông minh</h1>
          <p>
            Truy cập dashboard dự báo AQI, PM2.5, cảnh báo sức khỏe và tùy chỉnh theo nhóm người dùng.
          </p>
          <Link to="/" className="btn btn-secondary">
            Về trang chủ
          </Link>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Đăng nhập</h2>

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

          {error ? <div className="form-error">{error}</div> : null}

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}