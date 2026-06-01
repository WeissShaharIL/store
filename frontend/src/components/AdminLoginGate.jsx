import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import FormaLogo from "./FormaLogo.jsx";
import "../pages/LoginPage.css";

export default function AdminLoginGate({ children }) {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ customer_id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user === undefined) return null; // still hydrating

  if (user && !user.is_admin) return <Navigate to="/" replace />;

  if (user && user.is_admin) return children;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.customer_id, form.password);
      // auth context updates → component re-renders → shows children
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand"><FormaLogo /></div>
        <p className="login-title">כניסה למנהל</p>
        <Link to="/" className="login-back-link">חזרה לאתר</Link>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>שם משתמש</span>
            <input
              type="text"
              value={form.customer_id}
              onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
              autoComplete="username"
              required
            />
          </label>
          <label>
            <span>סיסמה</span>
            <div className="login-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
