"""
IV solving (FR3, Hour 4-6) via Brent's method, plus a basic 3-5 strike smile fit.

Deferred to post-review per requirements: spline smoothing, liquidity/OI
filtering, sticky-strike vs sticky-delta convention (see FR11). This module
intentionally stays simple.
"""

from typing import Iterable

import numpy as np
from scipy.optimize import brentq

from .pricing import bs_price


def solve_iv(
    observed_price: float,
    S: float,
    K: float,
    T: float,
    r: float,
    option_type: str,
    lo: float = 1e-4,
    hi: float = 5.0,
) -> float:
    """
    Back out implied vol from an observed option price using Brent's method.
    Raises ValueError if no root is bracketed in [lo, hi] (e.g. price violates
    no-arbitrage bounds).
    """

    def f(sigma: float) -> float:
        return bs_price(S, K, T, r, sigma, option_type) - observed_price

    f_lo, f_hi = f(lo), f(hi)
    if f_lo * f_hi > 0:
        raise ValueError(
            f"No IV bracketed in [{lo}, {hi}] for observed_price={observed_price} "
            f"(f(lo)={f_lo:.4f}, f(hi)={f_hi:.4f}). Price may violate no-arbitrage bounds."
        )
    return brentq(f, lo, hi)


def fit_basic_smile(strikes: Iterable[float], ivs_pct: Iterable[float], degree: int = 2) -> np.poly1d:
    """
    Fit a quadratic (default) or linear curve across 3-5 liquid strikes.
    ivs_pct are IV values in PERCENT (e.g. 15.0), matching the display/
    attribution convention. Returns a numpy poly1d callable as smile(strike).

    Post-review upgrade path (FR11): replace with proper spline fitting +
    OI/spread-based liquidity filtering.
    """
    strikes = np.asarray(list(strikes), dtype=float)
    ivs_pct = np.asarray(list(ivs_pct), dtype=float)
    if len(strikes) < 3:
        raise ValueError("Need at least 3 strikes for a smile fit")
    if len(strikes) < degree + 1:
        degree = len(strikes) - 1
    coeffs = np.polyfit(strikes, ivs_pct, degree)
    return np.poly1d(coeffs)
