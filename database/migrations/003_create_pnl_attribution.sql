-- P&L attribution snapshots. One row per point in time while a trade is
-- open — this is what powers the live "why did my P&L move" feature and
-- the historical "how do I usually lose money" queries.

create table if not exists pnl_attribution (
    id                uuid primary key default gen_random_uuid(),
    trade_id          uuid not null references trades(id) on delete cascade,

    snapshot_time     timestamptz not null default now(),

    total_pnl         numeric not null,

    -- decomposition: how much of total_pnl came from each Greek/factor
    -- since the previous snapshot (or since entry, for the first row)
    iv_component      numeric default 0,
    theta_component   numeric default 0,
    delta_component   numeric default 0,   -- spot movement effect
    gamma_component   numeric default 0,
    vega_component    numeric default 0,

    spot_price        numeric,
    underlying_iv     numeric,

    created_at        timestamptz not null default now()
);

create index if not exists idx_pnl_attribution_trade_id on pnl_attribution (trade_id);
create index if not exists idx_pnl_attribution_snapshot_time on pnl_attribution (snapshot_time);
