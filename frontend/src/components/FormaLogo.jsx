export default function FormaLogo({ className, style, sub = true }) {
  return (
    <span
      className={["landing-nav__brand", className].filter(Boolean).join(" ")}
      aria-label={sub ? "FORMA ארונות" : "FORMA"}
      style={{ textDecoration: "none", color: "#ffffff", ...style }}
    >
      <span className="landing-nav__brand-mark">Forma</span>
      {sub && <span className="landing-nav__brand-sub">ארונות</span>}
    </span>
  );
}
