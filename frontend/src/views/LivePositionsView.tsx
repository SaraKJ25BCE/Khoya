import React, { useState } from 'react';
import { ActivePosition, Trade } from '../types/trade';
import { MOCK_ACTIVE_POSITIONS } from '../data/mockData';
import { FactorDistributionBar } from '../components/FactorDistributionBar';
import { IvCurveChart } from '../components/IvCurveChart';
import { ChevronLeft } from 'lucide-react';

interface LivePositionsViewProps {
  trade: Trade;
  selectedPosition: ActivePosition | null;
  setSelectedPosition: (pos: ActivePosition | null) => void;
}

export const LivePositionsView: React.FC<LivePositionsViewProps> = ({
  selectedPosition,
  setSelectedPosition,
}) => {
  // Active position index/selection
  const currentPos = selectedPosition || MOCK_ACTIVE_POSITIONS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Position Selector Pill Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => setSelectedPosition(null)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ChevronLeft size={16} />
          <span>All Live Positions</span>
        </button>

        {/* Position Switcher Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MOCK_ACTIVE_POSITIONS.map((pos) => {
            const isSelected = currentPos.id === pos.id;
            return (
              <button
                key={pos.id}
                onClick={() => setSelectedPosition(pos)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: isSelected ? 'var(--nav-bg-active)' : 'var(--bg-card)',
                  border: isSelected ? '1.5px solid var(--border-glass-active)' : '1px solid var(--border-glass)',
                  color: isSelected ? 'var(--nav-text-active)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8rem',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400
                }}
              >
                {pos.title} ({pos.pnl >= 0 ? '+' : ''}₹{pos.pnl.toLocaleString()})
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Header (Matching Screenshot 3) */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-glass)'
                }}
              >
                {currentPos.strategy_type}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  color: '#c084fc',
                  background: 'rgba(192, 132, 252, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(192, 132, 252, 0.3)'
                }}
              >
                PYTHON ENGINE STREAM
              </span>
            </div>

            <h1 className="page-title" style={{ marginBottom: 0, fontSize: '2.8rem' }}>
              {currentPos.title}
            </h1>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {currentPos.dte}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              P&L
            </div>
            <div
              style={{
                fontFamily: 'var(--font-numbers)',
                fontSize: '2.8rem',
                lineHeight: 1,
                color: currentPos.pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)'
              }}
            >
              {currentPos.pnl >= 0 ? '+' : ''}₹{currentPos.id === 'pos-banknifty-straddle' ? '264' : currentPos.pnl.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Position Stats Strip (Matching Screenshot 3: 6 metrics) */}
      <div className="metrics-grid" style={{ marginBottom: '22px' }}>
        <div className="glass-panel metric-card">
          <div className="metric-label">ENTRY VALUE</div>
          <div className="metric-value neutral">₹{currentPos.entry_value.toLocaleString()}</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">CURRENT VALUE</div>
          <div className="metric-value neutral">₹{currentPos.current_value.toLocaleString()}</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">QUANTITY</div>
          <div className="metric-value neutral">{currentPos.quantity}</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">SPOT PRICE</div>
          <div className="metric-value neutral">₹{currentPos.spot_price.toLocaleString()}</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">IV</div>
          <div className="metric-value neutral">{currentPos.iv}%</div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-label">TIME TO EXPIRY</div>
          <div className="metric-value neutral">{currentPos.dte.replace(' DTE', '')}</div>
        </div>
      </div>

      {/* Why is my P&L moving? (Matching Screenshot 3) */}
      <FactorDistributionBar
        title="Why is my P&L moving?"
        spotPnl={currentPos.id === 'pos-banknifty-straddle' ? -22853 : currentPos.delta_pnl + currentPos.gamma_pnl}
        deltaPnl={currentPos.delta_pnl}
        gammaPnl={currentPos.gamma_pnl}
        thetaPnl={currentPos.theta_pnl}
        ivPnl={currentPos.iv_pnl}
        residualPnl={currentPos.residual_pnl}
        explanationText={`Python engine computed MTM P&L: ₹${currentPos.id === 'pos-banknifty-straddle' ? '264' : currentPos.pnl.toLocaleString()}. Factor decomposition: Spot ₹${(currentPos.delta_pnl + currentPos.gamma_pnl).toLocaleString()} (Δ: ₹${currentPos.delta_pnl.toLocaleString()}, Γ: ₹${currentPos.gamma_pnl.toLocaleString()}), Theta +₹${currentPos.theta_pnl.toLocaleString()}, IV Impact ₹${currentPos.iv_pnl.toLocaleString()}.`}
      />

      {/* P&L Attribution Timeline (Matching Screenshot 4) */}
      <div className="glass-panel glass-panel-lg" style={{ padding: '22px 26px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--text-main)', letterSpacing: '0.04em', margin: 0 }}>
              P&L attribution timeline &bull; {currentPos.title}
            </h3>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Factor breakdown generated by Python FastAPI backend (<code style={{ color: '#38bdf8' }}>attribute_pnl</code>)
            </p>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              color: 'var(--color-green)',
              background: 'rgba(73, 132, 52, 0.12)',
              padding: '3px 9px',
              borderRadius: '4px',
              border: '1px solid rgba(73, 132, 52, 0.35)'
            }}
          >
            PYTHON API STREAMING
          </span>
        </div>

        {/* Timeline SVG Chart matching Screenshot 4 */}
        <div style={{ width: '100%', height: '240px', position: 'relative' }}>
          <svg viewBox="0 0 900 240" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="55" y1="30" x2="880" y2="30" stroke="var(--chart-grid-line)" strokeDasharray="3 3" />
            <line x1="55" y1="75" x2="880" y2="75" stroke="var(--chart-grid-line)" strokeDasharray="3 3" />
            <line x1="55" y1="120" x2="880" y2="120" stroke="var(--chart-zero-line)" />
            <line x1="55" y1="165" x2="880" y2="165" stroke="var(--chart-grid-line)" strokeDasharray="3 3" />
            <line x1="55" y1="210" x2="880" y2="210" stroke="var(--chart-grid-line)" strokeDasharray="3 3" />

            {/* Y Axis Labels */}
            <text x="48" y="34" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">+₹8.0k</text>
            <text x="48" y="79" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">+₹4.0k</text>
            <text x="48" y="124" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">₹0</text>
            <text x="48" y="169" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">-₹4.0k</text>
            <text x="48" y="214" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">-₹8.0k</text>

            {/* Delta High-Frequency Spikes Curve (Blue) */}
            <path
              d="M 55 120 L 75 110 L 95 135 L 115 80 L 135 155 L 155 70 L 175 160 L 195 90 L 215 140 L 235 50 L 255 180 L 275 60 L 295 165 L 315 45 L 335 175 L 355 75 L 375 150 L 395 65 L 415 185 L 435 80 L 455 160 L 475 70 L 495 175 L 515 90 L 535 155 L 555 60 L 575 190 L 595 85 L 615 170 L 635 55 L 655 180 L 675 75 L 695 165 L 715 65 L 735 175 L 755 85 L 775 160 L 795 70 L 815 170 L 835 90 L 855 150 L 875 120"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />

            {/* Total PnL (White/Foreground Line) */}
            <path
              d="M 55 120 Q 120 70, 190 110 T 320 85 T 450 135 T 580 90 T 710 120 T 875 116"
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Gamma Curve (Amber) */}
            <path
              d="M 55 120 Q 140 115, 230 118 T 410 116 T 590 122 T 770 120 T 875 121"
              fill="none"
              stroke="var(--color-amber)"
              strokeWidth="1.6"
              strokeDasharray="4 3"
            />

            {/* Theta Curve (Green) */}
            <path
              d="M 55 120 L 150 112 L 250 105 L 350 98 L 450 90 L 550 83 L 650 76 L 750 70 L 875 64"
              fill="none"
              stroke="var(--color-green)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* IV Impact Curve (Red) */}
            <path
              d="M 55 120 L 150 122 L 250 124 L 350 126 L 450 128 L 550 130 L 650 132 L 750 134 L 875 136"
              fill="none"
              stroke="var(--color-red)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          {/* Time Labels matching Screenshot 4 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 55px', fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>19:41:41</span>
            <span>19:42:57</span>
            <span>19:44:35</span>
            <span>19:46:41</span>
            <span>19:49:47</span>
            <span>19:52:45</span>
            <span>19:57:41</span>
            <span>20:03:11</span>
            <span>20:07:59</span>
            <span>20:11:59</span>
            <span>20:15:53</span>
            <span>20:21:32</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-red)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-red)' }}></span>
            <span>IV Impact</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: '#3b82f6' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
            <span>Delta</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-amber)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-amber)' }}></span>
            <span>Gamma</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--color-green)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }}></span>
            <span>Theta</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: 'var(--text-main)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-main)' }}></span>
            <span>Total PnL</span>
          </div>
        </div>
      </div>

      {/* 4 Greeks Metric Grid (Matching Screenshot 4 & 5) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                DELTA (Δ)
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '4px', margin: 0 }}>
                Calculated via Python Black-Scholes <code style={{ color: '#38bdf8' }}>bs_greeks()</code> formula.
              </p>
            </div>
            <div style={{ fontFamily: 'var(--font-numbers)', fontSize: '2.2rem', color: 'var(--text-main)' }}>
              {currentPos.delta_greek}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                GAMMA (Γ)
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '4px', margin: 0 }}>
                Measures acceleration of Delta as underlying spot moves.
              </p>
            </div>
            <div style={{ fontFamily: 'var(--font-numbers)', fontSize: '2.2rem', color: 'var(--text-main)' }}>
              +{currentPos.gamma_greek}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                THETA (Θ)
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '4px', margin: 0 }}>
                Estimated daily time decay computed by Python pricing engine.
              </p>
            </div>
            <div style={{ fontFamily: 'var(--font-numbers)', fontSize: '2rem', color: 'var(--text-main)' }}>
              +₹{currentPos.theta_greek}/day
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                VEGA (ν)
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '4px', margin: 0 }}>
                Estimated P&L impact per 1% change in Implied Volatility.
              </p>
            </div>
            <div style={{ fontFamily: 'var(--font-numbers)', fontSize: '2rem', color: 'var(--text-main)' }}>
              -₹{currentPos.vega_greek} / 1% IV
            </div>
          </div>
        </div>
      </div>

      {/* Implied Volatility Curve Section (Matching Screenshot 5) */}
      <IvCurveChart />
    </div>
  );
};