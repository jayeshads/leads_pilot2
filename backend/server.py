# Compatibility shim for the Emergent supervisor config, which expects
# `uvicorn server:app` to be runnable from /app/backend.
# The real FastAPI app lives in app/main.py.
from app.main import app  # noqa: F401
