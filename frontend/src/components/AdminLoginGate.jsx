import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import FormaLogo from "./FormaLogo.jsx";
import "../pages/LoginPage.css";

export default function AdminLoginGate({ children }) {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ customer_id: "", password: "" });
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
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
              required
            />
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
