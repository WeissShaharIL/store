import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import InstallAppButton from "./InstallAppButton.jsx";
import { BookOpen, LogOut, Moon, Sun } from "./Icons.jsx";

const THEME_META = {
  light:  { icon: <Sun />,      label: "מצב בהיר",   next: "מצב כהה" },
  dark:   { icon: <Moon />,     label: "מצב כהה",    next: "מצב ספיה" },
  sepia:  { icon: <BookOpen />, label: "מצב ספיה",  next: "מצב בהיר" },
};

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const meta = THEME_META[theme] || THEME_META.light;

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__mark" aria-label="Simple">SIMPLE</div>
        <div className="app-header__title">{title}</div>
      </div>
      <div className="app-header__right">
        <button
          className="icon-btn"
          title={`${meta.label} (החלף ל${meta.next})`}
          onClick={cycleTheme}
        >
          {meta.icon}
        </button>
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
