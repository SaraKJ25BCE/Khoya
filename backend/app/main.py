"""
FR1 (Hour 0-1): FastAPI service scaffolding. Kept intentionally small —
no database, no auth, no WebSocket gateway yet (those are FR7, explicitly
out of scope before Hour 12 per the requirements' non-functional section).

Endpoints:
  GET  /health              - liveness check
  POST /price                - Black-Scholes price + Greeks for one option
  POST /iv                   - solve IV from an observed price
  GET  /replay/straddle      - run the FR5 replay and return the full
                                attribution breakdown as JSON (same numbers
                                `python -m app.replay` prints to console)
"""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .iv_solver import solve_iv
from .pricing import bs_greeks, bs_price
from .replay import run_replay

app = FastAPI(title="Khoya", version="0.1.0-hour12")

# Configure CORS origins from environment variable ALLOWED_ORIGINS (comma-separated), defaulting to '*'
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if raw_origins == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PriceRequest(BaseModel):
    spot: float = Field(..., gt=0)
    strike: float = Field(..., gt=0)
    days_to_expiry: float = Field(..., gt=0)
    risk_free_rate: float = 0.06
    iv_pct: float = Field(..., gt=0, description="IV in percent, e.g. 15.0")
    option_type: str = Field(..., pattern="^(call|put)$")


class IVRequest(BaseModel):
    observed_price: float = Field(..., gt=0)
    spot: float = Field(..., gt=0)
    strike: float = Field(..., gt=0)
    days_to_expiry: float = Field(..., gt=0)
    risk_free_rate: float = 0.06
    option_type: str = Field(..., pattern="^(call|put)$")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/price")
def price(req: PriceRequest):
    T = req.days_to_expiry / 365.0
    iv = req.iv_pct / 100.0
    p = bs_price(req.spot, req.strike, T, req.risk_free_rate, iv, req.option_type)
    g = bs_greeks(req.spot, req.strike, T, req.risk_free_rate, iv, req.option_type)
    return {"price": p, "greeks": g.__dict__}


@app.post("/iv")
def iv(req: IVRequest):
    T = req.days_to_expiry / 365.0
    try:
        sigma = solve_iv(req.observed_price, req.spot, req.strike, T, req.risk_free_rate, req.option_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"iv_pct": sigma * 100.0}


@app.get("/replay/straddle")
def replay_straddle():
    return run_replay()
