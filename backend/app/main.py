"""
FR1 — service scaffold. Just enough to prove the app boots and to serve
the FR5 replay output to the frontend. No DB, no auth, no websockets —
those are explicitly out of scope until after Review 1.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.replay.straddle_replay import run_replay

app = FastAPI(title="P&L Attribution — Review 1 build")

# Wide open for local dev against the Vite dev server. Tighten before
# this ever sees a real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/replay/straddle")
def replay_straddle():
    """Returns the FR5 breakdown: per-interval theta/delta-gamma/vega/residual."""
    return {"rows": run_replay()}
