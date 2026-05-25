import logging
import sys
from contextvars import ContextVar

from pythonjsonlogger import jsonlogger

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIDFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get("-")
        return True


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    handler.addFilter(RequestIDFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    for noisy in ("uvicorn.access", "uvicorn.error"):
        lg = logging.getLogger(noisy)
        lg.handlers.clear()
        lg.propagate = True
