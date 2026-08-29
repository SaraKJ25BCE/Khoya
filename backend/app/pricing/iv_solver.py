"""
FR3 — IV solving and a basic smile.

Root-finder is scipy's brentq (this is the one place we take an external
dep — Brent's method by hand is a false-economy reimplementation).

Smile fit is deliberately dumb: numpy.polyfit, degree 1 or 2, across
3-5 strikes. No spline, no OI/liquidity filtering — those are explicitly
deferred past Review 1 per FR3.
"""

import numpy as np
from scipy.optimize import brentq

from app.pricing.black_scholes import bs_price


def solve_iv(
    market_price: float,
    spot: float,
    strike: float,
    t: float,
    r: float,
    option_type: str = "call",
    low: float = 1e-4,
    high: float = 5.0,
) -> float:
    """Back out implied vol from an observed market price via Brent's method."""

    def objective(sigma: float) -> float:
        return bs_price(spot, strike, t, r, sigma, option_type) - market_price

    # Sanity check the bracket actually straddles a root before handing off
    # to brentq — a bad market_price (e.g. below intrinsic) will otherwise
    # throw an opaque scipy error.
    f_low, f_high = objective(low), objective(high)
    if f_low * f_high > 0:
        raise ValueError(
            f"no sign change in [{low}, {high}] — market_price {market_price} "
            f"may be outside no-arbitrage bounds for these inputs"
        )

    return brentq(objective, low, high, xtol=1e-6)


def fit_smile(strikes: list[float], ivs: list[float], degree: int = 2) -> np.poly1d:
    """
    Fit a simple polynomial smile (degree 1 = skew line, degree 2 = parabola)
    across a handful of liquid strikes. Returns a callable poly1d so you can
    do smile(some_strike) -> interpolated IV.
    """
    if len(strikes) < degree + 1:
        raise ValueError(f"need at least {degree + 1} strikes to fit degree {degree}")
    coeffs = np.polyfit(strikes, ivs, degree)
    return np.poly1d(coeffs)
