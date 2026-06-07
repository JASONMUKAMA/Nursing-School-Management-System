import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../api/client';
import { academicApi, studentsApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EditRowButton } from '../../components/ui/EditRowButton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PhotoUploadField } from '../../components/ui/PhotoUploadField';
import { ProfileViewModal } from '../../components/ui/ProfileViewModal';
import { StudentProfileUploads } from '../../components/ui/StudentProfileUploads';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { ViewRowButton } from '../../components/ui/ViewRowButton';
import { useAuth } from '../../hooks/useAuth';
import type { Program, Student } from '../../types';
import { getStudentPhotoUrl, mergeStudentMedia } from '../../utils/studentMedia';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { hydrateStudentPhotos, setStudentPhoto } from '../../utils/studentPhotoStore';

type UploadField = 'photo' | 'idFront' | 'idBack';

type FieldUploadStatus = {
  status: 'idle' | 'uploading' | 'saved' | 'error' | 'pending';
  message?: string;
};

const emptyFieldStatus = (): Record<UploadField, FieldUploadStatus> => ({
  photo: { status: 'idle' },
  idFront: { status: 'idle' },
  idBack: { status: 'idle' },
});

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
  const [uploadingField, setUploadingField] = useState<'photo' | 'idFront' | 'idBack' | null>(null);
  const [fieldUploadStatus, setFieldUploadStatus] = useState(emptyFieldStatus);
  const [modalError, setModalError] = useState('');
  const [rowPatchTick, setRowPatchTick] = useState(0);
  const rowPatchesRef = useRef<Record<string, Partial<Student>>>({});
  const pendingFilesRef = useRef({
    photo: null as File | null,
    idFront: null as File | null,
    idBack: null as File | null,
  });

  const applyRowPatch = (row: Student): Student => {
    const patch = rowPatchesRef.current[row.id];
    if (!patch) return row;
    return mergeStudentMedia(row, patch as Student);
  };

  const rememberMedia = (...students: (Student | null | undefined)[]) => {
    const valid = students.filter((s): s is Student => Boolean(s));
    if (valid.length === 0) return;
    hydrateStudentPhotos(valid);
    let patches = rowPatchesRef.current;
    let changed = false;
    for (const student of valid) {
      const photo = getStudentPhotoUrl(student);
      if (photo) {
        setStudentPhoto(student.id, photo);
        if (patches[student.id]?.profilePhotoUrl !== photo) {
          patches = {
            ...patches,
            [student.id]: { ...patches[student.id], profilePhotoUrl: photo },
          };
          changed = true;
        }
      }
      if (student.nationalIdFrontUrl || student.nationalIdBackUrl) {
        patches = {
          ...patches,
          [student.id]: {
            ...patches[student.id],
            nationalIdFrontUrl: student.nationalIdFrontUrl ?? patches[student.id]?.nationalIdFrontUrl,
            nationalIdBackUrl: student.nationalIdBackUrl ?? patches[student.id]?.nationalIdBackUrl,
          },
        };
        changed = true;
      }
    }
    if (!changed) return;
    rowPatchesRef.current = patches;
    setRowPatchTick((t) => t + 1);
  };

  const syncStudent = (updated: Student, preserve?: Student | null) => {
    const base = preserve ?? editing;
    const merged = base ? mergeStudentMedia(base, updated) : updated;
    rememberMedia(merged);
    setEditing(merged);
    setRefreshKey((k) => k + 1);
    if (viewing?.id === merged.id) setViewing(merged);
  };

  const fetchStudents = useCallback(async (page: number, pageSize: number, search: string) => {
    const result = await studentsApi.getAll(page, pageSize, search || undefined);
    rememberMedia(...result.items);
    return {
      ...result,
      items: result.items.map((row) => applyRowPatch(row)),
    };
  }, []);

  const setFieldStatus = (field: UploadField, status: FieldUploadStatus) => {
    setFieldUploadStatus((prev) => ({ ...prev, [field]: status }));
  };

  const queueFile = (field: UploadField, file: File | null) => {
    setModalError('');
    if (!file) {
      if (field === 'photo') {
        setProfilePhoto(null);
        pendingFilesRef.current.photo = null;
      }
      if (field === 'idFront') {
        setNationalIdFront(null);
        pendingFilesRef.current.idFront = null;
      }
      if (field === 'idBack') {
        setNationalIdBack(null);
        pendingFilesRef.current.idBack = null;
      }
      setFieldStatus(field, { status: 'idle' });
      return;
    }

    if (field === 'photo') {
      setProfilePhoto(file);
      pendingFilesRef.current.photo = file;
    }
    if (field === 'idFront') {
      setNationalIdFront(file);
      pendingFilesRef.current.idFront = file;
    }
    if (field === 'idBack') {
      setNationalIdBack(file);
      pendingFilesRef.current.idBack = file;
    }
    setFieldStatus(field, {
      status: 'pending',
      message: 'Selected — press Save to upload.',
    });
  };

  const instantUpload = async (field: UploadField, file: File | null) => {
    if (!file) {
      queueFile(field, null);
      return;
    }

    if (!editing) {
      queueFile(field, file);
      return;
    }

    setUploadingField(field);
    setModalError('');
    setFieldStatus(field, { status: 'uploading', message: 'Uploading to server…' });
    try {
      const updated =
        field === 'photo'
          ? await studentsApi.uploadProfilePhoto(editing.id, file)
          : field === 'idFront'
            ? await studentsApi.uploadNationalIdFront(editing.id, file)
            : await studentsApi.uploadNationalIdBack(editing.id, file);
      syncStudent(updated, editing);
      setFieldStatus(field, {
        status: 'saved',
        message:
          field === 'photo'
            ? 'Profile photo saved.'
            : field === 'idFront'
              ? 'National ID (front) saved.'
              : 'National ID (back) saved.',
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Upload failed.';
      setFieldStatus(field, { status: 'error', message });
      setModalError(message);
    } finally {
      setUploadingField(null);
    }
  };

  useEffect(() => {
    academicApi.getPrograms(1, 100).then((r) => setPrograms(r.items)).catch(() => {});
  }, []);

  const clearPendingFiles = () => {
    setProfilePhoto(null);
    setNationalIdFront(null);
    setNationalIdBack(null);
    pendingFilesRef.current = { photo: null, idFront: null, idBack: null };
    setFieldUploadStatus(emptyFieldStatus());
    setModalError('');
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    clearPendingFiles();
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setViewOpen(false);
    setEditing(student);
    setForm(toForm(student));
    clearPendingFiles();
    setFieldUploadStatus({
      photo: student.profilePhotoUrl ? { status: 'saved', message: 'Photo on file.' } : { status: 'idle' },
      idFront: student.nationalIdFrontUrl ? { status: 'saved', message: 'Front on file.' } : { status: 'idle' },
      idBack: student.nationalIdBackUrl ? { status: 'saved', message: 'Back on file.' } : { status: 'idle' },
    });
    setModalOpen(true);
  };

  const openView = async (student: Student) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewing(student);
    try {
      const full = await studentsApi.getById(student.id);
      rememberMedia(full);
      setViewing(full);
      const listPhoto = getStudentPhotoUrl(student);
      const fullPhoto = getStudentPhotoUrl(full);
      if (fullPhoto && fullPhoto !== listPhoto) {
        setRefreshKey((k) => k + 1);
      }
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

  const uploadDocuments = async (studentId: string): Promise<Student | null> => {
    let latest: Student | null = null;
    const tasks: { field: UploadField; file: File; upload: (id: string, f: File) => Promise<Student> }[] = [];

    const photoFile = pendingFilesRef.current.photo;
    const frontFile = pendingFilesRef.current.idFront;
    const backFile = pendingFilesRef.current.idBack;

    if (photoFile) {
      tasks.push({ field: 'photo', file: photoFile, upload: studentsApi.uploadProfilePhoto });
    }
    if (frontFile) {
      tasks.push({ field: 'idFront', file: frontFile, upload: studentsApi.uploadNationalIdFront });
    }
    if (backFile) {
      tasks.push({ field: 'idBack', file: backFile, upload: studentsApi.uploadNationalIdBack });
    }

    for (const task of tasks) {
      setUploadingField(task.field);
      setFieldStatus(task.field, { status: 'uploading', message: 'Uploading to server…' });
      try {
        latest = await task.upload(studentId, task.file);
        if (task.field === 'photo') {
          setProfilePhoto(null);
          pendingFilesRef.current.photo = null;
        }
        if (task.field === 'idFront') {
          setNationalIdFront(null);
          pendingFilesRef.current.idFront = null;
        }
        if (task.field === 'idBack') {
          setNationalIdBack(null);
          pendingFilesRef.current.idBack = null;
        }
        setFieldStatus(task.field, {
          status: 'saved',
          message:
            task.field === 'photo'
              ? 'Profile photo saved.'
              : task.field === 'idFront'
                ? 'National ID (front) saved.'
                : 'National ID (back) saved.',
        });
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Upload failed.';
        setFieldStatus(task.field, { status: 'error', message });
        throw new ApiClientError(message, err instanceof ApiClientError ? err.status : 500);
      }
    }

    setUploadingField(null);
    return latest;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setModalError('');
    try {
      if (editing) {
        const snapshot = editing;
        await studentsApi.update(snapshot.id, form);
        const fresh = await studentsApi.getById(snapshot.id);
        syncStudent(fresh, snapshot);
        clearPendingFiles();
        closeModal();
        setSuccess('Student saved.');
        void openView(fresh);
      } else {
        const { status: _status, ...createPayload } = form;
        const student = await studentsApi.create(createPayload);
        const uploaded = await uploadDocuments(student.id);
        const merged = uploaded ? mergeStudentMedia(student, uploaded) : student;
        if (uploaded) syncStudent(merged, student);
        else setRefreshKey((k) => k + 1);
        clearPendingFiles();
        closeModal();
        setSuccess('Student created.');
        if (uploaded?.profilePhotoUrl) void openView(merged);
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to save student.';
      setModalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'photo',
      header: '',
      render: (s: Student) => {
        void rowPatchTick;
        const row = applyRowPatch(s);
        const src = resolveMediaUrl(row.profilePhotoUrl, row.profilePhotoUrl ?? refreshKey);
        return (
          <span className="table-photo-cell">
            {src ? (
              <img
                key={`${s.id}-${row.profilePhotoUrl ?? 'none'}-${refreshKey}`}
                src={src}
                alt=""
                className="table-avatar"
                style={{ display: 'block' }}
                loading="eager"
              />
            ) : (
              <span className="table-avatar table-avatar-empty" aria-hidden>👤</span>
            )}
          </span>
        );
      },
    },
    { key: 'studentNo', header: 'Student No', render: (s: Student) => s.studentNo },
    { key: 'name', header: 'Name', render: (s: Student) => `${s.firstName} ${s.lastName}` },
    { key: 'program', header: 'Program', render: (s: Student) => s.programName },
    { key: 'email', header: 'Email', render: (s: Student) => s.email },
    { key: 'phone', header: 'Phone', render: (s: Student) => s.phone },
    {
      key: 'idDoc',
      header: 'National ID',
      render: (s: Student) => {
        void rowPatchTick;
        const row = applyRowPatch(s);
        return (
          <span className="id-doc-status">
            <span className={`badge ${row.nationalIdFrontUrl ? 'badge-active' : 'badge-pending'}`}>Front</span>
            <span className={`badge ${row.nationalIdBackUrl ? 'badge-active' : 'badge-pending'}`}>Back</span>
          </span>
        );
      },
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
            <Button type="submit" form="student-form" disabled={submitting || uploadingField !== null}>
              {submitting
                ? uploadingField
                  ? 'Uploading files…'
                  : 'Saving…'
                : editing
                  ? 'Save Changes'
                  : 'Save Student'}
            </Button>
          </div>
        }
      >
        <form id="student-form" className="form-grid" onSubmit={handleSubmit}>
          {modalError && (
            <div className="full-width">
              <Alert type="error" message={modalError} onClose={() => setModalError('')} />
            </div>
          )}
          <div className="full-width photo-upload-row photo-upload-row-three">
            <PhotoUploadField
              label="Profile photo"
              hint={editing ? 'Uploads immediately when you choose a file or capture.' : 'Uploads when you save the new student.'}
              value={profilePhoto}
              onChange={(file) => void instantUpload('photo', file)}
              existingUrl={editing?.profilePhotoUrl}
              cacheBust={editing?.profilePhotoUrl ?? refreshKey}
              uploading={uploadingField === 'photo'}
              uploadStatus={fieldUploadStatus.photo.status}
              statusMessage={fieldUploadStatus.photo.message}
            />
            <PhotoUploadField
              label="National ID — front"
              hint={editing ? 'Uploads immediately.' : 'Uploads when you save the new student.'}
              value={nationalIdFront}
              onChange={(file) => void instantUpload('idFront', file)}
              acceptDocuments
              existingUrl={editing?.nationalIdFrontUrl}
              cacheBust={editing?.nationalIdFrontUrl ?? refreshKey}
              uploading={uploadingField === 'idFront'}
              uploadStatus={fieldUploadStatus.idFront.status}
              statusMessage={fieldUploadStatus.idFront.message}
            />
            <PhotoUploadField
              label="National ID — back"
              hint={editing ? 'Uploads immediately.' : 'Uploads when you save the new student.'}
              value={nationalIdBack}
              onChange={(file) => void instantUpload('idBack', file)}
              acceptDocuments
              existingUrl={editing?.nationalIdBackUrl}
              cacheBust={editing?.nationalIdBackUrl ?? refreshKey}
              uploading={uploadingField === 'idBack'}
              uploadStatus={fieldUploadStatus.idBack.status}
              statusMessage={fieldUploadStatus.idBack.message}
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
        uploads={
          canManage && viewing && !viewLoading ? (
            <StudentProfileUploads
              student={viewing}
              onUpdated={(updated) => syncStudent(updated, viewing)}
            />
          ) : undefined
        }
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
