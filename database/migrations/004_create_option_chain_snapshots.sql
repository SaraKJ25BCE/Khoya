-- Raw option chain data captured from broker/scrape adapters
-- (dhan_adapter.py, kite_adapter.py, mofsl_adapter.py, nselib_adapter.py).
-- Decoupled from trades — this stores EVERY strike observed, whether or
-- not you hold a position in it, since the attribution engine and future
-- pattern-matching both need market context beyond just your own trades.

create table if not exists option_chain_snapshots (
    id                  uuid primary key default gen_random_uuid(),

    broker_source       text not null check (broker_source in ('dhan', 'mofsl', 'kite', 'nse_scrape', 'replay')),

    underlying          text not null,
    expiry              date not null,
    strike_price        numeric not null,
    option_type         text not null check (option_type in ('CE', 'PE')),

    ltp                 numeric,
    open_interest        bigint,
    change_in_oi        bigint,
    volume              bigint,

    implied_volatility  numeric,
    delta               numeric,
    gamma               numeric,
    theta               numeric,
    vega                numeric,

    captured_at         timestamptz not null default now()
);

create index if not exists idx_chain_snapshots_underlying_expiry
    on option_chain_snapshots (underlying, expiry);
create index if not exists idx_chain_snapshots_captured_at
    on option_chain_snapshots (captured_at);
create index if not exists idx_chain_snapshots_strike
    on option_chain_snapshots (underlying, expiry, strike_price, option_type);
