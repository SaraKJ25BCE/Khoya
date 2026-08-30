import React from 'react';
import { RefreshCw, Play, Pause, RotateCcw, Zap } from 'lucide-react';

interface TopEngineBarProps {
  isSimulating: boolean;
  setIsSimulating: (val: boolean | ((prev: boolean) => boolean)) => void;
  tickCount: number;
  onManualTick: () => void;
  onReset: () => void;
}

export const TopEngineBar: React.FC<TopEngineBarProps> = ({
  isSimulating,
  setIsSimulating,
  tickCount,
  onManualTick,
  onReset,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '22px',
        padding: '12px 20px',
        borderRadius: '20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--card-shadow)'
      }}
    >
      {/* Backend Status Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '9999px',
            background: 'rgba(73, 132, 52, 0.12)',
            border: '1px solid rgba(73, 132, 52, 0.35)',
            color: 'var(--color-green)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600
          }}
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-green)'
            }}
          />
          <span>PYTHON BACKEND ENGINE ACTIVE (Kite Connect Live Feed)</span>
        </div>

        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Ticks: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>#{tickCount}</span>
        </span>
      </div>

      {/* Control Buttons Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => setIsSimulating(prev => !prev)}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'var(--nav-bg)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isSimulating ? <Pause size={12} /> : <Play size={12} />}
          <span>{isSimulating ? 'Pause Stream' : 'Resume Stream'}</span>
        </button>

        <button
          onClick={onManualTick}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'var(--nav-bg)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Zap size={12} color="#38bdf8" />
          <span>Manual Tick</span>
        </button>

        <button
          onClick={onReset}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'rgba(196, 17, 79, 0.08)',
            border: '1px solid rgba(196, 17, 79, 0.35)',
            color: 'var(--color-red)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RotateCcw size={12} />
          <span>Reset Simulation</span>
        </button>
      </div>
    </div>
  );
};
