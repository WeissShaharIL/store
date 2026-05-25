import { useEffect, useMemo, useRef, useState } from "react";
import { Package, Upload, Trash, Image as ImageIcon } from "../../components/Icons.jsx";
import {
  adminGetTemplates,
  adminGetTemplate,
  adminGetDoorTypeCovers,
  adminUploadDoorTypeCover,
  adminDeleteDoorTypeCover,
} from "../../api.js";
import { resizeImageForUpload } from "./closet-builder/helpers.js";
import ClosetScene from "./closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./closet3d/ClosetFromConfig.jsx";
import { totalWidth } from "./closet3d/schema.js";

/* A closet's door-type bucket for the v1.49.0 segmented tabs.
 *
 * v1.56.0 — prefer the new closet-level `config.kind` field.
 * Fall back to the legacy per-door derivation for older templates
 * that pre-date the field (so existing data keeps showing up in
 * the right tab without an admin re-save). Mixed-kind data is
 * gone in new templates (BasicsEditor's kind picker rewrites all
 * doors), so this code path is just for old saved configs. */
function inferDoorType(config) {
  if (config?.kind === "sliding" || config?.kind === "hinged") {
    return config.kind;
  }
  const doors = config?.doors ?? [];
  if (doors.length === 0) return null;
  const first = doors[0].kind;
  return doors.every((d) => d.kind === first) ? first : "mixed";
}

/**
 * Gallery view — shows every closet model marked `is_ready=true`.
 *
 * Each card shows a static 3D thumbnail (frameloop="never") or the
 * uploaded product photo. A door-type picker at the top filters
 * between sliding and hinged models.
 */
export default function DevClosetGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Door-type filter. Default to sliding.
  const [activeType, setActiveType] = useState("sliding");
  // Door-type picker cover photos, indexed by kind.
  const [covers, setCovers] = useState({});

  async function reloadCovers() {
    try {
      const list = await adminGetDoorTypeCovers();
      const map = {};
      for (const row of list) map[row.kind] = row;
      setCovers(map);
    } catch {
      // Non-fatal — the picker just shows the placeholder.
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [list, coverList] = await Promise.all([
          adminGetTemplates(),
          adminGetDoorTypeCovers().catch(() => []),
        ]);
        const readyOnly = list.filter((t) => t.is_ready);
        const full = await Promise.all(
          readyOnly.map((t) => adminGetTemplate(t.id))
        );
        if (cancelled) return;
        // Parse config_json for each template.
        setItems(full.map((m) => ({ ...m, config: JSON.parse(m.config_json) })));
        const coverMap = {};
        for (const row of coverList) coverMap[row.kind] = row;
        setCovers(coverMap);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Per-type counts (drives the tab labels) + filtered list (drives
  // the cards). Mixed-door closets aren't counted in either bucket.
  const { slidingItems, hingedItems } = useMemo(() => {
    const out = { slidingItems: [], hingedItems: [] };
    for (const t of items) {
      const k = inferDoorType(t.config);
      if (k === "sliding") out.slidingItems.push(t);
      else if (k === "hinged") out.hingedItems.push(t);
    }
    return out;
  }, [items]);

  const filteredItems =
    activeType === "sliding" ? slidingItems : hingedItems;

  return (
    <div className="closet-gallery-section">
      {loading && <div className="muted">טוען…</div>}
      {!loading && error && (
        <div className="muted small">שגיאה בטעינת הגלריה: {error}</div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="muted">
          אין עדיין מודלים מוכנים. סמן מודל כ״מוכן״ בבונה כדי שיופיע כאן.
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <GalleryTypePicker
            activeType={activeType}
            onChange={setActiveType}
            covers={covers}
            onCoversChanged={reloadCovers}
            slidingCount={slidingItems.length}
            hingedCount={hingedItems.length}
          />
          {filteredItems.length === 0 ? (
            <div className="closet-gallery__empty muted">
              {activeType === "sliding"
                ? "אין כרגע ארונות הזזה מוכנים. עבור לכרטיסיה ״ארונות ציר״ או סמן מודל כ״מוכן״ בבונה."
                : "אין כרגע ארונות ציר מוכנים. עבור לכרטיסיה ״ארונות הזזה״ או סמן מודל כ״מוכן״ בבונה."}
            </div>
          ) : (
            <div className="closet-gallery">
              {filteredItems.map((t) => (
                <GalleryCard
                  key={t.id}
                  item={t}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Door-type picker at the top of the gallery.
 * Each option is a big card with an admin-uploaded cover photo
 * (or a placeholder if not uploaded yet). */
const TYPE_LABELS = {
  sliding: "ארונות הזזה",
  hinged: "ארונות ציר",
};

function GalleryTypePicker({
  activeType,
  onChange,
  covers,
  onCoversChanged,
  slidingCount,
  hingedCount,
}) {
  return (
    <div className="closet-gallery__type-picker" role="tablist">
      <TypePickerCard
        kind="sliding"
        active={activeType === "sliding"}
        count={slidingCount}
        cover={covers.sliding}
        onPick={() => onChange("sliding")}
        onCoverChanged={onCoversChanged}
      />
      <TypePickerCard
        kind="hinged"
        active={activeType === "hinged"}
        count={hingedCount}
        cover={covers.hinged}
        onPick={() => onChange("hinged")}
        onCoverChanged={onCoversChanged}
      />
    </div>
  );
}

function TypePickerCard({ kind, active, count, cover, onPick, onCoverChanged }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const label = TYPE_LABELS[kind];

  async function handlePicked(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImageForUpload(file);
      const fd = new FormData();
      fd.append("file", resized);
      await adminUploadDoorTypeCover(kind, fd);
      await onCoverChanged();
    } catch (err) {
      console.error("door-type cover upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(e) {
    e.stopPropagation();
    if (!cover) return;
    if (!window.confirm(`להסיר את התמונה של ${label}?`)) return;
    try {
      await adminDeleteDoorTypeCover(kind);
      await onCoverChanged();
    } catch (err) {
      console.error("door-type cover remove failed", err);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick();
    }
  }

  return (
    <div
      className={
        "closet-gallery__type-card" +
        (active ? " closet-gallery__type-card--active" : "")
      }
      role="tab"
      tabIndex={0}
      aria-selected={active}
      onClick={onPick}
      onKeyDown={onKeyDown}
    >
      <div className="closet-gallery__type-card-media">
        {cover ? (
          <img src={`/uploads/${cover.image_path}`} alt={label} loading="lazy" />
        ) : (
          <div className="closet-gallery__type-card-placeholder">
            <ImageIcon />
            <span className="muted small">אין תמונה</span>
          </div>
        )}
        <div
          className="closet-gallery__type-card-admin"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="closet-gallery__type-card-admin-btn"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            title={cover ? "החלף תמונה" : "העלה תמונה"}
            aria-label={cover ? "החלף תמונה" : "העלה תמונה"}
            disabled={uploading}
          >
            <Upload />
          </button>
          {cover && (
            <button
              type="button"
              className="closet-gallery__type-card-admin-btn"
              onClick={handleRemove}
              title="הסר תמונה"
              aria-label="הסר תמונה"
              disabled={uploading}
            >
              <Trash />
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handlePicked}
        />
      </div>
      <div className="closet-gallery__type-card-label">
        <span>{label}</span>
        <span className="closet-gallery__type-count">{count}</span>
      </div>
    </div>
  );
}

/* Static gallery card — 3D thumbnail or product photo. */
function GalleryCard({ item }) {
  const cfg = item.config;
  const w = totalWidth(cfg);
  const sceneCamera = [
    Math.max(5, w / 100 + 2),
    cfg.dimensions.H / 200 + 0.5,
    w / 100 + 3,
  ];
  const sceneTargetY = cfg.dimensions.H / 200;

  return (
    <div className="closet-gallery__card">
      <div className="closet-gallery__header">
        <h4 className="closet-gallery__name">{item.name}</h4>
      </div>
      <div className="closet-gallery__canvas-wrap">
        {item.image_path ? (
          <img
            className="closet-gallery__photo"
            src={`/uploads/${item.image_path}`}
            alt={item.name}
            loading="lazy"
          />
        ) : (
          <ClosetScene
            cameraPosition={sceneCamera}
            targetY={sceneTargetY}
            frameloop="never"
            interactive={false}
          >
            <ClosetFromConfig config={cfg} />
          </ClosetScene>
        )}
      </div>
      <div className="closet-gallery__footer closet-gallery__footer--quiet">
        <span className="muted small">
          {cfg.doors.length} דלתות · רוחב {Math.round(w)} ס״מ
        </span>
      </div>
    </div>
  );
}
