# backend/app/mcp_server.py
#
# Install: pip install "mcp[cli]" httpx  (add both to requirements.txt)
#
# This wraps your existing FastAPI endpoints as MCP tools by calling them
# over HTTP (localhost), so it doesn't need to know the internal function
# signatures in pricing.py / attribution.py / replay.py. If you'd rather
# call those functions directly (skipping the HTTP hop), tell me what's
# in main.py and I'll rewire it.

import httpx
from mcp.server.fastmcp import FastMCP

BASE_URL = "http://localhost:8000"  # matches your uvicorn --port 8000

mcp = FastMCP("khoya")


@mcp.tool()
async def get_replay_straddle() -> dict:
    """Get the full replay attribution breakdown for the demo straddle
    position: how the P&L move decomposes into Theta / Delta-Gamma / Vega /
    Residual across the replay snapshots."""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/replay/straddle")
        r.raise_for_status()
        return r.json()


@mcp.tool()
async def price_option(
    spot: float,
    strike: float,
    days_to_expiry: float,
    risk_free_rate: float,
    iv_pct: float,
    option_type: str,
) -> dict:
    """Price a single option and get its Greeks using Black-Scholes.
    option_type is 'call' or 'put'."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/price",
            json={
                "spot": spot,
                "strike": strike,
                "days_to_expiry": days_to_expiry,
                "risk_free_rate": risk_free_rate,
                "iv_pct": iv_pct,
                "option_type": option_type,
            },
        )
        r.raise_for_status()
        return r.json()


@mcp.tool()
async def health_check() -> dict:
    """Check whether the Khoya backend is up."""
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/health")
        r.raise_for_status()
        return r.json()


# Exposed as a mountable ASGI app — see main.py for how this gets attached.
mcp_asgi_app = mcp.streamable_http_app()