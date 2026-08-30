"""
Tests for live simulation engine, sample open trades, and real-time attribution calculation.
"""

from app.sample_trades import list_sample_trades, get_sample_trade
from app.live_simulation import LiveSimulationEngine


def test_sample_trades_availability():
    trades = list_sample_trades()
    assert len(trades) >= 3
    ids = [t["id"] for t in trades]
    assert "short_straddle" in ids
    assert "iron_condor" in ids
    assert "bull_call_spread" in ids


def test_live_tick_generation_and_attribution_identity():
    engine = LiveSimulationEngine()
    tick1 = engine.generate_live_tick(trade_id="short_straddle")

    assert tick1["trade_id"] == "short_straddle"
    assert "spot" in tick1
    assert "iv_pct" in tick1
    assert "mtm_pnl" in tick1

    # Advance second tick
    tick2 = engine.generate_live_tick(trade_id="short_straddle", spot_change_pct=0.2, iv_change_pct=-0.1)
    assert len(tick2["intervals"]) == 2

    # Verify attribution totals match interval sum
    totals = tick2["totals"]
    actual_pnl = totals["pnl_change_actual"]
    explained = (
        totals["theta_contribution"]
        + totals["delta_gamma_contribution"]
        + totals["vega_contribution"]
        + totals["residual"]
    )
    assert abs(actual_pnl - explained) < 1e-4
