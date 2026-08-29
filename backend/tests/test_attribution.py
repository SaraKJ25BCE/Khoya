"""
FR4 acceptance test — THE critical artifact for Review 1.

Proves: theta + delta/gamma + vega + residual ~= actual P&L change,
within tolerance, and that residual stays small (i.e. the three named
buckets actually explain the move rather than hiding behind residual).

Two cases:
  1. A synthetic hand-built snapshot pair with an exact expected identity
     (residual should be ~0 by construction, since actual_pnl is defined
     as the linear/quadratic approximation itself).
  2. The real straddle replay scenario from FR5, using true BS reprices
     as "actual" P&L — here residual is small but non-zero (curvature/
     cross-term effects the linear model doesn't capture), which is
     expected and exactly what the residual bucket exists to surface.
"""

import pytest

from app.attribution.engine import Snapshot, attribute_pnl, check_identity
from app.replay.straddle_replay import run_replay


def test_identity_holds_on_synthetic_exact_case():
    before = Snapshot(spot=100.0, iv=0.20, delta=0.5, gamma=0.05, theta=-10.0, vega=20.0, timestamp_years=0.0)
    after = Snapshot(spot=101.0, iv=0.19, delta=0.5, gamma=0.05, theta=-10.0, vega=20.0, timestamp_years=1 / 365)

    d_spot = 1.0
    d_iv = -0.01
    elapsed = 1 / 365

    expected_theta = before.theta * elapsed
    expected_delta_gamma = before.delta * d_spot + 0.5 * before.gamma * (d_spot ** 2)
    expected_vega = before.vega * d_iv
    actual_pnl = expected_theta + expected_delta_gamma + expected_vega  # residual = 0 by construction

    attribution = attribute_pnl(before, after, actual_pnl)

    assert attribution.residual == pytest.approx(0.0, abs=1e-9)
    assert check_identity(attribution, tolerance=0.02)


def test_identity_holds_on_straddle_replay_scenario():
    rows = run_replay()
    assert len(rows) > 0

    for row in rows:
        # Components + residual must sum back to actual, always — this is
        # exact by construction of the engine, not an approximation.
        recombined = row["theta_pnl"] + row["delta_gamma_pnl"] + row["vega_pnl"] + row["residual"]
        assert recombined == pytest.approx(row["actual_pnl"], abs=1e-9)

    # The headline claim: residual should be small relative to actual P&L
    # across the session, not just interval-by-interval noise cancelling out.
    total_residual = sum(row["residual"] for row in rows)
    total_actual = sum(row["actual_pnl"] for row in rows)
    assert abs(total_residual / total_actual) <= 0.05


def test_residual_is_never_silently_dropped():
    """Traceability NFR: residual must appear in the output dict, always."""
    before = Snapshot(spot=100.0, iv=0.2, delta=0.4, gamma=0.03, theta=-5.0, vega=15.0, timestamp_years=0.0)
    after = Snapshot(spot=102.0, iv=0.18, delta=0.4, gamma=0.03, theta=-5.0, vega=15.0, timestamp_years=1 / 365)
    # Deliberately mismatched actual_pnl to force a non-trivial residual.
    attribution = attribute_pnl(before, after, actual_pnl=999.0)
    d = attribution.as_dict()
    assert "residual" in d
    assert d["residual"] != 0.0
