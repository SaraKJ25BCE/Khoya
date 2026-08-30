import React, { useState } from 'react';
import { PnLAttributionPoint } from '../types/trade';
import { Eye, TrendingUp, Sparkles } from 'lucide-react';

interface AttributionChartProps {
  data: PnLAttributionPoint[];
  currentSpot: number;
}

export const AttributionChart: React.FC<AttributionChartProps> = ({ data, currentSpot }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({
    total: true,
    iv: true,
    theta: true,
    delta: true,
  });

  const toggleLine = (key: string) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // SVG dimensions
  const width = 1000;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const allValues = data.flatMap(d => [
    d.total_pnl,
    visibleLines.iv ? d.iv_component : 0,
    visibleLines.theta ? d.theta_component : 0,
    visibleLines.delta ? d.delta_component : 0
  ]);
  
  const minVal = Math.min(-5000, Math.min(...allValues) * 1.15);
  const maxVal = Math.max(4000, Math.max(...allValues) * 1.15);
  const range = maxVal - minVal;

  const getY = (val: number) => {
    return padding.top + graphHeight - ((val - minVal) / range) * graphHeight;
  };

  const getX = (idx: number) => {
    return padding.left + (idx / (data.length - 1)) * graphWidth;
  };

  const zeroY = getY(0);

  // Generate SVG path strings
  const generatePath = (key: keyof PnLAttributionPoint) => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key] as number)}`)
      .join(' ');
  };

  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];

  return (
    <div className="glass-panel glass-panel-lg center-stage-panel" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Panel Top Header & Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: '#e6edf5', letterSpacing: '0.04em' }}>
              Real-Time Decomposition Stream
            </span>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.76rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              SPOT NIFTY: <span style={{ color: '#fff', fontWeight: 600 }}>{currentSpot.toFixed(2)}</span> &bull; 1-SECOND BLACK-SCHOLES RESOLUTION
            </div>
          </div>
        </div>

        {/* Legend toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => toggleLine('total')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: visibleLines.total ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${visibleLines.total ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: visibleLines.total ? '#fff' : 'var(--text-subtle)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              letterSpacing: '0.06em'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }}></span>
            TOTAL P&L
          </button>

          <button
            onClick={() => toggleLine('theta')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: visibleLines.theta ? 'rgba(0, 240, 144, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${visibleLines.theta ? 'rgba(0, 240, 144, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: visibleLines.theta ? 'var(--color-green)' : 'var(--text-subtle)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              letterSpacing: '0.06em'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }}></span>
            +THETA DECAY
          </button>

          <button
            onClick={() => toggleLine('iv')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: visibleLines.iv ? 'rgba(255, 59, 105, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${visibleLines.iv ? 'rgba(255, 59, 105, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: visibleLines.iv ? 'var(--color-red)' : 'var(--text-subtle)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              letterSpacing: '0.06em'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-red)' }}></span>
            -IV EXPANSION
          </button>

          <button
            onClick={() => toggleLine('delta')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: visibleLines.delta ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${visibleLines.delta ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: visibleLines.delta ? 'var(--color-cyan)' : 'var(--text-subtle)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              letterSpacing: '0.06em'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-cyan)' }}></span>
            DELTA MOVE
          </button>
        </div>
      </div>

      {/* SVG Timeline Decomposition Visualizer */}
      <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="totalGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="greenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00f090" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00f090" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="redGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff3b69" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#ff3b69" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={padding.top + graphHeight / 2} x2={width - padding.right} y2={padding.top + graphHeight / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          
          {/* Zero Axis Line (The subtle clean horizontal line seen in the Figma mockup) */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.2"
          />

          {/* Y Axis Labels */}
          <text x={padding.left - 8} y={padding.top + 4} fill="var(--text-subtle)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">
            +₹{Math.round(maxVal)}
          </text>
          <text x={padding.left - 8} y={zeroY + 3} fill="rgba(255, 255, 255, 0.7)" fontSize="11" fontFamily="var(--font-numbers)" textAnchor="end">
            ₹0
          </text>
          <text x={padding.left - 8} y={padding.top + graphHeight} fill="var(--text-subtle)" fontSize="10" fontFamily="var(--font-numbers)" textAnchor="end">
            -₹{Math.round(Math.abs(minVal))}
          </text>

          {/* Theta Path (Green) */}
          {visibleLines.theta && (
            <path
              d={generatePath('theta_component')}
              fill="none"
              stroke="var(--color-green)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}

          {/* IV Path (Red) */}
          {visibleLines.iv && (
            <path
              d={generatePath('iv_component')}
              fill="none"
              stroke="var(--color-red)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}

          {/* Delta Path (Cyan) */}
          {visibleLines.delta && (
            <path
              d={generatePath('delta_component')}
              fill="none"
              stroke="var(--color-cyan)"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
          )}

          {/* Total P&L Solid Path (White) */}
          {visibleLines.total && (
            <path
              d={generatePath('total_pnl')}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Hover Nodes */}
          {data.map((d, i) => {
            const x = getX(i);
            const y = getY(d.total_pnl);
            return (
              <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={x}
                  cy={y}
                  r={hoveredIndex === i ? 6 : 3.5}
                  fill={d.total_pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)'}
                  stroke="#ffffff"
                  strokeWidth={hoveredIndex === i ? 2 : 1}
                />
                {/* X Axis Time Labels */}
                <text
                  x={x}
                  y={height - 10}
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontFamily="var(--font-ui)"
                  textAnchor="middle"
                >
                  {d.time}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Snapshot Tooltip Overlay */}
        {activePoint && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '20px',
              background: 'rgba(8, 15, 26, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>TIME: </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{activePoint.time}</span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL: </span>
              <span style={{ fontFamily: 'var(--font-numbers)', fontSize: '1.05rem', color: activePoint.total_pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {activePoint.total_pnl >= 0 ? '+' : ''}₹{activePoint.total_pnl}
              </span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--color-green)' }}>THETA: </span>
              <span style={{ fontFamily: 'var(--font-numbers)', fontSize: '1rem', color: 'var(--color-green)' }}>+₹{activePoint.theta_component}</span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--color-red)' }}>IV: </span>
              <span style={{ fontFamily: 'var(--font-numbers)', fontSize: '1rem', color: 'var(--color-red)' }}>₹{activePoint.iv_component}</span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: 'var(--color-cyan)' }}>DELTA: </span>
              <span style={{ fontFamily: 'var(--font-numbers)', fontSize: '1rem', color: 'var(--color-cyan)' }}>{activePoint.delta_component >= 0 ? '+' : ''}₹{activePoint.delta_component}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
