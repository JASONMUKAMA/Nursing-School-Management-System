import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { academicApi, classroomApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { CourseOffering, LiveSession } from '../../types';

function StatusBadge({ status }: { status: LiveSession['status'] }) {
  const cls = status === 'Live' ? 'badge-live' : status === 'Ended' ? 'badge-inactive' : 'badge-pending';
  return <span className={`badge ${cls}`}>{status === 'Live' ? '● Live' : status}</span>;
}

export function ClassroomPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole('Admin', 'Lecturer');

  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ courseOfferingId: '', title: '' });

  const fetchSessions = useCallback(
    (page: number, pageSize: number, search: string) =>
      classroomApi.getSessions(undefined, page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    if (!canManage) return;
    academicApi.getCourseOfferings(undefined, 1, 200).then((r) => setOfferings(r.items)).catch(() => {});
  }, [canManage]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.courseOfferingId) {
      setError('Select a course offering first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await classroomApi.createSession(form);
      setSuccess('Classroom created. Start it when you are ready to go live.');
      setShowModal(false);
      setForm({ courseOfferingId: '', title: '' });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the classroom.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (session: LiveSession) => {
    try {
      await classroomApi.startSession(session.id);
      navigate(`/app/classroom/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start the session.');
    }
  };

  const handleEnd = async (session: LiveSession) => {
    try {
      await classroomApi.endSession(session.id);
      setSuccess('Session ended.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end the session.');
    }
  };

  const renderActions = (session: LiveSession) => {
    if (canManage) {
      return (
        <div className="table-actions">
          {session.status === 'Scheduled' && (
            <Button size="sm" onClick={() => void handleStart(session)}>Start</Button>
          )}
          {session.status === 'Live' && (
            <>
              <Button size="sm" onClick={() => navigate(`/app/classroom/${session.id}`)}>Open Room</Button>
              <Button size="sm" variant="danger" onClick={() => void handleEnd(session)}>End</Button>
            </>
          )}
          {session.status === 'Ended' && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/app/classroom/${session.id}`)}>
              Review
            </Button>
          )}
        </div>
      );
    }
    if (session.status === 'Live') {
      return <Button size="sm" onClick={() => navigate(`/app/classroom/${session.id}`)}>Join Class</Button>;
    }
    return (
      <span className="text-muted">
        {session.status === 'Scheduled' ? 'Not started yet' : 'Ended'}
      </span>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Live Classroom</h2>
        <p className="text-muted">
          {canManage
            ? 'Host live video classes, share lecture files, and run real-time quizzes.'
            : 'Join live video classes for your enrolled courses.'}
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        title="Classroom Sessions"
        actions={canManage ? <Button size="sm" onClick={() => setShowModal(true)}>New Classroom</Button> : undefined}
      >
        <ServerDataTable<LiveSession>
          columns={[
            { key: 'course', header: 'Course', render: (s) => `${s.courseCode} — ${s.courseName}` },
            { key: 'title', header: 'Title', render: (s) => s.title },
            { key: 'host', header: 'Host', render: (s) => s.hostName },
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            {
              key: 'started',
              header: 'Started',
              render: (s) => (s.startedAt ? new Date(s.startedAt).toLocaleString() : '—'),
            },
            { key: 'actions', header: 'Actions', render: renderActions },
          ]}
          keyField="id"
          fetchData={fetchSessions}
          searchPlaceholder="Search by course or title..."
          emptyMessage={canManage ? 'No classrooms yet. Create one to get started.' : 'No live classes for your courses yet.'}
          refreshKey={refreshKey}
        />
      </Card>

      <Modal
        title="New Classroom"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        }
      >
        <form className="form-grid" onSubmit={handleCreate}>
          <Select
            label="Course Offering"
            value={form.courseOfferingId}
            onChange={(e) => setForm({ ...form, courseOfferingId: e.target.value })}
            options={[
              { value: '', label: 'Select offering...' },
              ...offerings.map((o) => ({ value: o.id, label: `${o.courseCode} — ${o.courseName} (${o.semesterName})` })),
            ]}
            required
          />
          <Input
            label="Session Title"
            placeholder="e.g. Pharmacology — Week 6 Live Lecture"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <p className="text-muted full-width">
            A secure, unguessable video room is generated automatically for this class.
          </p>
        </form>
      </Modal>
    </div>
  );
}
