import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsCharts, MlInsights } from '../../types';

const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

interface DashboardChartsProps {
  charts: AnalyticsCharts;
}

function formatUgxAxis(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function DashboardCharts({ charts }: DashboardChartsProps) {
  const enrollment = charts.enrollmentByProgram.map((d) => ({
    name: d.label.length > 18 ? `${d.label.slice(0, 16)}…` : d.label,
    value: Number(d.value),
  }));
  const feeStatus = charts.feeStatusBreakdown.map((d) => ({ name: d.label, value: Number(d.value) }));
  const monthly = charts.monthlyCollections.map((d) => ({
    month: d.month.slice(5),
    amount: Number(d.amount),
  }));
  const methods = charts.paymentMethods.map((d) => ({ name: d.label, value: Number(d.value) }));

  const tooltipStyle = {
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 12,
  };

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <p className="chart-label">Enrollment</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={enrollment} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <p className="chart-label">Fees</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={feeStatus}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={3}
            >
              {feeStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          {feeStatus.map((item, i) => (
            <span key={item.name} className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      <div className="chart-card chart-card-wide">
        <p className="chart-label">Collections</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthly} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatUgxAxis} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`UGX ${v.toLocaleString()}`, '']}
            />
            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <p className="chart-label">Payments</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={methods} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PredictionAlerts({ insights }: { insights: MlInsights }) {
  const total = insights.atRiskFeeStudents + insights.atRiskAcademicStudents;

  const items = [
    { icon: '💰', value: insights.atRiskFeeStudents, hint: 'Fee follow-up' },
    { icon: '📚', value: insights.atRiskAcademicStudents, hint: 'Academic support' },
    { icon: '🔔', value: total, hint: 'Total alerts' },
  ];

  return (
    <div className="prediction-alerts-wrap">
      <div className="prediction-alerts">
        {items.map((item) => (
          <div key={item.hint} className="prediction-alert">
            <span className="prediction-alert-icon" aria-hidden>{item.icon}</span>
            <span className="prediction-alert-value">{item.value}</span>
            <span className="prediction-alert-hint">{item.hint}</span>
          </div>
        ))}
      </div>
      {insights.summary ? (
        <p className="prediction-alerts-summary">{insights.summary}</p>
      ) : null}
    </div>
  );
}
