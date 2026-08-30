"""
Sample Open Trades Library for Khoya Live Simulation & Attribution.

Provides realistic multi-leg option strategies:
1. Short Straddle (BANKNIFTY) - Sell 48200 CE, Sell 48200 PE
2. Iron Condor (NIFTY) - Buy 21800 PE, Sell 22000 PE, Sell 22400 CE, Buy 22600 CE
3. Bull Call Spread (BANKNIFTY) - Buy 48000 CE, Sell 48500 CE
"""

from typing import Dict, List, Any
from .position import Leg, Position

SAMPLE_TRADES: Dict[str, Dict[str, Any]] = {
    "short_straddle": {
        "id": "short_straddle",
        "name": "BANKNIFTY Short Straddle",
        "underlying": "BANKNIFTY",
        "strategy_type": "short_straddle",
        "description": "Delta-neutral strategy profiting from time decay and contracting volatility.",
        "entry_spot": 48200.0,
        "entry_iv_pct": 18.5,
        "days_to_expiry": 3.0,
        "risk_free_rate": 0.06,
        "legs": [
            {"option_type": "call", "strike": 48200.0, "qty": -15.0, "entry_price": 210.0},
            {"option_type": "put", "strike": 48200.0, "qty": -15.0, "entry_price": 195.0},
        ],
    },
    "iron_condor": {
        "id": "iron_condor",
        "name": "NIFTY Iron Condor",
        "underlying": "NIFTY",
        "strategy_type": "iron_condor",
        "description": "Defined-risk range-bound strategy selling inner strikes and buying outer wings.",
        "entry_spot": 22200.0,
        "entry_iv_pct": 15.0,
        "days_to_expiry": 4.0,
        "risk_free_rate": 0.06,
        "legs": [
            {"option_type": "put", "strike": 21800.0, "qty": 50.0, "entry_price": 35.0},
            {"option_type": "put", "strike": 22000.0, "qty": -50.0, "entry_price": 75.0},
            {"option_type": "call", "strike": 22400.0, "qty": -50.0, "entry_price": 80.0},
            {"option_type": "call", "strike": 22600.0, "qty": 50.0, "entry_price": 30.0},
        ],
    },
    "bull_call_spread": {
        "id": "bull_call_spread",
        "name": "BANKNIFTY Bull Call Spread",
        "underlying": "BANKNIFTY",
        "strategy_type": "bull_call_spread",
        "description": "Moderately bullish vertical spread buying lower strike call and selling higher strike call.",
        "entry_spot": 48000.0,
        "entry_iv_pct": 19.2,
        "days_to_expiry": 5.0,
        "risk_free_rate": 0.06,
        "legs": [
            {"option_type": "call", "strike": 48000.0, "qty": 30.0, "entry_price": 340.0},
            {"option_type": "call", "strike": 48500.0, "qty": -30.0, "entry_price": 160.0},
        ],
    },
}


def get_sample_trade(trade_id: str) -> Dict[str, Any]:
    """Retrieve sample trade by ID or default to short_straddle."""
    return SAMPLE_TRADES.get(trade_id, SAMPLE_TRADES["short_straddle"])


def get_position_from_sample(trade_dict: Dict[str, Any]) -> Position:
    """Convert sample trade dict into a Position object."""
    return Position(
        strategy_type=trade_dict["strategy_type"],
        underlying=trade_dict["underlying"],
        legs=[
            Leg(option_type=l["option_type"], strike=l["strike"], qty=l["qty"])
            for l in trade_dict["legs"]
        ],
    )


def list_sample_trades() -> List[Dict[str, Any]]:
    """List all available sample trades."""
    return list(SAMPLE_TRADES.values())
