# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A full-stack custom closet e-commerce platform. The standout feature is a real-time 3D closet designer (Three.js) where customers configure cabinets with adjustable dimensions, colors, handles, and door types. The admin dashboard manages closet templates, color palettes, handles, customer catalogs, orders, and a media library. The UI is in Hebrew (RTL).

## Commands

All commands are run from inside `store/` unless noted.

**Frontend dev:**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api → :8000
npm run build
npm run test       # Vitest (unit + smoke)
npm run test:watch
npm run test:e2e   # Playwright E2E — requires `npm run preview` to be running
```

**Backend dev:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# DATABASE_URL must point at postgres (or omit for SQLite dev fallback)
uvicorn main:app --reload --port 8000
```

**Full stack via Docker (local, no external postgres required):**
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml -p store up --build -d
# App at http://localhost:3082, login admin/admin
```

**Pre-deploy gate (run before every release):**
```powershell
.\predeploy.ps1          # builds frontend, runs Vitest + pytest; pass -E2E for Playwright
```

**Release & deploy:**
```powershell
.\release.ps1            # bump version, merge dev→main, tag, push
.\deploy-remote.ps1      # SSH to server, pull latest tag, rebuild Docker stack
```

**Post-deploy smoke test:**
```bash
python smoke_test.py https://store.works-on-my-machine.net
```

**Run a single backend test:**
```bash
cd backend && python -m pytest tests/test_auth.py -q
```

## Architecture

### Stack
- **Backend:** FastAPI, SQLAlchemy 2 (sync), psycopg2, python-jose JWT, passlib/bcrypt, slowapi
- **Frontend:** React 18 + Vite, React Router 6, Three.js / @react-three/fiber (3D designer), Vitest, Playwright
- **Infrastructure:** Docker Compose, Nginx (reverse proxy + static file serving), PostgreSQL (shared container)

### Request flow
Nginx (port 3082 in dev, 80 in prod) routes `/api/*` → FastAPI on :8000, everything else → React SPA. `/uploads/` is served statically by nginx with 30-day cache headers (do not serve uploads from FastAPI).

### Auth
JWT stored in an httpOnly cookie named `store_token` (TTL 7 days). The token also carries `is_admin` and a `ver` claim (the user's `token_version`); `get_current_user()` re-reads `is_admin` from the DB and rejects any token whose `ver` no longer matches (a password change bumps `token_version`, revoking all prior tokens). `get_current_user()` is the dependency for customer routes and `require_admin()` for admin routes; public endpoints simply omit the auth dependency. The admin password-change endpoint enforces the shared policy in `auth.validate_password_strength`.

### Database
`bootstrap.py` runs at startup — it applies idempotent `ALTER TABLE` migrations and seeds default data (admin user, default colors, handles). There is no Alembic; add new columns directly in `bootstrap.py` with `ADD COLUMN IF NOT EXISTS`. SQLite is used for local dev without postgres; PostgreSQL in production.

### Backend routers
Grouped by domain under `backend/routers/`:
- `me/` — customer-facing endpoints (catalog, orders, messages, announcements)
- `public.py` — unauthenticated showroom/closet/color data
- `leads.py` — public inquiry form + admin lead list
- `orders.py` — admin order management
- `media.py` — admin file upload / folder management
- `closet_templates.py`, `palette_colors.py`, `handles.py`, `door_type_covers.py` — admin design config
- `landing.py`, `logos.py`, `hero_banners.py` — admin homepage config
- `activity_router.py` — admin audit log

### Frontend structure
- `src/pages/admin/closet3d/` — Three.js 3D closet renderer; geometry is computed client-side from config JSON
- `src/pages/admin/closet-builder/` — low-code closet config editor
- `src/pages/admin/interior-plan/` — 2D room planner
- `src/lib/` — pure logic (cart state, date/money formatting, config parsing) — no side effects
- `src/contexts/` — `AuthContext` (login state), `ThemeContext`
- `src/styles/` — CSS split by feature; admin button rules all live in `admin-buttons.css` scoped under `.admin`, admin responsive rules in `admin-mobile.css`

### 3D designer
The closet designer builds Three.js geometry from a JSON config (dimensions, section count, color codes, handle type, door type). Textures and materials are swapped on the fly. The final render is screenshot-captured and saved to the DB as the template thumbnail. Code-split: `closet3d` is a separate Vite chunk so it doesn't bloat the main bundle.

### File uploads
Uploaded via `media.py` → stored under `uploads/` volume → served by nginx. Use `register_media` / `unregister_media` helpers to track files in the `media_files` table. Never hard-delete files without calling `unregister_media`.

### Audit logging
All admin mutations call `log_activity(db, user_id, action, detail)` from `activity.py`. This writes to the `activity` table, which the admin can view in the dashboard.

## Environment variables

See `.env.template`. Required in production `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `ADMIN_CUSTOMER_ID`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME` — bootstrapped admin credentials
- `COOKIE_SECURE=true`, `COOKIE_SAMESITE=strict`

## Deployment notes

- Active development branch is `dev`; `main` holds tagged releases only.
- `deploy.sh` does **not** touch host nginx — if `nginx-host.conf` changes, copy it manually and reload nginx.
- `predeploy.ps1` is the gate: never release without it passing.
- Version tags follow semver; middle segment bumped for features (`v0.1.0` → `v0.2.0`), patch for fixes.
- `release.json` at repo root always reflects the current deployed version.
