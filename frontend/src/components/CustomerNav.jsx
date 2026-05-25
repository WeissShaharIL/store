import { NavLink } from "react-router-dom";
import { useUnreadCount } from "../hooks/useUnreadCount.js";

export default function CustomerNav() {
  const unread = useUnreadCount();

  return (
    <nav className="tabs">
      <NavLink
        to="/catalog"
        className={({ isActive }) =>
          "tabs__btn" + (isActive ? " tabs__btn--active" : "")
        }
      >
        קטלוג
      </NavLink>
      <NavLink
        to="/orders"
        className={({ isActive }) =>
          "tabs__btn" + (isActive ? " tabs__btn--active" : "")
        }
      >
        הזמנות
      </NavLink>
      <NavLink
        to="/messages"
        className={({ isActive }) =>
          "tabs__btn" + (isActive ? " tabs__btn--active" : "")
        }
      >
        הודעות
        {unread > 0 && <span className="badge">{unread}</span>}
      </NavLink>
    </nav>
  );
}
