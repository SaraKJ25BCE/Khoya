-- Khoya — Postgres schema (FR8, Hour 12-24 scope)
--
-- STATUS: designed, NOT wired up. Per Section 2, no Postgres/Redis until
-- after Review 1. This file is the concrete artifact behind the pitch line
-- "we designed for the Level 3 moat, we didn't fake it" — every column
-- needed for broker-agnostic longitudinal pattern-matching across a
-- trader's whole history is here, even though only one data source
-- (replay) feeds it during the hackathon window.
--
-- To actually use this: `createdb khoya && psql khoya -f db/schema.sql`,
-- then wire backend/app/main.py's endpoints to write through it (FR7).

CREATE TABLE positions (
    position_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_source      TEXT NOT NULL DEFAULT 'replay',       -- 'replay' | 'zerodha' | 'dhan' | ... (generic now, real values later)
    strategy_type       TEXT NOT NULL,                       -- 'short_straddle', 'bull_call_spread', ...
    underlying          TEXT NOT NULL,                       -- 'NIFTY', 'BANKNIFTY', ...
    entry_timestamp     TIMESTAMPTZ NOT NULL,
    exit_timestamp      TIMESTAMPTZ,                          -- NULL while open
    legs                JSONB NOT NULL,                       -- [{option_type, strike, qty, entry_price}, ...]
    market_regime_at_entry TEXT,                              -- 'low_vol' | 'trending' | ... — stub/placeholder is fine pre-Level-3
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE snapshots (
    snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id     UUID NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,
    "timestamp"     TIMESTAMPTZ NOT NULL,
    spot_price      NUMERIC NOT NULL,
    iv_curve        JSONB,                                    -- fitted smile points at this timestamp: [{strike, iv_pct}, ...]
    greeks          JSONB NOT NULL,                            -- {delta, gamma, theta_per_day, vega_per_1pct} net position Greeks
    observed_pnl    NUMERIC NOT NULL,                          -- actual mark-to-market P&L at this timestamp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_position_ts ON snapshots(position_id, "timestamp");

CREATE TABLE attribution_ledger (
    ledger_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id              UUID NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,
    from_snapshot_id          UUID NOT NULL REFERENCES snapshots(snapshot_id),
    to_snapshot_id            UUID NOT NULL REFERENCES snapshots(snapshot_id),
    theta_contribution         NUMERIC NOT NULL,
    delta_gamma_contribution   NUMERIC NOT NULL,
    vega_contribution          NUMERIC NOT NULL,
    residual                   NUMERIC NOT NULL,               -- always stored, never silently absorbed (Section 5)
    pnl_change_actual          NUMERIC NOT NULL,                -- stored, not just re-derivable, so the identity check is auditable after the fact
    confidence_flag            TEXT,                            -- 'high' | 'medium' | 'low' — nullable until FR9 populates it
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_position ON attribution_ledger(position_id);

-- Why this shape matters (see FR8 in requirements): strategy_type +
-- market_regime_at_entry + holding period (derivable from entry/exit
-- timestamps) + iv_curve + the full attribution history per position is
-- everything a later "how do YOU trade" model needs — regardless of which
-- broker (broker_source) the position came from. That's the Level 3 bet;
-- this schema is what makes it buildable once there's enough trade volume,
-- without a rewrite.
