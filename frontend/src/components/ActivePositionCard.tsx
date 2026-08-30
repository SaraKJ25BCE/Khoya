import React from 'react';
import { ActivePosition } from '../types/trade';
import { ChevronRight } from 'lucide-react';

interface ActivePositionCardProps {
  position: ActivePosition;
  onSelect: (position: ActivePosition) => void;
}

export const ActivePositionCard: React.FC<ActivePositionCardProps> = ({ position, onSelect }) => {
  const isProfit = position.pnl >= 0;

  return (
    <div
      onClick={() => onSelect(position)}
      className="glass-panel"
      style={{
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        borderRadius: '16px',
        marginBottom: '12px'
      }}
    >
      <div>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              background: '#111a2a',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-glass)'
            }}
          >
            {position.strategy_type}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(56, 189, 248, 0.25)'
            }}
          >
            {position.confidence}
          </span>
        </div>

        {/* Title */}
        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', color: 'var(--text-main)', letterSpacing: '0.04em', marginBottom: '6px', textTransform: 'uppercase' }}>
          {position.title}{' '}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>
            &bull; {position.dte}
          </span>
        </h4>

        {/* Driver Tag */}
        <div>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              color: '#60a5fa',
              background: '#132238',
              padding: '2px 10px',
              borderRadius: '4px',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'inline-block'
            }}
          >
            {position.driver_tag}
          </span>
        </div>
      </div>

      {/* Right Side P&L and Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.74rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            P&L
          </div>
          <div
            style={{
              fontFamily: 'var(--font-numbers)',
              fontSize: '1.85rem',
              lineHeight: 1,
              marginTop: '2px',
              color: isProfit ? 'var(--color-green)' : 'var(--color-red)'
            }}
          >
            {isProfit ? `+₹${position.pnl.toLocaleString()}` : `₹-${Math.abs(position.pnl).toLocaleString()}`}
          </div>
        </div>
        <ChevronRight size={18} color="var(--text-muted)" />
      </div>
    </div>
  );
};
