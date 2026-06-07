import { useCallback, useEffect, useState } from 'react';
import { analyticsApi, dashboardApi } from '../../api/endpoints';
import { DashboardCharts, PredictionAlerts } from '../../components/charts/DashboardCharts';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { StatTrendBadge } from '../../components/ui/StatTrendBadge';
import { useAuth } from '../../hooks/useAuth';
import type {
  AdminDashboard,
  DashboardStatTrends,
  DashboardSummary,
  FinanceDashboard,
  SchoolEvent,
  StatTrend,
  StudentDashboard,
  StudentRiskRow,
} from '../../types';
import { getPrimaryRole, ROLES } from '../../utils/roles';

function formatUgxCompact(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

function formatUgx(value: number) {
  return `UGX ${value.toLocaleString()}`;
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function riskIcon(type: string) {
  if (type.includes('Fee') && type.includes('Academic')) return '⚠️';
  if (type.includes('Fee')) return '💰';
  return '📚';
}

function EventsList({ events }: { events: SchoolEvent[] }) {
  if (events.length === 0) return <p className="text-muted">No upcoming events.</p>;
  return (
    <ul className="dashboard-events-list">
      {events.map((event) => (
        <li key={event.id} className="dashboard-event-item">
          <div>
            <strong>{event.title}</strong>
            <p className="text-muted">{event.description}</p>
          </div>
          <div className="dashboard-event-meta">
            <span>{formatEventDate(event.startDate)}</span>
            <span>{event.location}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboard | null>(null);
  const [financeData, setFinanceData] = useState<FinanceDashboard | null>(null);
  const [studentData, setStudentData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAtRisk = useCallback(
    (page: number, pageSize: number, search: string) =>
      analyticsApi.getAtRiskStudents(page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    if (!user) return;
    const role = getPrimaryRole(user);
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        if (role === 'Admin') setAdminData(await dashboardApi.getAdmin());
        else if (role === 'FinanceOfficer') setFinanceData(await dashboardApi.getFinance());
        else if (role === 'Student' && user.studentId) setStudentData(await dashboardApi.getStudent(user.studentId));
        else setSummary(await dashboardApi.getSummary());
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  if (!user) return null;

  const role = getPrimaryRole(user);
  const charts = adminData?.charts ?? financeData?.charts ?? null;
  const insights = charts?.mlInsights;

  const roleMessages: Record<string, string> = {
    Admin: 'School overview at a glance.',
    Registrar: 'Admissions, students, and academic records.',
    Lecturer: 'Attendance, marks, and course sessions.',
    ClinicalCoordinator: 'Clinical facilities and placements.',
    FinanceOfficer: 'Fees, collections, and balances.',
    Student: 'Your progress and records.',
  };

  type StatItem = {
    label: string;
    value: string;
    icon: string;
    sub: string;
    isMoney?: boolean;
    wide?: boolean;
    trend?: StatTrend | null;
  };

  const renderStats = (): StatItem[] => {
    const t = (trends: DashboardStatTrends | null | undefined, key: keyof DashboardStatTrends) =>
      trends?.[key] ?? null;

    if (role === 'Admin' && adminData) {
      const tr = adminData.trends;
      return [
        { label: 'Students', value: adminData.totalStudents.toLocaleString(), icon: '👨‍🎓', sub: 'enrolled', trend: t(tr, 'students') },
        { label: 'Active', value: adminData.activeStudents.toLocaleString(), icon: '✓', sub: 'this term', trend: t(tr, 'active') },
        { label: 'Collected', value: formatUgxCompact(adminData.collectedFees), icon: '💳', sub: 'UGX', isMoney: true, trend: t(tr, 'collected') },
        { label: 'Outstanding', value: formatUgxCompact(adminData.outstandingFees), icon: '💰', sub: 'UGX', isMoney: true, trend: t(tr, 'outstanding') },
        { label: 'Placements', value: String(adminData.activePlacements), icon: '🏥', sub: 'active', trend: t(tr, 'placements') },
        { label: 'Applications', value: String(adminData.pendingApplications), icon: '📝', sub: 'pending', trend: t(tr, 'applications') },
      ];
    }
    if (role === 'FinanceOfficer' && financeData) {
      const rate = ((financeData.totalCollected / Math.max(1, financeData.totalInvoiced)) * 100).toFixed(0);
      const tr = financeData.trends;
      return [
        { label: 'Invoiced', value: formatUgxCompact(financeData.totalInvoiced), icon: '🧾', sub: 'UGX', isMoney: true, trend: t(tr, 'invoiced') },
        { label: 'Collected', value: formatUgxCompact(financeData.totalCollected), icon: '💳', sub: 'UGX', isMoney: true, trend: t(tr, 'collected') },
        { label: 'Outstanding', value: formatUgxCompact(financeData.outstanding), icon: '💰', sub: 'UGX', isMoney: true, trend: t(tr, 'outstanding') },
        { label: 'Overdue', value: String(financeData.overdueCount), icon: '⚠️', sub: 'invoices', trend: t(tr, 'overdue') },
        { label: 'Collection', value: `${rate}%`, icon: '📈', sub: 'rate', trend: t(tr, 'collectionRate') },
      ];
    }
    if (role === 'Student' && studentData) {
      return [
        { label: 'Program', value: studentData.programName, icon: '📚', sub: '', wide: true },
        { label: 'Courses', value: String(studentData.coursesEnrolled), icon: '📖', sub: 'enrolled' },
        { label: 'Attendance', value: `${studentData.attendancePercent}%`, icon: '📅', sub: '' },
        { label: 'Balance', value: formatUgxCompact(studentData.feeBalance), icon: '💰', sub: 'UGX', isMoney: true },
        { label: 'Status', value: studentData.feeStatus, icon: '📋', sub: 'fees' },
      ];
    }
    if (summary) {
      const tr = summary.trends;
      return [
        { label: 'Students', value: summary.totalStudents.toLocaleString(), icon: '👨‍🎓', sub: 'total', trend: t(tr, 'students') },
        { label: 'Active', value: summary.activeStudents.toLocaleString(), icon: '✓', sub: '', trend: t(tr, 'active') },
        { label: 'Applications', value: String(summary.pendingApplications), icon: '📝', sub: 'pending', trend: t(tr, 'applications') },
        { label: 'Outstanding', value: formatUgxCompact(summary.outstandingBalance), icon: '💰', sub: 'UGX', isMoney: true, trend: t(tr, 'outstanding') },
        { label: 'Placements', value: String(summary.activePlacements), icon: '🏥', sub: 'active', trend: t(tr, 'placements') },
      ];
    }
    return [];
  };

  const stats = renderStats();

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="text-muted">{roleMessages[role] ?? 'Welcome to NSMS.'}</p>
      </div>

      <Card title={`${ROLES[role]} Overview`}>
        {loading && <Loading />}
        {error && <p className="text-error">{error}</p>}
        {!loading && !error && (
          <div className="stats-grid stats-grid-compact">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`stat-card-v2${stat.isMoney ? ' stat-card-money' : ''}${stat.wide ? ' stat-card-wide' : ''}`}
              >
                <div className="stat-card-v2-top">
                  <span className="stat-card-v2-icon">{stat.icon}</span>
                  <StatTrendBadge trend={stat.trend} />
                </div>
                <div className="stat-card-v2-body">
                  <span className="stat-card-v2-value">{stat.value}</span>
                  <span className="stat-card-v2-label">
                    {stat.label}
                    {stat.sub ? <span className="stat-card-v2-sub"> · {stat.sub}</span> : null}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!loading && insights && (role === 'Admin' || role === 'FinanceOfficer') && (
        <Card title="Predictions" className="dashboard-section-card">
          <PredictionAlerts insights={insights} />
        </Card>
      )}

      {!loading && charts && (
        <Card title="Overview" className="dashboard-section-card">
          <DashboardCharts charts={charts} />
        </Card>
      )}

      {!loading && role === 'Admin' && (
        <Card title="Students Needing Attention" className="dashboard-section-card">
          <ServerDataTable<StudentRiskRow>
            columns={[
              { key: 'studentNo', header: 'No', render: (r) => r.studentNo },
              { key: 'name', header: 'Name', render: (r) => r.studentName },
              { key: 'program', header: 'Program', render: (r) => r.programName },
              {
                key: 'risk',
                header: '',
                width: '40px',
                render: (r) => <span title={r.riskType}>{riskIcon(r.riskType)}</span>,
              },
              { key: 'rec', header: 'Suggested action', render: (r) => r.recommendation },
            ]}
            keyField="studentId"
            fetchData={fetchAtRisk}
            searchPlaceholder="Search students..."
            pageSize={10}
          />
        </Card>
      )}

      {!loading && adminData && adminData.events.length > 0 && (
        <Card title="Upcoming Events" className="dashboard-section-card">
          <EventsList events={adminData.events} />
        </Card>
      )}

      {!loading && financeData && financeData.recentPayments.length > 0 && (
        <Card title="Recent Payments" className="dashboard-section-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {financeData.recentPayments.map((p) => (
                  <tr key={p.receiptNo}>
                    <td>{p.receiptNo}</td>
                    <td>{p.studentName}</td>
                    <td>{formatUgx(p.amount)}</td>
                    <td>{p.paymentMethod}</td>
                    <td>{p.paymentDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && studentData && studentData.upcomingEvents.length > 0 && (
        <Card title="Upcoming Events" className="dashboard-section-card">
          <EventsList events={studentData.upcomingEvents} />
        </Card>
      )}
    </div>
  );
}
