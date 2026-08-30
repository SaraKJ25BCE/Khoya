import React from 'react';

interface FactorDistributionBarProps {
  title?: string;
  spotPnl: number;
  deltaPnl: number;
  gammaPnl: number;
  thetaPnl: number;
  ivPnl: number;
  residualPnl: number;
  explanationText: string;
}

export const FactorDistributionBar: React.FC<FactorDistributionBarProps> = ({
  title = "What's driving your P&L?",
  spotPnl,
  deltaPnl,
  gammaPnl,
  thetaPnl,
  ivPnl,
  residualPnl,
  explanationText
}) => {
  // Compute absolute weights for the progress bar segments
  const absSpot = Math.abs(spotPnl) || 50000;
  const absTheta = Math.abs(thetaPnl) || 11238;
  const absIv = Math.abs(ivPnl) || 500;
  const absResidual = Math.abs(residualPnl) || 40000;
  const total = absSpot + absTheta + absIv + absResidual;

  const spotPct = (absSpot / total) * 100;
  const thetaPct = (absTheta / total) * 100;
  const ivPct = (absIv / total) * 100;
  const residualPct = (absResidual / total) * 100;

  return (
    <div className="glass-panel glass-panel-lg" style={{ padding: '22px 26px', marginBottom: '22px' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--text-main)', letterSpacing: '0.04em', marginBottom: '14px' }}>
        {title}
      </h3>

      {/* Multi-segment Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '10px',
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.25)',
          marginBottom: '14px'
        }}
      >
        <div style={{ width: `${spotPct}%`, backgroundColor: '#3b82f6' }} title="Spot Movement" />
        <div style={{ width: `${thetaPct}%`, backgroundColor: 'var(--color-green)' }} title="Theta Decay" />
        <div style={{ width: `${ivPct}%`, backgroundColor: 'var(--color-red)' }} title="IV Impact" />
        <div style={{ width: `${residualPct}%`, backgroundColor: 'var(--color-amber)' }} title="Residual Impact" />
      </div>

      {/* Factor Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
          <span style={{ color: 'var(--text-muted)' }}>Spot</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {spotPnl >= 0 ? '+' : ''}₹{spotPnl.toLocaleString()} (Δ: ₹{deltaPnl.toLocaleString()}, Γ: ₹{gammaPnl.toLocaleString()})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }}></span>
          <span style={{ color: 'var(--text-muted)' }}>Theta</span>
          <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>
            +{thetaPnl >= 0 ? '+' : ''}₹{thetaPnl.toLocaleString()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-red)' }}></span>
          <span style={{ color: 'var(--text-muted)' }}>IV</span>
          <span style={{ color: 'var(--color-red)', fontWeight: 600 }}>
            {ivPnl >= 0 ? '+' : ''}₹{ivPnl.toLocaleString()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-amber)' }}></span>
          <span style={{ color: 'var(--text-muted)' }}>Residual</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {residualPnl >= 0 ? '+' : ''}₹{residualPnl.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Explanatory text */}
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
        {explanationText}
      </p>
    </div>
  );
};
