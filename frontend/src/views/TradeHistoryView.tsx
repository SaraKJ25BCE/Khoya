import React, { useState } from 'react';

interface HistoryTrade {
  id: string;
  strategy: string;
  date: string;
  name: string;
  driverTag: string;
  duration: string;
  ivChange: string;
  outcome: 'profit' | 'loss';
  amount: number;
}

const MOCK_HISTORY_TRADES: HistoryTrade[] = [
  { id: '1', strategy: 'SHORT STRADDLE', date: '28 Aug', name: 'BANKNIFTY SHORT STRADDLE', driverTag: 'IV Expansion', duration: '5h 42m', ivChange: '+3.2%', outcome: 'loss', amount: 4280 },
  { id: '2', strategy: 'BULL CALL SPREAD', date: '25 Aug', name: 'BANKNIFTY BULL CALL SPREAD', driverTag: 'Spot Movement', duration: '2d 4h', ivChange: '-0.6%', outcome: 'profit', amount: 2100 },
  { id: '3', strategy: 'SHORT STRADDLE', date: '22 Aug', name: 'BANKNIFTY SHORT STRADDLE', driverTag: 'IV Expansion', duration: '4h 10m', ivChange: '+2.8%', outcome: 'loss', amount: 3100 },
  { id: '4', strategy: 'IRON CONDOR', date: '19 Aug', name: 'NIFTY IRON CONDOR', driverTag: 'Theta', duration: '3d 1h', ivChange: '-1.1%', outcome: 'profit', amount: 5400 },
  { id: '5', strategy: 'SHORT STRADDLE', date: '15 Aug', name: 'NIFTY SHORT STRADDLE', driverTag: 'IV Expansion', duration: '6h 55m', ivChange: '+4.0%', outcome: 'loss', amount: 2870 },
  { id: '6', strategy: 'BULL CALL SPREAD', date: '12 Aug', name: 'NIFTY BULL CALL SPREAD', driverTag: 'Spot Movement', duration: '1d 18h', ivChange: '+0.4%', outcome: 'profit', amount: 3650 },
];

const outcomeFilters = ['All', 'Profit', 'Loss'];
const strategyFilters = ['All strategies', 'Short Straddle', 'Bull Call Spread', 'Iron Condor'];
const driverFilters = ['All drivers', 'IV conditions', 'Theta', 'Spot'];

export const TradeHistoryView: React.FC = () => {
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [strategyFilter, setStrategyFilter] = useState('All strategies');
  const [driverFilter, setDriverFilter] = useState('All drivers');

  const filtered = MOCK_HISTORY_TRADES.filter((t) => {
    if (outcomeFilter === 'Profit' && t.outcome !== 'profit') return false;
    if (outcomeFilter === 'Loss' && t.outcome !== 'loss') return false;
    if (strategyFilter !== 'All strategies' && t.strategy.toLowerCase() !== strategyFilter.toLowerCase()) return false;
    if (driverFilter !== 'All drivers') {
      const driverMap: Record<string, string> = { 'IV conditions': 'IV Expansion', Theta: 'Theta', Spot: 'Spot Movement' };
      if (t.driverTag !== driverMap[driverFilter]) return false;
    }
    return true;
  });

  const pillStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-ui)',
    fontSize: '0.85rem',
    padding: '7px 18px',
    borderRadius: '9999px',
    border: active ? '1.5px solid #38bdf8' : '1px solid var(--border-glass)',
    background: active ? '#142033' : '#101726',
    color: active ? '#ffffff' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    outline: 'none',
    transition: 'all 0.18s ease'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <h1 className="page-title">TRADE HISTORY</h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Your persistent trading memory &mdash; {MOCK_HISTORY_TRADES.length} recorded trades.
        </p>
      </div>

      {/* Filters (3 rows matching Screenshots 3 & 4) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {outcomeFilters.map((f) => (
            <button key={f} style={pillStyle(outcomeFilter === f)} onClick={() => setOutcomeFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {strategyFilters.map((f) => (
            <button key={f} style={pillStyle(strategyFilter === f)} onClick={() => setStrategyFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {driverFilters.map((f) => (
            <button key={f} style={pillStyle(driverFilter === f)} onClick={() => setDriverFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((t) => (
          <div
            key={t.id}
            className="glass-panel"
            style={{
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {t.strategy}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.date}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', color: 'var(--text-main)', letterSpacing: '0.04em', marginBottom: '8px', textTransform: 'uppercase' }}>
                {t.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.72rem',
                    color: t.outcome === 'loss' ? 'var(--color-red)' : (t.driverTag === 'Theta' ? 'var(--color-green)' : '#60a5fa'),
                    background: t.outcome === 'loss' ? '#25162a' : (t.driverTag === 'Theta' ? 'rgba(34, 197, 94, 0.12)' : '#132238'),
                    border: t.outcome === 'loss' ? '1px solid rgba(244, 63, 94, 0.3)' : (t.driverTag === 'Theta' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'),
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {t.driverTag}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t.duration} &bull; IV {t.ivChange}
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.74rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: t.outcome === 'profit' ? 'var(--color-green)' : 'var(--color-red)'
                }}
              >
                {t.outcome === 'profit' ? 'PROFIT' : 'LOSS'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-numbers)',
                  fontSize: '1.85rem',
                  lineHeight: 1,
                  marginTop: '2px',
                  color: t.outcome === 'profit' ? 'var(--color-green)' : 'var(--color-red)'
                }}
              >
                {t.outcome === 'profit' ? `+₹${t.amount.toLocaleString()}` : `-₹${t.amount.toLocaleString()}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};