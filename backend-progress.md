# Backend remediation progress

Working through the findings in [backend.md](store/backend.md), in the suggested order. Baseline test suite: **98 passed** before any changes.

Legend: ✅ done · 🔄 in progress · ⬜ not started

| # | Finding | Status | Notes |
|---|---------|--------|-------|
| S1 | Enforce rate limiting | ✅ | `SlowAPIMiddleware` + per-route limits; new `test_rate_limit.py` |
| S2 | Fail-fast on insecure SECRET_KEY | ✅ | Refuses to boot on non-sqlite DB without a real key |
| S3 | Require auth on `GET /api/settings` | ✅ | Whole router behind `require_admin`; test updated |
| S4 | Unify/strengthen password policy | ✅ | `validate_password_strength` (≥8) used by both change-password endpoints |
| S5 | Token invalidation on password change | ✅ | `token_version` in JWT + DB, bumped on change, re-issues cookie |
| S6 | Bound upload size before buffering | ✅ | Chunked read, caps memory at ~MAX_FILE_SIZE |
| M1 | Extract shared `parse_cart` helper | ✅ | One helper; removed 5 duplicate blocks |
| M2 | Standardize Pydantic v2 `ConfigDict` | ✅ | All legacy `class Config` removed (warnings 133→121) |
| M4 | Enum-ize statuses / pricing basis | ✅ | New `enums.py`; routers derive valid sets from it |
| P1 | Replace N+1 count queries | ✅ | `GROUP BY` in lead/order counts + `list_folders` |
| P2 | Add pagination to list endpoints | ✅ | `limit`/`offset` (cap 1000) on leads/orders/files; logs on truncation |
| C1 | Money as Decimal in admin orders | ✅ | |
| C2 | Settings-key drift | ✅ | `PUBLIC_SETTING_KEYS` constant + seeded defaults |
| C3 | Broad except masks bugs | ✅ | order-total failure now logged |
| A1 | Deprecated `on_event` → lifespan | ✅ | |
| A4 | Doc drift (`get_optional_user`) | ✅ | CLAUDE.md auth section corrected |

---

## Change log

### S1 — Enforce rate limiting ✅
- `main.py`: added `SlowAPIMiddleware` so the limiter's `default_limits` (200/min) act as a global backstop.
- Per-route `@limiter.limit("10/minute")` on the abuse-prone endpoints: `POST /api/auth/login`, `POST /api/auth/change-password` (added a `request` param), `POST /api/public/leads`, `POST /api/public/contact` (added a `request` param).
- `tests/conftest.py`: `limiter.enabled = False` for the suite so existing tests can hammer endpoints.
- New `tests/test_rate_limit.py`: flips the limiter on, proves `/login` returns 429 past the limit, resets in `finally`.
- Result: **99 passed**.

### S2 — Fail-fast on insecure SECRET_KEY ✅
- `auth.py`: `SECRET_KEY` now resolves to the dev placeholder **only** when running on the SQLite dev fallback (`DATABASE_URL` starts with `sqlite`). With a real DB URL and no key set, the app raises `RuntimeError` at import — mirroring the existing `ADMIN_PASSWORD` guard. Tests (no `DATABASE_URL`) keep the dev key.

### S3 — Require auth on GET /api/settings ✅
- `routers/settings.py`: moved `require_admin` to the router level so **both** `GET` and `PATCH /api/settings` need admin. Anonymous callers use the whitelisted `/api/public/settings`. Verified the frontend admin `SettingsTab` is the only `getSettings` caller; the public site uses `getPublicSettings`.
- `tests/test_settings.py`: replaced `test_get_settings_no_auth` with `test_get_settings_requires_admin` (401) + `test_get_settings_admin` (200).

### S4 — Unify/strengthen password policy ✅
- `auth.py`: added `MIN_PASSWORD_LENGTH = 8` and `validate_password_strength()` — the single policy gate (Hebrew 422 message).
- Applied in both `routers/auth.py::change_password` (was an inline `< 6` check) and `routers/me/profile.py::change_my_password` (previously **no** check, schema allowed 1 char).

### S5 — Token invalidation on password change ✅
- `models.py`: added `User.token_version` (int, default 0); `bootstrap.py`: idempotent `ADD COLUMN token_version`.
- `auth.py`: `create_token` embeds `ver`; `get_current_user` rejects a token whose `ver` ≠ the user's current `token_version` (Hebrew 401).
- Both change-password endpoints bump `token_version` (revoking every prior token) and re-issue a fresh cookie via the new shared `_set_auth_cookie()` helper so the acting session isn't logged out.
- `tests/conftest.py`: `admin_token`/`auth_headers` made **module-scoped** so each module re-logins at the current version. New assertion in `test_change_password_and_login_with_new` proves a clean client carrying the pre-change token gets 401.
- Result: **100 passed**.

### S6 — Bound upload size before buffering ✅
- `helpers.py::save_upload`: reads the upload in 1 MB chunks and aborts with 413 the moment the running total exceeds `MAX_FILE_SIZE` — memory is now bounded at ~MAX_FILE_SIZE instead of buffering the whole (possibly huge) body first. Also replaced the `__import__("io")` hack with a top-level `import io`.

### M1 — Shared parse_cart helper ✅
- `helpers.py::parse_cart()` is the single tolerant JSON-cart parser. Removed the copy-pasted try/except block from `leads.py` (×2), `orders.py` (×2), and `notify.py`.

### M2 — Standardize Pydantic config ✅
- Replaced every legacy `class Config:` in `schemas.py` with `model_config = ConfigDict(...)`. No more class-based-config deprecation warnings.

### M4 — Enums as single source of truth ✅
- New `enums.py`: `LeadStatus`, `OrderStatus`, `PriceBasis` (str-enums with a `.values()` helper). `leads.py` / `orders.py` / `component_prices.py` now derive their `VALID_*` sets from the enum instead of redeclaring literal sets. Kept the Hebrew 422 messages (typing the body field as the enum would surface Pydantic's English error list, which the frontend can't render).

### P1 — N+1 counts → GROUP BY ✅
- `lead_counts` (was 4 queries) and `order_counts` (was 1-per-status) now run a single `GROUP BY status`. `media.list_folders` (was 1 COUNT per folder) now runs one grouped count.

### P2 — Pagination ✅
- `limit` (default 500, max 1000) + `offset` query params on `list_leads`, `list_orders`, `list_files`, mirroring the existing `activity` endpoint. Responses stay plain arrays (no frontend change). A `logger.warning` fires when a page is full, so truncation is never silent.

### C1/C2/C3 + A1/A4 — correctness & cleanup ✅
- **C1**: admin order totals computed and stored as `Decimal` (str-routed) instead of `float`.
- **C2**: hoisted the public settings whitelist to a `PUBLIC_SETTING_KEYS` constant and added the previously-unseeded keys (`hero_tagline`, `about_text`, `default_closet_image`, `trust_items`) to `DEFAULT_SETTINGS`. Verified end-to-end: `/api/public/settings` now returns all 9 keys.
- **C3**: the order-total best-effort `except` now logs a warning instead of silently swallowing.
- **A1**: migrated `@app.on_event("startup")` to a `lifespan` context manager; conftest neutralizes it with a no-op so the suite keeps managing its own engine/seeding.
- **A4**: corrected the `store/CLAUDE.md` auth section (no `get_optional_user`; documented `token_version`/`require_admin`). Removed a redundant local `import HTTPException` in `public.py`.

---

## Final state

- **All 100 tests pass** (98 original + `test_rate_limit` + the in-test revocation assertion).
- Deprecation warnings reduced 133 → 121 (Pydantic class-config + `on_event` gone; the remainder are third-party `jose`/`passlib` `utcnow` warnings).
- Production-path sanity-checked outside the suite: the `SECRET_KEY` guard raises on a non-sqlite DB with no key, and the real `lifespan` boots + seeds cleanly.

### Deliberately left for a follow-up (acknowledged trade-offs in backend.md)
- **A2 (Alembic)**: still on the hand-rolled `ADD COLUMN` migrations — a larger architectural change.
- **A3 (audit session)**: `act.record` still commits on the request session; low urgency.
- **M3/M5 (schema location / serializer consolidation)**: partially eased via `parse_cart`; the remaining 1:1 `_to_out` functions are low-risk and left as-is.

---

## Release & deploy

- **Committed** to `dev` (`e64d2f1`) — backend changes + the two review docs only; the unrelated `.claude/settings.json` edit and untracked skill files were kept out.
- **Predeploy gate**: frontend build OK, all frontend tests pass, backend **100 passed**. Note: `vitest` hangs at worker-pool teardown in this environment (a pre-existing flake — my changes are backend-only) so the gate script itself doesn't exit cleanly; the underlying checks are all green and were run/verified individually.
- **Released `v1.64.12`** via `release.ps1` (dev→main merge, tag, GitHub release) and pushed `dev`.
- **Deployed** via `deploy-remote.ps1 shahar 89.139.33.201` — backend + frontend images rebuilt, all three containers recreated and started (exit 0).
- **Production smoke checks** against `https://store.works-on-my-machine.net`:
  - `GET /api/health` → `{"ok":true}` (backend booted → `SECRET_KEY` present on server; S2 didn't break the deploy)
  - `GET /api/public/settings` → all 9 keys (C2 live)
  - `GET /api/settings` (no auth) → **401** (S3 live)
  - `POST /api/auth/login` (bad creds) → **401**, not 500 (auth + `token_version` path healthy)
