"""
FR5 (Hour 9-11): minimum visible output. Feeds a handful of recorded/
simulated snapshots of a position through the attribution engine and prints
a Theta/Delta-Gamma/Vega/Residual breakdown per interval.

No live broker API, no persistence — this reads a JSON file (historical
replay engine only, per Section 2 constraints) and holds everything in
memory. Also importable by main.py so the FastAPI /replay/{name} endpoint
can return the same structured result as JSON.
"""

import json
from pathlib import Path
from typing import List, Tuple

from .attribution import AttributionResult, PositionSnapshot, attribute_pnl
from .position import Leg, Position, net_greeks, net_value

DEFAULT_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "straddle_replay.json"


def load_replay_file(path: Path = DEFAULT_DATA_PATH) -> dict:
    with open(path, "r") as f:
        return json.load(f)


def build_snapshots(replay: dict) -> Tuple[List[PositionSnapshot], List[float]]:
    """
    Turn raw {spot, iv_pct, days_to_expiry} snapshots into PositionSnapshot
    objects carrying net Greeks + mark-to-market value, via Black-Scholes.

    Also returns the parallel list of days_to_expiry values. IMPORTANT: the
    elapsed time fed into attribute_pnl's theta_contribution MUST be derived
    from the change in days_to_expiry (the same clock that drove T in the
    pricing calls above), NOT from a naive diff of the wall-clock
    `timestamp` strings. days_to_expiry advances on a trading-time
    convention (e.g. skips/compresses overnight and weekend hours the way a
    real desk's theta convention would), so it will not equal the raw
    calendar gap between two timestamps — using the wrong one silently
    breaks the identity check by injecting a fake theta contribution.
    """
    position = Position(
        strategy_type=replay["strategy_type"],
        underlying=replay["underlying"],
        legs=[Leg(option_type=l["option_type"], strike=l["strike"], qty=l["qty"]) for l in replay["legs"]],
    )
    r = replay["risk_free_rate"]

    snapshots = []
    dtes = []
    for raw in replay["snapshots"]:
        S = raw["spot"]
        iv_pct = raw["iv_pct"]
        dte = raw["days_to_expiry"]
        T = dte / 365.0
        iv = iv_pct / 100.0

        g = net_greeks(position, S, T, r, iv)
        v = net_value(position, S, T, r, iv)

        snapshots.append(
            PositionSnapshot(
                timestamp=raw["timestamp"],
                spot=S,
                iv_pct=iv_pct,
                greeks=g,
                observed_value=v,
            )
        )
        dtes.append(dte)
    return snapshots, dtes


def run_replay(path: Path = DEFAULT_DATA_PATH) -> dict:
    """
    Runs the full replay -> attribution pipeline. Returns a JSON-serializable
    dict: per-interval breakdown + a total-row identity check, so main.py's
    endpoint and the CLI script return/print the exact same numbers.
    """
    replay = load_replay_file(path)
    snapshots, dtes = build_snapshots(replay)

    intervals = []
    totals = {"theta_contribution": 0.0, "delta_gamma_contribution": 0.0, "vega_contribution": 0.0, "residual": 0.0, "pnl_change_actual": 0.0}

    for i in range(len(snapshots) - 1):
        s0, s1 = snapshots[i], snapshots[i + 1]
        elapsed = dtes[i] - dtes[i + 1]  # see build_snapshots docstring on why not wall-clock
        result: AttributionResult = attribute_pnl(s0, s1, elapsed)

        row = {
            "from_timestamp": s0.timestamp,
            "to_timestamp": s1.timestamp,
            "spot_from": s0.spot,
            "spot_to": s1.spot,
            "iv_pct_from": s0.iv_pct,
            "iv_pct_to": s1.iv_pct,
            **result.as_dict(),
        }
        intervals.append(row)
        for k in totals:
            totals[k] += result.as_dict()[k]

    residual_pct_of_total = abs(totals["residual"] / totals["pnl_change_actual"]) * 100 if totals["pnl_change_actual"] else 0.0

    return {
        "underlying": replay["underlying"],
        "strategy_type": replay["strategy_type"],
        "intervals": intervals,
        "totals": totals,
        "residual_pct_of_total": residual_pct_of_total,
    }


def print_table(result: dict) -> None:
    """Console/printed-table output — acceptable per FR5, no frontend required."""
    print(f"\nReplay: {result['strategy_type']} on {result['underlying']}")
    print("=" * 100)
    header = f"{'From':<20}{'To':<20}{'Actual':>10}{'Theta':>10}{'Δ/Γ':>10}{'Vega':>10}{'Resid':>10}"
    print(header)
    print("-" * 100)
    for row in result["intervals"]:
        from_t = row["from_timestamp"][5:16]
        to_t = row["to_timestamp"][5:16]
        print(
            f"{from_t:<20}{to_t:<20}"
            f"{row['pnl_change_actual']:>10.1f}"
            f"{row['theta_contribution']:>10.1f}"
            f"{row['delta_gamma_contribution']:>10.1f}"
            f"{row['vega_contribution']:>10.1f}"
            f"{row['residual']:>10.1f}"
        )
    print("-" * 100)
    t = result["totals"]
    print(
        f"{'TOTAL':<40}"
        f"{t['pnl_change_actual']:>10.1f}"
        f"{t['theta_contribution']:>10.1f}"
        f"{t['delta_gamma_contribution']:>10.1f}"
        f"{t['vega_contribution']:>10.1f}"
        f"{t['residual']:>10.1f}"
    )
    print("=" * 100)
    total_actual = t["pnl_change_actual"]
    if total_actual:
        theta_pct = t["theta_contribution"] / total_actual * 100
        vega_pct = t["vega_contribution"] / total_actual * 100
        dg_pct = t["delta_gamma_contribution"] / total_actual * 100
        print(
            f"This ₹{abs(total_actual):,.0f} move was ~{theta_pct:.0f}% theta, "
            f"~{vega_pct:.0f}% vega, ~{dg_pct:.0f}% delta/gamma "
            f"(residual {result['residual_pct_of_total']:.1f}% of total)."
        )


if __name__ == "__main__":
    result = run_replay()
    print_table(result)
