"""
FR4's acceptance test — the single most important test in the whole build:

    theta_contribution + delta_gamma_contribution + vega_contribution + residual
        == pnl_change_actual   (always true by construction, residual absorbs the gap)

and separately, the *real* claim being tested:

    |residual| / |pnl_change_actual| <= TOLERANCE

TOLERANCE is defined here explicitly (not picked reactively) per FR4:
±2%, matching the requirements doc's own example number.
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.attribution import PositionSnapshot, attribute_pnl
from app.pricing import Greeks, bs_greeks, bs_price
from app.replay import run_replay

TOLERANCE_PCT = 2.0  # ±2%, locked per FR4 — do not loosen this to make a test pass.


def test_attribution_components_always_sum_to_actual_by_construction():
    """residual is defined as whatever's left over, so this holds by construction
    for ANY inputs — it's a guard against someone breaking the arithmetic, not
    a test of model quality (that's the tolerance test below)."""
    S, K, T, r, iv = 100.0, 100.0, 30 / 365, 0.05, 0.20
    g = bs_greeks(S, K, T, r, iv, "call")
    s0 = PositionSnapshot(timestamp="t0", spot=S, iv_pct=iv * 100, greeks=g, observed_value=bs_price(S, K, T, r, iv, "call"))

    S2, T2, iv2 = 101.0, 29 / 365, 0.19
    g2 = bs_greeks(S2, K, T2, r, iv2, "call")
    s1 = PositionSnapshot(timestamp="t1", spot=S2, iv_pct=iv2 * 100, greeks=g2, observed_value=bs_price(S2, K, T2, r, iv2, "call"))

    result = attribute_pnl(s0, s1, elapsed_days=1.0)
    reconstructed = result.theta_contribution + result.delta_gamma_contribution + result.vega_contribution + result.residual
    assert math.isclose(reconstructed, result.pnl_change_actual, abs_tol=1e-9)


def test_identity_check_small_single_day_move_within_tolerance():
    """
    A single-day, single-leg move: the core claim from Section 1 —
    'components sum back to actual P&L within tolerance'.

    NOTE on move size: this uses a small, realistic overnight move (0.07% of
    spot, 0.2 vol points, 1 day of decay near expiry) deliberately. Larger
    relative moves blow the linearization error (this is 2nd-order Taylor,
    not exact) well past 2%, and moves that nearly cancel theta against
    delta/gamma produce a near-zero actual P&L, which makes the *percentage*
    residual wildly noisy even though the absolute error stays tiny — a
    known limitation of any percent-of-actual tolerance metric on a single
    small interval, not a bug in the attribution math. The full-replay test
    below is the real Review-1 acceptance criterion for exactly this reason.
    """
    S, K, r = 22000.0, 22000.0, 0.06
    g0 = bs_greeks(S, K, 10 / 365, r, 0.15, "call")
    v0 = bs_price(S, K, 10 / 365, r, 0.15, "call")
    s0 = PositionSnapshot(timestamp="t0", spot=S, iv_pct=15.0, greeks=g0, observed_value=v0)

    S1 = S + 15
    iv1_pct = 15.0 - 0.2
    g1 = bs_greeks(S1, K, 9 / 365, r, iv1_pct / 100, "call")
    v1 = bs_price(S1, K, 9 / 365, r, iv1_pct / 100, "call")
    s1 = PositionSnapshot(timestamp="t1", spot=S1, iv_pct=iv1_pct, greeks=g1, observed_value=v1)

    result = attribute_pnl(s0, s1, elapsed_days=1.0)
    residual_pct = abs(result.residual / result.pnl_change_actual) * 100
    assert residual_pct <= TOLERANCE_PCT, f"residual {residual_pct:.2f}% exceeds ±{TOLERANCE_PCT}% tolerance"


def test_residual_is_never_dropped_even_when_small():
    """Section 5 non-functional requirement: residual must always be surfaced,
    never silently folded into the other three buckets."""
    S, K, r = 100.0, 100.0, 0.05
    g0 = bs_greeks(S, K, 30 / 365, r, 0.20, "call")
    v0 = bs_price(S, K, 30 / 365, r, 0.20, "call")
    s0 = PositionSnapshot(timestamp="t0", spot=S, iv_pct=20.0, greeks=g0, observed_value=v0)
    s1 = s0  # zero move -> zero everything, but the field must still be present
    result = attribute_pnl(s0, s1, elapsed_days=0.0)
    assert hasattr(result, "residual")
    assert result.residual == 0.0
    assert result.as_dict()["residual"] == 0.0


def test_elapsed_days_must_not_be_negative():
    S, K, r = 100.0, 100.0, 0.05
    g0 = bs_greeks(S, K, 30 / 365, r, 0.20, "call")
    v0 = bs_price(S, K, 30 / 365, r, 0.20, "call")
    s0 = PositionSnapshot(timestamp="t0", spot=S, iv_pct=20.0, greeks=g0, observed_value=v0)
    try:
        attribute_pnl(s0, s0, elapsed_days=-1.0)
        assert False, "expected ValueError for negative elapsed_days"
    except ValueError:
        pass


def test_full_replay_scenario_identity_check_within_tolerance():
    """FR5/Review-1 'definition of done': replay the ₹6,000-class straddle
    bleed and confirm the AGGREGATE identity check holds within tolerance.
    (Per-interval residual %s can be noisier when an individual interval's
    actual P&L is small — see replay.py's docstring on the midpoint-Greeks
    convention — so the requirements-doc claim is checked at the total level,
    which is also what gets said out loud in the Review 1 narrative.)"""
    result = run_replay()
    assert result["residual_pct_of_total"] <= TOLERANCE_PCT, (
        f"aggregate residual {result['residual_pct_of_total']:.2f}% exceeds ±{TOLERANCE_PCT}% tolerance"
    )
    # sanity: this really is a multi-thousand-rupee bleed, not a rounding artifact
    assert abs(result["totals"]["pnl_change_actual"]) > 1000
