import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, ArrowRight, Eye, EyeOff } from "../components/Icons.jsx";
import { addToCart } from "../lib/cart.js";
import ClosetScene from "./admin/closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./admin/closet3d/ClosetFromConfig.jsx";
import { totalPrice } from "./admin/closet3d/schema.js";
import { usePaletteColors } from "./admin/PaletteContext.jsx";
import { useHandles } from "./admin/HandlesContext.jsx";
import { ColorPicker, ToggleField } from "./admin/closet-builder/Fields.jsx";
import ClosetInteriorPlan from "./admin/ClosetInteriorPlan.jsx";
import RoomPlanner from "./admin/RoomPlanner.jsx";
import { WIZARD_STEPS } from "./admin/designer/wizardSteps.js";
import StepNav from "./admin/designer/StepNav.jsx";
import DimensionSlider from "./admin/designer/DimensionSlider.jsx";
import DoorHandlesPicker from "./admin/designer/DoorHandlesPicker.jsx";
import DoorMaterialsPicker from "./admin/designer/DoorMaterialsPicker.jsx";
import {
  clearDesignerState,
  loadDesignerState,
  saveDesignerState,
} from "./admin/designer/persistence.js";
import "../styles/showroom/05-designer.css";

export default function ClosetDesigner({ item, onClose, initialColor, mode = "full" }) {
  const navigate = useNavigate();
  const cfg = item.config;
  const nDoors = Math.max(1, cfg.doors?.length ?? 1);

  const { colors } = usePaletteColors();
  const { handles } = useHandles();
  const MATERIAL_LABELS = { wood: "עץ", mirror: "מראה", glass: "זכוכית" };
  const colorName = (key) => colors[key]?.name ?? key;
  const handleName = (key) => handles[key]?.name ?? key;

  const availableSteps = useMemo(
    () => mode === "quick" ? WIZARD_STEPS.filter((s) => s.id === 3 || s.id === 6) : WIZARD_STEPS,
    [mode],
  );

  const saved = useMemo(() => loadDesignerState(item.id), [item.id]);

  const c = cfg.constraints ?? {};
  const widthC = c.width ?? { min: nDoors * 40, max: nDoors * 150, step: 5 };
  const heightC = c.height ?? { min: 100, max: 300, step: 5 };
  const depthC = c.depth ?? { min: 30, max: 100, step: 5 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const [customDims, setCustomDims] = useState(saved?.customDims ?? {
    H: clamp(cfg.dimensions?.H ?? 240, heightC.min, heightC.max),
    compartmentWidth: clamp(
      cfg.dimensions?.compartmentWidth ?? Math.round((cfg.dimensions?.W ?? 80) / nDoors),
      Math.ceil(widthC.min / nDoors),
      Math.floor(widthC.max / nDoors),
    ),
    D: clamp(cfg.dimensions?.D ?? 56, depthC.min, depthC.max),
  });

  const [customColor, setCustomColor] = useState(
    saved?.customColor ?? initialColor ?? cfg.color ?? "white",
  );

  const [customDivider, setCustomDivider] = useState(
    saved?.customDivider ?? cfg.hasInternalDivider ?? false,
  );

  const [customItems, setCustomItems] = useState(saved?.customItems ?? {});

  const [customRoom, setCustomRoom] = useState(
    saved?.customRoom ?? { widthCm: 400, depthCm: 400, items: [] },
  );

  const [step, setStep] = useState(() => {
    const restored = saved?.step;
    if (restored && availableSteps.some((s) => s.id === restored)) return restored;
    return availableSteps[0].id;
  });

  const [customDoorHandles, setCustomDoorHandles] = useState(() => {
    if (saved?.customDoorHandles) return saved.customDoorHandles;
    const map = {};
    for (const door of cfg.doors ?? []) {
      map[door.id] = door.handleColor ?? cfg.handleColor ?? "silver";
    }
    return map;
  });
  const setDoorHandle = useCallback((doorId, key) => {
    setCustomDoorHandles((m) => ({ ...m, [doorId]: key }));
  }, []);

  const [customDoorMaterials, setCustomDoorMaterials] = useState(() => {
    if (saved?.customDoorMaterials) return saved.customDoorMaterials;
    const map = {};
    for (const door of cfg.doors ?? []) {
      map[door.id] = door.defaultMaterial ?? "wood";
    }
    return map;
  });
  const setDoorMaterial = useCallback((doorId, kind) => {
    setCustomDoorMaterials((m) => ({ ...m, [doorId]: kind }));
  }, []);

  const [slidingDoorsHidden, setSlidingDoorsHidden] = useState(false);
  const hasSliding =
    cfg.kind === "sliding" ||
    (cfg.doors ?? []).some((d) => d.kind === "sliding");

  const [openDoorIds, setOpenDoorIds] = useState([]);
  const [openDrawerIds, setOpenDrawerIds] = useState([]);

  const totalW = customDims.compartmentWidth * nDoors;
  const setTotalW = (w) =>
    setCustomDims((d) => ({ ...d, compartmentWidth: Math.round(w / nDoors) }));

  const customConfig = useMemo(() => ({
    ...cfg,
    dimensions: { ...cfg.dimensions, ...customDims },
    color: customColor,
    hasInternalDivider: customDivider,
  }), [cfg, customDims, customColor, customDivider]);

  useEffect(() => {
    saveDesignerState(item.id, {
      customDims, customColor, customDivider, customDoorHandles,
      customDoorMaterials, customItems, customRoom, step,
    });
  }, [item.id, customDims, customColor, customDivider, customDoorHandles,
    customDoorMaterials, customItems, customRoom, step]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Hm = customDims.H / 100;
  const Wm = totalW / 100;
  const Dm = customDims.D / 100;
  const sceneCamera = [
    Wm * 0.2,
    Hm / 2 + Hm * 0.4,
    Dm / 2 + Math.max(3.5, Math.max(Hm, Wm) * 2.0),
  ];
  const sceneTargetY = Hm / 2;

  function handleAddToCart() {
    addToCart({
      id: "closet-" + item.id + "-" + Date.now(),
      templateId: item.id,
      name: item.name,
      image_path: item.image_path,
      config_json: item.config_json,
      priceEstimate,
      snapshot: {
        customDims, customColor, customDivider,
        customDoorHandles, customDoorMaterials,
        customItems, customRoom,
        priceEstimate,
      },
    });
    clearDesignerState(item.id);
    onClose?.();
    navigate("/cart");
  }

  function handleContinue() {
    const i = availableSteps.findIndex((s) => s.id === step);
    if (i >= 0 && i < availableSteps.length - 1) {
      setStep(availableSteps[i + 1].id);
      return;
    }
    handleAddToCart();
  }

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

  const commonState = {
    openDoorIds, openDrawerIds, doorHandles: customDoorHandles,
    doorMaterials: customDoorMaterials, slidingDoorsHidden,
  };

  // Live price estimate (base + selected add-ons). Shown in the footer and the
  // confirmation step, and stored on the cart item so the admin sees it on the lead.
  const priceEstimate = totalPrice(customConfig, commonState);
  const priceLabel = priceEstimate ? `₪${Number(priceEstimate).toLocaleString()}` : null;

  // Per-door interior fittings count for the summary (shelf/rod/drawer).
  const interiorCounts = (() => {
    const labels = { shelf: "מדפים", rod: "מוטות", drawer: "מגירות" };
    const counts = {};
    for (const list of Object.values(customItems || {})) {
      if (!Array.isArray(list)) continue;
      for (const it of list) if (it?.type) counts[it.type] = (counts[it.type] || 0) + 1;
    }
    return ["shelf", "rod", "drawer"].filter((t) => counts[t]).map((t) => `${counts[t]} ${labels[t]}`).join(" · ");
  })();

  const doorList = cfg.doors ?? [];
  const uniformMaterial = doorList.length && doorList.every((d) => customDoorMaterials[d.id] === customDoorMaterials[doorList[0].id])
    ? customDoorMaterials[doorList[0].id] : null;
  const uniformHandle = doorList.length && doorList.every((d) => customDoorHandles[d.id] === customDoorHandles[doorList[0].id])
    ? customDoorHandles[doorList[0].id] : null;

  const Preview = (
    <div className="closet-designer__preview">
      {hasSliding && (
        <button
          type="button"
          className="closet-preview__eye-btn"
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
        introAnimation={step === availableSteps[0].id}
        hall
        showDimToggle
      >
        <ClosetFromConfig
          config={customConfig}
          state={commonState}
          onSelectDoor={toggleDoor}
          onSelectDrawer={toggleDrawer}
          showDimensions={step === 1}
        />
      </ClosetScene>
    </div>
  );

  const idx = availableSteps.findIndex((s) => s.id === step);
  const prevId = idx > 0 ? availableSteps[idx - 1].id : null;
  const nextId = idx < availableSteps.length - 1 ? availableSteps[idx + 1].id : null;
  const isLastStep = step === availableSteps[availableSteps.length - 1].id;

  return (
    <div className="closet-designer__overlay" role="dialog" aria-label={`עיצוב: ${item.name}`}>
      <div className="closet-designer__card">
        <div className="closet-designer__header">
          <div className="closet-designer__title-wrap">
            <h3 className="closet-designer__name">{item.name}</h3>
          </div>
          <button type="button" className="closet-designer__close-btn" onClick={onClose} aria-label="סגור" title="סגור (Esc)">
            <X />
          </button>
        </div>

        <div className="closet-designer__step-nav-pill">
          <StepNav steps={availableSteps} activeStep={step} onStepChange={setStep} />
        </div>

        {step === 1 && (
          <div className="closet-designer__body">
            <div className="closet-designer__controls">
              <h4 className="closet-designer__step-title">מימדים</h4>
              <p className="closet-designer__step-hint">התאם את גודל הארון. התצוגה מתעדכנת בזמן אמת.</p>
              <DimensionSlider
                label="רוחב כללי"
                value={totalW}
                min={widthC.min}
                max={widthC.max}
                step={widthC.step}
                onChange={setTotalW}
                hint={nDoors > 1 ? `${nDoors} מדורים × ${customDims.compartmentWidth} ס״מ` : null}
              />
              <DimensionSlider
                label="גובה"
                value={customDims.H}
                min={heightC.min}
                max={heightC.max}
                step={heightC.step}
                onChange={(v) => setCustomDims((d) => ({ ...d, H: v }))}
              />
              <DimensionSlider
                label="עומק"
                value={customDims.D}
                min={depthC.min}
                max={depthC.max}
                step={depthC.step}
                onChange={(v) => setCustomDims((d) => ({ ...d, D: v }))}
              />
              {nDoors > 1 && (
                <div className="closet-designer__color-block">
                  <h5 className="closet-designer__color-title">חלוקה פנימית</h5>
                  <ToggleField
                    label="מחיצה פנימית בין תאים"
                    checked={customDivider}
                    onChange={setCustomDivider}
                  />
                </div>
              )}
            </div>
            {Preview}
          </div>
        )}

        {step === 2 && (
          <div className="closet-designer__body closet-designer__body--step2">
            <ClosetInteriorPlan
              cfg={customConfig}
              items={customItems}
              onChange={setCustomItems}
            />
          </div>
        )}

        {step === 3 && (
          <div className="closet-designer__body">
            <div className="closet-designer__controls">
              <h4 className="closet-designer__step-title">צבע וידיות</h4>
              <p className="closet-designer__step-hint">הצבע והידיות חלים על הארון שמולך.</p>
              <div className="closet-designer__color-block">
                <h5 className="closet-designer__color-title">צבע הארון</h5>
                <ColorPicker value={customColor} onChange={setCustomColor} />
              </div>
              <div className="closet-designer__color-block">
                <h5 className="closet-designer__color-title">ידיות לפי דלת</h5>
                <DoorHandlesPicker
                  doors={customConfig.doors ?? []}
                  values={customDoorHandles}
                  onChange={setDoorHandle}
                />
              </div>
            </div>
            {Preview}
          </div>
        )}

        {step === 4 && (
          <div className="closet-designer__body">
            <div className="closet-designer__controls">
              <h4 className="closet-designer__step-title">תוספות</h4>
              <p className="closet-designer__step-hint">
                בחר אם להחליף דלתות לזכוכית והאם להוסיף מראה בצד הפנימי. ניתן לבחור לכל דלת בנפרד.
              </p>
              <div className="closet-designer__color-block">
                <h5 className="closet-designer__color-title">חומרי דלת ומראות</h5>
                <DoorMaterialsPicker
                  doors={customConfig.doors ?? []}
                  values={customDoorMaterials}
                  onChange={setDoorMaterial}
                />
              </div>
            </div>
            {Preview}
          </div>
        )}

        {step === 5 && (
          <div className="closet-designer__body closet-designer__body--room">
            <RoomPlanner
              room={customRoom}
              onChange={setCustomRoom}
              closetWidthCm={totalW}
              closetDepthCm={customDims.D}
            />
          </div>
        )}

        {step === 6 && (
          <div className="closet-designer__body">
            <div className="closet-designer__controls">
              <h4 className="closet-designer__step-title">אישור הזמנה</h4>
              <p className="closet-designer__step-hint">בדוק את הפרטים שבחרת. אם הכל מתאים, הוסף לעגלה.</p>
              <dl className="closet-designer__summary">
                <dt>דגם</dt><dd>{item.name}</dd>
                <dt>גובה</dt><dd>{Math.round(customDims.H)} ס״מ</dd>
                <dt>רוחב כולל</dt><dd>{Math.round(totalW)} ס״מ ({nDoors} דלתות)</dd>
                <dt>עומק</dt><dd>{Math.round(customDims.D)} ס״מ</dd>
                <dt>צבע</dt><dd>{colorName(customColor)}</dd>
                {uniformMaterial && <><dt>חומר דלתות</dt><dd>{MATERIAL_LABELS[uniformMaterial] || uniformMaterial}</dd></>}
                {uniformHandle && <><dt>ידיות</dt><dd>{handleName(uniformHandle)}</dd></>}
                {interiorCounts && <><dt>פנים הארון</dt><dd>{interiorCounts}</dd></>}
                {priceLabel && <><dt>הערכת מחיר</dt><dd className="closet-designer__summary-price">{priceLabel}</dd></>}
              </dl>
              <p className="closet-designer__price-note">
                * המחיר הוא הערכה בלבד. ההצעה הסופית תישלח לאחר יצירת קשר.
              </p>
            </div>
            {Preview}
          </div>
        )}

        <div className="closet-designer__mobile-nav">
          <button
            type="button"
            className="closet-designer__mobile-nav__btn"
            onClick={() => prevId != null && setStep(prevId)}
            disabled={prevId == null}
          >
            <ArrowRight /> הקודם
          </button>
          <div className="closet-designer__mobile-nav__indicator">
            שלב {idx + 1} מתוך {availableSteps.length}
            <span className="closet-designer__mobile-nav__label">{availableSteps[idx]?.label}</span>
          </div>
          <button
            type="button"
            className="closet-designer__mobile-nav__btn closet-designer__mobile-nav__btn--primary"
            onClick={() => nextId != null ? setStep(nextId) : handleAddToCart()}
          >
            {nextId != null ? "הבא" : "הוסף לעגלה"} <ArrowLeft />
          </button>
        </div>

        <div className="closet-designer__footer">
          <button type="button" className="closet-designer__cancel-btn" onClick={onClose}>ביטול</button>
          {priceLabel && (
            <div className="closet-designer__footer-price">
              <span className="closet-designer__footer-price-label">הערכת מחיר</span>
              <span className="closet-designer__footer-price-value">{priceLabel}</span>
            </div>
          )}
          {isLastStep && (
            <button type="button" className="closet-designer__add-btn" onClick={handleContinue}>
              הוסף לעגלה <ArrowLeft />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
