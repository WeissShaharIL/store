export default function FormaLogo({ className, style }) {
  return (
    <span
      className={className}
      aria-label="FORMA"
      style={{
        fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: "13px",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        lineHeight: 1,
        display: "block",
        whiteSpace: "nowrap",
        color: "#ffffff",
        ...style,
      }}
    >
      FORMA
    </span>
  );
}
