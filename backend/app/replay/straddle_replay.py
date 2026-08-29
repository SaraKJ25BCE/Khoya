"""
FR5 — Minimum visible output.

Historical replay engine is a stretch for later (per constraints — no
live broker API this phase). For now this module just feeds a handful of
hand-built/simulated snapshots of a long straddle through the pricer and
attribution engine, and prints a table.

Run directly: `python -m app.replay.straddle_replay`

The scenario: a long ATM straddle that bleeds ~₹6,000 over a session as
time passes and IV drifts down, without a big spot move — i.e. we should
see theta and vega dominate, and delta/gamma stay small. That's the "point
at numbers and say this was X% theta, Y% vega" moment from FR5.
"""

from app.attribution.engine import Snapshot, attribute_pnl, check_identity
from app.pricing.black_scholes import straddle_price
from app.pricing.greeks import straddle_greeks

# Fixed contract terms for the demo straddle.
STRIKE = 100.0
RISK_FREE = 0.06  # 6% annualized, typical short-term INR rate assumption


def _build_snapshot(spot: float, iv: float, days_elapsed: float, days_to_expiry: float) -> tuple[Snapshot, float]:
    """
    Build a Greeks snapshot at a point in time, plus the actual straddle
    price at that point (used to compute actual P&L between snapshots).
    """
    t_remaining = days_to_expiry / 365.0
    g = straddle_greeks(spot, STRIKE, t_remaining, RISK_FREE, iv)
    price = straddle_price(spot, STRIKE, t_remaining, RISK_FREE, iv)
    snap = Snapshot(
        spot=spot,
        iv=iv,
        delta=g["delta"],
        gamma=g["gamma"],
        theta=g["theta"],
        vega=g["vega"],
        timestamp_years=days_elapsed / 365.0,
    )
    return snap, price


def run_replay() -> list[dict]:
    """
    Five snapshots across a session: spot barely moves, IV grinds lower,
    time passes. Returns a list of per-interval attribution breakdowns
    (as dicts) ready to print or serve over the API.
    """
    # (spot, iv, day_offset, days_to_expiry_at_that_point)
    scenario = [
        (100.0, 0.28, 0.0, 7.0),
        (100.4, 0.26, 0.25, 6.75),
        (99.7, 0.24, 0.5, 6.5),
        (100.2, 0.22, 0.75, 6.25),
        (99.9, 0.19, 1.0, 6.0),
    ]

    snapshots_and_prices = [_build_snapshot(spot, iv, day, dte) for spot, iv, day, dte in scenario]

    rows = []
    for i in range(1, len(snapshots_and_prices)):
        before_snap, before_price = snapshots_and_prices[i - 1]
        after_snap, after_price = snapshots_and_prices[i]
        actual_pnl = after_price - before_price

        attribution = attribute_pnl(before_snap, after_snap, actual_pnl)
        passed = check_identity(attribution, tolerance=0.02)

        rows.append(
            {
                "interval": f"{i-1} -> {i}",
                "spot": f"{before_snap.spot:.2f} -> {after_snap.spot:.2f}",
                "iv": f"{before_snap.iv:.2%} -> {after_snap.iv:.2%}",
                **attribution.as_dict(),
                "identity_ok": passed,
            }
        )
    return rows


def print_table(rows: list[dict]) -> None:
    header = f"{'interval':>10} | {'theta':>10} | {'delta/gamma':>12} | {'vega':>10} | {'residual':>10} | {'actual':>10} | ok"
    print(header)
    print("-" * len(header))
    total_actual = 0.0
    for r in rows:
        total_actual += r["actual_pnl"]
        print(
            f"{r['interval']:>10} | {r['theta_pnl']:>10.2f} | {r['delta_gamma_pnl']:>12.2f} | "
            f"{r['vega_pnl']:>10.2f} | {r['residual']:>10.2f} | {r['actual_pnl']:>10.2f} | {r['identity_ok']}"
        )
    print("-" * len(header))
    print(f"Total actual P&L over session (per unit notional): {total_actual:.2f}")
    print("Scale by lot size / contracts to get to the real rupee bleed (e.g. the ₹6,000 example).")


if __name__ == "__main__":
    print_table(run_replay())
