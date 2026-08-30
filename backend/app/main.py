"""
FastAPI service scaffolding for Khoya option pricing, attribution, and live simulation.

Endpoints:
  GET  /health              - liveness check
  POST /price               - Black-Scholes price + Greeks for one option
  POST /iv                  - solve IV from an observed price
  GET  /replay/straddle     - run historical replay breakdown
  GET  /sample-trades       - fetch list of sample open option trades
  GET  /live/tick           - fetch / advance live simulation tick with attribution calculation
  POST /live/reset          - reset live simulation for a sample trade
  GET  /live/option-chain   - fetch live option chain snapshot (Zerodha / Simulation)
  GET  /zerodha/status      - check Zerodha Kite Connect configuration status
  GET  /zerodha/login-url   - generate Zerodha OAuth login URL
  POST /zerodha/session     - exchange request_token for access_token
  GET  /zerodha/positions   - fetch live open positions from Zerodha
"""

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .iv_solver import solve_iv
from .pricing import bs_greeks, bs_price
from .replay import run_replay
from .sample_trades import list_sample_trades, get_sample_trade
from .live_simulation import simulation_engine
from .zerodha import ZerodhaClient

app = FastAPI(title="Khoya Live Options Engine", version="0.2.0")

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


class ZerodhaSessionRequest(BaseModel):
    request_token: str = Field(..., min_length=1)


class TickRequest(BaseModel):
    trade_id: str = "short_straddle"
    spot_change_pct: Optional[float] = None
    iv_change_pct: Optional[float] = None
    elapsed_hours: float = 0.5


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


# -----------------------------------------------------------------------------
# Sample Trades & Live Simulation Endpoints
# -----------------------------------------------------------------------------

@app.get("/sample-trades")
def get_sample_trades():
    """List sample open trades available for live simulation."""
    return list_sample_trades()


@app.get("/live/tick")
def get_live_tick(
    trade_id: str = Query("short_straddle", description="Sample trade identifier"),
    spot_change_pct: Optional[float] = Query(None, description="Optional manual spot price % change"),
    iv_change_pct: Optional[float] = Query(None, description="Optional manual IV % change"),
    elapsed_hours: float = Query(0.5, description="Time decay elapsed in hours"),
):
    """
    Advance simulation ticker by one tick and return real-time mark-to-market P&L,
    Greeks, and P&L attribution breakdown.
    """
    return simulation_engine.generate_live_tick(
        trade_id=trade_id,
        spot_change_pct=spot_change_pct,
        iv_change_pct=iv_change_pct,
        elapsed_hours=elapsed_hours,
    )


@app.post("/live/reset")
def reset_live_simulation(trade_id: str = Query("short_straddle")):
    """Reset live simulation history for a trade."""
    simulation_engine.reset_trade(trade_id)
    return {"status": "reset", "trade_id": trade_id}


@app.get("/live/option-chain")
def get_live_option_chain(underlying: str = Query("NIFTY")):
    """Fetch option chain snapshot (via Zerodha Kite API or simulated stream)."""
    return simulation_engine.fetch_live_option_chain(underlying=underlying)


# -----------------------------------------------------------------------------
# Zerodha (Kite Connect) API Endpoints
# -----------------------------------------------------------------------------

@app.get("/zerodha/status")
def zerodha_status():
    client = ZerodhaClient()
    return {
        "configured": client.is_configured(),
        "authenticated": client.is_authenticated(),
        "has_api_key": bool(client.api_key),
        "has_api_secret": bool(client.api_secret),
        "has_access_token": bool(client.access_token),
    }


@app.get("/zerodha/login-url")
def zerodha_login_url():
    client = ZerodhaClient()
    try:
        url = client.get_login_url()
        return {"login_url": url}
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/zerodha/session")
def zerodha_session(req: ZerodhaSessionRequest):
    client = ZerodhaClient()
    try:
        result = client.generate_session(req.request_token)
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/zerodha/positions")
def zerodha_positions():
    client = ZerodhaClient()
    try:
        positions = client.fetch_positions()
        return positions
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
