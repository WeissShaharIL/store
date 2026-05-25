import { useEffect, useState } from "react";
import { Download, Check } from "./Icons.jsx";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallAppButton({ variant = "primary" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [stage, setStage] = useState("idle");

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
      setStage("success");
      setTimeout(() => setStage("idle"), 1800);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed && stage !== "success") return null;
  if (!deferred && stage === "idle" && !installed) return null;

  async function handleClick() {
    if (!deferred) return;
    setStage("installing");
    try {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setStage("success");
        setInstalled(true);
        setTimeout(() => setStage("idle"), 1800);
      } else {
        setStage("idle");
      }
    } catch {
      setStage("idle");
    } finally {
      setDeferred(null);
    }
  }

  const isInstalling = stage === "installing";
  const isSuccess = stage === "success";

  return (
    <>
      {!installed && (
        <button
          type="button"
          className={`install-btn install-btn--${variant}`}
          onClick={handleClick}
          disabled={isInstalling}
          title="התקן אפליקציה"
        >
          <Download />
          <span className="install-btn__label">
            {isInstalling ? "מתקין…" : "הורד אפליקציה"}
          </span>
        </button>
      )}

      {isInstalling && (
        <div className="install-overlay" role="dialog" aria-live="polite">
          <div className="install-overlay__card">
            <div className="spinner" aria-hidden />
            <div className="install-overlay__title">מתקין אפליקציה…</div>
            <div className="install-overlay__sub muted">
              אנא אשרו את ההתקנה בחלון שעולה כעת.
            </div>
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="install-toast" role="status">
          <Check /> האפליקציה הותקנה בהצלחה
        </div>
      )}
    </>
  );
}
