-- Example demo data: demo user profile and one short straddle trade with attribution
-- snapshots, useful for demoing the UI before you have real trade history.

with demo_user as (
    insert into users (
        google_id, email, email_verified, name, given_name, family_name, picture
    ) values (
        '100000000000000000001', 'demo.trader@khoya.app', true, 'Demo Trader', 'Demo', 'Trader', 'https://lh3.googleusercontent.com/a/default-user'
    )
    on conflict (google_id) do update set updated_at = now()
    returning id
),
new_trade as (
    insert into trades (
        user_id, broker_source, underlying, strategy, entry_time,
        spot_at_entry, iv_at_entry, market_regime
    ) select
        id, 'replay', 'BANKNIFTY', 'short_straddle', now() - interval '2 hours',
        48200, 18.5, 'high_iv'
    from demo_user
    returning id
)
insert into trade_legs (trade_id, option_type, strike_price, expiry, side, quantity, entry_price)
select id, 'CE', 48200, current_date + interval '3 days', 'sell', 15, 210 from new_trade
union all
select id, 'PE', 48200, current_date + interval '3 days', 'sell', 15, 195 from new_trade;

-- Attribution snapshots for the same trade
with t as (select id from trades order by created_at desc limit 1)
insert into pnl_attribution (trade_id, total_pnl, iv_component, theta_component, delta_component, spot_price, underlying_iv)
select id, -4200, -5100, 1400, -400, 48350, 19.8 from t
union all
select id, -2100, -3000, 1800, -900, 48480, 19.2 from t;
