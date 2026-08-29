"""
FR4 (Hour 6-9): the attribution engine. This is the single most important
file in the Hour 0-12 build — everything else exists to feed it or display
its output.

Design choices, stated explicitly (not left implicit):
  - theta_contribution and vega_contribution use the MIDPOINT (average of
    start-snapshot and end-snapshot) Greeks, multiplied by elapsed days /
    IV change respectively. A start-snapshot-only convention is simpler but
    accumulates more linearization error over larger intervals (Greeks
    themselves move a lot as expiry approaches) — midpoint is the trapezoidal-
    rule equivalent and materially tightens the identity-check tolerance for
    free. This is a deliberate choice, not an oversight; see FR4/FR11.
  - delta_gamma_contribution also uses midpoint delta/gamma, and includes the
    second-order Gamma term:
        delta * dS + 0.5 * gamma * dS**2
    A first-order-only (Delta * dS) attribution would misattribute a chunk
    of a large spot move into the residual bucket.
  - IV change is in PERCENTAGE POINTS (not decimal) — matches the per-1pct
    vega convention from pricing.py.
  - residual is whatever is left over. It is ALWAYS computed and ALWAYS
    surfaced — never silently folded into theta/delta-gamma/vega. A
    persistently large residual is a signal (stale snapshot, wrong smile
    convention, missing leg) not something to hide.

This module has ZERO I/O. It takes numbers, returns numbers. Everything
broker/replay/DB-specific lives in replay.py and (later) the FastAPI layer.
"""

from dataclasses import dataclass

from .pricing import Greeks


@dataclass(frozen=True)
class PositionSnapshot:
    """One point-in-time observation of a position's state."""

    timestamp: str  # ISO string, kept as string here — parsing is a caller concern
    spot: float
    iv_pct: float  # position-level representative IV, in PERCENT (e.g. 15.0)
    greeks: Greeks  # net position Greeks at this timestamp (already qty/sign aggregated)
    observed_value: float  # actual mark-to-market value of the position (₹, or points * lot_size)


@dataclass(frozen=True)
class AttributionResult:
    theta_contribution: float
    delta_gamma_contribution: float
    vega_contribution: float
    residual: float
    pnl_change_actual: float

    def as_dict(self) -> dict:
        return {
            "theta_contribution": self.theta_contribution,
            "delta_gamma_contribution": self.delta_gamma_contribution,
            "vega_contribution": self.vega_contribution,
            "residual": self.residual,
            "pnl_change_actual": self.pnl_change_actual,
        }


def attribute_pnl(
    from_snapshot: PositionSnapshot,
    to_snapshot: PositionSnapshot,
    elapsed_days: float,
) -> AttributionResult:
    """
    Decompose the P&L change between two snapshots of the SAME position into
    Theta / Delta-Gamma / Vega / Residual.

    elapsed_days is supplied by the caller (this module does no datetime
    parsing) — e.g. replay.py computes it from the two snapshot timestamps.

    This is a pure function: same inputs -> same outputs, no side effects.
    """
    if elapsed_days < 0:
        raise ValueError("elapsed_days must be >= 0")

    dS = to_snapshot.spot - from_snapshot.spot
    d_iv_pct = to_snapshot.iv_pct - from_snapshot.iv_pct

    g0, g1 = from_snapshot.greeks, to_snapshot.greeks
    delta_mid = (g0.delta + g1.delta) / 2
    gamma_mid = (g0.gamma + g1.gamma) / 2
    theta_mid = (g0.theta_per_day + g1.theta_per_day) / 2
    vega_mid = (g0.vega_per_1pct + g1.vega_per_1pct) / 2

    theta_contribution = theta_mid * elapsed_days
    delta_gamma_contribution = delta_mid * dS + 0.5 * gamma_mid * dS**2
    vega_contribution = vega_mid * d_iv_pct

    pnl_change_actual = to_snapshot.observed_value - from_snapshot.observed_value
    predicted = theta_contribution + delta_gamma_contribution + vega_contribution
    residual = pnl_change_actual - predicted

    return AttributionResult(
        theta_contribution=theta_contribution,
        delta_gamma_contribution=delta_gamma_contribution,
        vega_contribution=vega_contribution,
        residual=residual,
        pnl_change_actual=pnl_change_actual,
    )
