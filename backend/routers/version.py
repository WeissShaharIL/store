from fastapi import APIRouter

router = APIRouter()

VERSION = "1.0.0"


@router.get("")
def get_version():
    return {"version": VERSION}
