export default function FormaLogo({ height = 13, className, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 13"
      height={height}
      style={{ width: "auto", display: "block", ...style }}
      className={className}
      aria-label="FORMA"
    >
      <text
        x="0"
        y="10.5"
        fontFamily="Manrope, Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="11.5"
        letterSpacing="4.2"
        fill="currentColor"
      >
        FORMA
      </text>
    </svg>
  );
}
