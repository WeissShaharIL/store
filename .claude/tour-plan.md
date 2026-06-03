# Admin Guided Tour — Planning Document

## Status: Phase 1 complete ✓, Phase 2 pending

---

## What's built (v1.58.19)

### Files created/modified
- `frontend/src/pages/admin/TourOverlay.jsx` — tour engine + 15 step definitions
- `frontend/src/pages/admin/TourOverlay.css` — spotlight + tooltip card styles
- `frontend/src/pages/admin/SettingsTab.jsx` — added "סיור מודרך" section with enable/disable toggle + "התחל סיור עכשיו" button
- `frontend/src/pages/AdminDashboard.jsx` — added `tourActive`, `pituchSubTab` state; renders TourOverlay; shows "סיור" button in header when enabled
- `frontend/src/pages/admin/PituchTab.jsx` — added `externalSubTab` prop so AdminDashboard can drive sub-tab navigation during the tour

### How it works
1. Toggle in הגדרות stores `admin-tour-enabled` in localStorage (`"false"` = off, anything else = on)
2. When enabled, a green "סיור" button appears in the admin header
3. Clicking "סיור" (or "התחל סיור עכשיו" in settings) sets `tourActive = true` → renders `TourOverlay`
4. TourOverlay works through 15 steps:
   - Each step declares: `tab`, optional `subTab`, CSS `selector`, `title`, `body`
   - On step change: calls `setActiveTab(step.tab)` + `setPituchSubTab(step.subTab)` → then polls `document.querySelector(step.selector)` every 150ms (up to 12 attempts) until the element appears
   - Spotlight = a `position: fixed` div sized to `getBoundingClientRect()` of target, with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.62)` — creates the darkened backdrop with a "hole" over the target
   - Tooltip card positions below/above the spotlight based on available viewport space

---

## Tour steps (15 total)

| # | Tab | Sub-tab | Selector | Title |
|---|-----|---------|----------|-------|
| 1 | settings | — | `.admin-tabs` | ברוך הבא ללוח הניהול |
| 2 | settings | — | `.settings-section` | הגדרות |
| 3 | landing | — | `.admin-tab-content` | דף הבית |
| 4 | images | — | `.admin-tab-content` | תמונות |
| 5 | leads | — | `.admin-tab-content` | פניות |
| 6 | orders | — | `.admin-tab-content` | הזמנות |
| 7 | activity | — | `.admin-tab-content` | פעילות |
| 8 | pituch | builder | `.pituch-tab__nav` | פיתוח ארונות |
| 9 | pituch | builder | `.closet-builder__toolbar` | בונה ארונות |
| 10 | pituch | gallery | `.admin-tab-content` | גלריה |
| 11 | pituch | colors | `.admin-tab-content` | צבעים |
| 12 | pituch | handles | `.admin-tab-content` | ידיות |
| 13 | pituch | prices | `.admin-tab-content` | תוספות ארון |
| 14 | pituch | custom | `.admin-tab-content` | ארון בהתאמה אישית |
| 15 | settings | — | `#tour-section` | סיום |

---

## Phase 2 — Improvements to do

### Known issues / polish
- [ ] When the tour navigates TO the `pituch` tab for the first time, PituchTab lazy-loads (Suspense). The `setTimeout(250ms)` before querying the DOM might not be enough if the Three.js bundle hasn't loaded yet. Consider increasing the wait or using a MutationObserver.
- [ ] Step 9 targets `.closet-builder__toolbar` which is deep inside the builder. If the builder is still loading (Three.js heavy bundle), it won't exist. May need a longer delay or a more stable selector.
- [ ] Progress dots (15 dots) are many — consider replacing with a simple "X / 15" counter only, or grouping dots by section.
- [ ] The spotlight doesn't track if the user scrolls or resizes the window mid-step. Add a `window.addEventListener('resize', tryFind)` and `scroll` listener.
- [ ] On mobile, the 360px card may overflow. Add responsive sizing.

### Possible enhancements
- [ ] Auto-start on first-ever admin login (check `admin-tour-seen` in localStorage)
- [ ] Section labels in the card (e.g. "תוכן האתר", "פיתוח") to group steps visually
- [ ] Keyboard navigation: Escape = close, ArrowRight = next, ArrowLeft = prev
- [ ] Animate the spotlight position with smoother transitions when jumping to very different positions

---

## Key selectors to watch (fragile ones)

- `.closet-builder__toolbar` — only exists when the builder sub-tab is active AND the Three.js bundle has loaded
- `.settings-section` — first one in SettingsTab is password change; if the DOM order changes, step 2 will point at wrong section
- `#tour-section` — this ID is set on the tour section in SettingsTab; if SettingsTab is refactored, update this

---

## Storage
- `localStorage["admin-tour-enabled"]` = `"true"` (default) or `"false"`
- No DB storage needed — tour preference is per-device/per-browser
