# ship — commit, release, and deploy the store

Use this skill when the user wants to push a code change to production, or when finishing any code change in the store project.

## When to invoke automatically

After **every** code change in this repo — without waiting to be asked. The full pipeline must run after each edit.

---

## The pipeline (always run all 3 steps in order)

```powershell
# 1. Commit — stage only what changed
git add <changed files>
git commit -m "<conventional commit message>"

# 2. Release — always bump MINOR
.\release.ps1 minor

# 3. Deploy
.\deploy-remote.ps1 shahar 89.139.33.201
```

All commands run from `c:\Users\MR Weiss\code\store`.

---

## Project context

- **Stack**: FastAPI backend + React/Vite frontend, deployed with Docker Compose on a home Ubuntu server
- **Branch model**: work on `dev`, `release.ps1` merges dev→main and creates a semver tag, `deploy-remote.ps1` SSH-deploys the latest tag
- **Active dev branch**: `dev` — never commit directly to `main`
- **Server**: `shahar@89.139.33.201`

## Commit message format

```
type(scope): short description in Hebrew or English
```

Examples:
- `fix(designer): depth slider broken for templates with no constraints`
- `ui(admin): replace select dropdowns with pill buttons`
- `feat(cart): allow editing a custom closet already in the cart`

## Version bumping

Always `.\release.ps1 minor` — this project bumps the middle segment for every change (e.g. v1.42.0 → v1.43.0). Never use `patch` or `major` unless explicitly asked.

## CSS conventions

- Admin button styles → `frontend/src/pages/admin/admin-buttons.css` (scoped under `.admin`)
- Admin builder styles → `frontend/src/pages/admin/AdminBuilder.css`
- All admin `.btn--primary::after` arrows are suppressed in specific contexts — add to the existing suppression list, don't add new global rules
- Hebrew UI: user-facing strings in Hebrew, error `detail` messages from FastAPI in Hebrew
- RTL: the site is RTL (Hebrew), keep `dir="rtl"` in mind for layout

## Key architecture reminders

- **Game state split**: DB holds durable state (templates, leads, orders), Redis is not used here (that's the elias project)
- **Price estimation**: `estimatePrice()` in `schema.js` uses `PRICE_RATES` — currently hardcoded, future: admin-configurable
- **Closet designer flow**: customer picks template → stage 1 (dimensions) → stage 2 (interior) → stage 3 (colors/handles) → cart
- **Cart**: stored in `sessionStorage` via `src/lib/cart.js`; custom closets have a `snapshot` with all customer customizations
- **WhatsApp button**: global floating button in `App.jsx` via `FloatingWhatsApp` component — reads `contact_whatsapp` from public settings
- **Logo**: nav always shows `FormaLogo` text component (FORMA / ארונות), NOT the uploaded logo image

## Files to know

| File | Purpose |
|------|---------|
| `frontend/src/pages/ClosetDesigner.jsx` | Customer-facing closet designer wizard |
| `frontend/src/pages/admin/closet3d/schema.js` | Price estimation + config validation |
| `frontend/src/pages/admin/admin-buttons.css` | All admin button styles |
| `frontend/src/pages/admin/AdminBuilder.css` | Closet builder UI styles |
| `frontend/src/lib/cart.js` | Cart state (sessionStorage) |
| `frontend/src/components/FormaLogo.jsx` | Brand logo — `sub={false}` hides ארונות |
| `frontend/src/components/FloatingWhatsApp.jsx` | Global WhatsApp button |
| `backend/routers/orders.py` | Order creation — has duplicate-order guard |
| `backend/bootstrap.py` | DB migrations (idempotent ALTER TABLE) |

## What NOT to do

- Don't use `git add -A` or `git add .` — stage only changed files
- Don't skip `release.ps1` — the server always deploys the latest **tag**, not a branch
- Don't push to `main` manually — `release.ps1` does the merge
- Don't add `!important` unless specificity genuinely can't be resolved another way
- Don't add comments explaining what code does — only add comments for non-obvious WHY
