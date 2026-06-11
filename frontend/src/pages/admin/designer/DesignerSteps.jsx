import { ColorPicker, ToggleField } from "../closet-builder/Fields.jsx";
import ClosetInteriorPlan from "../ClosetInteriorPlan.jsx";
import DimensionSlider from "./DimensionSlider.jsx";
import DoorHandlesPicker from "./DoorHandlesPicker.jsx";
import DoorMaterialsPicker from "./DoorMaterialsPicker.jsx";
import RoomPlanner from "../RoomPlanner.jsx";

/**
 * Wizard step bodies for the closet designer. Extracted verbatim from
 * ClosetDesigner.jsx (v2.x) — the JSX is unchanged; the component just
 * receives everything it needs via props + the shared `preview` node
 * (the 3D scene block) which every visual step renders.
 */
export default function DesignerSteps({
  step,
  preview,
  // step 1 — dimensions + structure
  totalW, widthC, setTotalW, nDoors, customDims, setCustomDims, heightC, depthC,
  fromScratch, customBase, setCustomBase, customDividers, setCustomDividers,
  customDivider, setCustomDivider, closetCfg,
  // step 2 — interior plan
  interiorError, customConfig, customItems, setCustomItems, setInteriorError, paletteComponents,
  // step 3 — color + handles
  customColor, setCustomColor, customDoorHandles, setDoorHandle,
  // step 4 — door materials
  customDoorMaterials, setDoorMaterial,
  // step 5 — room planner
  customRoom, setCustomRoom,
  // step 6 — summary
  item, colorName, uniformMaterial, MATERIAL_LABELS, uniformHandle, handleName,
  interiorCounts, priceLabel,
}) {
  if (step === 1) {
    return (
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
            <>
              {closetCfg?.allowBase !== false && (
                <div className="closet-designer__color-block">
                  <h5 className="closet-designer__color-title">בסיס</h5>
                  <ToggleField
                    label="במה — הארון עומד על רגליים"
                    checked={customBase}
                    onChange={setCustomBase}
                  />
                </div>
              )}
              {nDoors > 1 && closetCfg?.allowDivider !== false && (
                <div className="closet-designer__color-block">
                  <h5 className="closet-designer__color-title">חלוקה פנימית</h5>
                  <ToggleField
                    label="דופן פנימי בין תאים"
                    checked={customDivider}
                    onChange={setCustomDivider}
                  />
                </div>
              )}
            </>
          )}
        </div>
        {preview}
      </div>
    );
  }

  if (step === 2) {
    return (
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
    );
  }

  if (step === 3) {
    return (
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
        {preview}
      </div>
    );
  }

  if (step === 4) {
    return (
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
        {preview}
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="closet-designer__body closet-designer__body--room">
        <RoomPlanner
          room={customRoom}
          onChange={setCustomRoom}
          closetWidthCm={totalW}
          closetDepthCm={customDims.D}
        />
      </div>
    );
  }

  if (step === 6) {
    return (
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
        {preview}
      </div>
    );
  }

  return null;
}
