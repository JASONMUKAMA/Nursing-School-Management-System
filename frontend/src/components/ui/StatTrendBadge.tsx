import type { StatTrend } from '../../types';

interface StatTrendBadgeProps {
  trend?: StatTrend | null;
}

export function StatTrendBadge({ trend }: StatTrendBadgeProps) {
  if (!trend || trend.direction === 'neutral') {
    return (
      <span className="stat-trend stat-trend-neutral" title="No change vs last month">
        → 0%
      </span>
    );
  }

  const isPositive =
    trend.lowerIsBetter ? trend.direction === 'down' : trend.direction === 'up';
  const arrow = trend.direction === 'up' ? '↑' : '↓';

  return (
    <span
      className={`stat-trend ${isPositive ? 'stat-trend-positive' : 'stat-trend-negative'}`}
      title="vs last month"
    >
      {arrow} {trend.changePercent}%
    </span>
  );
}
