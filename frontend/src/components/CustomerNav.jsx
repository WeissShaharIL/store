import { NavLink } from "react-router-dom";
import { useUnreadCount } from "../hooks/useUnreadCount.js";
import { useSiteSettings, parseNavItems } from "../contexts/ThemeContext.jsx";

export default function CustomerNav() {
  const unread = useUnreadCount();
  const { settings } = useSiteSettings();
  const navItems = parseNavItems(settings.nav_items_json);

  const isVisible = (id) => {
    const item = navItems.find((n) => n.id === id);
    return item ? item.visible !== false : true;
  };

  return (
    <nav className="tabs" style={{ fontSize: "var(--nav-font-size, 14px)" }}>
      {isVisible("catalog") && (
        <NavLink
          to="/catalog"
          className={({ isActive }) => "tabs__btn" + (isActive ? " tabs__btn--active" : "")}
        >
          {navItems.find((n) => n.id === "catalog")?.label ?? "קטלוג"}
        </NavLink>
      )}
      {isVisible("orders") && (
        <NavLink
          to="/orders"
          className={({ isActive }) => "tabs__btn" + (isActive ? " tabs__btn--active" : "")}
        >
          {navItems.find((n) => n.id === "orders")?.label ?? "הזמנות"}
        </NavLink>
      )}
      {isVisible("messages") && (
        <NavLink
          to="/messages"
          className={({ isActive }) => "tabs__btn" + (isActive ? " tabs__btn--active" : "")}
        >
          {navItems.find((n) => n.id === "messages")?.label ?? "הודעות"}
          {unread > 0 && <span className="badge">{unread}</span>}
        </NavLink>
      )}
    </nav>
  );
}
