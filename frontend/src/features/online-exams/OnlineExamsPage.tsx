import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { academicApi, onlineExamsApi } from '../../api/endpoints';
import { ObjectiveExamBuilder } from '../../components/online-exams/ObjectiveExamBuilder';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { CourseOffering, OnlineExam, OnlineExamListItem, OnlineExamResult } from '../../types';
import { toast } from '../../utils/toast';

function StatusBadge({ status }: { status: OnlineExamListItem['status'] }) {
  const cls = status === 'Published' ? 'badge-live' : status === 'Closed' ? 'badge-inactive' : 'badge-pending';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function OnlineExamsPage() {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole('Admin', 'Lecturer');
  const isStudent = hasRole('Student') && !canManage;
  const studentProfileMissing = isStudent && !user?.studentId;

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingExam, setEditingExam] = useState<OnlineExam | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [resultsExam, setResultsExam] = useState<OnlineExamListItem | null>(null);
  const [results, setResults] = useState<OnlineExamResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const fetchExams = useCallback(
    (page: number, pageSize: number, search: string) =>
      onlineExamsApi.getExams(undefined, page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    if (!canManage) return;
    academicApi.getCourseOfferings(undefined, 1, 200).then((r) => setOfferings(r.items)).catch(() => {});
  }, [canManage]);

  const publish = async (exam: OnlineExamListItem) => {
    try {
      await onlineExamsApi.publishExam(exam.id);
      toast.success('Exam published.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish.');
    }
  };

  const close = async (exam: OnlineExamListItem) => {
    try {
      await onlineExamsApi.closeExam(exam.id);
      toast.success('Exam closed.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close.');
    }
  };

  const openResults = async (exam: OnlineExamListItem) => {
    setResultsExam(exam);
    setLoadingResults(true);
    try {
      setResults(await onlineExamsApi.getExamResults(exam.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load results.');
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const openEdit = async (exam: OnlineExamListItem) => {
    setLoadingEdit(true);
    try {
      setEditingExam(await onlineExamsApi.getExam(exam.id));
      setShowBuilder(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load exam for editing.');
    } finally {
      setLoadingEdit(false);
    }
  };

  const closeBuilder = () => {
    setShowBuilder(false);
    setEditingExam(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Online Exams</h2>
          <p className="text-muted">Objective (multiple choice) exams — separate from live classroom quizzes.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingExam(null); setShowBuilder(true); }}>+ New Exam</Button>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {studentProfileMissing && (
        <div className="alert alert-info" role="alert">
          Signed in as <strong>{user?.userName}</strong>, but this account is not linked to a student profile.
          Log in with <strong>student1</strong> / <strong>Student@123</strong> to see your exams.
        </div>
      )}

      <Card>
        <ServerDataTable<OnlineExamListItem>
          columns={[
            { key: 'title', header: 'Exam', render: (r) => r.title },
            { key: 'course', header: 'Course', render: (r) => `${r.courseCode} — ${r.courseName}` },
            { key: 'questions', header: 'Questions', render: (r) => `${r.questionCount} · ${r.maxScore} pts` },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ...(canManage
              ? [{
                  key: 'author',
                  header: 'Created by',
                  render: (r: OnlineExamListItem) => r.createdByName,
                }]
              : []),
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="table-actions">
                  {isStudent && r.status !== 'Draft' && (
                    <Button size="sm" onClick={() => navigate(`/app/online-exams/${r.id}`)}>
                      {r.status === 'Published' ? 'Take Exam' : 'View'}
                    </Button>
                  )}
                  {canManage && r.status !== 'Closed' && (
                    <Button size="sm" variant="secondary" onClick={() => void openEdit(r)} disabled={loadingEdit}>
                      Edit
                    </Button>
                  )}
                  {canManage && r.status === 'Draft' && (
                    <Button size="sm" onClick={() => void publish(r)}>Publish</Button>
                  )}
                  {canManage && r.status === 'Published' && (
                    <Button size="sm" variant="danger" onClick={() => void close(r)}>Close</Button>
                  )}
                  {canManage && r.status !== 'Draft' && (
                    <Button size="sm" variant="secondary" onClick={() => void openResults(r)}>Results</Button>
                  )}
                </div>
              ),
            },
          ]}
          keyField="id"
          fetchData={fetchExams}
          searchPlaceholder="Search exams or courses…"
          refreshKey={refreshKey}
          emptyMessage={isStudent ? 'No published exams for your courses yet.' : 'No online exams yet.'}
        />
      </Card>

      <Modal
        title={editingExam ? 'Edit Online Exam' : 'Create Online Exam'}
        isOpen={showBuilder}
        onClose={closeBuilder}
        size="lg"
      >
        <ObjectiveExamBuilder
          offerings={offerings}
          exam={editingExam}
          onSaved={() => {
            closeBuilder();
            setRefreshKey((k) => k + 1);
          }}
          onCancel={closeBuilder}
        />
      </Modal>

      <Modal
        title={resultsExam ? `Results — ${resultsExam.title}` : 'Results'}
        isOpen={Boolean(resultsExam)}
        onClose={() => setResultsExam(null)}
        size="lg"
      >
          {loadingResults ? (
            <p className="text-muted">Loading…</p>
          ) : results.length === 0 ? (
            <p className="empty-state">No submissions yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student No</th>
                    <th>Score</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.submissionId}>
                      <td>{r.studentName}</td>
                      <td>{r.studentNo}</td>
                      <td><strong>{r.score}</strong> / {r.maxScore}</td>
                      <td>{new Date(r.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Modal>
    </div>
  );
}
