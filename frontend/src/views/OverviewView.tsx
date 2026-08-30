import React from 'react';
import { Trade, ActivePosition } from '../types/trade';
import { MetricCard } from '../components/MetricCard';
import { FactorDistributionBar } from '../components/FactorDistributionBar';
import { ActivePositionCard } from '../components/ActivePositionCard';
import { MOCK_ACTIVE_POSITIONS } from '../data/mockData';

interface OverviewViewProps {
  trade: Trade;
  onSelectPosition: (position: ActivePosition) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onSelectPosition
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <h1 className="page-title">
          TOTAL P&L ANALYSIS.
        </h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Calculated live via Python Black-Scholes &amp; P&amp;L Attribution Engine.
        </p>
      </div>

      {/* Top 6 Metric Cards Strip (Matching Screenshot 1) */}
      <div className="metrics-grid">
        {/* Card 1: OPEN P&L */}
        <MetricCard
          label="OPEN P&L"
          sign="+"
          value="₹4,745"
          variant="green"
        />

        {/* Card 2: OPEN POSITIONS */}
        <MetricCard
          label="OPEN POSITIONS"
          value="3"
          variant="neutral"
        />

        {/* Card 3: THETA CONTRIBUTION */}
        <MetricCard
          label="THETA CONTRIBUTION"
          sign="+"
          value="₹11,238"
          variant="green"
        />

        {/* Card 4: IV IMPACT */}
        <MetricCard
          label="IV IMPACT"
          value="-₹48"
          variant="red"
        />

        {/* Card 5: DELTA IMPACT (Δ) */}
        <MetricCard
          label={
            <>
              DELTA IMPACT<br />(Δ)
            </>
          }
          sign="-"
          value="₹42,626"
          variant="red"
        />

        {/* Card 6: GAMMA IMPACT (Γ) */}
        <MetricCard
          label={
            <>
              GAMMA IMPACT<br />(Γ)
            </>
          }
          value="-₹7,523"
          variant="red"
        />
      </div>

      {/* What's driving your P&L? Factor Breakdown (Matching Screenshot 1) */}
      <FactorDistributionBar
        title="WHAT'S DRIVING YOUR P&L?"
        spotPnl={-50149}
        deltaPnl={-42626}
        gammaPnl={-7523}
        thetaPnl={11238}
        ivPnl={-48}
        residualPnl={-44176}
        explanationText="Your current total P&L across your 3 positions is primarily driven by spot price movement. Evaluated in real-time by Python FastAPI backend ('attribute_pnl')."
      />

      {/* Active Positions Section (Matching Screenshot 1) */}
      <div style={{ marginTop: '6px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', color: 'var(--text-main)', letterSpacing: '0.04em', marginBottom: '14px', textTransform: 'uppercase' }}>
          ACTIVE POSITIONS
        </h3>

        <div>
          {MOCK_ACTIVE_POSITIONS.map((position) => (
            <ActivePositionCard
              key={position.id}
              position={position}
              onSelect={onSelectPosition}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
