import { FormEvent, useCallback, useEffect, useState } from 'react';
import { academicApi, applicationsApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import type { Application, Program } from '../../types';

export function AdmissionsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    programId: '',
  });

  const fetchApplications = useCallback(
    (page: number, pageSize: number, search: string) =>
      applicationsApi.getAll(page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    if (!showModal) return;
    academicApi
      .getPrograms(1, 100)
      .then((r) => setPrograms(r.items ?? (r as { Items?: Program[] }).Items ?? []))
      .catch(() => setError('Failed to load programs.'));
  }, [showModal]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await applicationsApi.create(form);
      setSuccess('Application submitted successfully.');
      setShowModal(false);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setError('');
    try {
      await applicationsApi.approve(id, true, 'Student@123');
      setSuccess('Application approved and student account created.');
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Failed to approve application.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Admissions</h2>
        <p className="text-muted">Review and process student applications.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        title="Applications"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            New Application
          </Button>
        }
      >
        <ServerDataTable<Application>
          columns={[
            { key: 'applicationNo', header: 'App No', render: (a) => a.applicationNo },
            { key: 'name', header: 'Applicant', render: (a) => `${a.firstName} ${a.lastName}` },
            { key: 'program', header: 'Program', render: (a) => a.programName },
            { key: 'email', header: 'Email', render: (a) => a.email },
            { key: 'status', header: 'Status', render: (a) => <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span> },
            { key: 'submitted', header: 'Submitted', render: (a) => new Date(a.submittedAt).toLocaleDateString() },
            {
              key: 'actions',
              header: 'Actions',
              render: (a) =>
                a.status === 'Pending' ? (
                  <Button size="sm" onClick={() => handleApprove(a.id)} disabled={approvingId === a.id}>
                    {approvingId === a.id ? 'Approving...' : 'Approve'}
                  </Button>
                ) : '—',
            },
          ]}
          keyField="id"
          fetchData={fetchApplications}
          searchPlaceholder="Search applications..."
          refreshKey={refreshKey}
        />
      </Card>

      <Modal
        title="New Application"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        }
      >
        <form className="form-grid">
          <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Select
            label="Program"
            value={form.programId}
            onChange={(e) => setForm({ ...form, programId: e.target.value })}
            options={[
              { value: '', label: 'Select program...' },
              ...programs.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="full-width"
            required
          />
        </form>
      </Modal>
    </div>
  );
}
