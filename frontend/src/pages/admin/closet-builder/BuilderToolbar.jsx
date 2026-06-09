import { Plus, Save, Check, Trash, Download, Upload } from "../../../components/Icons.jsx";

/**
 * Top toolbar for the admin closet builder: model picker + new/surprise/
 * save/ready/display-sale/duplicate/delete/export/import controls + the
 * status chip. Extracted verbatim from DevClosetBuilder.jsx (v2.x) — JSX
 * unchanged, all handlers/state passed in as props.
 */
export default function BuilderToolbar({
  currentId, loadTemplate, drafts, ready,
  newOne, surpriseMe, saveCurrent,
  isReady, toggleReady,
  isDisplaySale, setIsDisplaySale, displaySalePrice, setDisplaySalePrice,
  duplicateCurrent, deleteCurrent,
  exportCurrent, triggerImport, exportLibrary,
  fileInputRef, handleImportFile, status,
}) {
  return (
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
        <button type="button" className="btn btn--ghost btn--sm" onClick={duplicateCurrent} title="צור עותק של המודל עם שם חדש">
          <Plus /> שכפל
        </button>
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
  );
}
