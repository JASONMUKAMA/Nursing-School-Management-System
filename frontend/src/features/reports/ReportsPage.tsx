import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { academicApi, reportsApi, studentsApi } from '../../api/endpoints';
import { StudentResultsTranscript } from '../../components/results/StudentResultsTranscript';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { useAuth } from '../../hooks/useAuth';
import type { FeeBalanceRow, Program, Student, StudentResult } from '../../types';
import { describeStudentFeeStatus, feeStatusBadgeClass } from '../../utils/feeDisplay';
import { sectionFromPath } from '../../utils/routing';

type ReportTab = 'fee-balances' | 'results';

export function ReportsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = useMemo(() => sectionFromPath(pathname, '/app/reports', 'fee-balances') as ReportTab, [pathname]);
  const { hasRole } = useAuth();
  const canViewFees = hasRole('Admin', 'FinanceOfficer');
  const canViewResults = hasRole('Admin', 'Registrar', 'Lecturer');

  const [results, setResults] = useState<StudentResult[]>([]);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pathname === '/app/reports' || pathname === '/app/reports/') {
      navigate(canViewFees ? '/app/reports/fee-balances' : '/app/reports/results', { replace: true });
    } else if (tab === 'fee-balances' && !canViewFees) {
      navigate('/app/reports/results', { replace: true });
    } else if (tab === 'results' && !canViewResults) {
      navigate('/app/reports/fee-balances', { replace: true });
    }
  }, [pathname, navigate, tab, canViewFees, canViewResults]);

  useEffect(() => {
    academicApi
      .getPrograms(1, 100)
      .then((r) => setPrograms(r.items ?? (r as { Items?: Program[] }).Items ?? []))
      .catch(() => {});
  }, []);

  const fetchFeeBalances = useCallback(
    (page: number, pageSize: number, search: string) =>
      reportsApi.getFeeBalances(programId || undefined, page, pageSize, search || undefined),
    [programId],
  );

  const loadResultsReport = async (id: string) => {
    if (!id) {
      setError('Select a student to load the results report.');
      setResults([]);
      setStudentProfile(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [studentData, resultsData] = await Promise.all([
        studentsApi.getById(id),
        reportsApi.getResultsReport(id),
      ]);
      setStudentProfile(studentData);
      setResults(resultsData);
    } catch {
      setError('Failed to load results report.');
      setResults([]);
      setStudentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{tab === 'fee-balances' ? 'Fee Balance Report' : 'Student Results Report'}</h2>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {tab === 'fee-balances' && canViewFees && (
        <Card
          actions={
            <Select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              options={[{ value: '', label: 'All Programs' }, ...programs.map((p) => ({ value: p.id, label: p.name }))]}
            />
          }
        >
          <ServerDataTable<FeeBalanceRow>
            columns={[
              { key: 'studentNo', header: 'Student No', render: (r) => r.studentNo },
              { key: 'name', header: 'Name', render: (r) => r.studentName },
              { key: 'program', header: 'Program', render: (r) => r.programName },
              { key: 'invoiced', header: 'Invoiced', render: (r) => `UGX ${r.totalInvoiced.toLocaleString()}` },
              { key: 'paid', header: 'Paid', render: (r) => `UGX ${r.totalPaid.toLocaleString()}` },
              { key: 'balance', header: 'Balance', render: (r) => `UGX ${r.balance.toLocaleString()}` },
              {
                key: 'status',
                header: 'Paid / Due',
                render: (r) => (
                  <div className="fee-status-cell">
                    <span className={`badge ${feeStatusBadgeClass(r.feeStatus)}`}>{r.feeStatus}</span>
                    <span className="text-muted fee-status-detail">
                      {describeStudentFeeStatus(r)}
                    </span>
                  </div>
                ),
                print: (r) => describeStudentFeeStatus(r),
              },
            ]}
            keyField="studentId"
            fetchData={fetchFeeBalances}
            searchPlaceholder="Search students..."
            refreshKey={programId}
          />
        </Card>
      )}

      {tab === 'results' && canViewResults && (
        <Card title="Student results report">
          <div className="toolbar" style={{ marginBottom: '1rem' }}>
            <StudentSearchSelect
              label="Student"
              value={studentId}
              onChange={(id) => {
                setStudentId(id);
                void loadResultsReport(id);
              }}
              placeholder="Search student to generate report..."
            />
          </div>
          {loading ? (
            <Loading />
          ) : studentProfile ? (
            <StudentResultsTranscript
              student={studentProfile}
              results={results}
              title="Student Results Report"
            />
          ) : (
            <p className="empty-state">Search for a student above to generate their results report.</p>
          )}
        </Card>
      )}
    </div>
  );
}
