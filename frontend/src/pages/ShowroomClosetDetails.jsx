import { useEffect, useMemo, useState } from "react";
import { X, Eye, EyeOff, Check } from "../components/Icons.jsx";
import SceneDoorControls from "../components/SceneDoorControls.jsx";
import { formatILS } from "../lib/money.js";
import ClosetScene from "./admin/closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./admin/closet3d/ClosetFromConfig.jsx";
import { totalWidth } from "./admin/closet3d/schema.js";
import { migrateConfig } from "./admin/closet-builder/defaults.js";

export default function ShowroomClosetDetails({ item, onClose, onAddToCart, onDesign, added }) {
  const cfg = useMemo(() => {
    try { return migrateConfig(JSON.parse(item.config_json || "{}")); }
    catch { return {}; }
  }, [item.config_json]);

  const widthCm = Math.round(totalWidth(cfg));

  const [openDoorIds, setOpenDoorIds] = useState([]);
  const [openDrawerIds, setOpenDrawerIds] = useState([]);
  const [slidingDoorsHidden, setSlidingDoorsHidden] = useState(false);
  const [allDoorsHidden, setAllDoorsHidden] = useState(false);

  const hasSliding =
    cfg.kind === "sliding" ||
    (cfg.doors ?? []).some((d) => d.kind === "sliding");

  function toggleDoor(id) {
    const isClosing = openDoorIds.includes(id);
    if (!isClosing) {
      setOpenDoorIds((p) => [...p, id]);
      return;
    }
    // Close drawers first, then close the door after they retract
    setOpenDrawerIds((d) =>
      d.filter((drawerId) =>
        !drawerId.startsWith(`item-${id}-`) && !drawerId.startsWith(`stack-${id}-`)
      )
    );
    setTimeout(() => setOpenDoorIds((p) => p.filter((x) => x !== id)), 300);
  }
  function toggleDrawer(id) {
    setOpenDrawerIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const Hm = (cfg.dimensions?.H ?? 240) / 100;
  const Wm = widthCm / 100;
  const Dm = (cfg.dimensions?.D ?? 56) / 100;
  const sceneCamera = [
    Wm * 0.2,
    Hm / 2 + Hm * 0.4,
    Dm / 2 + Math.max(3.5, Math.max(Hm, Wm) * 2.0),
  ];
  const sceneTargetY = Hm / 2;

  const doorKinds = (cfg.doors ?? []).map((d) => d.kind);
  const uniformKind = doorKinds.length && doorKinds.every((k) => k === doorKinds[0])
    ? doorKinds[0] : "mixed";
  const kindLabel = uniformKind === "sliding" ? "הזזה" : uniformKind === "hinged" ? "ציר" : "מעורב";

  return (
    <div
      className="sr-details__overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`פרטי דגם: ${item.name}`}
    >
      <div className="sr-details__card" onClick={(e) => e.stopPropagation()}>

        <div className="sr-details__header">
          <h3 className="sr-details__name">{item.name}</h3>
          <button type="button" className="sr-details__close" onClick={onClose} aria-label="סגור" title="סגור (Esc)">
            <X />
          </button>
        </div>

        <div className="sr-details__body">
          {/* Info column — DOM first → visual RIGHT in RTL */}
          <div className="sr-details__info">
            {item.is_display_sale && item.display_sale_price ? (
              <div className="sr-details__sale-block">
                <span className="sr-details__sale-badge">מכירה מתצוגה</span>
                <span className="sr-details__price-original">{formatILS(cfg.basePrice)}</span>
                <span className="sr-details__price-sale">₪{Number(item.display_sale_price).toLocaleString()}</span>
              </div>
            ) : cfg.basePrice ? (
              <div className="sr-details__price">{formatILS(cfg.basePrice)}</div>
            ) : null}

            <div className="sr-details__stats">
              {cfg.dimensions && (
                <div className="sr-details__stat">
                  <span className="sr-details__stat-label">מימדים (ס״מ)</span>
                  <span className="sr-details__stat-value">{widthCm} × {cfg.dimensions.H} × {cfg.dimensions.D}</span>
                </div>
              )}
              {cfg.doors?.length > 0 && (
                <div className="sr-details__stat">
                  <span className="sr-details__stat-label">דלתות</span>
                  <span className="sr-details__stat-value">{cfg.doors.length} · {kindLabel}</span>
                </div>
              )}
            </div>

            <p className="sr-details__hint">
              לחץ על דלת או מגירה כדי לפתוח / לסגור. גרור כדי לסובב את המודל.
            </p>

            <div className="sr-details__footer">
              <button type="button" className="sr-details__back-btn" onClick={onClose}>חזור</button>
              <div className="sr-details__footer-actions">
                <button
                  type="button"
                  className={"sr-details__cta-btn sr-details__cta-btn--quick" + (added ? " sr-details__cta-btn--added" : "")}
                  onClick={() => !added && onAddToCart(item)}
                  disabled={added}
                >
                  {added ? <><Check /> נוסף לעגלה</> : "הזמן"}
                </button>
                {onDesign && (
                  <button type="button" className="sr-details__cta-btn sr-details__cta-btn--design" onClick={() => onDesign(item)}>
                    התחל לעצב
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview column — DOM second → visual LEFT in RTL */}
          <div className="sr-details__preview">
            {hasSliding && (
              <button
                type="button"
                className={"sr-details__eye-btn" + (slidingDoorsHidden ? " sr-details__eye-btn--active" : "")}
                onClick={() => setSlidingDoorsHidden((v) => !v)}
                aria-label={slidingDoorsHidden ? "הראה דלתות הזזה" : "הסתר דלתות הזזה"}
              >
                {slidingDoorsHidden ? <EyeOff /> : <Eye />}
              </button>
            )}
            <ClosetScene
              cameraPosition={sceneCamera}
              targetY={sceneTargetY}
              minDistance={3}
              maxDistance={25}
              introAnimation
              overlayActions={
                <SceneDoorControls
                  doors={cfg.doors ?? []}
                  openDoorIds={openDoorIds}
                  setOpenDoorIds={setOpenDoorIds}
                  hideDoors={allDoorsHidden}
                  setHideDoors={setAllDoorsHidden}
                />
              }
            >
              <ClosetFromConfig
                config={cfg}
                state={{ openDoorIds, openDrawerIds, slidingDoorsHidden, hideDoors: allDoorsHidden }}
                onSelectDoor={toggleDoor}
                onSelectDrawer={toggleDrawer}
                showDimensions
              />
            </ClosetScene>
          </div>
        </div>
      </div>
    </div>
  );
}
