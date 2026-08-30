import React from 'react';
import { Trade } from '../types/trade';
import { Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ActiveLegsPanelProps {
  trade: Trade;
}

export const ActiveLegsPanel: React.FC<ActiveLegsPanelProps> = ({ trade }) => {
  return (
    <div className="glass-panel stacked-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={16} color="#38bdf8" />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: '#e6edf5', letterSpacing: '0.04em' }}>
            Active Strategy Legs &bull; {trade.strategy}
          </span>
          <span className="badge badge-kite">{trade.broker_source}</span>
          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            {trade.market_regime}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          ENTRY SPOT: <span style={{ color: '#fff' }}>{trade.spot_at_entry}</span> &bull; IV: <span style={{ color: '#fff' }}>{trade.iv_at_entry}%</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="khoya-table">
          <thead>
            <tr>
              <th>Instrument Leg</th>
              <th>Side / Qty</th>
              <th>Entry Price</th>
              <th>LTP (Live)</th>
              <th>Delta (&Delta;)</th>
              <th>Theta (&Theta;)</th>
              <th>Vega (&nu;)</th>
              <th>IV (%)</th>
              <th>Leg P&L</th>
              <th>IV P&L</th>
              <th>Theta P&L</th>
            </tr>
          </thead>
          <tbody>
            {trade.legs.map((leg) => (
              <tr key={leg.id}>
                <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {leg.symbol}
                </td>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: leg.side === 'SELL' ? 'var(--color-red)' : 'var(--color-green)',
                      fontWeight: 600
                    }}
                  >
                    {leg.side} {leg.quantity}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.1rem' }}>
                  ₹{leg.entry_price.toFixed(2)}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.1rem', color: leg.ltp > leg.entry_price ? 'var(--color-red)' : 'var(--color-green)' }}>
                  ₹{leg.ltp.toFixed(2)}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem', color: 'var(--color-cyan)' }}>
                  {leg.delta.toFixed(2)}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem', color: 'var(--color-green)' }}>
                  +{leg.theta.toFixed(1)}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem', color: 'var(--color-red)' }}>
                  {leg.vega.toFixed(1)}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem' }}>
                  {leg.iv.toFixed(1)}%
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.15rem', color: leg.pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {leg.pnl >= 0 ? '+' : ''}₹{leg.pnl}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem', color: leg.iv_pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {leg.iv_pnl >= 0 ? '+' : ''}₹{leg.iv_pnl}
                </td>
                <td style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem', color: 'var(--color-green)' }}>
                  +₹{leg.theta_pnl}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
