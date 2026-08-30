import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'red' | 'green' | 'cyan' | 'neutral';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  variant = 'neutral',
  tooltip
}) => {
  return (
    <div className="glass-panel metric-card" title={tooltip}>
      <div className="metric-label">
        <span>{label}</span>
      </div>
      <div className={`metric-value ${variant}`}>
        {value}
      </div>
      {subtext && <div className="metric-sub">{subtext}</div>}
    </div>
  );
};
