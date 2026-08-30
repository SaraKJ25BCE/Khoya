import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const RECURRING_PATTERNS = [
  'IV expansion is responsible for 63% of your short-straddle losses.',
  'Your average profitable trade captures Theta for 2.4 days.',
  'You perform best when underlying movement remains below 1%.',
  'Most of your largest losses occurred during rapid IV expansion.'
];

export const TraderDNAView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <h1 className="page-title">YOUR TRADING DNA</h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Patterns discovered across your trades.
        </p>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
        <div className="glass-panel metric-card">
          <div className="metric-label">TRADES ANALYZED</div>
          <div className="metric-value neutral">47</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">WIN RATE</div>
          <div className="metric-value green">63.8%</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">TOTAL P&L</div>
          <div className="metric-value green">₹18,420</div>
        </div>
      </div>

      {/* Profitable Strategy / Biggest Loss Source */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={15} color="var(--color-green)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Most Profitable Strategy
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.7rem', color: 'var(--text-main)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Iron Condor
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>68% win rate</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingDown size={15} color="var(--color-red)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Biggest Source of Losses
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.7rem', color: 'var(--text-main)', marginBottom: '4px', textTransform: 'uppercase' }}>
            IV Expansion
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>63% of losing trades</div>
        </div>
      </div>

      {/* Best / Weakest Conditions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Best Conditions
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Low IV', 'Low underlying movement'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  background: '#131d2e',
                  border: '1px solid var(--border-glass)',
                  padding: '4px 12px',
                  borderRadius: '9999px'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Weakest Conditions
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8rem',
                color: 'var(--color-red)',
                background: '#25162a',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '4px 12px',
                borderRadius: '9999px'
              }}
            >
              Rapid IV expansion
            </span>
          </div>
        </div>
      </div>

      {/* Recurring Patterns */}
      <div className="glass-panel" style={{ padding: '22px 26px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', color: 'var(--text-main)', letterSpacing: '0.04em', marginBottom: '16px', textTransform: 'uppercase' }}>
          Recurring patterns
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {RECURRING_PATTERNS.map((pattern, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#101726',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '12px 18px'
              }}
            >
              <span style={{ fontFamily: 'var(--font-numbers)', fontSize: '1rem', color: 'var(--text-subtle)' }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.92rem', color: '#cbd5e1' }}>{pattern}</span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--text-subtle)', margin: 0 }}>
          These are historical observations, not trading recommendations.
        </p>
      </div>
    </div>
  );
};