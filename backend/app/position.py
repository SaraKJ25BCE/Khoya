"""
A thin layer that turns "a multi-leg options position at a market state"
into the net Greeks + mark-to-market value the attribution engine needs.

Not called out as its own FR in the requirements doc, but FR4/FR5 both
assume something builds PositionSnapshot from raw legs + market data — this
is that something. Kept separate from pricing.py (single-option math) and
attribution.py (pure decomposition function) on purpose.
"""

from dataclasses import dataclass
from typing import List

from .pricing import Greeks, bs_greeks, bs_price


@dataclass(frozen=True)
class Leg:
    option_type: str  # "call" | "put"
    strike: float
    qty: float  # positive = long, negative = short (includes lot size if desired)


@dataclass(frozen=True)
class Position:
    strategy_type: str  # e.g. "long_straddle", "short_straddle", "bull_call_spread"
    underlying: str
    legs: List[Leg]


def net_greeks(position: Position, S: float, T: float, r: float, iv: float) -> Greeks:
    """
    Net position Greeks at a single flat IV (one IV per snapshot — matches
    the Hour 0-12 scope; per-leg IV via the smile fit is a natural next step
    once FR3's smile feeds this instead of a single scalar).
    """
    delta = gamma = theta_per_day = vega_per_1pct = 0.0
    for leg in position.legs:
        g = bs_greeks(S, leg.strike, T, r, iv, leg.option_type)
        delta += leg.qty * g.delta
        gamma += leg.qty * g.gamma
        theta_per_day += leg.qty * g.theta_per_day
        vega_per_1pct += leg.qty * g.vega_per_1pct
    return Greeks(delta=delta, gamma=gamma, theta_per_day=theta_per_day, vega_per_1pct=vega_per_1pct)


def net_value(position: Position, S: float, T: float, r: float, iv: float) -> float:
    """Net mark-to-market value of the position (sum of qty * leg price)."""
    return sum(leg.qty * bs_price(S, leg.strike, T, r, iv, leg.option_type) for leg in position.legs)
