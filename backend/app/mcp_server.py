# backend/app/mcp_server.py
"""
Model Context Protocol (MCP) Server for Khoya Options Engine.

Exposes all Khoya pricing, Greeks calculation, P&L attribution, historical replay,
live market simulation, database status, and Zerodha Kite Connect endpoints as MCP tools
for AI assistants (Grok, Claude, Antigravity, etc.).
"""

import os
from typing import Dict, List, Any, Optional

try:
    import httpx
    from mcp.server.fastmcp import FastMCP
    MCP_AVAILABLE = True
except ImportError:
    httpx = None
    FastMCP = None
    MCP_AVAILABLE = False

from .db import get_db_status
from .iv_solver import solve_iv
from .pricing import bs_greeks, bs_price
from .replay import run_replay
from .sample_trades import list_sample_trades, get_sample_trade
from .live_simulation import simulation_engine
from .zerodha import ZerodhaClient

BASE_URL = os.getenv("MCP_BACKEND_URL", "http://localhost:8000")

if MCP_AVAILABLE and FastMCP is not None:
    mcp = FastMCP("khoya")

    @mcp.tool()
    async def health_check() -> Dict[str, Any]:
        """Check whether the Khoya backend engine is active and healthy."""
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(f"{BASE_URL}/health", timeout=3.0)
                return r.json()
        except Exception:
            return {"status": "ok", "mode": "direct_in_memory"}

    @mcp.tool()
    async def check_db_status() -> Dict[str, Any]:
        """
        Check PostgreSQL / Supabase database connectivity, connection pooling driver,
        and row counts for all schema tables (users, trades, trade_legs, pnl_attribution, option_chain_snapshots).
        """
        return get_db_status()

    @mcp.tool()
    async def price_option(
        spot: float,
        strike: float,
        days_to_expiry: float,
        iv_pct: float,
        option_type: str = "call",
        risk_free_rate: float = 0.06,
    ) -> Dict[str, Any]:
        """
        Price a single option and calculate its Black-Scholes Greeks (Delta, Gamma, Theta, Vega).
        """
        T = days_to_expiry / 365.0
        iv = iv_pct / 100.0
        p = bs_price(spot, strike, T, risk_free_rate, iv, option_type)
        g = bs_greeks(spot, strike, T, risk_free_rate, iv, option_type)
        return {
            "price": round(float(p), 4),
            "greeks": {
                "delta": round(float(g.delta), 4),
                "gamma": round(float(g.gamma), 6),
                "theta_per_day": round(float(g.theta_per_day), 4),
                "vega_per_1pct": round(float(g.vega_per_1pct), 4),
            },
        }

    @mcp.tool()
    async def solve_option_iv(
        observed_price: float,
        spot: float,
        strike: float,
        days_to_expiry: float,
        option_type: str = "call",
        risk_free_rate: float = 0.06,
    ) -> Dict[str, Any]:
        """
        Solve Implied Volatility (IV %) from an observed market option premium using Newton-Raphson.
        """
        T = days_to_expiry / 365.0
        sigma = solve_iv(observed_price, spot, strike, T, risk_free_rate, option_type)
        return {"iv_pct": round(float(sigma * 100.0), 2)}

    @mcp.tool()
    async def get_replay_straddle() -> Dict[str, Any]:
        """
        Get full historical replay P&L attribution breakdown for the demo short straddle strategy.
        Returns per-interval decomposition into Theta Decay, Delta/Gamma move, Vega IV shift, and Residual.
        """
        return run_replay()

    @mcp.tool()
    async def get_sample_trades() -> List[Dict[str, Any]]:
        """
        List available sample open option trade strategies available for live simulation:
        - BANKNIFTY Short Straddle
        - NIFTY Iron Condor
        - BANKNIFTY Bull Call Spread
        """
        return list_sample_trades()

    @mcp.tool()
    async def get_live_simulation_tick(
        trade_id: str = "short_straddle",
        spot_change_pct: Optional[float] = None,
        iv_change_pct: Optional[float] = None,
        elapsed_hours: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Advance live simulation ticker by one step and calculate mark-to-market P&L,
        current Greeks, and real-time factor attribution breakdown.
        """
        return simulation_engine.generate_live_tick(
            trade_id=trade_id,
            spot_change_pct=spot_change_pct,
            iv_change_pct=iv_change_pct,
            elapsed_hours=elapsed_hours,
        )

    @mcp.tool()
    async def reset_live_simulation(trade_id: str = "short_straddle") -> Dict[str, Any]:
        """Reset simulation state and historical timeline for a sample trade."""
        simulation_engine.reset_trade(trade_id)
        return {"status": "reset", "trade_id": trade_id}

    @mcp.tool()
    async def get_live_option_chain(underlying: str = "NIFTY") -> Dict[str, Any]:
        """
        Fetch option chain snapshot including strike prices, call/put premiums, and IV curve.
        Uses Zerodha Kite Connect live quotes if authenticated, or simulated stream if off-market.
        """
        return simulation_engine.fetch_live_option_chain(underlying=underlying)

    @mcp.tool()
    async def get_zerodha_status() -> Dict[str, Any]:
        """Check Zerodha Kite Connect API configuration, authentication status, and active token status."""
        client = ZerodhaClient()
        return {
            "configured": client.is_configured(),
            "authenticated": client.is_authenticated(),
            "has_api_key": bool(client.api_key),
            "has_api_secret": bool(client.api_secret),
            "has_access_token": bool(client.access_token),
        }

    @mcp.tool()
    async def get_zerodha_login_url() -> Dict[str, Any]:
        """Generate Zerodha Kite Connect OAuth 2.0 login URL for user authentication."""
        client = ZerodhaClient()
        try:
            return {"login_url": client.get_login_url()}
        except Exception as e:
            return {"error": str(e)}

    @mcp.tool()
    async def get_zerodha_positions() -> Dict[str, Any]:
        """Fetch live open positions directly from Zerodha Kite Connect API if authenticated."""
        client = ZerodhaClient()
        try:
            return client.fetch_positions()
        except Exception as e:
            return {"error": str(e)}

    mcp_asgi_app = mcp.streamable_http_app()
else:
    mcp = None
    mcp_asgi_app = None