import { useState } from "react";
import { ChevronDown } from "./Icons.jsx";

export default function Section({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`section${open ? " section--open" : ""}`}>
      <button
        type="button"
        className="section__header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="section__title-wrap">
          {icon && <span className="section__icon">{icon}</span>}
          <span className="section__titles">
            <span className="section__title">{title}</span>
            {subtitle && <span className="section__subtitle">{subtitle}</span>}
          </span>
        </span>
        <span className="section__meta">
          {badge != null && <span className="section__badge">{badge}</span>}
          <ChevronDown className="section__chevron" />
        </span>
      </button>
      <div className="section__body" hidden={!open}>
        <div className="section__inner">{children}</div>
      </div>
    </section>
  );
}
