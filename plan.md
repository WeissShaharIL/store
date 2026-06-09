# Code Review & Remediation Plan

> Read-only senior-developer review of the three active repos in this workspace: `simple`, `store`, `tasks`.
> Date: 2026-06-09. No code was changed — this document is findings + suggested fixes only.

## Overall assessment

The codebases are **structurally sound**: parameterized SQL via SQLAlchemy, bcrypt password hashing, httpOnly-cookie JWT, restrictive CORS defaults, and soft-delete patterns. There are **no architectural disasters**. The issues are a consistent set of **repeated bad habits** that appear across all three repos. Fix the pattern once and you fix dozens of instances.

The recurring theme is **silent failure**: the apps are written to never crash, but they achieve that by hiding errors — trading a loud dev-time problem for a silent prod-time one.

---

## Cross-cutting issues (present in ALL three repos)

### 1. 🔴 HIGH — Insecure default JWT secret
**Where:** `auth.py` in `simple`, `store`, and `tasks`
```python
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
```
A misconfigured deploy (missing env var) silently runs with a publicly-known signing key → token forgery.

**Fix:** Fail loud at startup if `SECRET_KEY` is unset/equals the placeholder in production (e.g. raise on boot when `ENV=production`). Keep a dev fallback only when explicitly in dev mode.

### 2. 🟠 MED — Bare `except Exception:` that swallows errors silently (~20 instances)
**Where:** audit logging, file deletion, image/JSON parsing, notifications, schema migration.
- `simple/backend/bootstrap.py` (constraint/index drops), `activity.py:61-68`, `pdf.py:301`, `xlsx.py:38-39`, `routers/catalogs.py:116`
- `tasks/backend/ws_manager.py:22-23`, `routers/attachments.py:122-123`
- `store/backend/notify.py:53,82`, `helpers.py:48`, `activity.py:44`, `routers/orders.py:133`

**Fix:** At minimum log the exception type/message. Catch specific exceptions (`json.JSONDecodeError`, `OSError`, `WebSocketDisconnect`) instead of blanket `Exception`. "Best-effort" is fine — invisible is not.

### 3. 🟠 MED — Frontend errors swallowed with empty `catch {}`
**Where:** WS message parsing and API fetches in every frontend.
- `simple/frontend/src/api.js:31`, `contexts/AuthContext.jsx:55-57`
- `tasks/frontend/src/api.js:96`, `components/task/TaskAttachments.jsx:21`, `hooks/usePushNotifications.js:28,52`
- `store/frontend/src/api.js`

**Fix:** Log parse/fetch failures (at least in dev) and surface a UI error state instead of rendering an empty list.

### 4. 🟠 MED — Missing input validation at the API boundary
**Where:** `PATCH`/config endpoints accept `Dict[str, Any]` and `setattr`-loop onto models with no whitelist; Pydantic string fields lack `max_length`.
- `store/backend/routers/component_prices.py:65` (setattr loop, no whitelist), `routers/custom_closet.py:68` (`Dict[str, Any]`), `routers/media.py:66`
- `simple/backend/routers/leads.py:60-78` (cart structure never validated)
- `tasks/backend/schemas.py` (e.g. `TaskCreate.title` has no `max_length`)

**Fix:** Validate at the edge with explicit Pydantic models / field whitelists and `Field(max_length=...)`.

---

## Repo-specific findings

### `simple`
| Severity | Location | Issue |
|----------|----------|-------|
| 🔵 LOW (verified — NOT a bug) | `backend/routers/stats.py:44` | `_month_bounds()` returns `this_start` as the third value; the docstring calls it `last_month_end`. The last-month query uses an **exclusive** `< last_end`, so `this_start` is the *correct* exclusive upper bound — logic is right, only the name/docstring is misleading. |
| 🟠 MED | `backend/schemas.py` (529 lines) | Monolithic schema file mixing auth/users/items/catalogs/orders/messages — split by domain. |
| 🟠 MED | `backend/pdf.py` (442 lines) | Mixes pricing/discount business logic with HTML/CSS presentation. |
| 🟠 MED | `backend/auth.py:24`, `helpers.py:37` | `TOKEN_TTL_DAYS=7` and `DEFAULT_MAX_UPLOAD_BYTES=5MB` hardcoded — move to env. |
| 🟠 MED | `routers/auth.py:20,24` | `COOKIE_SECURE` defaults to false — require explicit `true` in prod. |
| 🔵 LOW | `backend/reset_passwords.py:22,28,30` | Leftover `print()` statements. |

### `store`
| Severity | Location | Issue |
|----------|----------|-------|
| 🔴 HIGH | `frontend/src/pages/admin/ClosetInteriorPlan.jsx` (719 lines) | God-component: drag logic + geometry + measurements + rendering; split into sub-components/hooks. |
| 🟠 MED | `frontend/src/pages/ClosetDesigner.jsx` (523 lines), `admin/LeadsTab.jsx` (288 lines) | Large components mixing fetch/filter/delete/export/3D-preview. |
| 🟠 MED | `backend/helpers.py:46` | `__import__("io")` obfuscation hack — use a normal top-level `import io`. |
| 🟠 MED | `backend/db.py:5` | Defaults to `sqlite:///./store.db`; production should require explicit `DATABASE_URL`. |
| 🔵 LOW | `routers/leads.py` + `routers/orders.py` | Duplicated `_to_out()` JSON-parsing and CSV-export logic — extract a shared util. |
| 🔵 LOW | `frontend/.../CartPage.jsx:58`, `AdminDashboard.jsx:59` | Direct `document.body.style` manipulation / inline rgba styles — move to CSS. |
| 🔵 LOW | `frontend/.../CartPage.jsx:79` | Loose phone regex accepts malformed numbers like "1111111". |

### `tasks`
| Severity | Location | Issue |
|----------|----------|-------|
| 🔴 HIGH | `backend/bootstrap.py:34-40` | SQL built with f-strings (`ALTER TABLE {table} ADD COLUMN {col} {col_type} DEFAULT {default}`); static inputs today but fragile — whitelist identifiers. |
| 🟠 MED | `backend/routers/auth.py:55` | Password minimum length is only 4 chars — raise to 8–12. |
| 🟠 MED | Frontend, 18 instances | Browser `alert()` used for error UX (e.g. `UsersManager.jsx:33`, `TaskModal.jsx:49`) — blocking and poor UX; use toast/modal. |
| 🟠 MED | `backend/routers/tasks.py` | `_task_out()` conversion duplicated inline in multiple handlers — use the helper consistently (DRY). |
| 🟠 MED | `backend/models.py`, `routers/columns.py:57` | `color` fields accept any string with no hex-format validation. |
| 🔵 LOW | `backend/push_service.py:81-82` | `print()` instead of logging in `print_new_keys()`. |
| 🔵 LOW | `backend/tests/test_api.py` | Integration tests exist but no unit tests for auth/JWT/attachment validation/push. |

---

## Prioritized action plan

### Phase 1 — Security (do first, low effort / high ROI)
1. **Make `SECRET_KEY` mandatory in prod** — startup guard in all three `auth.py`.
2. **Eliminate f-string SQL** in `tasks/backend/bootstrap.py` — whitelist table/column/type identifiers.
3. **Raise password minimum length** in `tasks` (4 → 8+).

> Note: `simple/backend/routers/stats.py:44` was investigated and is **NOT a bug** — the exclusive-bound query makes the logic correct; only the `last_month_end` name/docstring is misleading.

### Phase 2 — Observability (stop flying blind)
5. **Add logging to all bare-except blocks** (~20 sites) — log exception type before swallowing.
6. **Log frontend parse/fetch failures** and surface UI error states instead of empty lists.

### Phase 3 — Validation & maintainability
7. **Whitelist fields on `Dict[str, Any]` PATCH endpoints** (`store`).
8. **Add `max_length` to Pydantic string fields** (`tasks`) and validate `color` hex format.
9. **Move hardcoded config to env** (`TOKEN_TTL_DAYS`, upload limits, `DATABASE_URL`, cookie flags).

### Phase 4 — Code health (larger refactors, schedule deliberately)
10. **Split `store/.../ClosetInteriorPlan.jsx`** (719 lines) into sub-components/hooks.
11. **Split `simple/backend/schemas.py`** by domain; separate presentation from logic in `pdf.py`.
12. **De-duplicate** `_to_out()` / CSV export (`store`) and `_task_out()` (`tasks`).
13. **Replace `alert()`** with toast notifications (`tasks` frontend).
14. **Remove debug `print()`** statements and the `__import__("io")` hack.

---

## Findings summary

| Repo | HIGH | MED | LOW |
|------|------|-----|-----|
| simple | 1 | ~14 | ~5 |
| store | 1 | ~8 | ~7 |
| tasks | 2 | ~11 | ~6 |

*Counts are approximate and overlap with the cross-cutting items above (e.g. the shared `SECRET_KEY` issue is counted once per repo).*
