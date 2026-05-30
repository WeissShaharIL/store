import { useState } from "react";

/**
 * Drop-in replacement for window.confirm() with a styled in-page dialog.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirm();
 *   // ...
 *   if (!await confirm("למחוק?")) return;
 *   // In JSX: {dialog}
 */
export function useConfirm() {
  const [state, setState] = useState(null); // null | { message, resolve }

  function confirm(message) {
    return new Promise((resolve) => setState({ message, resolve }));
  }

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }
  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  const dialog = state ? (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-card">
        <p className="confirm-msg">{state.message}</p>
        <div className="confirm-actions">
          <button className="btn btn--ghost btn--sm" onClick={handleCancel}>ביטול</button>
          <button className="btn btn--primary btn--sm confirm-actions__ok" onClick={handleConfirm}>אישור</button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
