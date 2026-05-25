import { useEffect, useMemo, useRef, useState } from "react";
import { Package, Plus, Trash, Save, Check, Download, Upload, Image as ImageIcon, Eye, EyeOff } from "../../components/Icons.jsx";
import {
  adminGetTemplates,
  adminGetTemplate,
  adminCreateTemplate,
  adminUpdateTemplate,
  adminUploadTemplateImage,
  adminDeleteTemplateImage,
  adminDeleteTemplate,
} from "../../api.js";
import ClosetScene from "./closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./closet3d/ClosetFromConfig.jsx";
import { totalPrice, totalWidth } from "./closet3d/schema.js";
import { migrateConfig, newConfig, randomConfig } from "./closet-builder/defaults.js";
import {
  EXPORT_SCHEMA_VERSION,
  downloadJson,
  resizeImageForUpload,
  safeFilename,
  todayStamp,
} from "./closet-builder/helpers.js";
import {
  AddOnsEditor,
  AppearanceEditor,
  BasicsEditor,
  ConstraintsEditor,
  DimensionsEditor,
} from "./closet-builder/Editors.jsx";
import { DoorsSection } from "./closet-builder/DoorCard.jsx";

function formatILS(amount) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Admin closet builder — authors ClosetConfig models and persists
 * them to the closet_templates table.
 *
 * v1.22.0 redesign: doors and compartments are 1:1; each door
 * card includes its compartment editor. Models persist with a
 * draft/ready flag. Customer-facing surface is a later release.
 *
 * v1.46.0 split this file. The form bits / editors / data helpers
 * live in ./closet-builder/ now:
 *
 *   closet-builder/
 *     helpers.js   — withClone, file I/O, random utilities,
 *                    EXPORT_SCHEMA_VERSION.
 *     defaults.js  — newConfig / newDoor / randomConfig (+ deps).
 *     Fields.jsx   — NumberField / TextField / ToggleField.
 *     Editors.jsx  — BasicsEditor / DimensionsEditor /
 *                    AppearanceEditor / AddOnsEditor.
 *     DoorCard.jsx — DoorCard + DoorsSection (the biggest chunk).
 *
 * This file is now just state + toolbar + layout.
 */

export default function DevClosetBuilder() {
  const [config, setConfig] = useState(newConfig);
  const [currentId, setCurrentId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  // v1.94.0 — display-sale: admin marks specific ready models as
  // floor units offered at a fixed discount. Customers see them on
  // /display-sale and add to cart with no customization. The price
  // is a free-text string (e.g. "₪3,500") so the admin types
  // whatever currency-formatted figure they want.
  const [isDisplaySale, setIsDisplaySale] = useState(false);
  const [displaySalePrice, setDisplaySalePrice] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [status, setStatus] = useState(""); // "saving" | "saved" | "imported" | "error: ..."
  // Per-door visibility state. Each door is in one of three states:
  //   "closed" (default, not stored)
  //   "open"   (rendered in open position — slid outward / swung)
  //   "hidden" (not rendered)
  const [doorStates, setDoorStates] = useState({});
  const [doorsHidden, setDoorsHidden] = useState(false);

  // Per-door active compartment variant. Tracks which variant tab
  // is selected for editing AND which variant the 3D preview
  // renders (v1.27.0 — was per-card local state before; the lift
  // makes the preview follow the form's active tab).
  const [activeVariantPerDoor, setActiveVariantPerDoor] = useState({});

  // v1.35.0 — which external drawers (below shortened doors) are
  // rendered in their "pulled-out" position.
  const [openDrawerIds, setOpenDrawerIds] = useState([]);

  // v1.52.0 — optional product photo. Lives on the backend (image_path
  // column); we keep a mirror here so the editor can show the current
  // image immediately without refetching. null = no image (gallery
  // falls back to the 3D thumbnail).
  const [imagePath, setImagePath] = useState(null);
  // Local progress flag for the upload spinner. Saved file lands in
  // `imagePath`; this only tracks the in-flight state.
  const [imageUploading, setImageUploading] = useState(false);
  // Hidden file input for the "העלה תמונה" button.
  const imageInputRef = useRef(null);

  function toggleDrawer(drawerId) {
    setOpenDrawerIds((prev) =>
      prev.includes(drawerId)
        ? prev.filter((x) => x !== drawerId)
        : [...prev, drawerId]
    );
  }

  // v1.40.0 — file picker ref. One input handles both single-
  // model and library imports; the file's `kind` field disambiguates.
  const fileInputRef = useRef(null);

  function exportCurrent() {
    downloadJson(
      `closet-${safeFilename(config.name)}-${todayStamp()}.json`,
      {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        kind: "model",
        model: { name: config.name, is_ready: isReady, config },
      }
    );
  }

  async function exportLibrary() {
    setStatus("saving");
    try {
      const list = await adminGetTemplates();
      const full = await Promise.all(
        list.map((t) => adminGetTemplate(t.id))
      );
      downloadJson(
        `closet-library-${todayStamp()}.json`,
        {
          schemaVersion: EXPORT_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          kind: "library",
          models: full.map((m) => ({
            name: m.name,
            is_ready: m.is_ready,
            config: JSON.parse(m.config_json),
          })),
        }
      );
      setStatus("saved");
    } catch (e) {
      setStatus(`error: ${e.message}`);
    }
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("saving");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let created = 0;
      if (data.kind === "model" && data.model) {
        await adminCreateTemplate({
          name: data.model.name,
          config_json: JSON.stringify(data.model.config),
          is_ready: data.model.is_ready ?? false,
        });
        created = 1;
      } else if (data.kind === "library" && Array.isArray(data.models)) {
        for (const m of data.models) {
          await adminCreateTemplate({
            name: m.name,
            config_json: JSON.stringify(m.config),
            is_ready: m.is_ready ?? false,
          });
          created++;
        }
      } else {
        throw new Error("קובץ לא מזוהה — לא מודל ולא ספרייה");
      }
      await reloadTemplates();
      setStatus(created === 1 ? "imported" : `imported-${created}`);
    } catch (err) {
      setStatus(`error: ${err.message}`);
    } finally {
      // Reset so the same file can be picked again later.
      e.target.value = "";
    }
  }

  function setActiveVariantForDoor(doorId, variantId) {
    setActiveVariantPerDoor((prev) => ({ ...prev, [doorId]: variantId }));
  }
  function resolveActiveVariantId(door) {
    return (
      activeVariantPerDoor[door.id] ??
      door.compartment.defaultVariant ??
      door.compartment.variants[0].id
    );
  }

  function setDoorState(id, next) {
    setDoorStates((prev) => {
      const merged = { ...prev };
      if (!next || next === "closed") delete merged[id];
      else merged[id] = next;
      return merged;
    });
  }
  function setAllDoorStates(next) {
    if (!next || next === "closed") {
      setDoorStates({});
      return;
    }
    const all = Object.fromEntries(config.doors.map((d) => [d.id, next]));
    setDoorStates(all);
  }
  function toggleDoorOpen(id) {
    setDoorStates((prev) => {
      const merged = { ...prev };
      if (merged[id] === "open") delete merged[id];
      else merged[id] = "open";
      return merged;
    });
  }

  // Recompute the preview's openDoorIds + hideDoorIds +
  // compartmentVariants whenever the relevant state changes. Stale
  // entries (door deleted) fall out naturally — we iterate the
  // live config.doors.
  const previewState = useMemo(() => {
    const openDoorIds = [];
    const hideDoorIds = [];
    const compartmentVariants = {};
    for (const door of config.doors) {
      const s = doorStates[door.id];
      if (s === "open") openDoorIds.push(door.id);
      else if (s === "hidden") hideDoorIds.push(door.id);
      const activeId =
        activeVariantPerDoor[door.id] ??
        door.compartment.defaultVariant ??
        door.compartment.variants[0].id;
      compartmentVariants[door.id] = activeId;
    }
    return {
      slidingDoorsHidden: doorsHidden,
      doorSlide: 0,
      openDoorIds,
      hideDoorIds,
      openDrawerIds,
      compartmentVariants,
    };
  }, [doorStates, activeVariantPerDoor, openDrawerIds, config.doors, doorsHidden]);

  async function reloadTemplates() {
    try {
      const list = await adminGetTemplates();
      setTemplates(list);
    } catch (e) {
      setStatus(`error: ${e.message}`);
    }
  }

  useEffect(() => { reloadTemplates(); }, []);

  async function saveCurrent() {
    setStatus("saving");
    try {
      if (currentId) {
        await adminUpdateTemplate(currentId, {
          name: config.name,
          config_json: JSON.stringify(config),
          is_ready: isReady,
          is_display_sale: isDisplaySale,
          display_sale_price: displaySalePrice,
        });
      } else {
        const created = await adminCreateTemplate({
          name: config.name,
          config_json: JSON.stringify(config),
        });
        setCurrentId(created.id);
        // persist flags now that we have an id
        await adminUpdateTemplate(created.id, {
          is_ready: isReady,
          is_display_sale: isDisplaySale,
          display_sale_price: displaySalePrice || null,
        });
      }
      setStatus("saved");
      await reloadTemplates();
    } catch (e) {
      setStatus(`error: ${e.message}`);
    }
  }

  async function loadTemplate(id) {
    if (!id) return;
    try {
      const raw = await adminGetTemplate(id);
      const t = { ...raw, config: JSON.parse(raw.config_json) };
      // v1.56.0 — older templates lack `kind` and `constraints`;
      // migrateConfig fills them in idempotently so the builder UI
      // and the customer designer have something to read.
      setConfig(migrateConfig(t.config));
      setCurrentId(t.id);
      setIsReady(t.is_ready);
      setIsDisplaySale(t.is_display_sale ?? false);
      setDisplaySalePrice(t.display_sale_price ?? "");
      setImagePath(t.image_path ?? null);
      setSelectedItem(null);
      setDoorStates({});
      setActiveVariantPerDoor({});
      setOpenDrawerIds([]);
      setStatus("");
    } catch (e) {
      setStatus(`error: ${e.message}`);
    }
  }

  function newOne() {
    setConfig(newConfig());
    setCurrentId(null);
    setIsReady(false);
    setIsDisplaySale(false);
    setDisplaySalePrice("");
    setImagePath(null);
    setSelectedItem(null);
    setDoorStates({});
    setActiveVariantPerDoor({});
    setOpenDrawerIds([]);
    setStatus("");
  }

  function surpriseMe() {
    setConfig(randomConfig());
    setCurrentId(null);
    setIsReady(false);
    setIsDisplaySale(false);
    setDisplaySalePrice("");
    setImagePath(null);
    setSelectedItem(null);
    setDoorStates({});
    setActiveVariantPerDoor({});
    setOpenDrawerIds([]);
    setStatus("");
  }

  // v1.52.0 — image upload. The user picks a file; we resize it
  // client-side, then POST it to the image endpoint. Requires the
  // template to already exist (currentId set) — for new (unsaved)
  // models the editor surfaces a "save first" hint instead.
  async function handleImagePicked(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || !currentId) return;
    setImageUploading(true);
    setStatus("");
    try {
      const resized = await resizeImageForUpload(file);
      const fd = new FormData();
      fd.append("file", resized);
      const updated = await adminUploadTemplateImage(currentId, fd);
      setImagePath(updated.image_path ?? null);
      setStatus("saved");
      await reloadTemplates();
    } catch (err) {
      setStatus(`error: ${err.message}`);
    } finally {
      setImageUploading(false);
    }
  }

  async function handleImageRemove() {
    if (!currentId || !imagePath) return;
    if (!window.confirm("להסיר את התמונה מהמודל?")) return;
    try {
      const updated = await adminDeleteTemplateImage(currentId);
      setImagePath(updated.image_path ?? null);
      setStatus("saved");
      await reloadTemplates();
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
  }

  async function deleteCurrent() {
    if (!currentId) return;
    if (!window.confirm(`למחוק את המודל "${config.name}"?`)) return;
    try {
      await adminDeleteTemplate(currentId);
      newOne();
      await reloadTemplates();
    } catch (e) {
      setStatus(`error: ${e.message}`);
    }
  }

  async function toggleReady() {
    const next = !isReady;
    setIsReady(next);
    // Persist immediately if this model is already saved.
    if (currentId) {
      try {
        await adminUpdateTemplate(currentId, { is_ready: next });
        await reloadTemplates();
      } catch (e) {
        setStatus(`error: ${e.message}`);
        setIsReady(!next); // revert
      }
    }
  }

  const previewPrice = totalPrice(config, previewState);
  const drafts = templates.filter((t) => !t.is_ready);
  const ready = templates.filter((t) => t.is_ready);

  return (
    <div className="closet-builder-section">
      <div className="closet-builder">
        <div className="closet-builder__toolbar">
          <label className="field field--small">
            <span>מודלים שמורים</span>
            <select
              value={currentId ?? ""}
              onChange={(e) => loadTemplate(Number(e.target.value))}
            >
              <option value="">— בחר מודל —</option>
              {drafts.length > 0 && (
                <optgroup label={`טיוטות (${drafts.length})`}>
                  {drafts.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {ready.length > 0 && (
                <optgroup label={`מוכנים (${ready.length})`}>
                  {ready.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <button type="button" className="btn btn--ghost btn--sm" onClick={newOne}>
            <Plus /> חדש
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={surpriseMe}
            title="צור תצורת ארון אקראית"
          >
            הפתע אותי
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={saveCurrent}>
            <Save /> {currentId ? "שמור שינויים" : "שמור כמודל"}
          </button>
          <button
            type="button"
            className={"btn btn--sm " + (isReady ? "btn--primary" : "btn--ghost")}
            onClick={toggleReady}
            title={isReady ? "החזר לטיוטה" : "סמן כמוכן"}
          >
            <Check /> {isReady ? "מוכן" : "טיוטה"}
          </button>
          {/* v1.94.0 — מכירה מתצוגה toggle. Marking a model as
              display-sale surfaces it on the public /display-sale
              page with the entered price. Only meaningful when
              the model is also is_ready (the public endpoint
              filters by both). The price input shows only when
              the toggle is on so admin doesn't see a stray field
              for regular models. Persisted by saveCurrent +
              re-hydrated by loadTemplate via setIsDisplaySale /
              setDisplaySalePrice. */}
          <button
            type="button"
            className={
              "btn btn--sm " +
              (isDisplaySale ? "btn--primary" : "btn--ghost")
            }
            onClick={() => setIsDisplaySale((v) => !v)}
            title={
              isDisplaySale
                ? "הסר מתצוגה (לא יופיע ב-/display-sale)"
                : "סמן כתצוגה (יופיע במכירה מתצוגה)"
            }
          >
            מכירה מתצוגה
          </button>
          {isDisplaySale && (
            <input
              type="text"
              className="dev-builder__sale-price-input"
              value={displaySalePrice}
              onChange={(e) => setDisplaySalePrice(e.target.value)}
              placeholder="למשל ₪3,500"
              maxLength={32}
              title="מחיר תצוגה — מוצג לצד מחיר הבסיס המקורי"
            />
          )}
          {currentId && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={deleteCurrent}>
              <Trash /> מחק
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={exportCurrent}
            title="הורד את המודל הנוכחי כקובץ JSON"
          >
            <Download /> ייצוא
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={triggerImport}
            title="ייבוא מודל או ספרייה מקובץ JSON"
          >
            <Upload /> ייבוא
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={exportLibrary}
            title="הורד את כל המודלים השמורים כקובץ JSON אחד"
          >
            <Download /> ייצוא הכל
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
          {status && (
            <span className={"closet-builder__status" + (status.startsWith("error") ? " closet-builder__status--err" : "")}>
              {status === "saving" ? "שומר…"
                : status === "saved" ? "נשמר"
                : status === "imported" ? "ייובא"
                : status.startsWith("imported-") ? `ייובאו ${status.slice(9)} מודלים`
                : status.startsWith("error") ? `שגיאה: ${status.slice(7)}`
                : ""}
            </span>
          )}
        </div>

        <div className="closet-builder__body">
          <div className="closet-builder__form">
            <BasicsEditor config={config} setConfig={setConfig} />
            <div className="closet-builder__group">
              <h4 className="closet-builder__group-title">תמונת מוצר</h4>
              {imagePath ? (
                <div className="closet-builder__image-preview">
                  <img
                    src={`/uploads/${imagePath}`}
                    alt={`תמונת ${config.name}`}
                  />
                  <div className="closet-builder__image-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageUploading}
                    >
                      <Upload /> החלף תמונה
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={handleImageRemove}
                      disabled={imageUploading}
                    >
                      <Trash /> הסר
                    </button>
                  </div>
                </div>
              ) : (
                <div className="closet-builder__image-empty">
                  <ImageIcon />
                  <div>
                    <div className="muted small">
                      תמונה אמיתית של המוצר. תופיע בגלריה במקום תצוגת
                      התלת-מימד הסטטית.
                    </div>
                    {!currentId && (
                      <div className="muted small closet-builder__image-hint">
                        שמור את המודל לפני העלאת תמונה.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={!currentId || imageUploading}
                  >
                    <Upload /> {imageUploading ? "מעלה…" : "העלה תמונה"}
                  </button>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleImagePicked}
              />
            </div>
            <DimensionsEditor config={config} setConfig={setConfig} />
            <ConstraintsEditor config={config} setConfig={setConfig} />
            <AppearanceEditor config={config} setConfig={setConfig} />
            <DoorsSection
              config={config}
              setConfig={setConfig}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              doorStates={doorStates}
              setDoorState={setDoorState}
              setAllDoorStates={setAllDoorStates}
              resolveActiveVariantId={resolveActiveVariantId}
              setActiveVariantForDoor={setActiveVariantForDoor}
            />
            <AddOnsEditor config={config} setConfig={setConfig} />
          </div>

          <div className="closet-builder__preview">
            <div className="dev-closet-3d__stage closet-builder__stage">
              <button
                type="button"
                className={"closet-builder__eye-btn" + (doorsHidden ? " closet-builder__eye-btn--active" : "")}
                onClick={() => setDoorsHidden((v) => !v)}
                title={doorsHidden ? "הצג דלתות" : "הסתר דלתות"}
                aria-pressed={doorsHidden}
              >
                {doorsHidden ? <EyeOff /> : <Eye />}
              </button>
              <ClosetScene
                cameraPosition={[Math.max(5, totalWidth(config) / 100 + 2), 3.0, 6.2]}
                targetY={config.dimensions.H / 200}
              >
                <ClosetFromConfig
                  config={config}
                  state={previewState}
                  onSelectItem={(doorIndex, itemIndex) =>
                    setSelectedItem({ doorIndex, itemIndex })
                  }
                  selectedItem={selectedItem}
                  onSelectDoor={toggleDoorOpen}
                  onSelectDrawer={toggleDrawer}
                />
              </ClosetScene>
              <div className="dev-closet-3d__hint muted small">
                לחיצה על דלת פותחת/סוגרת אותה · לחיצה על מגירה תחתונה פותחת/סוגרת אותה · לחיצה על מדף, מוט או פריט פנימי בוחרת אותו בטופס.
              </div>
            </div>
            <div className="closet-builder__preview-summary">
              <span className="muted small">מחיר בסיס (ללא תוספות)</span>
              <span className="closet-builder__price">{formatILS(previewPrice)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
