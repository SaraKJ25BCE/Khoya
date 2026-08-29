"""
Black-Scholes European option pricing.

Inputs are the standard five: spot, strike, time-to-expiry (years),
risk-free rate (annualized, decimal), implied vol (annualized, decimal).

No dividend yield term for now — add q if/when the underlying needs it.
Kept dependency-light: math.erf instead of scipy, so this file has zero
external deps and can be unit tested with nothing but stdlib.
"""

import math


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _d1_d2(spot: float, strike: float, t: float, r: float, sigma: float) -> tuple[float, float]:
    if t <= 0 or sigma <= 0:
        raise ValueError("time to expiry and vol must be > 0")
    d1 = (math.log(spot / strike) + (r + 0.5 * sigma ** 2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)
    return d1, d2


def bs_price(spot: float, strike: float, t: float, r: float, sigma: float, option_type: str = "call") -> float:
    """Theoretical Black-Scholes price for a European call or put."""
    d1, d2 = _d1_d2(spot, strike, t, r, sigma)
    disc = math.exp(-r * t)

    if option_type == "call":
        return spot * _norm_cdf(d1) - strike * disc * _norm_cdf(d2)
    elif option_type == "put":
        return strike * disc * _norm_cdf(-d2) - spot * _norm_cdf(-d1)
    else:
        raise ValueError("option_type must be 'call' or 'put'")


def straddle_price(spot: float, strike: float, t: float, r: float, sigma: float) -> float:
    """Convenience helper: ATM (or any strike) straddle = call + put at same strike."""
    return bs_price(spot, strike, t, r, sigma, "call") + bs_price(spot, strike, t, r, sigma, "put")
