import { useEffect, useState } from "react";
import { Download, X } from "./Icons.jsx";
import "../styles/install.css";

/**
 * PWA "install as app" prompt.
 *
 * The styling already existed in styles/install.css (.pwa-install*) but no
 * component ever rendered it, so the site was installable in principle yet
 * never offered it. This wires it up:
 *
 *  - Android / desktop Chromium: the browser fires `beforeinstallprompt`. We
 *    capture it, show our own bottom sheet, and call the saved event's
 *    prompt() when the user taps "התקן".
 *  - iOS Safari: there is no beforeinstallprompt API — installing is manual via
 *    Share → "Add to Home Screen". We detect iOS and show those instructions.
 *
 * Hidden when already running installed (display-mode: standalone) or when the
 * user dismissed it (snoozed for SNOOZE_DAYS via localStorage).
 */

const DISMISS_KEY = "pwa-install-dismissed-at";
const SNOOZE_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent || "";
  const iDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as Mac; detect via touch.
  const iPadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return iDevice || iPadOs;
}

function recentlyDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!ts) return false;
    return Date.now() - ts < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android / desktop: capture the install event when the browser offers it.
    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferred(e);
      setIos(false);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Once installed, never nag again.
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — show manual instructions instead,
    // after a short delay so it doesn't slam the user on first paint.
    let iosTimer;
    if (isIos()) {
      iosTimer = setTimeout(() => {
        if (!isStandalone() && !recentlyDismissed()) {
          setIos(true);
          setVisible(true);
        }
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pwa-install" role="dialog" aria-label="התקנת האפליקציה">
      <button className="pwa-install__close" onClick={dismiss} aria-label="סגור">
        <X />
      </button>
      <div className="pwa-install__content">
        <div className="pwa-install__icon">
          <Download />
        </div>
        <div className="pwa-install__text">
          <p className="pwa-install__title">התקינו את האפליקציה</p>
          <p className="pwa-install__desc">
            גישה מהירה ישירות ממסך הבית, גם במצב לא מקוון.
          </p>
        </div>
      </div>

      {ios ? (
        <p className="pwa-install__ios-hint">
          להתקנה: הקישו על כפתור השיתוף
          <IosShareGlyph />
          ואז בחרו ב״הוסף למסך הבית״.
        </p>
      ) : (
        <div className="pwa-install__actions">
          <button className="pwa-install__btn pwa-install__btn--ghost" onClick={dismiss}>
            לא עכשיו
          </button>
          <button className="pwa-install__btn pwa-install__btn--primary" onClick={install}>
            התקן
          </button>
        </div>
      )}
    </div>
  );
}

function IosShareGlyph() {
  return (
    <svg
      className="pwa-install__ios-share"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
