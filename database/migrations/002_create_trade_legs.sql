-- Individual option legs belonging to a trade.
-- A short straddle = 2 rows here (one CE sell, one PE sell) under one trades.id.

create table if not exists trade_legs (
    id              uuid primary key default gen_random_uuid(),
    trade_id        uuid not null references trades(id) on delete cascade,

    option_type     text not null check (option_type in ('CE', 'PE')),
    strike_price    numeric not null,
    expiry          date not null,

    side            text not null check (side in ('buy', 'sell')),
    quantity        integer not null,

    entry_price     numeric not null,   -- premium at entry
    exit_price      numeric,            -- premium at exit; null while open

    created_at      timestamptz not null default now()
);

create index if not exists idx_trade_legs_trade_id on trade_legs (trade_id);
create index if not exists idx_trade_legs_expiry on trade_legs (expiry);
