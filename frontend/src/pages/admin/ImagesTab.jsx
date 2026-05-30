import { useEffect, useRef, useState } from "react";
import {
  adminGetMediaFolders,
  adminCreateMediaFolder,
  adminDeleteMediaFolder,
  adminGetMediaFiles,
  adminUploadMediaFile,
  adminDeleteMediaFile,
} from "../../api.js";
import "./AdminTab.css";
import "./AdminImages.css";

const VIEW_ALL = "all";
const VIEW_NONE = "none";

export default function ImagesTab() {
  const [folders, setFolders] = useState([]);
  const [view, setView] = useState(VIEW_ALL); // VIEW_ALL | VIEW_NONE | folder.id (number)
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderSaving, setFolderSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);

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
    if (!window.confirm("למחוק את התיקייה? התמונות יעברו ל״ללא תיקייה״.")) return;
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
      // Refresh folder count if inside a folder
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
      // Update folder count
      if (removed?.folder_id != null) {
        setFolders((prev) =>
          prev.map((f) => f.id === removed.folder_id ? { ...f, file_count: Math.max(0, f.file_count - 1) } : f)
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }

  const currentFolderName =
    view === VIEW_ALL ? "כל התמונות" :
    view === VIEW_NONE ? "ללא תיקייה" :
    folders.find((f) => f.id === view)?.name ?? "";

  return (
    <div className="images-tab">
      {/* Sidebar */}
      <aside className="images-sidebar">
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
            className={"images-sidebar__item" + (view === VIEW_NONE ? " images-sidebar__item--active" : "")}
            onClick={() => setView(VIEW_NONE)}
          >
            <span>ללא תיקייה</span>
          </li>
          {folders.map((f) => (
            <li
              key={f.id}
              className={"images-sidebar__item" + (view === f.id ? " images-sidebar__item--active" : "")}
              onClick={() => setView(f.id)}
            >
              <span className="images-sidebar__folder-name">{f.name}</span>
              <span className="images-sidebar__count">{f.file_count || ""}</span>
              <button
                className="images-sidebar__del"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                title="מחק תיקייה"
              >×</button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main area */}
      <div className="images-main">
        <div className="images-toolbar">
          <h2 className="images-toolbar__title">{currentFolderName}</h2>
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
          <div className="images-grid">
            {files.map((file) => (
              <div key={file.id} className="images-grid__item">
                <div className="images-grid__thumb-wrap">
                  <img
                    src={`/uploads/${file.image_path}`}
                    alt={file.original_name || file.image_path}
                    className="images-grid__thumb"
                    loading="lazy"
                  />
                  <button
                    className="images-grid__del"
                    onClick={() => {
                      if (window.confirm("למחוק את התמונה לצמיתות?")) handleDeleteFile(file.id);
                    }}
                    title="מחק"
                  >×</button>
                </div>
                <div className="images-grid__name" title={file.original_name || file.image_path}>
                  {file.original_name || file.image_path}
                </div>
                <button
                  className="images-grid__copy"
                  onClick={() => {
                    navigator.clipboard.writeText(file.image_path);
                  }}
                  title="העתק שם קובץ"
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
