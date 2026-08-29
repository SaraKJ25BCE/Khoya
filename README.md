# Khoya — Live Options P&L Attribution (Hour 0–12 prototype)

Decomposes the change in an options position's P&L into **Theta / Delta-Gamma /
Vega / Residual**, and proves the decomposition is real by checking that the
components sum back to the actual observed P&L within a ±2% tolerance.

This build covers the **Hour 0–12 scope** from the requirements doc (FR1–FR6):
pricer, Greeks, IV solver, attribution engine, a replay-driven demo, and the
tests that back the core claim. Hour 12–24 items (FR7–FR11: Postgres, Redis,
WebSockets, spline smile, confidence flag) are scaffolded or stubbed where
explicitly called for (see "What's built vs. planned" below) but not wired up
— that's next, not now.

## Quickstart

### 1. Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt

# Run the tests first — this is the artifact that matters most:
pytest tests/ -v

# Run the replay as a standalone script (prints the breakdown table):
python -m app.replay

# Or run the API server:
uvicorn app.main:app --reload --port 8000
```

You should see 13 tests pass, including
`test_full_replay_scenario_identity_check_within_tolerance` — the FR4
critical artifact. `python -m app.replay` prints a table ending in something
like:

```
This ₹6,278 move was ~83% theta, ~18% vega, ~-3% delta/gamma (residual 1.6% of total).
```

That's the "walk through a straddle bleeding ₹6,000" demo from Section 1,
running end to end.

### 2. Frontend (optional — the backend + tests are the real deliverable)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 with the backend running on :8000 — you'll get a
stacked-area chart and a ledger table sourced from `/api/replay/straddle`.
**Note:** the frontend was written but not `npm install`-ed or run in the
sandbox this was built in (no network access there) — if `npm install`
surfaces a version conflict, pin to the versions in `package.json` or run
`npm install --legacy-peer-deps`.

### 3. Try the API directly

```bash
curl http://localhost:8000/health
curl http://localhost:8000/replay/straddle | python3 -m json.tool

curl -X POST http://localhost:8000/price -H "Content-Type: application/json" -d '{
  "spot": 22000, "strike": 22000, "days_to_expiry": 3,
  "risk_free_rate": 0.06, "iv_pct": 15.0, "option_type": "call"
}'
```

## Repo layout

```
backend/
  app/
    pricing.py      FR2 — Black-Scholes pricer + Greeks
    iv_solver.py     FR3 — Brent's method IV solve + basic smile fit
    position.py       multi-leg position -> net Greeks/value
    attribution.py     FR4 — the core decomposition (pure function, no I/O)
    replay.py           FR5 — replay engine, feeds snapshots through attribution
    main.py               FR1 — FastAPI scaffold (/health, /price, /iv, /replay/straddle)
  tests/
    test_pricing.py     reference-value tests for pricer/Greeks/IV solver
    test_attribution.py  THE critical test: identity check within ±2%
  requirements.txt
data/
  straddle_replay.json  synthetic snapshots, tuned to reproduce the spec's
                          ₹6,000 bleed example
db/
  schema.sql             FR8 — designed for Level 3, NOT wired to a live DB
frontend/
  src/App.jsx             FR5/FR10 — table + stacked area chart (Recharts)
```

## What's built vs. planned (say this out loud in the review — Section 0/FR6)

**Built (Level 2 — the product):**
- Real Black-Scholes pricer + Greeks, tested against known reference values
- IV solver (Brent's method) + a basic 3–5 strike smile fit
- The attribution engine: Theta / Delta-Gamma (with the second-order Gamma
  term) / Vega / Residual, with residual *always* shown, never hidden
- A passing identity-check test: **1.6% residual** on a realistic 3-day
  straddle-bleed replay — inside the ±2% tolerance locked in FR4
- A replay pipeline (JSON in memory, no DB) and a FastAPI layer exposing it

**Explicitly not built (deferred per Section 2/6):**
- Live broker API (replay-only, by design — not blocked, deferred)
- Postgres/Redis/WebSocket gateway (FR7) — schema is designed (`db/schema.sql`)
  but not wired up
- Confidence indicator (FR9) — the `confidence_flag` column exists in the
  schema and is nullable; nothing populates it yet
- Spline smile + liquidity filtering + sticky-strike/sticky-delta convention
  (FR11) — current smile is a basic quadratic fit, no filtering
- **Level 3** (cross-broker longitudinal pattern-matching, "how do YOU
  trade") — not demoed with fabricated data, per the explicit instruction in
  Section 0/6. What *is* built: the schema (`db/schema.sql`) that makes it
  possible once there's real trade volume — `strategy_type`,
  `market_regime_at_entry`, holding period (derivable from entry/exit
  timestamps), `iv_curve`, and full attribution history are all captured
  from day one.

## A design choice worth knowing about: midpoint Greeks

The attribution engine averages the Greeks from the *start* and *end*
snapshot of each interval (rather than using only the start snapshot) before
multiplying by elapsed time / spot move / IV move. This is the discrete
equivalent of a trapezoidal-rule integral and meaningfully tightens the
identity-check tolerance — using start-only Greeks on the demo replay data
gives ~5.9% aggregate residual; midpoint gives ~1.6%. It's documented in
`attribution.py`'s docstring so nobody has to reverse-engineer why the
numbers look the way they do.

One caveat worth knowing before you extend this: **percentage residual on a
single small interval is noisy** when that interval's actual P&L is near
zero (small denominator). The FR4 tolerance claim is checked at the
*aggregate* level across the full replay in
`test_full_replay_scenario_identity_check_within_tolerance` — that's the
real acceptance criterion, not any single row in the table.

## What I'd extend first

In rough priority order if you're picking this back up:

1. **Wire FR7 (FastAPI → Redis → WebSocket)**. Right now `/replay/straddle`
   is a single request/response. The natural next step is a
   WebSocket endpoint that pushes one attribution row at a time as the
   replay "plays" — this is what makes the frontend feel live and is most of
   what's needed for FR10's "updates via WebSocket" requirement. Be upfront
   in any demo that it's simulated playback, not a live feed (per FR10).

2. **Wire the Postgres schema (FR8) into `replay.py`**, writing each
   snapshot and attribution row through instead of holding everything in a
   Python list. This is low-risk (the schema is already designed) and
   unlocks actually persisting more than one replay scenario, which you'll
   want the moment you have more than one demo data file.

3. **Confidence indicator (FR9)**. Straightforward once persistence exists:
   derive high/medium/low from `residual / pnl_change_actual`,
   `iv_curve` bid-ask spread width, and time-since-last-snapshot, and
   populate `attribution_ledger.confidence_flag`. This is a good
   half-day task that meaningfully upgrades the pitch ("we don't just show a
   number, we tell you how much to trust it").

4. **Per-leg IV instead of one flat position-level IV.** Right now
   `position.py` prices every leg off a single scalar IV per snapshot. Real
   straddles have a different IV on the call leg vs. the put leg (skew). Once
   FR11's smile is feeding this instead of a flat number, the Vega
   attribution gets meaningfully more accurate, and the sticky-strike vs.
   sticky-delta choice (documented as deferred in `iv_solver.py`) stops being
   avoidable.

5. **A second replay scenario in `data/`** (e.g. a short-vega position
   getting hurt by an IV spike, not just a long straddle bleeding theta).
   One scenario is enough to prove the identity check works; two make the
   review narrative ("here's a completely different P&L driver, same engine,
   same tolerance") much more convincing than one.
