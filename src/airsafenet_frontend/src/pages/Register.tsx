import { useState } from "react";
import { registerApi } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/common/useToast";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validate(fullName: string, email: string, password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!fullName.trim())
    errors.fullName = "Vui lòng nhập họ và tên.";
  else if (fullName.trim().length < 2)
    errors.fullName = "Họ tên phải có ít nhất 2 ký tự.";

  if (!email.trim())
    errors.email = "Vui lòng nhập email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = "Email không đúng định dạng.";

  if (!password)
    errors.password = "Vui lòng nhập mật khẩu.";
  else if (password.length < 6)
    errors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
  else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    errors.password = "Mật khẩu phải có cả chữ và số.";

  if (!confirmPassword)
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  else if (password !== confirmPassword)
    errors.confirmPassword = "Mật khẩu xác nhận không khớp.";

  return errors;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Rất yếu",  color: "#ef4444" },
    { label: "Yếu",      color: "#f97316" },
    { label: "Trung bình", color: "#eab308" },
    { label: "Tốt",      color: "#22c55e" },
    { label: "Mạnh",     color: "#16a34a" },
  ];
  const lvl = levels[Math.min(score, 4)];

  return (
    <div className="password-strength">
      <div className="password-strength__bars">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="password-strength__bar"
            style={{ background: i < score ? lvl.color : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>
      <span style={{ color: lvl.color, fontSize: 11 }}>{lvl.label}</span>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName,        setFullName]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass,        setShowPass]        = useState(false);

  const [loading,      setLoading]      = useState(false);
  const [apiError,     setApiError]     = useState("");
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({});
  const [touched,      setTouched]      = useState<Record<string, boolean>>({});

  function touch(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }));
  }

  function getError(field: keyof FieldErrors): string {
    return touched[field] ? (fieldErrors[field] ?? "") : "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });

    const errors = validate(fullName, email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setLoading(true);
      setApiError("");
      await registerApi({ fullName, email, password });
      showToast("Tạo tài khoản thành công.", "success");
      navigate("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      setApiError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: keyof FieldErrors, value: string) {
    const setters: Record<keyof FieldErrors, (v: string) => void> = {
      fullName:        setFullName,
      email:           setEmail,
      password:        setPassword,
      confirmPassword: setConfirmPassword,
    };
    setters[field](value);

    if (touched[field]) {
      const vals = {
        fullName:        field === "fullName"        ? value : fullName,
        email:           field === "email"           ? value : email,
        password:        field === "password"        ? value : password,
        confirmPassword: field === "confirmPassword" ? value : confirmPassword,
      };
      setFieldErrors(validate(vals.fullName, vals.email, vals.password, vals.confirmPassword));
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-hero">
          <div className="auth-hero__badge">AirSafeNet</div>
          <h1>Tạo tài khoản để sử dụng hệ thống cảnh báo chất lượng không khí</h1>
          <p>Theo dõi AQI, PM2.5, dự báo 24 giờ, nhận khuyến nghị sức khỏe cá nhân hóa.</p>
          <Link to="/" className="btn btn-secondary">Về trang chủ</Link>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <h2>Đăng ký</h2>

          <label>Họ và tên</label>
          <input
            type="text"
            value={fullName}
            onChange={e => handleChange("fullName", e.target.value)}
            onBlur={() => { touch("fullName"); handleChange("fullName", fullName); }}
            placeholder="Nguyễn Văn A"
            className={getError("fullName") ? "input-error" : ""}
          />
          {getError("fullName") && <span className="field-error">{getError("fullName")}</span>}

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => handleChange("email", e.target.value)}
            onBlur={() => { touch("email"); handleChange("email", email); }}
            placeholder="you@example.com"
            className={getError("email") ? "input-error" : ""}
          />
          {getError("email") && <span className="field-error">{getError("email")}</span>}

          <label>Mật khẩu</label>
          <div className="input-reveal">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => handleChange("password", e.target.value)}
              onBlur={() => { touch("password"); handleChange("password", password); }}
              placeholder="Ít nhất 6 ký tự, có cả chữ và số"
              className={getError("password") ? "input-error" : ""}
            />
            <button
              type="button"
              className="input-reveal__btn"
              onClick={() => setShowPass(p => !p)}
              tabIndex={-1}
            >
              {showPass ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <PasswordStrength password={password} />
          {getError("password") && <span className="field-error">{getError("password")}</span>}

          <label>Xác nhận mật khẩu</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => handleChange("confirmPassword", e.target.value)}
            onBlur={() => { touch("confirmPassword"); handleChange("confirmPassword", confirmPassword); }}
            placeholder="Nhập lại mật khẩu"
            className={getError("confirmPassword") ? "input-error" : ""}
          />
          {getError("confirmPassword") && <span className="field-error">{getError("confirmPassword")}</span>}

          {apiError && <div className="form-error">{apiError}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>

          <p className="auth-footer">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
