import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads")).resolve()
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def save_upload(file: UploadFile) -> str:
    """Save an uploaded image to UPLOAD_DIR. Returns the bare filename."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"סוג קובץ לא נתמך. מותר: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    data = file.file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="הקובץ גדול מדי (מקסימום 5MB)")

    try:
        img = Image.open(__import__("io").BytesIO(data))
        img.verify()
    except Exception:
        raise HTTPException(status_code=422, detail="הקובץ אינו תמונה תקינה")

    filename = f"{uuid.uuid4().hex}.{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(data)
    return filename


def delete_upload(image_path: str | None) -> None:
    """Delete an upload file if it exists. Silent on missing files."""
    if not image_path:
        return
    target = UPLOAD_DIR / image_path
    try:
        target.unlink()
    except FileNotFoundError:
        pass
