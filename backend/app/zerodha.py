"""
Zerodha (Kite Connect) Ingestion Adapter for Khoya.

Provides integration with Zerodha's Kite Connect API:
- Authentication & login URL generation
- Session exchange (request_token -> access_token)
- Live position & quote fetching
- Conversion of Zerodha option positions into Khoya PositionSnapshots for real-time P&L attribution
"""

import os
from typing import Dict, List, Optional, Tuple

try:
    from kiteconnect import KiteConnect
    KITE_AVAILABLE = True
except ImportError:
    KiteConnect = None
    KITE_AVAILABLE = False

from .position import Leg, Position, net_greeks, net_value
from .attribution import PositionSnapshot


class ZerodhaClient:
    """
    Wrapper around KiteConnect for fetching live positions and quotes.
    Pulls credentials from environment variables:
      - KITE_API_KEY
      - KITE_API_SECRET
      - KITE_ACCESS_TOKEN
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        access_token: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("KITE_API_KEY", "")
        self.api_secret = api_secret or os.getenv("KITE_API_SECRET", "")
        self.access_token = access_token or os.getenv("KITE_ACCESS_TOKEN", "")

        self._kite: Optional[KiteConnect] = None

        if KITE_AVAILABLE and self.api_key:
            self._kite = KiteConnect(api_key=self.api_key)
            if self.access_token:
                self._kite.set_access_token(self.access_token)

    def is_configured(self) -> bool:
        """Check if client has API Key set."""
        return bool(self.api_key and self.api_key != "your_zerodha_api_key")

    def is_authenticated(self) -> bool:
        """Check if client has active access token set."""
        return bool(
            self.is_configured()
            and self.access_token
            and self.access_token != "your_zerodha_access_token"
        )

    def get_login_url(self) -> str:
        """Generate the login URL for user authentication."""
        if not self.is_configured():
            raise ValueError("KITE_API_KEY is not configured in environment or client.")
        if not self._kite:
            raise RuntimeError("kiteconnect package is not installed.")
        return self._kite.login_url()

    def generate_session(self, request_token: str) -> Dict[str, str]:
        """Exchange a request token for an access token."""
        if not self.is_configured() or not self.api_secret:
            raise ValueError("KITE_API_KEY and KITE_API_SECRET are required to generate session.")
        if not self._kite:
            raise RuntimeError("kiteconnect package is not installed.")

        data = self._kite.generate_session(request_token, api_secret=self.api_secret)
        self.access_token = data.get("access_token", "")
        self._kite.set_access_token(self.access_token)
        return {
            "access_token": self.access_token,
            "public_token": data.get("public_token", ""),
            "user_id": data.get("user_id", ""),
        }

    def fetch_positions(self) -> Dict[str, List[dict]]:
        """Fetch open net and day positions from Zerodha."""
        if not self.is_authenticated() or not self._kite:
            raise RuntimeError("Zerodha client is not authenticated. Please set KITE_ACCESS_TOKEN.")
        return self._kite.positions()

    def fetch_quotes(self, instruments: List[str]) -> Dict[str, dict]:
        """Fetch live quotes for given trading symbols (e.g. ['NSE:NIFTY 50', 'NFO:NIFTY24AUG22000CE'])."""
        if not self.is_authenticated() or not self._kite:
            raise RuntimeError("Zerodha client is not authenticated. Please set KITE_ACCESS_TOKEN.")
        return self._kite.quote(instruments)

    def build_snapshot_from_zerodha(
        self,
        position: Position,
        spot: float,
        iv_pct: float,
        days_to_expiry: float,
        risk_free_rate: float = 0.06,
        timestamp: str = "",
    ) -> PositionSnapshot:
        """
        Build a PositionSnapshot using Black-Scholes Greeks and live Zerodha market parameters.
        """
        T = days_to_expiry / 365.0
        iv = iv_pct / 100.0

        g = net_greeks(position, spot, T, risk_free_rate, iv)
        v = net_value(position, spot, T, risk_free_rate, iv)

        return PositionSnapshot(
            timestamp=timestamp,
            spot=spot,
            iv_pct=iv_pct,
            greeks=g,
            observed_value=v,
        )
