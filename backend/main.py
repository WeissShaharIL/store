import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from bootstrap import (
    run_migrations,
    seed_admin, seed_guest_user, seed_default_catalog,
    seed_handles, seed_palette_colors, seed_settings,
)
from db import Base, SessionLocal, engine
from limiter import limiter
from logging_config import setup_logging
from middleware import RequestIDMiddleware

setup_logging()

from routers import auth as auth_router
from routers import me as me_router
from routers import closet_templates as closet_templates_router
from routers import palette_colors as palette_colors_router
from routers import handles as handles_router
from routers import door_type_covers as door_type_covers_router
from routers import assets as assets_router
from routers import leads as leads_router
from routers import settings as settings_router
from routers import logos as logos_router
from routers import public as public_router
from routers import landing as landing_router
from routers import version as version_router

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads")).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Store")

app.add_middleware(RequestIDMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins_env = os.environ.get("CORS_ORIGINS", "").strip()
_cors_origins = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else []
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.on_event("startup")
def on_startup():
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_migrations(db)
        seed_admin(db)
        seed_guest_user(db)
        seed_default_catalog(db)
        seed_settings(db)
        seed_palette_colors(db)
        seed_handles(db)
    finally:
        db.close()


app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(me_router.router, prefix="/api/me", tags=["me"])
app.include_router(closet_templates_router.router, prefix="/api/admin/closet-templates", tags=["admin-closet-templates"])
app.include_router(palette_colors_router.router, prefix="/api/admin/palette-colors", tags=["admin-palette-colors"])
app.include_router(handles_router.router, prefix="/api/admin/handles", tags=["admin-handles"])
app.include_router(door_type_covers_router.router, prefix="/api/admin/door-type-covers", tags=["admin-door-type-covers"])
app.include_router(assets_router.router, prefix="/api/admin/assets", tags=["admin-assets"])
app.include_router(logos_router.router, prefix="/api/admin/logos", tags=["admin-logos"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
app.include_router(landing_router.router, prefix="/api/admin/landing", tags=["admin-landing"])
app.include_router(leads_router.public_router, prefix="/api/public/leads", tags=["public-leads"])
app.include_router(leads_router.admin_router, prefix="/api/admin/leads", tags=["admin-leads"])
app.include_router(public_router.router, prefix="/api/public", tags=["public"])
app.include_router(version_router.router, prefix="/api/version", tags=["version"])


@app.get("/api/health")
def health():
    return {"ok": True}
