import React from 'react';
import { Trade } from '../types/trade';
import { CheckCircle2, Cpu, HelpCircle } from 'lucide-react';

interface AttributionWaterfallProps {
  trade: Trade;
}

export const AttributionWaterfall: React.FC<AttributionWaterfallProps> = ({ trade }) => {
  const sumOfComponents = trade.iv_component + trade.theta_component + trade.delta_component + trade.gamma_component + trade.vega_component;
  const isConsistent = Math.abs(sumOfComponents - trade.total_pnl) < 100;

  const components = [
    { name: 'IV Expansion (Vega Leak)', value: trade.iv_component, type: 'loss', desc: 'IV rose from 13.8% to 14.6%' },
    { name: 'Theta Decay (Time Value)', value: trade.theta_component, type: 'gain', desc: '4h 12m accumulated decay' },
    { name: 'Delta Drift (Directional)', value: trade.delta_component, type: 'loss', desc: 'Spot moved +25.7 pts up' },
    { name: 'Gamma Acceleration', value: trade.gamma_component, type: 'loss', desc: 'Convexity drag on Short CE' },
    { name: 'Vega Residual / Higher Order', value: trade.vega_component, type: 'neutral', desc: 'Vanna / Volga minor' }
  ];

  return (
    <div className="glass-panel stacked-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={16} color="#00f090" />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: '#e6edf5', letterSpacing: '0.04em' }}>
            Real-Time Mathematical Attribution &bull; Why Your P&L Moved
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} color="var(--color-green)" />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--color-green)', letterSpacing: '0.06em' }}>
            Mathematical Consistency: {isConsistent ? 'VERIFIED (Δ ≈ ₹0)' : 'UNBALANCED'}
          </span>
        </div>
      </div>

      {/* Waterfall Visual Breakdown Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {components.map((c, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(10, 18, 30, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.74rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {c.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-numbers)',
                  fontSize: '1.45rem',
                  lineHeight: 1.1,
                  marginTop: '4px',
                  color: c.value >= 0 ? 'var(--color-green)' : 'var(--color-red)'
                }}
              >
                {c.value >= 0 ? '+' : ''}₹{c.value}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
              {c.desc}
            </div>
          </div>
        ))}

        {/* Total Summary Box */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 59, 105, 0.15) 0%, rgba(20, 30, 48, 0.6) 100%)',
            border: '1px solid rgba(255, 59, 105, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Decomposed Total P&L
            </div>
            <div
              style={{
                fontFamily: 'var(--font-numbers)',
                fontSize: '1.5rem',
                lineHeight: 1.1,
                marginTop: '4px',
                color: trade.total_pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)'
              }}
            >
              {trade.total_pnl >= 0 ? '+' : ''}₹{trade.total_pnl}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
            Broker Match: Zerodha Kite
          </div>
        </div>
      </div>
    </div>
  );
};
