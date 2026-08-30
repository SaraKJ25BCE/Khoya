import React from 'react';
import { BrainCircuit, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

interface TraderDNAAlertProps {
  onViewDetails?: () => void;
}

export const TraderDNAAlert: React.FC<TraderDNAAlertProps> = ({ onViewDetails }) => {
  return (
    <div
      className="glass-panel stacked-panel"
      style={{
        background: 'linear-gradient(180deg, rgba(24, 18, 38, 0.7) 0%, rgba(12, 18, 30, 0.85) 100%)',
        border: '1px solid rgba(147, 51, 234, 0.22)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.18)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BrainCircuit size={18} color="#c084fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: '#f3e8ff', letterSpacing: '0.04em' }}>
                TRADER DNA INTELLIGENCE &bull; ACTIVE PATTERN DETECTED
              </span>
              <span className="badge badge-replay" style={{ fontSize: '0.72rem' }}>
                Level 3 Moat
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: '#d8b4fe', marginTop: '2px', letterSpacing: '0.04em' }}>
              <span style={{ color: '#ff3b69', fontWeight: 600 }}>WARNING:</span> 71% of your overall losses across Kite & Motilal Oswal occurred when IV expanded &gt;3% on Short Straddles. Current IV expansion is <span style={{ color: '#fff', fontWeight: 600 }}>+0.8%</span>.
            </div>
          </div>
        </div>

        <button
          onClick={onViewDetails}
          style={{
            padding: '8px 16px',
            borderRadius: '9999px',
            background: 'rgba(168, 85, 247, 0.18)',
            border: '1px solid rgba(168, 85, 247, 0.45)',
            color: '#f3e8ff',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.82rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)')}
        >
          <span>Explore DNA Patterns</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
