export default function DimensionSlider({ label, value, min, max, step, onChange, hint }) {
  return (
    <div className="dim-slider">
      <div className="dim-slider__row">
        <span className="dim-slider__label">{label}</span>
        <span className="dim-slider__value">{Math.round(value)} ס״מ</span>
      </div>
      <input
        type="range"
        className="dim-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <div className="dim-slider__range muted small">
        <span>{min} ס״מ</span>
        {hint && <span className="dim-slider__hint">{hint}</span>}
        <span>{max} ס״מ</span>
      </div>
    </div>
  );
}
