import { FormEvent, useCallback, useEffect, useState } from 'react';
import { academicApi, attendanceApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { useAuth } from '../../hooks/useAuth';
import type { ClassSession, CourseOffering } from '../../types';

export function AttendancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'Lecturer');
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    courseOfferingId: '',
    sessionDate: new Date().toISOString().slice(0, 10),
    topic: '',
    startTime: '08:00',
    endTime: '10:00',
  });

  const fetchSessions = useCallback(
    (page: number, pageSize: number, search: string) =>
      attendanceApi.getSessions(undefined, page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    academicApi.getCourseOfferings(undefined, 1, 200).then((r) => setOfferings(r.items)).catch(() => {});
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await attendanceApi.createSession(form);
      setSuccess('Class session created.');
      setShowModal(false);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Failed to create session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Attendance</h2>
        <p className="text-muted">Manage class sessions and attendance records.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        title="Class Sessions"
        actions={canManage ? <Button size="sm" onClick={() => setShowModal(true)}>New Session</Button> : undefined}
      >
        <ServerDataTable<ClassSession>
          columns={[
            { key: 'course', header: 'Course', render: (s) => s.courseName },
            { key: 'date', header: 'Date', render: (s) => s.sessionDate },
            { key: 'topic', header: 'Topic', render: (s) => s.topic },
            { key: 'time', header: 'Time', render: (s) => `${s.startTime} – ${s.endTime}` },
          ]}
          keyField="id"
          fetchData={fetchSessions}
          searchPlaceholder="Search sessions..."
          refreshKey={refreshKey}
        />
      </Card>

      <Modal
        title="New Class Session"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
          </div>
        }
      >
        <form className="form-grid" onSubmit={handleCreate}>
          <Select
            label="Course Offering"
            value={form.courseOfferingId}
            onChange={(e) => setForm({ ...form, courseOfferingId: e.target.value })}
            options={[{ value: '', label: 'Select offering...' }, ...offerings.map((o) => ({ value: o.id, label: `${o.courseName} (${o.semesterName})` }))]}
            required
          />
          <Input label="Session Date" type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} required />
          <Input label="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required />
          <Input label="Start Time" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <Input label="End Time" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
