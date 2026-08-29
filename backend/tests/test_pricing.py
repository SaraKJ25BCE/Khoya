"""
FR2 acceptance test: engine output vs known reference Greek values.
FR3 acceptance test: IV solver round-trips a price back to the sigma that
produced it.

Reference values: S=100, K=100, T=1yr, r=5%, sigma=20% ATM call is a
standard textbook Black-Scholes example (price ~10.4506, delta ~0.6368).
"""

import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.iv_solver import fit_basic_smile, solve_iv
from app.pricing import bs_greeks, bs_price


def test_bs_price_atm_call_reference_value():
    price = bs_price(S=100, K=100, T=1.0, r=0.05, sigma=0.20, option_type="call")
    assert math.isclose(price, 10.4506, abs_tol=0.001)


def test_bs_price_put_call_parity():
    S, K, T, r, sigma = 105, 100, 0.5, 0.04, 0.25
    call = bs_price(S, K, T, r, sigma, "call")
    put = bs_price(S, K, T, r, sigma, "put")
    # C - P = S - K*e^(-rT)
    lhs = call - put
    rhs = S - K * math.exp(-r * T)
    assert math.isclose(lhs, rhs, abs_tol=1e-6)


def test_bs_greeks_atm_call_reference_values():
    g = bs_greeks(S=100, K=100, T=1.0, r=0.05, sigma=0.20, option_type="call")
    assert math.isclose(g.delta, 0.6368, abs_tol=0.001)
    assert math.isclose(g.gamma, 0.018762, abs_tol=0.0001)
    # theta_per_day and vega_per_1pct use this module's stated conventions
    # (annual theta / 365, vega / 100) — see pricing.py docstring.
    assert g.theta_per_day < 0  # long call bleeds value each day, all else equal
    assert g.vega_per_1pct > 0  # long call gains value if IV rises


def test_put_delta_range():
    g = bs_greeks(S=100, K=100, T=0.5, r=0.05, sigma=0.2, option_type="put")
    assert -1.0 <= g.delta <= 0.0


def test_solve_iv_round_trips_known_sigma():
    true_sigma = 0.22
    price = bs_price(S=22000, K=22000, T=3 / 365, r=0.06, sigma=true_sigma, option_type="call")
    solved = solve_iv(price, S=22000, K=22000, T=3 / 365, r=0.06, option_type="call")
    assert math.isclose(solved, true_sigma, abs_tol=1e-4)


def test_solve_iv_raises_on_unbracketed_price():
    # A price above the max possible (e.g. way beyond intrinsic + max vol) should raise, not silently return garbage.
    with pytest.raises(ValueError):
        solve_iv(observed_price=1_000_000, S=100, K=100, T=1.0, r=0.05, option_type="call", hi=2.0)


def test_fit_basic_smile_returns_callable_curve():
    strikes = [21800, 21900, 22000, 22100, 22200]
    ivs_pct = [16.5, 15.8, 15.0, 15.6, 16.3]  # rough smile shape
    smile = fit_basic_smile(strikes, ivs_pct)
    # ATM point should be close to the actual ATM IV fed in
    assert math.isclose(smile(22000), 15.0, abs_tol=0.5)


def test_fit_basic_smile_requires_at_least_three_strikes():
    with pytest.raises(ValueError):
        fit_basic_smile([21900, 22100], [15.0, 15.5])
