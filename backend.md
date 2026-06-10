# Backend code review — `store/backend`

_Senior backend review of the FastAPI service. Reviewed: app wiring, auth, models, bootstrap/migrations, all routers, helpers, and tests. Scope is code quality, security, correctness, and maintainability against common backend best practices._

The codebase is in **good shape overall** — see [What's already done well](#whats-already-done-well). The findings below are prioritized; **🔴 Security** items are worth doing before the next release, the rest are quality/scaling improvements.

---

## 🔴 Security

### S1 — The rate limiter is configured but never enforced
[main.py:49-50](store/backend/main.py#L49-L50) registers `app.state.limiter` and the `RateLimitExceeded` handler, and [limiter.py:4](store/backend/limiter.py#L4) sets `default_limits=["200/minute"]`. But **slowapi only enforces limits when you either add `SlowAPIMiddleware` or decorate routes with `@limiter.limit(...)`** — and neither exists anywhere (`grep` for `SlowAPIMiddleware` / `@limiter` returns nothing). The `default_limits` are dead config.

**Impact:** `POST /api/auth/login` ([auth.py:33](store/backend/routers/auth.py#L33)), `POST /api/public/leads`, and `POST /api/public/contact` are completely unthrottled → password brute-force and spam/abuse are wide open.

**Fix:** add the middleware so `default_limits` take effect, and put a tight limit on auth/public write endpoints:
```python
from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)        # main.py

@router.post("/login")
@limiter.limit("5/minute")                   # auth.py — request: Request already present
def login(payload: LoginRequest, request: Request, ...):
```

### S2 — `SECRET_KEY` is not fail-fast in production
[auth.py:15](store/backend/auth.py#L15) defaults to `"dev-insecure-change-me"`. If the env var is missing in prod, the app boots happily and **every JWT becomes forgeable** (an attacker can mint an `is_admin: true` token). Contrast with [bootstrap.py:94-97](store/backend/bootstrap.py#L94-L97), which correctly refuses to boot without `ADMIN_PASSWORD`.

**Fix:** mirror the admin-password guard — when `os.environ.get("ENV") == "production"` (or simply when not using the SQLite dev fallback), `raise RuntimeError` if `SECRET_KEY` is the default/empty.

### S3 — `GET /api/settings` leaks all settings without auth
[settings.py:14-17](store/backend/routers/settings.py#L14-L17): the router is mounted with **no auth dependency**; only `PATCH` has `require_admin`. `get_settings` returns `db.query(Setting).all()` — every key. The public router deliberately whitelists keys ([public.py:106-119](store/backend/routers/public.py#L106-L119)), which shows the intent was *not* to expose everything. Any setting that isn't meant to be public (and any added later) is disclosed to anonymous callers.

**Fix:** require auth on `GET /api/settings` (it's an admin-config read), and have the public surface go only through `/api/public/settings`.

### S4 — Inconsistent / weak password policy
Admin change-password enforces ≥6 chars ([auth.py:76-77](store/backend/routers/auth.py#L76-L77)), but the customer endpoint accepts a **1-character password** — `PasswordChange` uses `min_length=1` ([schemas.py:30-32](store/backend/schemas.py#L30-L32)) and [me/profile.py:18-21](store/backend/routers/me/profile.py#L18-L21) does no length check. Centralize one policy (length + ideally a complexity/length floor) and apply it everywhere passwords are set.

### S5 — No token invalidation on password change
JWTs are valid for 7 days ([auth.py:17](store/backend/auth.py#L17)) and carry no `jti`/token-version. Changing a password (S4 endpoints) does **not** revoke existing tokens, so a leaked/old token keeps working for up to a week. Add a `token_version` integer to `User`, embed it in the token, bump it on password change, and check it in `get_current_user`.

### S6 — Uploads are fully buffered into memory before the size check
[helpers.py:41-43](store/backend/helpers.py#L41-L43): `data = file.file.read()` reads the **entire** upload, *then* checks `len(data) > MAX_FILE_SIZE`. A client can post a multi-GB body and exhaust memory before the 413 fires. Check `request`/content-length up front, or read in bounded chunks and abort once the cap is exceeded. (Combine with S1 — upload endpoints have no rate limit either.)

---

## 🟠 Correctness & robustness

### C1 — Money is handled as `float` in the admin order path
`ClosetOrder.total_amount` is `Numeric(10,2)` ([models.py:343](store/backend/models.py#L343)), but `OrderUpdate.total_amount` is `Optional[float]` ([orders.py:47](store/backend/routers/orders.py#L47)), `_to_out` casts via `float(...)` ([orders.py:60](store/backend/routers/orders.py#L60)), and the auto-total sums `float`s ([orders.py:125-132](store/backend/routers/orders.py#L125-L132)). The customer order path correctly uses `Decimal` throughout ([me/orders.py:37-48](store/backend/routers/me/orders.py#L37-L48)). Mixing `float` into money invites rounding drift. Use `Decimal` (and `condecimal`/`Decimal` in the Pydantic schema) consistently for the admin orders too.

### C2 — Settings keys are magic strings that drift across files
`DEFAULT_SETTINGS` ([bootstrap.py:14-20](store/backend/bootstrap.py#L14-L20)) seeds 5 keys, but `PUBLIC_KEYS` ([public.py:107-117](store/backend/routers/public.py#L107-L117)) serves 9 (`hero_tagline`, `about_text`, `default_closet_image`, `trust_items` are served but never seeded). `update_settings` also writes arbitrary keys with no whitelist ([settings.py:22-27](store/backend/routers/settings.py#L22-L27)). Define the known setting keys in **one** place (an enum/constants module) and reference it from seed, public-allowlist, and update-validation.

### C3 — Broad `except Exception` can mask real bugs
The auto-total computation swallows everything ([orders.py:133-134](store/backend/routers/orders.py#L133-L134)), as does the image-verify path ([helpers.py:48](store/backend/helpers.py#L48)). The best-effort intent is fine for `notify`/`activity`, but for order totals a malformed cart silently yields `total=None` with no log. At minimum `logger.warning(..., exc_info=True)` so these are observable.

---

## 🟡 Maintainability & DRY

### M1 — The cart-JSON parse-and-guard block is duplicated 5×
The exact pattern
```python
try:
    cart = json.loads(row.cart_snapshot or "[]")
    if not isinstance(cart, list): cart = []
except (TypeError, ValueError):
    cart = []
```
appears in [leads.py:24-29](store/backend/routers/leads.py#L24-L29), [leads.py:108-112](store/backend/routers/leads.py#L108-L112), [orders.py:51-56](store/backend/routers/orders.py#L51-L56), [orders.py:166-170](store/backend/routers/orders.py#L166-L170), and [notify.py:74-76](store/backend/routers/../notify.py#L74-L76). Extract `parse_cart(snapshot) -> list` into `helpers.py` and call it everywhere.

### M2 — Pydantic v1 and v2 config styles are mixed
Some schemas use the v2 form `model_config = ConfigDict(from_attributes=True)` ([schemas.py:62](store/backend/schemas.py#L62), [orders.py:25](store/backend/routers/orders.py#L25)), while ~8 others use the legacy nested `class Config: from_attributes = True` ([schemas.py:148-149](store/backend/schemas.py#L148-L149), 187, 220, 232, 245, 255, 272, 314, 355). Standardize on `ConfigDict` (the `class Config` form is deprecated in Pydantic v2).

### M3 — Per-row `_to_out()` serializers are hand-written and repeated
Every router defines a `_to_out` that copies each field by hand (closet_templates, leads, orders, component_prices, plus `order_to_out` in helpers). For most of these the model maps 1:1 to the schema — `Out.model_validate(row)` with `from_attributes=True` already does this (and is used in [public.py](store/backend/routers/public.py)). The only ones that *need* custom logic are the cart-decoding ones (leads/orders), which M1 collapses into one shared transform. Dropping the trivial `_to_out`s removes a class of "added a column, forgot to map it" bugs.

### M4 — Status validation is duplicated string-set logic; use enums
`VALID_STATUSES` is redefined per router ([leads.py:20](store/backend/routers/leads.py#L20), [orders.py:19](store/backend/routers/orders.py#L19), [component_prices.py:14](store/backend/routers/component_prices.py#L14) as `VALID_BASIS`) with the same manual `if x not in SET: raise HTTPException(422)` boilerplate scattered through create/update handlers. Modeling these as `str`-`Enum`s on the Pydantic schemas gets you automatic 422s, OpenAPI docs, and a single source of truth — deleting the manual checks.

### M5 — Schema location is inconsistent
Most schemas live in [schemas.py](store/backend/schemas.py), but `orders.py` and `media.py` define theirs inline in the router. Pick one convention. (Inline is defensible for a router-local DTO, but be consistent — right now it's split for no clear reason.)

### M6 — Minor style: imports not at top / odd idioms
- `helpers.py` puts `from discounts import ...` and model imports after the module's `logger =` line ([helpers.py:13-25](store/backend/helpers.py#L13-L25)).
- `save_upload` uses `__import__("io").BytesIO(...)` ([helpers.py:46](store/backend/helpers.py#L46)) instead of a top-level `import io`.
- `get_public_closet` re-imports `HTTPException` inside the function ([public.py:72](store/backend/routers/public.py#L72)) though it's already imported at module top.

These are trivially fixable and worth a cleanup pass.

---

## 🔵 Performance & scaling

### P1 — N+1 / per-status count queries
- `lead_counts` runs 4 separate `COUNT` queries ([leads.py:82-91](store/backend/routers/leads.py#L82-L91)); `order_counts` runs one per status ([orders.py:68-74](store/backend/routers/orders.py#L68-L74)). Replace with a single `GROUP BY status` aggregate.
- `list_folders` runs a `COUNT` query **per folder** ([media.py:44-47](store/backend/routers/media.py#L44-L47)) — a classic N+1. Use one grouped count / `outerjoin` + `func.count`.

These are fine at today's data volumes but are the first things to bite as data grows.

### P2 — No pagination on list endpoints
`list_leads`, `list_orders`, `list_files`, the catalog builders, and the activity log all return **every** matching row with no `limit`/`offset`. Add cursor or limit/offset pagination (and a sane default cap) before these tables get large — otherwise a single request can pull the whole table into memory and serialize it.

---

## ⚪ Architecture notes (acknowledged trade-offs)

### A1 — Deprecated `@app.on_event("startup")`
[main.py:67](store/backend/main.py#L67) uses the startup event hook, which Starlette/FastAPI have deprecated in favor of the `lifespan` async context manager. Low urgency, but it'll warn (and eventually break) on a future FastAPI bump. Migrate to `lifespan=`.

### A2 — Hand-rolled migrations instead of Alembic
`run_migrations` ([bootstrap.py:42-86](store/backend/bootstrap.py#L42-L86)) is a tidy idempotent `ADD COLUMN` runner, and `CLAUDE.md` documents this as a deliberate choice. The limits to keep in mind: it can only **add** columns — no type changes, renames, index/constraint additions, data backfills, or rollbacks, and there's no applied-version ledger. That's acceptable for a small evolving app, but I'd plan to adopt Alembic once the schema stabilizes; the longer you wait the more painful the first "real" migration becomes.

### A3 — Audit logging commits on the request's session
`act.record` does its own `db.commit()` on the shared request session ([activity.py:42-45](store/backend/activity.py#L42-L45)). Because callers typically commit the business change *first* and then call `record`, this is OK today — but it couples audit durability to the request transaction and, if ever called mid-transaction, would commit partial work. Consider giving the audit writer its own short-lived session so it's truly independent.

### A4 — Doc drift: `get_optional_user()` doesn't exist
`CLAUDE.md` ("Auth") states *"public endpoints use `get_optional_user()`"*, but there's no such function — public routers simply omit the auth dependency. Update the doc (or add the helper if optional-user context is actually wanted on public routes).

---

## What's already done well

Worth stating, since the goal is overall quality — these are solid and should be preserved:

- **Clean domain-per-router layout** with a composed `me/` sub-package; `main.py` wiring is readable.
- **Server-side price authority**: customer orders recompute `unit_price` from the catalog the customer is actually allowed to see and reject unknown items ([me/orders.py:25-47](store/backend/routers/me/orders.py#L25-L47)) — the client cannot dictate price. Order lines snapshot `product_code`/`name`/`unit_price` ([models.py:147-150](store/backend/models.py#L147-L150)) so history survives catalog edits.
- **`get_current_user` re-reads `is_admin` from the DB** rather than trusting the JWT claim ([auth.py:60-64](store/backend/auth.py#L60-L64)) — correct, avoids stale-privilege bugs.
- **Cookie auth done right**: httpOnly, `secure`/`samesite` env-driven ([auth.py:45-53](store/backend/routers/auth.py#L45-L53)).
- **Observability**: request-ID middleware + structured JSON logging with the request id threaded via `contextvars` ([middleware.py](store/backend/middleware.py), [logging_config.py](store/backend/logging_config.py)).
- **Robustness touches**: `with_for_update()` + one-order-per-lead guard to serialize concurrent order creation ([orders.py:113-121](store/backend/routers/orders.py#L113-L121)); soft-delete + trash/restore/permanent-delete flow for leads; idempotent seeds; `register_media`/`unregister_media` discipline so the media table never points at missing files.
- **Upload validation** checks extension *and* verifies real image bytes via Pillow ([helpers.py:34-49](store/backend/helpers.py#L34-L49)) (just fix the read-order in S6).
- **A real test suite exists** with a clean in-memory-SQLite + `StaticPool` harness and good fixtures ([tests/conftest.py](store/backend/tests/conftest.py)). Good docstrings throughout.

---

## Suggested order of work

1. **S1, S2, S3** — close the auth/abuse gaps (small, high value).
2. **S4, S5, S6** — password policy + token revocation + upload buffering.
3. **M1, M2, M4** — DRY up cart parsing, unify Pydantic config, enum-ize statuses (mechanical, low-risk, shrinks the code).
4. **P1, P2** — counts and pagination before data grows.
5. **C1, C2, C3 / A1, A3, A4** — correctness and cleanup as you touch those areas.
