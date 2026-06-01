export default function FormaLogo({ className, style }) {
  return (
    <span
      className={["landing-nav__brand", className].filter(Boolean).join(" ")}
      aria-label="FORMA ארונות"
      style={{ textDecoration: "none", color: "#ffffff", ...style }}
    >
      <span className="landing-nav__brand-mark">Forma</span>
      <span className="landing-nav__brand-sub">ארונות</span>
    </span>
  );
}
