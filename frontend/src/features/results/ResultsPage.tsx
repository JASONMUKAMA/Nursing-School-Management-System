import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { academicApi, dashboardApi, financeApi, resultsApi, studentsApi } from '../../api/endpoints';
import { ApiClientError } from '../../api/client';
import { StudentResultsTranscript } from '../../components/results/StudentResultsTranscript';
import { StudentFeeContextPanel } from '../../components/finance/StudentFeeContextPanel';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Select } from '../../components/ui/Select';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { useAuth } from '../../hooks/useAuth';
import type { AssessmentComponent, CourseOffering, Student, StudentInvoicePreview, StudentResult } from '../../types';
import { sectionFromPath } from '../../utils/routing';

export function ResultsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeTab = useMemo(() => sectionFromPath(pathname, '/app/results', 'view') as 'view' | 'marks', [pathname]);
  const { hasRole, user } = useAuth();
  const canManage = hasRole('Admin', 'Lecturer');
  const isStudentOnly = hasRole('Student') && !canManage;
  const [results, setResults] = useState<StudentResult[]>([]);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState(user?.studentId ?? '');
  const [tuitionBlocked, setTuitionBlocked] = useState(false);
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null);
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [markStudentPreview, setMarkStudentPreview] = useState<StudentInvoicePreview | null>(null);
  const [markPreviewLoading, setMarkPreviewLoading] = useState(false);

  useEffect(() => {
    if (pathname === '/app/results' || pathname === '/app/results/') {
      navigate('/app/results/view', { replace: true });
    } else if (activeTab === 'marks' && !canManage) {
      navigate('/app/results/view', { replace: true });
    }
  }, [pathname, navigate, activeTab, canManage]);

  const [markForm, setMarkForm] = useState({
    courseOfferingId: '',
    assessmentComponentId: '',
    studentId: '',
    score: 0,
  });

  const [componentForm, setComponentForm] = useState({
    name: 'Coursework',
    weight: 40,
    maxScore: 100,
  });

  const selectedComponent = useMemo(
    () => components.find((c) => c.id === markForm.assessmentComponentId),
    [components, markForm.assessmentComponentId],
  );

  const offeringLabel = (o: CourseOffering) =>
    `${o.courseName} (${o.semesterName} · ${o.academicYear})`;

  const loadComponents = useCallback(async (courseOfferingId: string) => {
    if (!courseOfferingId) {
      setComponents([]);
      return;
    }
    setLoadingComponents(true);
    try {
      const data = await resultsApi.getComponents(courseOfferingId);
      setComponents(data);
    } catch {
      setComponents([]);
      setError('Failed to load assessments for this course.');
    } finally {
      setLoadingComponents(false);
    }
  }, []);

  const loadResults = useCallback(async (id: string) => {
    if (!id) {
      setResults([]);
      setStudentProfile(null);
      setTuitionBlocked(false);
      setOutstandingBalance(null);
      return;
    }
    setLoading(true);
    setError('');
    setTuitionBlocked(false);
    setOutstandingBalance(null);
    try {
      const studentData = await studentsApi.getById(id);
      setStudentProfile(studentData);
      const resultsData = await resultsApi.getStudentResults(id);
      setResults(resultsData);
    } catch (err) {
      setResults([]);
      if (!(err instanceof ApiClientError && err.status === 403)) {
        setStudentProfile(null);
      }
      if (err instanceof ApiClientError && err.status === 403) {
        setTuitionBlocked(true);
        setError(err.message);
        const match = err.message.match(/UGX ([\d,]+)/);
        if (match) {
          setOutstandingBalance(Number(match[1].replace(/,/g, '')));
        } else if (isStudentOnly && user?.studentId) {
          try {
            const dash = await dashboardApi.getStudent(user.studentId);
            setOutstandingBalance(dash.feeBalance);
          } catch {
            /* ignore */
          }
        }
      } else {
        setError('Failed to load results.');
      }
    } finally {
      setLoading(false);
    }
  }, [isStudentOnly, user?.studentId]);

  useEffect(() => {
    if (user?.studentId) {
      setStudentId(user.studentId);
      if (activeTab === 'view') {
        void loadResults(user.studentId);
      }
    }
  }, [user, activeTab, loadResults]);

  useEffect(() => {
    if (activeTab !== 'marks') return;
    academicApi
      .getCourseOfferings(undefined, 1, 200)
      .then((r) => setOfferings(r.items ?? (r as { Items?: CourseOffering[] }).Items ?? []))
      .catch(() => setError('Failed to load course offerings.'));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'marks' || !markForm.courseOfferingId) return;
    void loadComponents(markForm.courseOfferingId);
  }, [activeTab, markForm.courseOfferingId, loadComponents]);

  const loadMarkStudentPreview = useCallback(async (studentId: string) => {
    if (!studentId) {
      setMarkStudentPreview(null);
      return;
    }
    setMarkPreviewLoading(true);
    try {
      setMarkStudentPreview(await financeApi.getStudentInvoicePreview(studentId));
    } catch {
      setMarkStudentPreview(null);
    } finally {
      setMarkPreviewLoading(false);
    }
  }, []);

  const handleSubmitMark = async (e: FormEvent) => {
    e.preventDefault();
    if (!markForm.assessmentComponentId || !markForm.studentId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await resultsApi.submitMark({
        assessmentComponentId: markForm.assessmentComponentId,
        studentId: markForm.studentId,
        score: markForm.score,
      });
      setSuccess('Mark saved successfully.');
      setMarkForm((prev) => ({ ...prev, studentId: '', score: 0 }));
    } catch {
      setError('Failed to save mark. Check the score is within the allowed range.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateComponent = async (e: FormEvent) => {
    e.preventDefault();
    if (!markForm.courseOfferingId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const created = await resultsApi.createComponent({
        courseOfferingId: markForm.courseOfferingId,
        ...componentForm,
      });
      setSuccess(`Assessment "${created.name}" added.`);
      setComponentForm({ name: 'Coursework', weight: 40, maxScore: 100 });
      setShowAddAssessment(false);
      await loadComponents(markForm.courseOfferingId);
      setMarkForm((prev) => ({ ...prev, assessmentComponentId: created.id }));
    } catch {
      setError('Failed to add assessment component.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{activeTab === 'view' ? 'Student Results' : 'Marks & Assessments'}</h2>
        <p className="text-muted">View and manage student academic results.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {activeTab === 'view' && (
        <Card
          title={isStudentOnly ? undefined : 'Results by student'}
          actions={
            !isStudentOnly ? (
              <div className="toolbar">
                <StudentSearchSelect
                  label="Student"
                  value={studentId}
                  onChange={(id) => {
                    setStudentId(id);
                    void loadResults(id);
                  }}
                  placeholder="Search student to view transcript..."
                />
              </div>
            ) : undefined
          }
        >
          {loading ? (
            <Loading />
          ) : tuitionBlocked ? (
            <div className="tuition-hold-notice">
              <h3>Results withheld</h3>
              <p>
                Marks and transcripts are only released after tuition fees are paid in full.
                {outstandingBalance != null && outstandingBalance > 0 && (
                  <> Outstanding balance: <strong>UGX {outstandingBalance.toLocaleString()}</strong>.</>
                )}
              </p>
              <p className="text-muted">Please visit the finance office or pay your balance to access your results.</p>
            </div>
          ) : studentProfile ? (
            <StudentResultsTranscript student={studentProfile} results={results} />
          ) : (
            <p className="empty-state">
              {studentId ? 'No student record found.' : 'Search for a student above to view their transcript.'}
            </p>
          )}
        </Card>
      )}

      {activeTab === 'marks' && canManage && (
        <>
          <Card title="Enter mark">
            <form className="form-grid" onSubmit={handleSubmitMark}>
              <Select
                className="full-width"
                label="Course"
                value={markForm.courseOfferingId}
                onChange={(e) => {
                  const courseOfferingId = e.target.value;
                  setComponents([]);
                  setLoadingComponents(!!courseOfferingId);
                  setMarkForm({
                    courseOfferingId,
                    assessmentComponentId: '',
                    studentId: markForm.studentId,
                    score: 0,
                  });
                }}
                options={[
                  { value: '', label: 'Select course offering...' },
                  ...offerings.map((o) => ({ value: o.id, label: offeringLabel(o) })),
                ]}
                required
              />
              <Select
                className="full-width"
                label="Assessment"
                value={markForm.assessmentComponentId}
                onChange={(e) =>
                  setMarkForm({ ...markForm, assessmentComponentId: e.target.value, score: 0 })
                }
                disabled={!markForm.courseOfferingId || loadingComponents}
                options={[
                  {
                    value: '',
                    label: loadingComponents
                      ? 'Loading assessments...'
                      : !markForm.courseOfferingId
                        ? 'Select a course first'
                        : components.length === 0
                          ? 'No assessments — add one below'
                          : 'Select assessment...',
                  },
                  ...components.map((c) => ({
                    value: c.id,
                    label: `${c.name} (max ${c.maxScore}, weight ${c.weight}%)`,
                  })),
                ]}
                required
              />
              <StudentSearchSelect
                className="full-width"
                label="Student"
                value={markForm.studentId}
                onChange={(studentId) => {
                  setMarkForm({ ...markForm, studentId });
                  void loadMarkStudentPreview(studentId);
                }}
                disabled={!markForm.assessmentComponentId}
                required
              />
              {(markPreviewLoading || markStudentPreview) && markForm.studentId && (
                <div className="full-width">
                  <StudentFeeContextPanel preview={markStudentPreview} loading={markPreviewLoading} />
                </div>
              )}
              <Input
                className="score-input"
                label={selectedComponent ? `Score (out of ${selectedComponent.maxScore})` : 'Score'}
                type="number"
                min={0}
                max={selectedComponent?.maxScore}
                step="0.5"
                value={markForm.score}
                onChange={(e) => setMarkForm({ ...markForm, score: Number(e.target.value) })}
                disabled={!markForm.assessmentComponentId}
                required
              />
              <div className="mark-entry-actions">
                <Button type="submit" disabled={submitting || !markForm.assessmentComponentId}>
                  {submitting ? 'Saving...' : 'Save mark'}
                </Button>
              </div>
            </form>
          </Card>

          <Card
            title="Assessments for this course"
            actions={
              markForm.courseOfferingId ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddAssessment((v) => !v)}
                >
                  {showAddAssessment ? 'Cancel' : 'Add assessment'}
                </Button>
              ) : undefined
            }
          >
            {!markForm.courseOfferingId ? (
              <p className="empty-state">Select a course above to view or add assessments.</p>
            ) : loadingComponents ? (
              <Loading />
            ) : components.length === 0 && !showAddAssessment ? (
              <p className="empty-state">
                No assessments yet for this course.{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setShowAddAssessment(true)}
                >
                  Add the first assessment
                </button>
              </p>
            ) : (
              <>
                {components.length > 0 && (
                  <ul className="assessment-list">
                    {components.map((c) => (
                      <li key={c.id}>
                        <strong>{c.name}</strong>
                        <span className="text-muted">
                          Max {c.maxScore} · Weight {c.weight}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {showAddAssessment && (
                  <form className="form-grid form-section-spaced" onSubmit={handleCreateComponent}>
                    <Input
                      label="Name"
                      value={componentForm.name}
                      onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Weight (%)"
                      type="number"
                      min={1}
                      max={100}
                      value={componentForm.weight}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, weight: Number(e.target.value) })
                      }
                      required
                    />
                    <Input
                      label="Max score"
                      type="number"
                      min={1}
                      value={componentForm.maxScore}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, maxScore: Number(e.target.value) })
                      }
                      required
                    />
                    <div className="full-width">
                      <Button type="submit" variant="secondary" disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add assessment'}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
