"""
FR2 acceptance test — reference-value check.

Uses the classic Hull ("Options, Futures & Other Derivatives") example:
S=42, K=40, r=10%, sigma=20%, T=0.5 years, European call.
Published reference values: price ~4.76, delta ~0.7791, gamma ~0.0497,
vega ~8.77 (per 1.0 vol move), theta ~-4.55 (per year).

This must pass before moving on to FR3, per the spec.
"""

import pytest

from app.pricing.black_scholes import bs_price
from app.pricing.greeks import delta, gamma, theta, vega

S, K, T, R, SIGMA = 42.0, 40.0, 0.5, 0.10, 0.20


def test_call_price_matches_reference():
    price = bs_price(S, K, T, R, SIGMA, "call")
    assert price == pytest.approx(4.76, abs=0.01)


def test_delta_matches_reference():
    d = delta(S, K, T, R, SIGMA, "call")
    assert d == pytest.approx(0.7791, abs=0.001)


def test_gamma_matches_reference():
    g = gamma(S, K, T, R, SIGMA)
    assert g == pytest.approx(0.0497, abs=0.001)


def test_vega_matches_reference():
    v = vega(S, K, T, R, SIGMA)
    # Hull's table rounds to 8.77; exact computation is ~8.81. Tolerance
    # widened accordingly rather than chasing a rounded textbook figure.
    assert v == pytest.approx(8.81, abs=0.05)


def test_theta_matches_reference():
    th = theta(S, K, T, R, SIGMA, "call")
    # Hull quotes theta per-day (~-0.0125); here it's per-year, so ~-4.5.
    assert th == pytest.approx(-4.55, abs=0.05)


def test_put_call_parity_holds():
    # Sanity check independent of any published table: C - P = S - K*e^(-rT)
    import math

    call = bs_price(S, K, T, R, SIGMA, "call")
    put = bs_price(S, K, T, R, SIGMA, "put")
    assert (call - put) == pytest.approx(S - K * math.exp(-R * T), abs=1e-6)
