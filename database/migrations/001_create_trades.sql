-- One row per trade/strategy (e.g. one short straddle = one row here,
-- even though it has two legs — legs live in trade_legs.sql).

create table if not exists trades (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid references users(id) on delete cascade,

    -- broker-agnostic by design: which broker this trade actually came from
    broker_source     text not null check (broker_source in ('dhan', 'mofsl', 'kite', 'replay')),
    external_trade_id text,             -- broker's own trade/order id, if available

    underlying        text not null,    -- e.g. 'BANKNIFTY', 'NIFTY'
    strategy          text not null,    -- e.g. 'short_straddle', 'iron_condor', 'covered_call'

    entry_time        timestamptz not null,
    exit_time         timestamptz,      -- null while position is still open
    holding_period    interval generated always as (exit_time - entry_time) stored,

    -- context fields the Level 3 pattern-matching feature depends on
    spot_at_entry     numeric,
    iv_at_entry       numeric,
    market_regime     text,             -- e.g. 'low_iv', 'high_iv', 'trending', 'range_bound'

    realized_pnl      numeric,          -- final P&L once closed; null while open
    notes             text,

    created_at        timestamptz not null default now()
);

create index if not exists idx_trades_user_id on trades (user_id);
create index if not exists idx_trades_underlying on trades (underlying);
create index if not exists idx_trades_strategy on trades (strategy);
create index if not exists idx_trades_entry_time on trades (entry_time);
