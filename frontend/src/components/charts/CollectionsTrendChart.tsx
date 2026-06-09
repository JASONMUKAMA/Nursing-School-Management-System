import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyCollectionPoint } from '../../types';

interface ChartRow {
  monthKey: string;
  monthLabel: string;
  amount: number;
  trend: number;
}

interface TrendSummary {
  direction: 'up' | 'down' | 'neutral';
  percent: number;
}

function formatUgxAxis(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatUgxFull(value: number) {
  return `UGX ${Math.round(value).toLocaleString()}`;
}

function formatMonthLabel(month: string) {
  const [year, monthNum] = month.split('-');
  if (!year || !monthNum) return month;
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleString('en-UG', { month: 'short' });
}

function formatMonthLong(month: string) {
  const [year, monthNum] = month.split('-');
  if (!year || !monthNum) return month;
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleString('en-UG', { month: 'long', year: 'numeric' });
}

function buildTrendData(points: MonthlyCollectionPoint[]): ChartRow[] {
  const rows = points.map((d) => ({
    monthKey: d.month,
    monthLabel: formatMonthLabel(d.month),
    amount: Number(d.amount),
    trend: 0,
  }));

  const n = rows.length;
  if (n < 2) {
    return rows.map((r) => ({ ...r, trend: r.amount }));
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  rows.forEach((row, i) => {
    sumX += i;
    sumY += row.amount;
    sumXY += i * row.amount;
    sumX2 += i * i;
  });

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return rows.map((row, i) => ({
    ...row,
    trend: Math.max(0, intercept + slope * i),
  }));
}

function summarizeTrend(rows: ChartRow[]): TrendSummary | null {
  if (rows.length < 2) return null;

  const first = rows[0].amount;
  const last = rows[rows.length - 1].amount;

  if (first === 0 && last === 0) return { direction: 'neutral', percent: 0 };
  if (first === 0) return { direction: 'up', percent: 100 };

  const raw = Math.round(((last - first) / first) * 100);
  if (raw > 0) return { direction: 'up', percent: raw };
  if (raw < 0) return { direction: 'down', percent: Math.abs(raw) };
  return { direction: 'neutral', percent: 0 };
}

interface TooltipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number; payload: ChartRow }[];
}

function CollectionTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const actual = row.amount;
  const trend = row.trend;
  const delta = actual - trend;

  return (
    <div className="collection-chart-tooltip">
      <p className="collection-chart-tooltip-title">{formatMonthLong(row.monthKey)}</p>
      <p className="collection-chart-tooltip-row">
        <span className="collection-chart-tooltip-dot collection-chart-tooltip-dot-actual" />
        Collected <strong>{formatUgxFull(actual)}</strong>
      </p>
      <p className="collection-chart-tooltip-row">
        <span className="collection-chart-tooltip-dot collection-chart-tooltip-dot-trend" />
        Trend <strong>{formatUgxFull(trend)}</strong>
      </p>
      {Math.abs(delta) > 0 && (
        <p className={`collection-chart-tooltip-delta${delta >= 0 ? ' is-above' : ' is-below'}`}>
          {delta >= 0 ? 'Above' : 'Below'} trend by {formatUgxFull(Math.abs(delta))}
        </p>
      )}
    </div>
  );
}

interface CollectionsTrendChartProps {
  points: MonthlyCollectionPoint[];
}

export function CollectionsTrendChart({ points }: CollectionsTrendChartProps) {
  const data = useMemo(() => buildTrendData(points), [points]);
  const summary = useMemo(() => summarizeTrend(data), [data]);
  const total = useMemo(() => data.reduce((sum, row) => sum + row.amount, 0), [data]);

  return (
    <div className="collection-chart">
      <div className="collection-chart-header">
        <div>
          <p className="chart-label">Fee collections</p>
          <p className="collection-chart-subtitle">
            {data.length > 0 ? `${data.length} months · ${formatUgxFull(total)} total` : 'No collection data yet'}
          </p>
        </div>
        {summary && (
          <span className={`collection-trend-badge collection-trend-${summary.direction}`}>
            {summary.direction === 'up' && '↑'}
            {summary.direction === 'down' && '↓'}
            {summary.direction === 'neutral' && '→'}
            {summary.percent}% vs start
          </span>
        )}
      </div>

      <div className="collection-chart-legend">
        <span className="collection-chart-legend-item">
          <span className="collection-chart-legend-line collection-chart-legend-line-actual" />
          Actual collections
        </span>
        <span className="collection-chart-legend-item">
          <span className="collection-chart-legend-line collection-chart-legend-line-trend" />
          Trendline
        </span>
      </div>

      <p className="collection-chart-explainer">
        <strong>How to read this chart:</strong> The <span className="collection-chart-explainer-actual">solid teal line</span> shows
        real fees collected each month. The <span className="collection-chart-explainer-trend">dashed amber trendline</span> is the
        overall direction across the period — it smooths out month-to-month ups and downs so you can see whether collections are
        generally rising or falling. Hover a month to compare actual vs trend. The badge shows how the latest month compares to the
        first month shown.
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="collectionAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.28} />
              <stop offset="85%" stopColor="#0d9488" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={formatUgxAxis}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CollectionTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="amount"
            fill="url(#collectionAreaGradient)"
            stroke="none"
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="7 5"
            dot={false}
            activeDot={false}
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#0d9488"
            strokeWidth={3}
            dot={{ r: 4, fill: '#fff', stroke: '#0d9488', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
