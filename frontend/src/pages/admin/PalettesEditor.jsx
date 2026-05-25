import { useState } from "react";
import { Image, Plus, Trash, Edit } from "../../components/Icons.jsx";
import { adminGetColors, adminCreateColor, adminUpdateColor, adminDeleteColor } from "../../api.js";
import { usePaletteColors } from "./PaletteContext.jsx";
import { TEXTURE_OPTIONS } from "./closet3d/textures.js";

/**
 * v1.75.0 — admin-managed catalog of palette colors. Lives directly
 * beneath the closet builder in the Development tab so admins can
 * tweak the available colors while editing a model.
 *
 * Each row is either:
 *   - read-only (swatch + name + texture badge + edit/delete buttons), or
 *   - in inline edit mode (name / wood / trim / swatch hex inputs +
 *     texture toggle + save/cancel buttons).
 *
 * "הוסף צבע חדש" prepends a new draft row in edit mode. Saving sends
 * POST /api/admin/palette-colors and refreshes the context so the
 * closet builder + designer immediately see the new entry.
 *
 * Delete is blocked by the backend (409) if any closet template
 * references the color_key; the error message includes the count.
 */
export default function PalettesEditor() {
  const { list, loading, error, refresh } = usePaletteColors();
  // ID of the row currently being edited (or "new" for a draft row),
  // plus the draft values that haven't been saved yet.
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  function startAdd() {
    setEditingId("new");
    setSaveError(null);
    setDraft({
      color_key: "",
      name: "",
      wood: "#dddddd",
      trim: "#aaaaaa",
      swatch: "#dddddd",
      has_texture: false,
      texture_key: null,
      sort_order: (list[list.length - 1]?.sort_order ?? -1) + 1,
    });
  }

  function startEdit(row) {
    setEditingId(row.id);
    setSaveError(null);
    setDraft({
      color_key: row.color_key,
      name: row.name,
      wood: row.wood,
      trim: row.trim,
      swatch: row.swatch,
      has_texture: row.has_texture,
      texture_key: row.texture_key,
      sort_order: row.sort_order,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setSaveError(null);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId === "new") {
        await adminCreateColor(draft);
      } else {
        // Don't send color_key on update — backend rejects changes
        // to the stable identifier. Only the other fields are
        // editable in place.
        const { color_key: _ignore, ...patch } = draft;
        await adminUpdateColor(editingId, patch);
      }
      await refresh();
      setEditingId(null);
      setDraft(null);
    } catch (e) {
      setSaveError(e.message || "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row) {
    if (
      !window.confirm(
        `למחוק את הצבע "${row.name}"? פעולה זו אינה ניתנת לביטול.`,
      )
    ) {
      return;
    }
    try {
      await adminDeleteColor(row.id);
      await refresh();
    } catch (e) {
      alert(e.message || "שגיאה במחיקת הצבע");
    }
  }

  return (
    <div className="closet-builder-section">
      {loading && <div className="muted small">טוען…</div>}
      {error && (
        <div className="muted small">שגיאה בטעינת הפלטה: {error}</div>
      )}

      <div className="palette-editor__toolbar">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={startAdd}
          disabled={editingId !== null}
        >
          <Plus />
          הוסף צבע חדש
        </button>
      </div>

      <div className="palette-editor__grid">
        {editingId === "new" && (
          <PaletteRowEditing
            draft={draft}
            isNew
            onChange={setDraft}
            onSave={save}
            onCancel={cancelEdit}
            saving={saving}
            error={saveError}
          />
        )}
        {list.map((row) =>
          editingId === row.id ? (
            <PaletteRowEditing
              key={row.id}
              draft={draft}
              isNew={false}
              onChange={setDraft}
              onSave={save}
              onCancel={cancelEdit}
              saving={saving}
              error={saveError}
            />
          ) : (
            <PaletteRowReadOnly
              key={row.id}
              row={row}
              disabled={editingId !== null}
              onEdit={() => startEdit(row)}
              onDelete={() => removeRow(row)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function PaletteRowReadOnly({ row, disabled, onEdit, onDelete }) {
  return (
    <div className="palette-row">
      <span
        className="palette-row__swatch"
        style={{ background: row.swatch }}
      />
      <div className="palette-row__meta">
        <div className="palette-row__name">{row.name}</div>
        <div className="palette-row__key muted small">{row.color_key}</div>
        {row.has_texture && (
          /* v1.99.12 — badge label reflects which texture is
             actually picked. Pre-1.99.12 the label was hardcoded
             "טקסטורת עץ" (wood texture), which was correct when
             wood-mevuka was the only option but became misleading
             after v1.99.11 added oak / marble / concrete. Look the
             label up from TEXTURE_OPTIONS; fall back to a generic
             "טקסטורה" if the row's texture_key isn't in the list
             (could happen on a stale frontend or a hand-edited DB
             row). */
          <span className="palette-row__badge">
            {TEXTURE_OPTIONS.find((o) => o.key === row.texture_key)?.label
              ?? "טקסטורה"}
          </span>
        )}
      </div>
      <div className="palette-row__actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`ערוך את ${row.name}`}
          title="ערוך"
        >
          <Edit />
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`מחק את ${row.name}`}
          title="מחק"
        >
          <Trash />
        </button>
      </div>
    </div>
  );
}

function PaletteRowEditing({
  draft,
  isNew,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}) {
  const set = (k, v) => onChange({ ...draft, [k]: v });
  return (
    <div className="palette-row palette-row--editing">
      <span
        className="palette-row__swatch"
        style={{ background: draft.swatch }}
      />
      <div className="palette-row__edit-grid">
        <label className="palette-row__field">
          <span>שם בעברית</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="למשל: אגוז כהה"
          />
        </label>
        {isNew && (
          <label className="palette-row__field">
            <span>מזהה (אנגלית, ללא רווחים)</span>
            <input
              type="text"
              value={draft.color_key}
              onChange={(e) =>
                set("color_key", e.target.value.replace(/\s+/g, ""))
              }
              placeholder="darkwalnut"
              dir="ltr"
            />
          </label>
        )}
        <label className="palette-row__field palette-row__field--hex">
          <span>צבע עץ ראשי</span>
          <span className="palette-row__hex-row">
            <input
              type="color"
              value={draft.wood}
              onChange={(e) => set("wood", e.target.value)}
            />
            <input
              type="text"
              value={draft.wood}
              onChange={(e) => set("wood", e.target.value)}
              dir="ltr"
            />
          </span>
        </label>
        <label className="palette-row__field palette-row__field--hex">
          <span>צבע מסגרת/קצה</span>
          <span className="palette-row__hex-row">
            <input
              type="color"
              value={draft.trim}
              onChange={(e) => set("trim", e.target.value)}
            />
            <input
              type="text"
              value={draft.trim}
              onChange={(e) => set("trim", e.target.value)}
              dir="ltr"
            />
          </span>
        </label>
        <label className="palette-row__field palette-row__field--hex">
          <span>צבע ה־swatch בפלטה</span>
          <span className="palette-row__hex-row">
            <input
              type="color"
              value={draft.swatch}
              onChange={(e) => set("swatch", e.target.value)}
            />
            <input
              type="text"
              value={draft.swatch}
              onChange={(e) => set("swatch", e.target.value)}
              dir="ltr"
            />
          </span>
        </label>
        {/* v1.99.11 — texture-key selector replaces the binary
            "has texture" checkbox. The new options (oak / marble /
            concrete) live alongside the original wood-mevuka, plus
            an explicit "no texture" choice that still renders the
            renderer's universal neutral grain so the surface never
            looks plastic-flat. Selecting "none" sets has_texture
            false + texture_key null; any other choice sets
            has_texture true + texture_key to the picked value. */}
        <label className="palette-row__field">
          <span>טקסטורת משטח</span>
          <select
            value={draft.has_texture ? draft.texture_key || "" : ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...draft,
                has_texture: !!v,
                texture_key: v || null,
              });
            }}
          >
            {TEXTURE_OPTIONS.map((opt) => (
              <option key={opt.key || "__none__"} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {error && <div className="palette-row__error">{error}</div>}
      </div>
      <div className="palette-row__actions palette-row__actions--editing">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onSave}
          disabled={saving || !draft.name.trim() || (isNew && !draft.color_key.trim())}
        >
          {saving ? "שומר…" : "שמור"}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onCancel}
          disabled={saving}
        >
          בטל
        </button>
      </div>
    </div>
  );
}
