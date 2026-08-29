"""
Black-Scholes pricing and Greeks.

Conventions (locked so downstream code never has to guess):
  - theta is returned PER DAY (raw annualized theta / 365), because the
    attribution engine multiplies theta by elapsed calendar days.
  - vega is returned PER 1 PERCENTAGE POINT of IV (raw vega / 100), because
    IV is elsewhere expressed in percent (e.g. 15.0 for 15%) and the
    attribution engine multiplies vega by the IV change in percentage points.
  - delta and gamma are the standard raw Black-Scholes values.
  - all rates (r) and IV (sigma) passed into bs_price/bs_greeks are in
    DECIMAL form (0.06 for 6%, 0.15 for 15% vol), not percent. Percent-form
    IV is a display/attribution-layer convention only — convert at the edge.

FR2 (Hour 1-4): pricer + Greeks, tested against reference values in
backend/tests/test_pricing.py.
"""

import math
from dataclasses import dataclass

from scipy.stats import norm

OptionType = str  # "call" | "put"


@dataclass(frozen=True)
class Greeks:
    delta: float
    gamma: float
    theta_per_day: float
    vega_per_1pct: float


def _d1_d2(S: float, K: float, T: float, r: float, sigma: float):
    if T <= 0:
        raise ValueError("T (time to expiry, in years) must be > 0")
    if sigma <= 0:
        raise ValueError("sigma (IV, decimal) must be > 0")
    if S <= 0 or K <= 0:
        raise ValueError("S and K must be > 0")
    d1 = (math.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return d1, d2


def bs_price(S: float, K: float, T: float, r: float, sigma: float, option_type: OptionType) -> float:
    """European option price. T in years, r and sigma in decimal."""
    if T <= 0:
        # at/after expiry: intrinsic value only
        return max(0.0, S - K) if option_type == "call" else max(0.0, K - S)

    d1, d2 = _d1_d2(S, K, T, r, sigma)
    if option_type == "call":
        return S * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    elif option_type == "put":
        return K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    else:
        raise ValueError(f"option_type must be 'call' or 'put', got {option_type!r}")


def bs_greeks(S: float, K: float, T: float, r: float, sigma: float, option_type: OptionType) -> Greeks:
    """Delta/Gamma/Theta/Vega for a single option. See module docstring for units."""
    d1, d2 = _d1_d2(S, K, T, r, sigma)
    pdf_d1 = norm.pdf(d1)

    gamma = pdf_d1 / (S * sigma * math.sqrt(T))
    vega_raw = S * pdf_d1 * math.sqrt(T)  # per 1.0 (100 vol points) change in sigma

    if option_type == "call":
        delta = norm.cdf(d1)
        theta_raw = -(S * pdf_d1 * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * norm.cdf(d2)
    elif option_type == "put":
        delta = norm.cdf(d1) - 1
        theta_raw = -(S * pdf_d1 * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * norm.cdf(-d2)
    else:
        raise ValueError(f"option_type must be 'call' or 'put', got {option_type!r}")

    return Greeks(
        delta=delta,
        gamma=gamma,
        theta_per_day=theta_raw / 365.0,
        vega_per_1pct=vega_raw / 100.0,
    )
