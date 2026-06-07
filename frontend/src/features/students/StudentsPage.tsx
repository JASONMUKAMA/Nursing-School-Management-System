import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiClientError } from '../../api/client';
import { academicApi, studentsApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EditRowButton } from '../../components/ui/EditRowButton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PhotoUploadField } from '../../components/ui/PhotoUploadField';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { ProfileViewModal } from '../../components/ui/ProfileViewModal';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { ViewRowButton } from '../../components/ui/ViewRowButton';
import { useAuth } from '../../hooks/useAuth';
import type { Program, Student } from '../../types';

const STUDENT_STATUSES = [
  { value: 'Active', label: 'Active' },
  { value: 'Graduated', label: 'Graduated' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Withdrawn', label: 'Withdrawn' },
];

type StudentForm = {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  programId: string;
  admissionDate: string;
  status: string;
};

const emptyForm = (): StudentForm => ({
  firstName: '',
  lastName: '',
  gender: 'Female',
  dateOfBirth: '',
  phone: '',
  email: '',
  address: '',
  programId: '',
  admissionDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
});

function toForm(student: Student): StudentForm {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth.slice(0, 10),
    phone: student.phone,
    email: student.email,
    address: student.address,
    programId: student.programId,
    admissionDate: student.admissionDate.slice(0, 10),
    status: student.status,
  };
}

export function StudentsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'Registrar');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [nationalIdFront, setNationalIdFront] = useState<File | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<File | null>(null);

  const fetchStudents = useCallback(
    (page: number, pageSize: number, search: string) =>
      studentsApi.getAll(page, pageSize, search || undefined),
    [],
  );

  useEffect(() => {
    academicApi.getPrograms(1, 100).then((r) => setPrograms(r.items)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setProfilePhoto(null);
    setNationalIdFront(null);
    setNationalIdBack(null);
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setViewOpen(false);
    setEditing(student);
    setForm(toForm(student));
    setProfilePhoto(null);
    setNationalIdFront(null);
    setNationalIdBack(null);
    setModalOpen(true);
  };

  const openView = async (student: Student) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewing(student);
    try {
      const full = await studentsApi.getById(student.id);
      setViewing(full);
    } catch {
      setViewing(student);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    setViewOpen(false);
    setViewing(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const uploadDocuments = async (studentId: string) => {
    if (profilePhoto) await studentsApi.uploadProfilePhoto(studentId, profilePhoto);
    if (nationalIdFront) await studentsApi.uploadNationalIdFront(studentId, nationalIdFront);
    if (nationalIdBack) await studentsApi.uploadNationalIdBack(studentId, nationalIdBack);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        await studentsApi.update(editing.id, form);
        await uploadDocuments(editing.id);
        setSuccess('Student updated successfully.');
      } else {
        const { status: _status, ...createPayload } = form;
        const student = await studentsApi.create(createPayload);
        await uploadDocuments(student.id);
        setSuccess('Student created successfully.');
      }
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to save student.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'photo',
      header: '',
      render: (s: Student) => <ProfileAvatar url={s.profilePhotoUrl} key={`${s.id}-${s.profilePhotoUrl ?? 'none'}-${refreshKey}`} />,
    },
    { key: 'studentNo', header: 'Student No', render: (s: Student) => s.studentNo },
    { key: 'name', header: 'Name', render: (s: Student) => `${s.firstName} ${s.lastName}` },
    { key: 'program', header: 'Program', render: (s: Student) => s.programName },
    { key: 'email', header: 'Email', render: (s: Student) => s.email },
    { key: 'phone', header: 'Phone', render: (s: Student) => s.phone },
    {
      key: 'idDoc',
      header: 'National ID',
      render: (s: Student) => (
        <span className="id-doc-status">
          <span className={`badge ${s.nationalIdFrontUrl ? 'badge-active' : 'badge-pending'}`}>Front</span>
          <span className={`badge ${s.nationalIdBackUrl ? 'badge-active' : 'badge-pending'}`}>Back</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: Student) => (
        <span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '5rem',
      render: (s: Student) => (
        <div className="row-actions">
          <ViewRowButton label={`View ${s.firstName} ${s.lastName}`} onClick={() => void openView(s)} />
          {canManage && (
            <EditRowButton label={`Edit ${s.firstName} ${s.lastName}`} onClick={() => openEdit(s)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Students</h2>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        title="Student Registry"
        actions={
          canManage ? (
            <Button size="sm" onClick={openCreate}>Add Student</Button>
          ) : undefined
        }
      >
        <ServerDataTable<Student>
          columns={columns}
          keyField="id"
          fetchData={fetchStudents}
          searchPlaceholder="Search by name or student number..."
          refreshKey={refreshKey}
        />
      </Card>

      <Modal
        title={editing ? `Edit Student — ${editing.studentNo}` : 'Add Student'}
        isOpen={modalOpen}
        onClose={closeModal}
        size="lg"
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Student'}
            </Button>
          </div>
        }
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="full-width photo-upload-row photo-upload-row-three">
            <PhotoUploadField
              label="Profile photo"
              hint="Upload a photo or capture from your camera."
              value={profilePhoto}
              onChange={setProfilePhoto}
              existingUrl={editing?.profilePhotoUrl}
            />
            <PhotoUploadField
              label="National ID — front"
              hint="Front side of national ID (JPG, PNG, or PDF)."
              value={nationalIdFront}
              onChange={setNationalIdFront}
              acceptDocuments
              existingUrl={editing?.nationalIdFrontUrl}
            />
            <PhotoUploadField
              label="National ID — back"
              hint="Back side of national ID (JPG, PNG, or PDF)."
              value={nationalIdBack}
              onChange={setNationalIdBack}
              acceptDocuments
              existingUrl={editing?.nationalIdBackUrl}
            />
          </div>
          <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }]} />
          <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="full-width" />
          <Select label="Program" value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} options={[{ value: '', label: 'Select program...' }, ...programs.map((p) => ({ value: p.id, label: p.name }))]} required />
          <Input label="Admission Date" type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} required />
          {editing && (
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STUDENT_STATUSES} required />
          )}
        </form>
      </Modal>

      <ProfileViewModal
        isOpen={viewOpen}
        onClose={closeView}
        title={viewing ? `${viewing.firstName} ${viewing.lastName}` : 'Student profile'}
        subtitle={viewing?.studentNo}
        loading={viewLoading}
        profilePhotoUrl={viewing?.profilePhotoUrl}
        nationalIdFrontUrl={viewing?.nationalIdFrontUrl}
        nationalIdBackUrl={viewing?.nationalIdBackUrl}
        onEdit={canManage && viewing ? () => openEdit(viewing) : undefined}
        fields={viewing ? [
          { label: 'Program', value: viewing.programName },
          { label: 'Status', value: viewing.status },
          { label: 'Gender', value: viewing.gender },
          { label: 'Date of birth', value: viewing.dateOfBirth.slice(0, 10) },
          { label: 'Admission date', value: viewing.admissionDate.slice(0, 10) },
          { label: 'Phone', value: viewing.phone },
          { label: 'Email', value: viewing.email },
          { label: 'Address', value: viewing.address },
        ] : []}
      />
    </div>
  );
}
