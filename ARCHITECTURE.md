# Architecture — Khoya

Text form of the diagram FR6 says to have ready to sketch on request.

## Hour 0–12 (what's actually running right now)

```
┌──────────────────────┐
│ data/                 │
│  straddle_replay.json │   (synthetic snapshots — spot, IV, days-to-expiry)
└──────────┬────────────┘
           │ load_replay_file()
           ▼
┌──────────────────────────┐
│ backend/app/replay.py     │
│  build_snapshots()          │──uses──▶ pricing.py (Black-Scholes + Greeks)
│  run_replay()                 │──uses──▶ position.py (multi-leg aggregation)
└──────────┬───────────────┘
           │ PositionSnapshot pairs + elapsed_days
           ▼
┌──────────────────────────┐
│ backend/app/attribution.py │   PURE FUNCTION. No I/O.
│  attribute_pnl()             │   theta_contribution
│                                 │   delta_gamma_contribution
│                                 │   vega_contribution
│                                 │   residual  (always shown)
└──────────┬───────────────┘
           │
           ├──▶ replay.py: print_table()          (console output, FR5)
           └──▶ main.py: GET /replay/straddle      (JSON, consumed by React)
                          ▼
                 frontend/src/App.jsx
                  (stacked area chart + ledger table)
```

Everything above the attribution engine is replaceable (different data
source, different position shape). Everything below it (how the numbers get
displayed) is replaceable too. `attribution.py` is the one piece that has to
stay correct — it's covered by the identity-check tests.

## Hour 12–24 target (designed now, not built — FR7/FR8)

```
   Broker A ("zerodha")  ─┐
   Broker B ("dhan")      ─┤──▶  FastAPI ingestion service  ──▶  Redis pub/sub
   Replay engine (today)  ─┘        (broker_source field)         (live Greeks/IV cache)
                                            │                            │
                                            ▼                            ▼
                                   attribution.py (unchanged)   WebSocket gateway
                                            │                            │
                                            ▼                            ▼
                                  Postgres (db/schema.sql)      Frontend (live updates)
                                   positions / snapshots /
                                   attribution_ledger
```

The `broker_source` field on `positions` (see `db/schema.sql`) is what makes
this broker-agnostic: the attribution engine and schema don't change when a
second broker integration gets added, only the ingestion adapter does.

## Level 1 / 2 / 3 framing (Section 0 — say this explicitly in the review)

```
Level 1 — Commodity     Black-Scholes pricer, Greeks, IV solve.
                          Anyone can copy this. (backend/app/pricing.py, iv_solver.py)

Level 2 — Product        Real-time realized P&L attribution, reconciled
                          against actual P&L. Harder to build correctly.
                          >>> THIS IS WHAT'S BUILT AND TESTED <<<
                          (backend/app/attribution.py + the identity-check tests)

Level 3 — Moat           Broker-agnostic, longitudinal trading intelligence
                          across hundreds of positions. NOT buildable in this
                          window (no trader has 100+ trades of history to
                          show) and NOT faked with insufficient data.
                          >>> THE SCHEMA THAT MAKES IT POSSIBLE IS BUILT <<<
                          (db/schema.sql — strategy_type, market_regime_at_entry,
                          holding period, iv_curve, full attribution history,
                          all broker-agnostic via broker_source)
```
