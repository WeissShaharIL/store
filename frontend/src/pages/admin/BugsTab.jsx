import { useEffect, useRef, useState } from "react";
import {
  adminListBugs,
  adminCreateBug,
  adminUpdateBug,
  adminDeleteBug,
  adminUploadBugAttachment,
  adminDeleteBugAttachment,
} from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import { Check, Edit, Plus, Trash, Upload, X } from "../../components/Icons.jsx";
import "./AdminTab.css";
import "./AdminBugs.css";

const STATUS_LABELS = { open: "פתוח", closed: "סגור" };

function formatDate(iso) {
  try { return new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }); }
  catch { return ""; }
}

function AttachmentTile({ att, onDelete }) {
  const url = `/uploads/${att.path}`;
  return (
    <div className="bug-att">
      {att.kind === "video" ? (
        <>
          <video className="bug-att__media" src={url} controls preload="metadata" />
          <button
            type="button"
            className="bug-att__open"
            title="פתח בחלון חדש"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >&#x2197;</button>
        </>
      ) : (
        <img
          className="bug-att__media"
          src={url}
          alt={att.original_name || "צילום מסך"}
          loading="lazy"
          style={{ cursor: "pointer" }}
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          title={att.original_name || ""}
        />
      )}
      <button type="button" className="bug-att__del" onClick={onDelete} aria-label="הסר קובץ" title="הסר קובץ">
        <X />
      </button>
    </div>
  );
}

export default function BugsTab() {
  const { confirm, dialog } = useConfirm();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Per-bug upload state
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputsRef = useRef({});

  useEffect(() => {
    adminListBugs()
      .then(setBugs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await adminCreateBug({ title: title.trim(), description: description.trim() || null });
      setBugs((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setCreating(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(bug) {
    setEditingId(bug.id);
    setEditTitle(bug.title);
    setEditDesc(bug.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(bug) {
    if (!editTitle.trim()) return;
    setEditSaving(true);
    try {
      const updated = await adminUpdateBug(bug.id, { title: editTitle.trim(), description: editDesc.trim() || null });
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleStatus(bug) {
    const next = bug.status === "open" ? "closed" : "open";
    try {
      const updated = await adminUpdateBug(bug.id, { status: next });
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(bug) {
    if (!(await confirm(`למחוק את "${bug.title}" כולל כל הקבצים המצורפים?`))) return;
    try {
      await adminDeleteBug(bug.id);
      setBugs((prev) => prev.filter((b) => b.id !== bug.id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleFiles(bug, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadingId(bug.id);
    setError("");
    try {
      let latest = bug;
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        latest = await adminUploadBugAttachment(bug.id, fd);
      }
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? latest : b)));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDeleteAttachment(bug, index) {
    try {
      const updated = await adminDeleteBugAttachment(bug.id, index);
      setBugs((prev) => prev.map((b) => (b.id === bug.id ? updated : b)));
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="tab-loading">טוען...</div>;

  const open = bugs.filter((b) => b.status === "open");
  const closed = bugs.filter((b) => b.status === "closed");

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>באגים</h2>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => setCreating(true)}
          disabled={creating}
        >
          <Plus /> דווח באג
        </button>
      </div>

      {error && <p className="tab-error">{error}</p>}

      {creating && (
        <form className="bug-create" onSubmit={handleCreate}>
          <label className="bug-create__field">
            <span>כותרת *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="לדוגמה: המחיר לא מתעדכן בשלב 2"
              autoFocus
              required
            />
          </label>
          <label className="bug-create__field">
            <span>תיאור / צעדים לשחזור</span>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={8000}
              placeholder={"מה קרה? מה היה צפוי לקרות?\n1. ...\n2. ..."}
            />
          </label>
          <div className="bug-create__actions">
            <button type="submit" className="settings-save-btn" disabled={saving || !title.trim()}>
              {saving ? "שומר..." : "פתח באג"}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCreating(false)}>
              ביטול
            </button>
          </div>
          <p className="bug-create__hint">קבצים (תמונות / וידאו) מוסיפים לבאג אחרי הפתיחה.</p>
        </form>
      )}

      {bugs.length === 0 && !creating && (
        <p className="bug-empty">אין באגים פתוחים. לחץ על ״דווח באג״ כדי לתעד אחד.</p>
      )}

      {[{ label: `פתוחים (${open.length})`, items: open }, { label: `סגורים (${closed.length})`, items: closed }]
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <section key={group.label} className="bug-group">
            <h3 className="bug-group__title">{group.label}</h3>
            {group.items.map((bug) => (
              <article key={bug.id} className={"bug-card" + (bug.status === "closed" ? " bug-card--closed" : "")}>
                {editingId === bug.id ? (
                  <div className="bug-edit">
                    <input
                      className="bug-edit__title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={200}
                      autoFocus
                    />
                    <textarea
                      className="bug-edit__desc"
                      rows={4}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      maxLength={8000}
                      placeholder="תיאור / צעדים לשחזור"
                    />
                    <div className="bug-edit__actions">
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => saveEdit(bug)} disabled={editSaving || !editTitle.trim()}>
                        {editSaving ? "שומר..." : "שמור"}
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={cancelEdit} disabled={editSaving}>ביטול</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bug-card__head">
                      <span className={"bug-status bug-status--" + bug.status}>{STATUS_LABELS[bug.status]}</span>
                      <h4 className="bug-card__title">{bug.title}</h4>
                      <span className="bug-card__date">{formatDate(bug.created_at)}</span>
                      <div className="bug-card__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(bug)} aria-label="ערוך באג">
                          <Edit />
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleStatus(bug)}>
                          {bug.status === "open" ? <><Check /> סגור</> : "פתח מחדש"}
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm bug-card__delete" onClick={() => handleDelete(bug)} aria-label="מחק באג">
                          <Trash />
                        </button>
                      </div>
                    </div>
                    {bug.description && <p className="bug-card__desc">{bug.description}</p>}
                  </>
                )}

                <div className="bug-card__attachments">
                  {bug.attachments.map((att, i) => (
                    <AttachmentTile key={`${att.path}-${i}`} att={att} onDelete={() => handleDeleteAttachment(bug, i)} />
                  ))}
                  <label className="bug-att-add" title="העלה תמונה או וידאו לשחזור">
                    <Upload />
                    <span>{uploadingId === bug.id ? "מעלה..." : "תמונה / וידאו"}</span>
                    <input
                      ref={(el) => { fileInputsRef.current[bug.id] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                      multiple
                      hidden
                      disabled={uploadingId === bug.id}
                      onChange={(e) => { handleFiles(bug, e.target.files); e.target.value = ""; }}
                    />
                  </label>
                </div>
              </article>
            ))}
          </section>
        ))}
      {dialog}
    </div>
  );
}
