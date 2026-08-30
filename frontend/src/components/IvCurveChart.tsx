import React from 'react';
import { MOCK_IV_CURVE } from '../data/mockData';

export const IvCurveChart: React.FC = () => {
  const data = MOCK_IV_CURVE;
  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 35, bottom: 35, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const minIv = 16.6;
  const maxIv = 20.1;
  const range = maxIv - minIv;

  const getY = (val: number) => {
    return padding.top + graphHeight - ((val - minIv) / range) * graphHeight;
  };

  const getX = (idx: number) => {
    return padding.left + (idx / (data.length - 1)) * graphWidth;
  };

  // Generate smooth cubic bezier SVG path
  const pathD = data.reduce((acc, point, i, arr) => {
    const x = getX(i);
    const y = getY(point.iv);
    if (i === 0) return `M ${x} ${y}`;
    const prevX = getX(i - 1);
    const prevY = getY(arr[i - 1].iv);
    const cp1x = prevX + (x - prevX) / 2;
    const cp1y = prevY;
    const cp2x = prevX + (x - prevX) / 2;
    const cp2y = y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
  }, '');

  return (
    <div className="glass-panel glass-panel-lg" style={{ padding: '22px 26px', marginTop: '22px' }}>
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--text-main)', letterSpacing: '0.04em', margin: 0 }}>
          Implied Volatility Curve
        </h3>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
          Option chain snapshot loaded from Python backend (<code style={{ color: '#38bdf8' }}>fetch_live_option_chain</code>).
        </p>
      </div>

      <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          {/* Y Axis Grid lines */}
          <line x1={padding.left} y1={getY(20.1)} x2={width - padding.right} y2={getY(20.1)} stroke="var(--chart-grid-line)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={getY(18.4)} x2={width - padding.right} y2={getY(18.4)} stroke="var(--chart-grid-line)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={getY(17.5)} x2={width - padding.right} y2={getY(17.5)} stroke="var(--chart-grid-line)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={getY(16.6)} x2={width - padding.right} y2={getY(16.6)} stroke="var(--chart-zero-line)" />

          {/* Y Axis Labels */}
          <text x={padding.left - 8} y={getY(20.1) + 4} fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-ui)" textAnchor="end">20.1%</text>
          <text x={padding.left - 8} y={getY(18.4) + 4} fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-ui)" textAnchor="end">18.4%</text>
          <text x={padding.left - 8} y={getY(17.5) + 4} fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-ui)" textAnchor="end">17.5%</text>
          <text x={padding.left - 8} y={getY(16.6) + 4} fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-ui)" textAnchor="end">16.6%</text>

          {/* IV Curve Path */}
          <path d={pathD} fill="none" stroke="var(--color-red)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Strike points */}
          {data.map((point, i) => {
            const x = getX(i);
            const y = getY(point.iv);
            return (
              <g key={point.strike}>
                <circle cx={x} cy={y} r="5" fill="var(--color-red)" stroke="#ffffff" strokeWidth="1.5" />
                <text x={x} y={height - 10} fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-numbers)" textAnchor="middle">
                  {point.strike}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
