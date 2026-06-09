import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, ArrowRight, Eye, EyeOff, Download } from "../components/Icons.jsx";
import { addToCart, updateCartItem } from "../lib/cart.js";
import ClosetScene from "./admin/closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./admin/closet3d/ClosetFromConfig.jsx";
import { totalPrice, estimatePrice } from "./admin/closet3d/schema.js";
import { usePaletteColors } from "./admin/PaletteContext.jsx";
import { useHandles } from "./admin/HandlesContext.jsx";
import { ColorPicker, ToggleField } from "./admin/closet-builder/Fields.jsx";
import ClosetInteriorPlan from "./admin/ClosetInteriorPlan.jsx";
import { usePhotoExport } from "./admin/designer/usePhotoExport.js";
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
import { getPublicCustomClosetConfig, getPublicComponentPrices } from "../api.js";
import { SNAP_POSITIONS, findFreeSlotIndex } from "./admin/interior-plan/slots.js";
import "../styles/showroom/05-designer.css";

export default function ClosetDesigner({ item, onClose, initialColor, mode = "full", fromScratch = false, editCartItemId = null }) {
  const navigate = useNavigate();
  const cfg = item.config;
  const nDoors = Math.max(1, cfg.doors?.length ?? 1);

  const [closetCfg, setClosetCfg] = useState(null);
  const [componentPrices, setComponentPrices] = useState([]);
  useEffect(() => {
    getPublicCustomClosetConfig().then(setClosetCfg).catch(() => {});
    getPublicComponentPrices().then(setComponentPrices).catch(() => {});
  }, []);

  // Build the stage-2 palette: enabled components that have item_type set.
  // Each entry has id, name, color, item_type → rendered as a colored draggable chip.
  const paletteComponents = (() => {
    if (!closetCfg) return [];
    const enabledIds = new Set(closetCfg.addOnComponentIds ?? []);
    return componentPrices.filter(c => enabledIds.has(c.id) && c.item_type);
  })();

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
  const widthC  = { min: c.width?.min  ?? nDoors * 40,  max: c.width?.max  ?? nDoors * 150, step: c.width?.step  ?? 5 };
  const heightC = { min: c.height?.min ?? 100,           max: c.height?.max ?? 300,          step: c.height?.step ?? 5 };
  const depthC  = { min: c.depth?.min  ?? 30,            max: c.depth?.max  ?? 100,           step: c.depth?.step  ?? 5 };
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

  // v2.x — from-scratch stage-1 structure controls.
  // customBase: stand the closet on the silver base/legs (במה). Default off.
  const [customBase, setCustomBase] = useState(
    saved?.customBase ?? cfg.hasBase ?? false,
  );
  // customDividers: per-2-door-unit מחיצה, keyed by the unit's SECOND door
  // index (odd index 1,3,5). Absent → ON (default). Between-unit boundaries
  // are always solid walls and aren't represented here.
  const [customDividers, setCustomDividers] = useState(
    saved?.customDividers ?? {},
  );

  const [customItems, setCustomItems] = useState(() => {
    if (saved?.customItems) return saved.customItems;
    // Seed the stage-2 interior plan from each door's default compartment
    // variant, so the planner shows the template's built-in shelves/rods/
    // drawers instead of an empty cabinet. (The renderer already falls back to
    // these defaults on later steps; this keeps stage 2 consistent.)
    const seed = {};
    for (const door of cfg.doors ?? []) {
      const comp = door.compartment;
      const variant =
        comp?.variants?.find((v) => v.id === comp.defaultVariant) ?? comp?.variants?.[0];
      if (variant?.items?.length) {
        seed[door.id] = variant.items.map((it) => ({ type: it.type, y: it.y }));
      }
    }
    return seed;
  });

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
  const [interiorError, setInteriorError] = useState("");

  // Pre-seed cabins with required minimum items when palette loads
  useEffect(() => {
    const required = paletteComponents.filter(c => c.min_per_cabin > 0);
    if (!required.length) return;
    const doors = cfg.doors ?? [];
    const cabinIds = customDivider && doors.length > 1
      ? doors.map(d => d.id)
      : doors.length > 0 ? [doors[0].id] : [];
    setCustomItems(prev => {
      let updated = { ...prev };
      let anyChange = false;
      for (const cabinId of cabinIds) {
        let cabinItems = [...(updated[cabinId] ?? [])];
        for (const comp of required) {
          const typeKey = `c:${comp.id}`;
          const count = cabinItems.filter(it => it.type === typeKey).length;
          const needed = comp.min_per_cabin - count;
          for (let i = 0; i < needed; i++) {
            const idx = findFreeSlotIndex(cabinItems, comp.item_type ?? 'shelf');
            if (idx === null) break;
            cabinItems = [...cabinItems, { type: typeKey, y: SNAP_POSITIONS[idx] }];
            anyChange = true;
          }
        }
        if (anyChange) updated[cabinId] = cabinItems;
      }
      return anyChange ? updated : prev;
    });
  }, [paletteComponents, customDivider]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalW = customDims.compartmentWidth * nDoors;
  const setTotalW = (w) =>
    setCustomDims((d) => ({ ...d, compartmentWidth: Math.round(w / nDoors) }));

  const customConfig = useMemo(() => {
    // Merge the stage-2 interior plan (customItems: { doorId: [{type,y}] })
    // into each door's compartment so the renderer (which reads
    // door.compartment.variants[].items) shows the shelves/rods/drawers the
    // customer placed. Doors the customer didn't touch keep their template
    // interior.
    // Resolve a placed item's type (custom components are stored as
    // `c:<id>`) to its underlying item_type.
    const resolveType = (t) => {
      if (typeof t === "string" && t.startsWith("c:")) {
        const id = parseInt(t.slice(2), 10);
        return componentPrices.find((c) => c.id === id)?.item_type ?? null;
      }
      return t;
    };
    const doors = (cfg.doors ?? []).map((door, i) => {
      // Divider (דופן) to the LEFT of this door. From-scratch uses the
      // 2-door-unit rule: door 0 has no left divider; the unit's second
      // door (odd index) carries the toggleable מחיצה (default on); the
      // between-unit boundary (even index ≥ 2) is always a solid wall.
      // Templates keep their admin-authored per-cabin divider.
      let divider = door.divider;
      if (fromScratch) {
        if (i === 0) divider = false;
        else if (i % 2 === 1) divider = customDividers[i] ?? true;
        else divider = true;
      }
      const placed = customItems?.[door.id];
      if (!placed) return { ...door, divider };
      // External drawers (מגירה חיצונית) aren't interior items — each one
      // shortens the door and renders as a front drawer below it. Pull
      // them out of the interior list and fold their count into the
      // door's drawerStack (same mechanism as the admin "קיצור" option).
      const interior = placed.filter((it) => resolveType(it.type) !== "external_drawer");
      const extCount = placed.length - interior.length;
      return {
        ...door,
        divider,
        drawerStack: (door.drawerStack ?? 0) + extCount,
        compartment: {
          defaultVariant: "custom",
          variants: [{ id: "custom", label: "מותאם", items: interior }],
        },
      };
    });
    return {
      ...cfg,
      doors,
      dimensions: { ...cfg.dimensions, ...customDims },
      color: customColor,
      hasInternalDivider: customDivider,
      hasBase: customBase,
    };
  }, [cfg, customDims, customColor, customDivider, customBase, customDividers, customItems, componentPrices, fromScratch]);

  useEffect(() => {
    saveDesignerState(item.id, {
      customDims, customColor, customDivider, customBase, customDividers, customDoorHandles,
      customDoorMaterials, customItems, customRoom, step,
    });
  }, [item.id, customDims, customColor, customDivider, customBase, customDividers, customDoorHandles,
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
    const snapshot = {
      customDims, customColor, customDivider, customBase, customDividers,
      customDoorHandles, customDoorMaterials,
      customItems, customRoom,
      priceEstimate,
    };
    if (editCartItemId) {
      updateCartItem(editCartItemId, { snapshot, priceEstimate });
      clearDesignerState(item.id);
      onClose?.();
      return;
    }
    addToCart({
      id: "closet-" + item.id + "-" + Date.now(),
      templateId: item.id,
      name: item.name,
      image_path: item.image_path,
      config_json: item.config_json,
      priceEstimate,
      snapshot,
    });
    clearDesignerState(item.id);
    onClose?.();
    navigate("/cart");
  }

  function checkInteriorMinimums() {
    const required = paletteComponents.filter(c => c.min_per_cabin > 0);
    if (!required.length) return null;
    const doors = customConfig.doors ?? [];
    const cabinIds = customDivider && doors.length > 1
      ? doors.map(d => d.id)
      : doors.length > 0 ? [doors[0].id] : [];
    for (const comp of required) {
      const typeKey = `c:${comp.id}`;
      for (const doorId of cabinIds) {
        const count = (customItems?.[doorId] ?? []).filter(it => it.type === typeKey).length;
        if (count < comp.min_per_cabin) {
          return `יש להוסיף לפחות ${comp.min_per_cabin} ${comp.name} בכל תא`;
        }
      }
    }
    return null;
  }

  function handleContinue() {
    if (step === 2) {
      const err = checkInteriorMinimums();
      if (err) { setInteriorError(err); return; }
    }
    setInteriorError("");
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

  // Numeric fitting counts (shelf/rod/drawer) across all compartments —
  // used both for the summary text and for from-scratch pricing.
  const fittingCounts = (() => {
    const counts = { shelf: 0, rod: 0, drawer: 0 };
    for (const list of Object.values(customItems || {})) {
      if (!Array.isArray(list)) continue;
      for (const it of list) if (it?.type && counts[it.type] != null) counts[it.type] += 1;
    }
    return counts;
  })();

  // Live price estimate. Templates use the admin's basePrice (+ add-ons);
  // from-scratch closets are priced by dimensions + structure + fittings.
  const priceEstimate = fromScratch
    ? estimatePrice(customConfig, { fittings: fittingCounts, state: commonState })
    : totalPrice(customConfig, commonState);
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

  const idx = availableSteps.findIndex((s) => s.id === step);
  const prevId = idx > 0 ? availableSteps[idx - 1].id : null;
  const nextId = idx < availableSteps.length - 1 ? availableSteps[idx + 1].id : null;
  const isLastStep = step === availableSteps[availableSteps.length - 1].id;

  // ── Photo download (final step) ──────────────────────────────────────────
  const captureRef = useRef(null);
  const { downloading, handleDownloadPhotos } = usePhotoExport({
    captureRef,
    name: item.name,
    dims: { Hm, Wm, Dm, targetY: sceneTargetY },
    hasSliding,
    doorList,
    customConfig,
    customItems,
    setOpenDoorIds,
    setSlidingDoorsHidden,
  });

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
      {isLastStep && (
        <button
          type="button"
          className="closet-preview__eye-btn closet-preview__dl-btn"
          onClick={handleDownloadPhotos}
          disabled={downloading}
          title="הורד תמונות הארון (פתוח/סגור, חזית/זווית)"
          aria-label="הורד תמונות"
        >
          <Download />
        </button>
      )}
      <ClosetScene
        cameraPosition={sceneCamera}
        targetY={sceneTargetY}
        minDistance={3}
        maxDistance={25}
        introAnimation={step === availableSteps[0].id}
        showDimToggle
        captureRef={captureRef}
      >
        <ClosetFromConfig
          config={customConfig}
          state={commonState}
          components={componentPrices}
          onSelectDoor={toggleDoor}
          onSelectDrawer={toggleDrawer}
          showDimensions={step === 1 || isLastStep}
        />
      </ClosetScene>
      {downloading && <div className="closet-preview__capturing">מכין תמונות…</div>}
    </div>
  );

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
              {fromScratch ? (
                <>
                  <div className="closet-designer__color-block">
                    <h5 className="closet-designer__color-title">בסיס</h5>
                    <ToggleField
                      label="במה — הארון עומד על רגליים"
                      checked={customBase}
                      onChange={setCustomBase}
                    />
                  </div>
                  {nDoors > 1 && (
                    <div className="closet-designer__color-block">
                      <h5 className="closet-designer__color-title">מחיצות פנים</h5>
                      <p className="closet-designer__step-hint">
                        כל זוג דלתות חולק תא; ניתן להסיר את המחיצה בכל זוג.
                      </p>
                      {Array.from({ length: Math.floor(nDoors / 2) }).map((_, u) => {
                        const secondDoorIdx = u * 2 + 1; // odd index = unit's 2nd door
                        const on = customDividers[secondDoorIdx] ?? true;
                        return (
                          <ToggleField
                            key={u}
                            label={`מחיצה בין דלת ${u * 2 + 1} ל-${u * 2 + 2}`}
                            checked={on}
                            onChange={(v) =>
                              setCustomDividers((m) => ({ ...m, [secondDoorIdx]: v }))
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                nDoors > 1 && closetCfg?.allowDivider !== false && (
                  <div className="closet-designer__color-block">
                    <h5 className="closet-designer__color-title">חלוקה פנימית</h5>
                    <ToggleField
                      label="דופן פנימי בין תאים"
                      checked={customDivider}
                      onChange={setCustomDivider}
                    />
                  </div>
                )
              )}
            </div>
            {Preview}
          </div>
        )}

        {step === 2 && (
          <div className="closet-designer__body closet-designer__body--step2">
            {interiorError && (
              <div className="closet-designer__interior-error">{interiorError}</div>
            )}
            <ClosetInteriorPlan
              cfg={customConfig}
              items={customItems}
              onChange={(v) => { setCustomItems(v); setInteriorError(""); }}
              paletteComponents={paletteComponents}
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
            onClick={handleContinue}
          >
            {nextId != null ? "הבא" : editCartItemId ? "שמור שינויים" : "הוסף לעגלה"} <ArrowLeft />
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
              {editCartItemId ? "שמור שינויים" : "הוסף לעגלה"} <ArrowLeft />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
