import { useState } from "react";
import { Image, Plus, Trash, Edit } from "../../components/Icons.jsx";
import { adminGetHandles, adminCreateHandle, adminUpdateHandle, adminDeleteHandle } from "../../api.js";
import { useHandles } from "./HandlesContext.jsx";

/**
 * v1.84.0 — admin-managed catalog of door handles. Mirror of the
 * v1.75.0 PalettesEditor; sits next to it under DevClosetBuilder
 * in the Development tab.
 *
 * Each row is either:
 *   - read-only (color bar + name + key + finish + door-kind badge
 *     + edit/delete buttons), or
 *   - in inline edit mode (name / color / finish / door_kind +
 *     save/cancel).
 *
 * "הוסף ידית חדשה" prepends a new draft row in edit mode. Saving
 * sends POST /api/admin/handles and refreshes the context so the
 * closet builder + designer immediately see the new entry.
 *
 * Delete is blocked by the backend (HTTP 409) if any closet
 * template still references the handle_key — at either the cabinet
 * default or a per-door override.
 */
const FINISH_OPTIONS = [
  { value: "matte", label: "מאט (צבועה)" },
  { value: "metallic", label: "מתכתי (מבריק)" },
];
const DOOR_KIND_OPTIONS = [
  { value: "both", label: "ציר + הזזה" },
  { value: "hinged", label: "ציר בלבד" },
  { value: "sliding", label: "הזזה בלבד" },
];

const DOOR_KIND_BADGE = {
  both: "ציר + הזזה",
  hinged: "ציר בלבד",
  sliding: "הזזה בלבד",
};

export default function HandlesEditor() {
  const { list, loading, error, refresh } = useHandles();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  function startAdd() {
    setEditingId("new");
    setSaveError(null);
    setDraft({
      handle_key: "",
      name: "",
      color: "#cccccc",
      finish: "matte",
      door_kind: "both",
      sort_order: (list[list.length - 1]?.sort_order ?? -1) + 1,
    });
  }

  function startEdit(row) {
    setEditingId(row.id);
    setSaveError(null);
    setDraft({
      handle_key: row.handle_key,
      name: row.name,
      color: row.color,
      finish: row.finish,
      door_kind: row.door_kind,
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
        await adminCreateHandle(draft);
      } else {
        const { handle_key: _ignore, ...patch } = draft;
        await adminUpdateHandle(editingId, patch);
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
        `למחוק את הידית "${row.name}"? פעולה זו אינה ניתנת לביטול.`,
      )
    ) {
      return;
    }
    try {
      await adminDeleteHandle(row.id);
      await refresh();
    } catch (e) {
      alert(e.message || "שגיאה במחיקת הידית");
    }
  }

  return (
    <div className="closet-builder-section">
      {loading && <div className="muted small">טוען…</div>}
      {error && (
        <div className="muted small">שגיאה בטעינת הידיות: {error}</div>
      )}

      <div className="palette-editor__toolbar">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={startAdd}
          disabled={editingId !== null}
        >
          <Plus />
          הוסף ידית חדשה
        </button>
      </div>

      <div className="palette-editor__grid">
        {editingId === "new" && (
          <HandleRowEditing
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
            <HandleRowEditing
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
            <HandleRowReadOnly
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

function HandleRowReadOnly({ row, disabled, onEdit, onDelete }) {
  return (
    <div className="palette-row">
      <span
        className="palette-row__handle-bar"
        style={{ background: row.color }}
      />
      <div className="palette-row__meta">
        <div className="palette-row__name">{row.name}</div>
        <div className="palette-row__key muted small">{row.handle_key}</div>
        <div className="palette-row__badges">
          {row.finish === "metallic" && (
            <span className="palette-row__badge">מתכתי</span>
          )}
          <span className="palette-row__badge palette-row__badge--ghost">
            {DOOR_KIND_BADGE[row.door_kind] ?? row.door_kind}
          </span>
        </div>
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

function HandleRowEditing({
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
        className="palette-row__handle-bar"
        style={{ background: draft.color }}
      />
      <div className="palette-row__edit-grid">
        <label className="palette-row__field">
          <span>שם בעברית</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="למשל: זהב מבריק"
          />
        </label>
        {isNew && (
          <label className="palette-row__field">
            <span>מזהה (אנגלית, ללא רווחים)</span>
            <input
              type="text"
              value={draft.handle_key}
              onChange={(e) =>
                set("handle_key", e.target.value.replace(/\s+/g, ""))
              }
              placeholder="brushedgold"
              dir="ltr"
            />
          </label>
        )}
        <label className="palette-row__field palette-row__field--hex">
          <span>צבע</span>
          <span className="palette-row__hex-row">
            <input
              type="color"
              value={draft.color}
              onChange={(e) => set("color", e.target.value)}
            />
            <input
              type="text"
              value={draft.color}
              onChange={(e) => set("color", e.target.value)}
              dir="ltr"
            />
          </span>
        </label>
        <label className="palette-row__field">
          <span>גימור</span>
          <select
            value={draft.finish}
            onChange={(e) => set("finish", e.target.value)}
          >
            {FINISH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="palette-row__field">
          <span>מתאים לסוג ארון</span>
          <select
            value={draft.door_kind}
            onChange={(e) => set("door_kind", e.target.value)}
          >
            {DOOR_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
          disabled={saving || !draft.name.trim() || (isNew && !draft.handle_key.trim())}
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
