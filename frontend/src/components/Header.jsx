import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import InstallAppButton from "./InstallAppButton.jsx";
import { LogOut } from "./Icons.jsx";

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__mark" aria-label="Simple">SIMPLE</div>
        <div className="app-header__title">{title}</div>
      </div>
      <div className="app-header__right">
        {user && (
          <>
            <InstallAppButton variant="header" />
            <div className="app-header__user-chip" title={user.customer_id}>
              <div className="avatar avatar--sm">
                {(user.display_name || user.customer_id).charAt(0).toUpperCase()}
              </div>
              <span className="app-header__user">{user.display_name || user.customer_id}</span>
            </div>
            <button className="icon-btn" title="התנתק" onClick={handleLogout}>
              <LogOut />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
