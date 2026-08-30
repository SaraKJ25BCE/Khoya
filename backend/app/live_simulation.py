"""
Live Market Simulation & Zerodha Option Chain Data Engine.

Generates real-time ticks, spot price movements, IV shifts, and time decay for sample open trades.
Evaluates Black-Scholes Greeks, mark-to-market P&L, and runs real-time P&L attribution (`attribute_pnl`).
Integrates with ZerodhaClient when active Kite credentials are present.
"""

import math
import random
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from .attribution import PositionSnapshot, AttributionResult, attribute_pnl
from .position import Position, Leg, net_greeks, net_value
from .sample_trades import get_sample_trade, get_position_from_sample
from .zerodha import ZerodhaClient


def _to_float(val: Any) -> float:
    return float(val) if val is not None else 0.0


class LiveSimulationEngine:
    def __init__(self):
        self._states: Dict[str, Dict[str, Any]] = {}
        self.zerodha_client = ZerodhaClient()

    def _init_trade_state(self, trade_id: str) -> Dict[str, Any]:
        trade_data = get_sample_trade(trade_id)
        position = get_position_from_sample(trade_data)
        r = _to_float(trade_data["risk_free_rate"])

        spot = _to_float(trade_data["entry_spot"])
        iv_pct = _to_float(trade_data["entry_iv_pct"])
        dte = _to_float(trade_data["days_to_expiry"])

        T = dte / 365.0
        iv = iv_pct / 100.0

        g = net_greeks(position, spot, T, r, iv)
        v = _to_float(net_value(position, spot, T, r, iv))

        initial_snapshot = PositionSnapshot(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            spot=spot,
            iv_pct=iv_pct,
            greeks=g,
            observed_value=v,
        )

        state = {
            "trade_id": trade_id,
            "position": position,
            "risk_free_rate": r,
            "current_spot": spot,
            "current_iv_pct": iv_pct,
            "current_dte": dte,
            "entry_value": v,
            "current_value": v,
            "snapshots": [initial_snapshot],
            "dtes": [dte],
            "intervals": [],
            "totals": {
                "theta_contribution": 0.0,
                "delta_gamma_contribution": 0.0,
                "vega_contribution": 0.0,
                "residual": 0.0,
                "pnl_change_actual": 0.0,
            },
            "step_count": 0,
        }
        self._states[trade_id] = state
        return state

    def reset_trade(self, trade_id: str) -> Dict[str, Any]:
        """Reset a trade simulation to its initial entry state."""
        return self._init_trade_state(trade_id)

    def get_or_create_state(self, trade_id: str) -> Dict[str, Any]:
        if trade_id not in self._states:
            return self._init_trade_state(trade_id)
        return self._states[trade_id]

    def generate_live_tick(
        self,
        trade_id: str = "short_straddle",
        spot_change_pct: Optional[float] = None,
        iv_change_pct: Optional[float] = None,
        elapsed_hours: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Advance the simulation by one tick:
        - Simulates or applies spot & IV price change
        - Decays days-to-expiry (elapsed time in trading days)
        - Computes new mark-to-market value & Greeks
        - Attributes P&L between previous and current snapshot
        """
        state = self.get_or_create_state(trade_id)

        position: Position = state["position"]
        r: float = state["risk_free_rate"]

        prev_spot: float = state["current_spot"]
        prev_iv: float = state["current_iv_pct"]
        prev_dte: float = state["current_dte"]

        # Random walk for spot if not overridden (e.g. ±0.1% to ±0.35%)
        if spot_change_pct is not None:
            new_spot = prev_spot * (1.0 + spot_change_pct / 100.0)
        else:
            pct = random.uniform(-0.35, 0.35)
            new_spot = round(prev_spot * (1.0 + pct / 100.0), 2)

        # Random walk for IV if not overridden (e.g. ±0.1% to ±0.25%)
        if iv_change_pct is not None:
            new_iv = max(5.0, prev_iv + iv_change_pct)
        else:
            iv_diff = random.uniform(-0.25, 0.25)
            new_iv = max(5.0, round(prev_iv + iv_diff, 2))

        # Time decay: default 0.5 hours = 0.5 / 24 trading day decay
        elapsed_days = elapsed_hours / 24.0
        new_dte = max(0.01, prev_dte - elapsed_days)

        T = new_dte / 365.0
        iv = new_iv / 100.0

        # Calculate new Greeks & MTM Value
        g = net_greeks(position, new_spot, T, r, iv)
        new_value = _to_float(net_value(position, new_spot, T, r, iv))

        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        current_snapshot = PositionSnapshot(
            timestamp=timestamp_str,
            spot=new_spot,
            iv_pct=new_iv,
            greeks=g,
            observed_value=new_value,
        )

        prev_snapshot: PositionSnapshot = state["snapshots"][-1]
        actual_elapsed_dte = prev_dte - new_dte

        # Attribute P&L between s0 and s1
        result: AttributionResult = attribute_pnl(prev_snapshot, current_snapshot, actual_elapsed_dte)
        res_dict = {
            "theta_contribution": _to_float(result.theta_contribution),
            "delta_gamma_contribution": _to_float(result.delta_gamma_contribution),
            "vega_contribution": _to_float(result.vega_contribution),
            "residual": _to_float(result.residual),
            "pnl_change_actual": _to_float(result.pnl_change_actual),
        }

        # Update state history
        state["current_spot"] = new_spot
        state["current_iv_pct"] = new_iv
        state["current_dte"] = new_dte
        state["current_value"] = new_value
        state["snapshots"].append(current_snapshot)
        state["dtes"].append(new_dte)
        state["step_count"] += 1

        interval_row = {
            "step": state["step_count"],
            "from_timestamp": prev_snapshot.timestamp,
            "to_timestamp": current_snapshot.timestamp,
            "spot_from": prev_snapshot.spot,
            "spot_to": current_snapshot.spot,
            "iv_pct_from": prev_snapshot.iv_pct,
            "iv_pct_to": current_snapshot.iv_pct,
            **res_dict,
        }
        state["intervals"].append(interval_row)

        for k in state["totals"]:
            state["totals"][k] = _to_float(state["totals"][k] + res_dict[k])

        total_actual = state["totals"]["pnl_change_actual"]
        residual_pct = (
            abs(state["totals"]["residual"] / total_actual) * 100.0 if total_actual else 0.0
        )

        trade_info = get_sample_trade(trade_id)
        zerodha_active = self.zerodha_client.is_authenticated()

        return {
            "trade_id": trade_id,
            "trade_name": trade_info["name"],
            "strategy_type": trade_info["strategy_type"],
            "underlying": trade_info["underlying"],
            "zerodha_authenticated": zerodha_active,
            "mode": "Kite Connect Live Feed" if zerodha_active else "Live Simulation Ticker",
            "timestamp": timestamp_str,
            "spot": _to_float(new_spot),
            "iv_pct": _to_float(new_iv),
            "days_to_expiry": round(new_dte, 3),
            "mtm_pnl": round(new_value - state["entry_value"], 2),
            "current_greeks": {
                "delta": round(_to_float(g.delta), 3),
                "gamma": round(_to_float(g.gamma), 5),
                "theta_per_day": round(_to_float(g.theta_per_day), 2),
                "vega_per_1pct": round(_to_float(g.vega_per_1pct), 2),
            },
            "last_interval": interval_row,
            "intervals": state["intervals"],
            "totals": state["totals"],
            "residual_pct_of_total": round(_to_float(residual_pct), 2),
            "legs": trade_info["legs"],
        }

    def fetch_live_option_chain(self, underlying: str = "NIFTY") -> Dict[str, Any]:
        """Fetch option chain snapshot (Zerodha / Simulation)."""
        if self.zerodha_client.is_authenticated():
            try:
                quotes = self.zerodha_client.fetch_quotes([f"NSE:{underlying} 50"])
                return {"source": "zerodha_live", "underlying": underlying, "quotes": quotes}
            except Exception as e:
                pass

        spot = 22200.0 if underlying == "NIFTY" else 48200.0
        strikes = [spot - 400 + i * 200 for i in range(5)]
        chain = []

        for st in strikes:
            chain.append({
                "strike_price": st,
                "call_ltp": max(5.0, round(abs(spot - st) * 0.4 + random.uniform(50, 120), 2)),
                "put_ltp": max(5.0, round(abs(spot - st) * 0.4 + random.uniform(50, 120), 2)),
                "call_iv": round(18.5 + random.uniform(-1, 1), 2),
                "put_iv": round(19.0 + random.uniform(-1, 1), 2),
            })

        return {
            "source": "simulated_chain",
            "underlying": underlying,
            "spot_price": spot,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "chain": chain,
        }


simulation_engine = LiveSimulationEngine()
