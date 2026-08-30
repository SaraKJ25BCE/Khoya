# Khoya — Database

Postgres schema for Khoya, designed for Supabase (plain Postgres underneath —
works unmodified on any Postgres instance too).

## Structure

```
database/
├── migrations/
│   ├── 000_create_users.sql               -- authenticated users from Google OAuth
│   ├── 001_create_trades.sql              -- one row per trade/strategy (references users.id)
│   ├── 002_create_trade_legs.sql          -- individual option legs of a trade
│   ├── 003_create_pnl_attribution.sql     -- P&L broken into IV/theta/delta/etc
│   └── 004_create_option_chain_snapshots.sql  -- periodic chain snapshots
└── seed/
    └── seed_demo_data.sql                 -- demo user & example trade for testing
```

## Design notes

- **User profile storage**: `users` table stores user profiles authenticated via
  Google OAuth (`google_id`, `email`, `email_verified`, `name`, `picture`, etc.).
- **Broker-agnostic by default**: every table that touches broker data has a
  `broker_source` column (`'dhan'`, `'mofsl'`, `'kite'`, `'nse_scrape'`, `'replay'`).
  This is what lets the "cross-broker intelligence" pitch be backed by a real
  schema decision, not just a roadmap claim.
- **Context-rich, not just numbers**: `trades` stores `user_id`, `market_regime`,
  `iv_at_entry`, `strategy`, and `holding_period` — the fields your pitch's
  Level 3 pattern-matching ("14 similar trades, 9 profitable") depends on,
  even before you have enough trade volume to actually run that feature.
- **Attribution is its own table, not columns on `trades`**: a trade's P&L
  attribution changes continuously while a position is open, so
  `pnl_attribution` stores one row per snapshot in time, not one row per trade.
  This is what your live "why did my P&L move" feature reads from.
- **Option chain snapshots are decoupled from trades**: `option_chain_snapshots`
  stores raw market data (any strike, whether or not you have a position in it)
  — this is what you write to from the Dhan/Kite/MOFSL/nselib adapters, and it's
  what your attribution engine reads spot/IV/Greeks from at any point in time.

## How to apply

**Supabase**: paste each file from `migrations/` into the SQL Editor, in order
(000 → 004), and run each once. Or use the Supabase CLI:

```bash
supabase db push
```
*(if you've set migrations/ as your supabase/migrations folder)*

**Plain Postgres**:

```bash
psql -h <host> -U <user> -d <db> -f migrations/000_create_users.sql
psql -h <host> -U <user> -d <db> -f migrations/001_create_trades.sql
psql -h <host> -U <user> -d <db> -f migrations/002_create_trade_legs.sql
psql -h <host> -U <user> -d <db> -f migrations/003_create_pnl_attribution.sql
psql -h <host> -U <user> -d <db> -f migrations/004_create_option_chain_snapshots.sql
```

Then optionally seed demo data:

```bash
psql -h <host> -U <user> -d <db> -f seed/seed_demo_data.sql
```
