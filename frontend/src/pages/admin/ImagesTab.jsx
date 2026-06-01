import { useEffect, useRef, useState } from "react";
import {
  adminGetMediaFolders,
  adminCreateMediaFolder,
  adminDeleteMediaFolder,
  adminGetMediaFiles,
  adminUploadMediaFile,
  adminDeleteMediaFile,
  adminMoveMediaFile,
  adminUpdateMediaFileDetails,
} from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import "./AdminTab.css";
import "./AdminImages.css";

const VIEW_ALL = "all";
const VIEW_NONE = "none";

// Sentinel: distinguishes "no drag-over target" from "drag-over unassigned (null)"
const NO_DRAG = Symbol("NO_DRAG");

export default function ImagesTab() {
  const { confirm, dialog } = useConfirm();
  const [folders, setFolders] = useState([]);
  const [view, setView] = useState(VIEW_ALL);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderSaving, setFolderSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);

  // Edit panel state
  const [gridSize, setGridSize] = useState("md"); // "sm" | "md" | "lg"
  const [lightboxFile, setLightboxFile] = useState(null);

  const [editingFile, setEditingFile] = useState(null); // file object being edited
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openEdit(file) {
    setEditingFile(file);
    setEditName(file.display_name || file.original_name || "");
    setEditTags(file.tags || "");
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!editingFile) return;
    setEditSaving(true);
    try {
      const updated = await adminUpdateMediaFileDetails(editingFile.id, {
        displayName: editName,
        tags: editTags,
      });
      setFiles((prev) => prev.map((f) => f.id === updated.id ? updated : f));
      setEditingFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  // Drag state (moving files between folders)
  const [dragFileId, setDragFileId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(NO_DRAG); // NO_DRAG | null (unassigned) | folder.id

  // Drag-from-OS state (uploading by dropping a file from the desktop)
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const dropZoneCounter = useRef(0); // tracks enter/leave pairs to avoid flicker

  // Load folders on mount
  useEffect(() => {
    adminGetMediaFolders()
      .then(setFolders)
      .catch(() => setError("שגיאה בטעינת התיקיות"));
  }, []);

  // Load files when view changes
  useEffect(() => {
    setLoading(true);
    setFiles([]);
    const params =
      view === VIEW_ALL ? {} :
      view === VIEW_NONE ? { noFolder: true } :
      { folderId: view };
    adminGetMediaFiles(params)
      .then(setFiles)
      .catch(() => setError("שגיאה בטעינת הקבצים"))
      .finally(() => setLoading(false));
  }, [view]);

  async function handleCreateFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setFolderSaving(true);
    try {
      const folder = await adminCreateMediaFolder(newFolderName.trim());
      setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setFolderSaving(false);
    }
  }

  async function handleDeleteFolder(id) {
    if (!await confirm("למחוק את התיקייה? התמונות יעברו ל״ללא תיקייה״.")) return;
    try {
      await adminDeleteMediaFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (view === id) setView(VIEW_ALL);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (typeof view === "number") fd.append("folder_id", view);
      const newFile = await adminUploadMediaFile(fd);
      setFiles((prev) => [newFile, ...prev]);
      if (typeof view === "number") {
        setFolders((prev) =>
          prev.map((f) => f.id === view ? { ...f, file_count: f.file_count + 1 } : f)
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function handleDeleteFile(id) {
    try {
      await adminDeleteMediaFile(id);
      const removed = files.find((f) => f.id === id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (removed?.folder_id != null) {
        setFolders((prev) =>
          prev.map((f) => f.id === removed.folder_id ? { ...f, file_count: Math.max(0, f.file_count - 1) } : f)
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFileConfirm(id) {
    if (!await confirm("למחוק את התמונה לצמיתות?")) return;
    handleDeleteFile(id);
  }

  async function handleMoveFile(fileId, targetFolderId) {
    const movedFile = files.find((f) => f.id === fileId);
    if (!movedFile) return;
    const oldFolderId = movedFile.folder_id ?? null;
    // No-op if dropping onto the same folder it's already in
    if (oldFolderId === targetFolderId) return;

    try {
      await adminMoveMediaFile(fileId, targetFolderId);

      if (view === VIEW_ALL) {
        // In "all" view: update the file's folder_id in place
        setFiles((prev) =>
          prev.map((f) => f.id === fileId ? { ...f, folder_id: targetFolderId } : f)
        );
      } else {
        // In a specific folder/unassigned view: file leaves the current view
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      }

      // Update folder counts
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id === oldFolderId) return { ...f, file_count: Math.max(0, f.file_count - 1) };
          if (f.id === targetFolderId) return { ...f, file_count: f.file_count + 1 };
          return f;
        })
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // Drag handlers for sidebar drop targets
  function makeSidebarDropProps(targetFolderId) {
    return {
      onDragOver: (e) => { e.preventDefault(); setDragOverTarget(targetFolderId); },
      onDragLeave: () => setDragOverTarget(NO_DRAG),
      onDrop: (e) => {
        e.preventDefault();
        setDragOverTarget(NO_DRAG);
        const fileId = parseInt(e.dataTransfer.getData("fileId"), 10);
        if (fileId) handleMoveFile(fileId, targetFolderId);
      },
    };
  }

  const currentFolderName =
    view === VIEW_ALL ? "כל התמונות" :
    view === VIEW_NONE ? "ללא תיקייה" :
    folders.find((f) => f.id === view)?.name ?? "";

  const isDragging = dragFileId !== null;

  return (
    <div className="images-tab">
      {/* Sidebar */}
      <aside className={"images-sidebar" + (isDragging ? " images-sidebar--dragging" : "")}>
        <div className="images-sidebar__head">
          <span className="images-sidebar__title">תיקיות</span>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setShowNewFolder((v) => !v)}
            title="תיקייה חדשה"
          >+</button>
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="images-sidebar__new-folder">
            <input
              autoFocus
              type="text"
              placeholder="שם תיקייה"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={folderSaving}>
              {folderSaving ? "..." : "צור"}
            </button>
          </form>
        )}

        <ul className="images-sidebar__list">
          <li
            className={"images-sidebar__item" + (view === VIEW_ALL ? " images-sidebar__item--active" : "")}
            onClick={() => setView(VIEW_ALL)}
          >
            <span>כל התמונות</span>
            <span className="images-sidebar__count">{files.length > 0 && view === VIEW_ALL ? files.length : ""}</span>
          </li>
          <li
            className={
              "images-sidebar__item" +
              (view === VIEW_NONE ? " images-sidebar__item--active" : "") +
              (dragOverTarget === null ? " images-sidebar__item--drop-target" : "")
            }
            onClick={() => setView(VIEW_NONE)}
            {...makeSidebarDropProps(null)}
          >
            <span>ללא תיקייה</span>
            {isDragging && <span className="images-sidebar__drop-hint">שחרר כאן</span>}
          </li>
          {folders.map((f) => (
            <li
              key={f.id}
              className={
                "images-sidebar__item" +
                (view === f.id ? " images-sidebar__item--active" : "") +
                (dragOverTarget === f.id ? " images-sidebar__item--drop-target" : "")
              }
              onClick={() => setView(f.id)}
              {...makeSidebarDropProps(f.id)}
            >
              <span className="images-sidebar__folder-name">{f.name}</span>
              <span className="images-sidebar__count">{f.file_count || ""}</span>
              {isDragging
                ? <span className="images-sidebar__drop-hint">שחרר כאן</span>
                : <button
                    className="images-sidebar__del"
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                    title="מחק תיקייה"
                  >×</button>
              }
            </li>
          ))}
        </ul>
      </aside>

      {/* Main area */}
      <div
        className={"images-main" + (dropZoneActive ? " images-main--drop-zone" : "")}
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            dropZoneCounter.current++;
            setDropZoneActive(true);
          }
        }}
        onDragLeave={() => {
          dropZoneCounter.current--;
          if (dropZoneCounter.current <= 0) {
            dropZoneCounter.current = 0;
            setDropZoneActive(false);
          }
        }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
        onDrop={async (e) => {
          e.preventDefault();
          dropZoneCounter.current = 0;
          setDropZoneActive(false);
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          setUploading(true);
          setError("");
          try {
            const fd = new FormData();
            fd.append("file", file);
            if (typeof view === "number") fd.append("folder_id", view);
            const newFile = await adminUploadMediaFile(fd);
            setFiles((prev) => [newFile, ...prev]);
            if (typeof view === "number") {
              setFolders((prev) =>
                prev.map((f) => f.id === view ? { ...f, file_count: f.file_count + 1 } : f)
              );
            }
          } catch (err) {
            setError(err.message);
          } finally {
            setUploading(false);
          }
        }}
      >
        <div className="images-toolbar">
          <h2 className="images-toolbar__title">{currentFolderName}</h2>
          <div className="images-toolbar__size-toggle">
            {[["sm","S"],["md","M"],["lg","L"]].map(([s,l]) => (
              <button
                key={s}
                type="button"
                className={"images-size-btn" + (gridSize === s ? " images-size-btn--active" : "")}
                onClick={() => setGridSize(s)}
                aria-label={s === "sm" ? "קטן" : s === "md" ? "בינוני" : "גדול"}
              >{l}</button>
            ))}
          </div>
          <label className={"btn btn--primary btn--sm" + (uploading ? " btn--loading" : "")}>
            {uploading ? "מעלה..." : "+ העלה תמונה"}
            <input
              ref={uploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {error && <p className="tab-error">{error}</p>}

        {loading ? (
          <p className="tab-loading">טוען…</p>
        ) : files.length === 0 ? (
          <p className="images-empty">אין תמונות כאן עדיין</p>
        ) : (
          <div className={"images-grid images-grid--" + gridSize}>
            {files.map((file) => (
              <div
                key={file.id}
                className={"images-grid__item" + (dragFileId === file.id ? " images-grid__item--dragging" : "")}
                draggable
                onDragStart={(e) => {
                  setDragFileId(file.id);
                  e.dataTransfer.setData("fileId", String(file.id));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => { setDragFileId(null); setDragOverTarget(NO_DRAG); }}
              >
                <div className="images-grid__thumb-wrap">
                  <img
                    src={`/uploads/${file.image_path}`}
                    alt={file.display_name || file.original_name || file.image_path}
                    className="images-grid__thumb"
                    loading="lazy"
                    draggable={false}
                    onClick={() => setLightboxFile(file)}
                    style={{ cursor: "zoom-in" }}
                  />
                  <div className="images-grid__overlay">
                    <button
                      className="images-grid__edit-btn"
                      onClick={() => openEdit(file)}
                      title="ערוך פרטים"
                    >✏️</button>
                    <button
                      className="images-grid__del"
                      onClick={() => handleDeleteFileConfirm(file.id)}
                      title="מחק"
                    >×</button>
                  </div>
                </div>
                <div className="images-grid__name" title={file.display_name || file.original_name || file.image_path}>
                  {file.display_name || file.original_name || file.image_path}
                </div>
                {file.tags && (
                  <div className="images-grid__tags">
                    {file.tags.split(",").map((t) => (
                      <span key={t} className="images-grid__tag">{t.trim()}</span>
                    ))}
                  </div>
                )}
                <button
                  className="images-grid__copy"
                  onClick={() => navigator.clipboard.writeText(file.image_path)}
                  title="העתק שם קובץ"
                >📋</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Edit details panel */}
      {editingFile && (
        <div className="images-edit-overlay" onClick={() => setEditingFile(null)}>
          <div className="images-edit-panel" onClick={(e) => e.stopPropagation()}>
            <img
              src={`/uploads/${editingFile.image_path}`}
              alt=""
              className="images-edit-panel__preview"
            />
            <form onSubmit={handleSaveDetails} className="images-edit-panel__form">
              <h3 className="images-edit-panel__title">פרטי תמונה</h3>
              <label className="images-edit-panel__field">
                <span>שם</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={editingFile.original_name || editingFile.image_path}
                />
              </label>
              <label className="images-edit-panel__field">
                <span>תגיות (מופרדות בפסיק)</span>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="לדוגמה: ארון, לבן, הזזה"
                />
              </label>
              <div className="images-edit-panel__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingFile(null)}>ביטול</button>
                <button type="submit" className="btn btn--primary btn--sm" disabled={editSaving}>
                  {editSaving ? "שומר..." : "שמור"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxFile && (
        <div
          className="images-lightbox"
          onClick={() => setLightboxFile(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxFile(null)}
          tabIndex={-1}
        >
          <img
            src={`/uploads/${lightboxFile.image_path}`}
            alt={lightboxFile.display_name || lightboxFile.original_name || ""}
            className="images-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="images-lightbox__close" onClick={() => setLightboxFile(null)}>✕</button>
        </div>
      )}

      {dialog}
    </div>
  );
}
