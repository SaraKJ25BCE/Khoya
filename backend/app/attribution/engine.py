"""
FR4 — Attribution engine.

Pure function, no I/O, no framework dependency. Given a "before" Greeks
snapshot, an "after" market snapshot, and the actual observed P&L change,
decompose the change into:

    theta contribution        = theta_before * elapsed_time_years
    delta/gamma contribution  = delta_before * dS + 0.5 * gamma_before * dS^2
    vega contribution         = vega_before * dIV
    residual                  = actual_pnl - (theta + delta_gamma + vega)

Residual is ALWAYS surfaced, never folded into another bucket — this is
the traceability requirement in the spec (NFR section), and it's also
what the identity-check test asserts stays small.

Being a pure function is deliberate: it has to be demoable independent
of the FastAPI service or any UI, per FR4's acceptance criteria.
"""

from dataclasses import dataclass


@dataclass
class Snapshot:
    spot: float
    iv: float
    delta: float
    gamma: float
    theta: float  # per-year convention, matches greeks.py
    vega: float   # per 1.0 (100 vol pt) move, matches greeks.py
    timestamp_years: float  # time elapsed since t0, in years (e.g. 1/365 for 1 day)


@dataclass
class Attribution:
    theta_pnl: float
    delta_gamma_pnl: float
    vega_pnl: float
    residual: float
    actual_pnl: float
    explained_pnl: float

    def as_dict(self) -> dict:
        return {
            "theta_pnl": self.theta_pnl,
            "delta_gamma_pnl": self.delta_gamma_pnl,
            "vega_pnl": self.vega_pnl,
            "residual": self.residual,
            "actual_pnl": self.actual_pnl,
            "explained_pnl": self.explained_pnl,
        }


def attribute_pnl(before: Snapshot, after: Snapshot, actual_pnl: float) -> Attribution:
    """
    Decompose actual_pnl (the real, observed change in position value)
    into theta / delta+gamma / vega buckets, using `before`'s Greeks as
    the linearization point. Whatever isn't explained falls into residual.
    """
    elapsed = after.timestamp_years - before.timestamp_years
    d_spot = after.spot - before.spot
    d_iv = after.iv - before.iv

    theta_pnl = before.theta * elapsed
    delta_gamma_pnl = before.delta * d_spot + 0.5 * before.gamma * (d_spot ** 2)
    vega_pnl = before.vega * d_iv

    explained = theta_pnl + delta_gamma_pnl + vega_pnl
    residual = actual_pnl - explained

    return Attribution(
        theta_pnl=theta_pnl,
        delta_gamma_pnl=delta_gamma_pnl,
        vega_pnl=vega_pnl,
        residual=residual,
        actual_pnl=actual_pnl,
        explained_pnl=explained,
    )


def check_identity(attribution: Attribution, tolerance: float = 0.02) -> bool:
    """
    The FR4 acceptance test: components (incl. residual) must sum back to
    actual P&L. Since residual is defined as actual - explained, this is
    trivially exact by construction — the real check is that |residual| is
    small RELATIVE to actual_pnl, i.e. the three named buckets explain the
    move rather than residual quietly absorbing everything.
    """
    if attribution.actual_pnl == 0:
        return abs(attribution.residual) < 1e-6
    return abs(attribution.residual / attribution.actual_pnl) <= tolerance
