"""
Greeks derived from the same Black-Scholes inputs as black_scholes.py.

Conventions used (matter for the attribution engine downstream, so pin
them here rather than let each caller assume):
  - theta is returned PER YEAR (negative for long options). The attribution
    engine multiplies by elapsed_time_in_years, so keep units consistent.
  - vega is the price sensitivity to a 1.0 (i.e. 100 vol-point) change in
    sigma. Multiply by d(sigma) directly — do not divide by 100 unless you
    also do it on the sigma-move side.
  - gamma is d(delta)/d(spot), i.e. price sensitivity is 0.5*gamma*dS^2.
"""

import math

from app.pricing.black_scholes import _d1_d2, _norm_cdf, _norm_pdf


def delta(spot: float, strike: float, t: float, r: float, sigma: float, option_type: str = "call") -> float:
    d1, _ = _d1_d2(spot, strike, t, r, sigma)
    if option_type == "call":
        return _norm_cdf(d1)
    elif option_type == "put":
        return _norm_cdf(d1) - 1.0
    raise ValueError("option_type must be 'call' or 'put'")


def gamma(spot: float, strike: float, t: float, r: float, sigma: float) -> float:
    # Same for calls and puts.
    d1, _ = _d1_d2(spot, strike, t, r, sigma)
    return _norm_pdf(d1) / (spot * sigma * math.sqrt(t))


def vega(spot: float, strike: float, t: float, r: float, sigma: float) -> float:
    # Same for calls and puts. Per 1.0 (100 vol point) move in sigma.
    d1, _ = _d1_d2(spot, strike, t, r, sigma)
    return spot * _norm_pdf(d1) * math.sqrt(t)


def theta(spot: float, strike: float, t: float, r: float, sigma: float, option_type: str = "call") -> float:
    # Per year. Divide by 365 at the call site if you want per-day theta.
    d1, d2 = _d1_d2(spot, strike, t, r, sigma)
    disc = math.exp(-r * t)
    term1 = -(spot * _norm_pdf(d1) * sigma) / (2 * math.sqrt(t))

    if option_type == "call":
        term2 = -r * strike * disc * _norm_cdf(d2)
    elif option_type == "put":
        term2 = r * strike * disc * _norm_cdf(-d2)
    else:
        raise ValueError("option_type must be 'call' or 'put'")

    return term1 + term2


def straddle_greeks(spot: float, strike: float, t: float, r: float, sigma: float) -> dict:
    """Greeks for a long straddle (call + put at same strike) — what FR5 replays against."""
    return {
        "delta": delta(spot, strike, t, r, sigma, "call") + delta(spot, strike, t, r, sigma, "put"),
        "gamma": gamma(spot, strike, t, r, sigma) * 2,
        "theta": theta(spot, strike, t, r, sigma, "call") + theta(spot, strike, t, r, sigma, "put"),
        "vega": vega(spot, strike, t, r, sigma) * 2,
    }
