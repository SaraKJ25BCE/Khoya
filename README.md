# Live P&L Attribution Dashboard — Review 1 build

Scope: Hour 0 → Review 1 (Hour 12). See `requirements.md` at repo root
for the full spec this was built against.

## Folder structure

```
pnl-attribution/
├── backend/
│   ├── app/
│   │   ├── main.py                  FR1 — FastAPI scaffold, serves replay over HTTP
│   │   ├── pricing/
│   │   │   ├── black_scholes.py     FR2 — BS pricer (call/put/straddle)
│   │   │   ├── greeks.py            FR2 — delta, gamma, theta, vega
│   │   │   └── iv_solver.py         FR3 — Brent's method IV solve + polyfit smile
│   │   ├── attribution/
│   │   │   └── engine.py            FR4 — the critical artifact: pure decomposition function
│   │   └── replay/
│   │       └── straddle_replay.py   FR5 — synthetic straddle scenario + printed table
│   ├── tests/
│   │   ├── test_black_scholes.py    FR2 acceptance test (reference values vs. Hull textbook)
│   │   └── test_attribution.py      FR4 acceptance test (identity check) — MUST pass for Review 1
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  FR5 — fetches replay, renders bare table
│   │   └── components/BreakdownTable.jsx
│   ├── index.html / vite.config.js / package.json
└── README.md   (this file)
```

## Why the structure is shaped this way

- `pricing/` and `attribution/` are pure, framework-free Python — every
  function in there can be unit tested with nothing running, per the
  "correctness over completeness" NFR. `main.py` is the only file that
  knows about FastAPI at all.
- `replay/` is separated from `attribution/` on purpose: replay is a data
  source, attribution is math. When the real historical replay engine or
  live broker feed shows up post-review, only `replay/` should need to
  change — `engine.py` and its test stay untouched.
- No `db/`, `models/`, or `services/` folder yet — intentional. NFR says
  no Postgres/Redis until after Review 1, so there's nothing to scaffold
  there without inventing unused code.
- Frontend has exactly two components. `App.jsx` owns data fetching,
  `BreakdownTable.jsx` owns rendering — split now so swapping the table
  for a Recharts stacked-area chart post-review is a one-file change.

## Running it

**Backend**
```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=. pytest tests/ -v          # FR2 + FR4 acceptance tests
PYTHONPATH=. python -m app.replay.straddle_replay   # printed table, no server needed
uvicorn app.main:app --reload --port 8000           # serves /api/replay/straddle
```

**Frontend**
```bash
cd frontend
npm install
npm run dev   # expects backend on localhost:8000
```

## Status vs. spec — what's built, what's deferred

**Built and passing:**
- FR1 — both apps scaffolded, no DB dependency.
- FR2 — BS pricer + Greeks, tested against Hull's textbook reference example.
- FR3 — Brent's method IV solver + linear/quadratic smile fit across a
  handful of strikes.
- FR4 — attribution engine as a pure function, identity-check test
  passing (residual stays under ~2% of actual P&L per interval, well
  under 2% aggregated across the session).
- FR5 — replay script and a bare table (both console output and a fetched
  React table) showing the theta/delta-gamma/vega/residual split.

**Explicitly deferred (per spec, not oversight):**
- Live broker API — replay-only this phase.
- Postgres/Redis/WebSocket streaming — no persistence yet, in-memory only.
- Spline-smoothed IV smile with liquidity/OI filtering — current smile is
  a simple polyfit.
- Confidence indicator (3-tier flag).
- Polished frontend — no stacked area chart, no ledger table yet; current
  UI is one fetch call and one `<table>`.

## Known model artifact worth mentioning in the review

The straddle replay uses true Black-Scholes reprices as "actual" P&L,
while the attribution is a first-order (delta) + second-order (gamma)
Taylor approximation around the *before* snapshot. That means residual
isn't exactly zero — it's picking up curvature and cross-terms (e.g.
spot-vol correlation) the linear model doesn't capture. That's expected,
small (single-digit % of the move), and exactly what the residual bucket
is *for* — it's a feature of the identity check, not a bug to explain away.
