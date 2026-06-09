import { FormEvent, useCallback, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiClientError } from '../../api/client';
import { authApi, usersApi } from '../../api/endpoints';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EditRowButton } from '../../components/ui/EditRowButton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { NationalIdDocCell } from '../../components/ui/NationalIdDocCell';
import { PhotoUploadField } from '../../components/ui/PhotoUploadField';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { ProfileViewModal } from '../../components/ui/ProfileViewModal';
import { Select } from '../../components/ui/Select';
import { ServerDataTable } from '../../components/ui/ServerDataTable';
import { ViewRowButton } from '../../components/ui/ViewRowButton';
import type { Role, TwoFactorSetupResponse, User } from '../../types';
import { getUserPhotoUrl, mergeUserMedia, mergeUserPhotoCache } from '../../utils/userMedia';
import {
  getUserManagementConfig,
  roleLabel,
  userMatchesMode,
} from './userManagementConfig';

type UserForm = {
  userName: string;
  email: string;
  password: string;
  newPassword: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
};

const emptyUserForm = (): UserForm => ({
  userName: '',
  email: '',
  password: '',
  newPassword: '',
  firstName: '',
  lastName: '',
  role: 'Lecturer',
  isActive: true,
});

function toUserForm(user: User, assignableRoles: Role[]): UserForm {
  const primaryRole = user.roles.find((r) => assignableRoles.includes(r)) ?? user.roles[0] ?? assignableRoles[0];
  return {
    userName: user.userName,
    email: user.email,
    password: '',
    newPassword: '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    role: primaryRole as Role,
    isActive: user.isActive,
  };
}

export function AdminUsersPage() {
  const { pathname } = useLocation();
  const config = useMemo(() => getUserManagementConfig(pathname), [pathname]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<User | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [enableCode, setEnableCode] = useState('');
  const [setupMessage, setSetupMessage] = useState('');
  const [setupError, setSetupError] = useState('');

  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [nationalIdFront, setNationalIdFront] = useState<File | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<File | null>(null);
  const [uploadingField, setUploadingField] = useState<'photo' | 'idFront' | 'idBack' | null>(null);
  const [uploadedRow, setUploadedRow] = useState<User | null>(null);
  const [photoById, setPhotoById] = useState<Record<string, string>>({});
  const photoByIdRef = useRef<Record<string, string>>({});

  const rememberPhotos = (...users: (User | null | undefined)[]) => {
    const valid = users.filter((u): u is User => Boolean(u));
    if (valid.length === 0) return;
    const next = mergeUserPhotoCache(photoByIdRef.current, valid);
    if (next === photoByIdRef.current) return;
    photoByIdRef.current = next;
    setPhotoById(next);
  };

  const syncUser = (updated: User, preserve?: User | null) => {
    const base = preserve ?? editing ?? uploadedRow;
    const merged = base ? mergeUserMedia(base, updated) : updated;
    rememberPhotos(merged);
    setEditing(merged);
    setUploadedRow(merged);
    setRefreshKey((k) => k + 1);
    if (viewing?.id === merged.id) setViewing(merged);
  };

  const fetchUsers = useCallback(
    async (page: number, pageSize: number, search: string) => {
      const result = await usersApi.getAll(page, pageSize, search || undefined);
      rememberPhotos(...result.items);
      const items = result.items
        .filter((row) => userMatchesMode(row, config))
        .map((row) => {
          let enriched = uploadedRow?.id === row.id ? mergeUserMedia(row, uploadedRow) : row;
          const photo = getUserPhotoUrl(enriched, photoByIdRef.current);
          if (photo && !enriched.profileImageUrl) {
            enriched = { ...enriched, profileImageUrl: photo };
          }
          return enriched;
        });
      return { ...result, items, totalCount: items.length };
    },
    [uploadedRow, config],
  );

  const instantUpload = async (field: 'photo' | 'idFront' | 'idBack', file: File | null) => {
    if (!config.allowUploads) return;

    if (!file) {
      if (field === 'photo') setProfilePhoto(null);
      if (field === 'idFront') setNationalIdFront(null);
      if (field === 'idBack') setNationalIdBack(null);
      return;
    }

    if (!editing) {
      if (field === 'photo') setProfilePhoto(file);
      if (field === 'idFront') setNationalIdFront(file);
      if (field === 'idBack') setNationalIdBack(file);
      return;
    }

    if (field === 'photo') setProfilePhoto(file);
    if (field === 'idFront') setNationalIdFront(file);
    if (field === 'idBack') setNationalIdBack(file);

    setUploadingField(field);
    setError('');
    try {
      const updated =
        field === 'photo'
          ? await usersApi.uploadProfilePhoto(editing.id, file)
          : field === 'idFront'
            ? await usersApi.uploadNationalIdFront(editing.id, file)
            : await usersApi.uploadNationalIdBack(editing.id, file);
      syncUser(updated);
      if (field === 'photo') setProfilePhoto(null);
      if (field === 'idFront') setNationalIdFront(null);
      if (field === 'idBack') setNationalIdBack(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Upload failed.';
      setError(message);
      if (field === 'photo') setProfilePhoto(null);
      if (field === 'idFront') setNationalIdFront(null);
      if (field === 'idBack') setNationalIdBack(null);
    } finally {
      setUploadingField(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setUserForm({ ...emptyUserForm(), role: config.defaultRole });
    setProfilePhoto(null);
    setNationalIdFront(null);
    setNationalIdBack(null);
    setUserModalOpen(true);
  };

  const openEdit = (user: User) => {
    setViewOpen(false);
    setEditing(user);
    setUserForm(toUserForm(user, config.assignableRoles));
    setProfilePhoto(null);
    setNationalIdFront(null);
    setNationalIdBack(null);
    setUserModalOpen(true);
  };

  const openView = async (user: User) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewing(user);
    try {
      const full = await usersApi.getById(user.id);
      rememberPhotos(full);
      setViewing(full);
      const listPhoto = getUserPhotoUrl(user, photoById);
      const fullPhoto = getUserPhotoUrl(full);
      if (fullPhoto && fullPhoto !== listPhoto) {
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setViewing(user);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => {
    setViewOpen(false);
    setViewing(null);
  };

  const closeUserModal = () => {
    setUserModalOpen(false);
    setEditing(null);
  };

  const uploadDocuments = async (userId: string): Promise<User | null> => {
    if (!config.allowUploads) return null;
    let latest: User | null = null;
    if (profilePhoto) latest = await usersApi.uploadProfilePhoto(userId, profilePhoto);
    if (nationalIdFront) latest = await usersApi.uploadNationalIdFront(userId, nationalIdFront);
    if (nationalIdBack) latest = await usersApi.uploadNationalIdBack(userId, nationalIdBack);
    return latest;
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (editing) {
        const updated = await usersApi.update(editing.id, {
          userName: userForm.userName,
          email: userForm.email,
          firstName: userForm.firstName || undefined,
          lastName: userForm.lastName || undefined,
          isActive: userForm.isActive,
          roles: [userForm.role],
          newPassword: userForm.newPassword || undefined,
        });
        const uploaded = await uploadDocuments(editing.id);
        syncUser(uploaded ?? updated, editing);
        setSuccess('User updated successfully.');
        closeUserModal();
      } else {
        const user = await usersApi.create({
          userName: userForm.userName,
          email: userForm.email,
          password: userForm.password,
          firstName: userForm.firstName || undefined,
          lastName: userForm.lastName || undefined,
          roles: [userForm.role],
        });
        const uploaded = await uploadDocuments(user.id);
        if (uploaded) syncUser(uploaded, user);
        else setRefreshKey((k) => k + 1);
        setProfilePhoto(null);
        setNationalIdFront(null);
        setNationalIdBack(null);
        setSuccess(`${roleLabel(userForm.role)} account created.`);
        closeUserModal();
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to save user.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const open2FaSetup = async () => {
    setSetupOpen(true);
    setSetupLoading(true);
    setSetupError('');
    setSetupMessage('');
    setEnableCode('');
    try {
      const data = await authApi.get2FaSetup();
      setSetup(data);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to load 2FA setup.';
      setSetupError(message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleEnable2Fa = async (e: FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupMessage('');
    try {
      await authApi.enable2Fa({ code: enableCode });
      setSetupMessage('Two-factor authentication enabled successfully.');
      const data = await authApi.get2FaSetup();
      setSetup(data);
      setEnableCode('');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Invalid verification code.';
      setSetupError(message);
    }
  };

  const columns = [
    ...(config.showPhotoColumn
      ? [
          {
            key: 'photo',
            header: '',
            render: (row: User) => {
              const photo = getUserPhotoUrl(row, photoById);
              const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || row.userName;
              return (
                <span className="table-photo-cell">
                  <ProfileAvatar
                    url={photo}
                    cacheBust={photo ? refreshKey : undefined}
                    eager
                    zoomable
                    zoomLabel={`${name} — profile photo`}
                    key={`${row.id}-${photo ?? 'none'}-${refreshKey}`}
                  />
                </span>
              );
            },
          },
        ]
      : []),
    { key: 'userName', header: 'Username', render: (row: User) => row.userName },
    {
      key: 'name',
      header: 'Name',
      render: (row: User) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
    },
    { key: 'email', header: 'Email', render: (row: User) => row.email },
    {
      key: 'roles',
      header: 'Roles',
      render: (row: User) =>
        row.roles.map((r) => roleLabel(r)).join(', ') || '—',
    },
    ...(config.showNationalIdColumn
      ? [
          {
            key: 'nationalId',
            header: 'National ID',
            render: (row: User) => {
              const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || row.userName;
              return (
                <NationalIdDocCell
                  frontUrl={row.nationalIdFrontUrl}
                  backUrl={row.nationalIdBackUrl}
                  cacheBust={refreshKey}
                  personName={name}
                />
              );
            },
          },
        ]
      : []),
    {
      key: 'isActive',
      header: 'Status',
      render: (row: User) => (
        <span className={`badge ${row.isActive ? 'badge-active' : 'badge-inactive'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'twoFactorEnabled',
      header: '2FA',
      render: (row: User) => (
        <span className={`badge ${row.twoFactorEnabled ? 'badge-active' : 'badge-pending'}`}>
          {row.twoFactorEnabled ? 'Enabled' : 'Off'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '5rem',
      render: (row: User) => (
        <div className="row-actions">
          <ViewRowButton label={`View ${row.userName}`} onClick={() => void openView(row)} />
          <EditRowButton label={`Edit ${row.userName}`} onClick={() => openEdit(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <h2>{config.title}</h2>
        <p className="text-muted">{config.subtitle}</p>
        {config.mode === 'identity' && (
          <p className="text-muted identity-doc-links">
            Photos &amp; documents:{' '}
            <Link to="/app/students">Students</Link>
            {' · '}
            <Link to="/app/teachers">Teachers</Link>
            {' · '}
            <Link to="/app/admin/administrators">Administrators</Link>
          </p>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        title={config.cardTitle}
        actions={
          <div className="card-actions-row">
            <Button size="sm" onClick={openCreate}>{config.addButtonLabel}</Button>
            <Button size="sm" variant="secondary" onClick={open2FaSetup}>
              Enable 2FA for My Account
            </Button>
          </div>
        }
      >
        <ServerDataTable<User>
          columns={columns}
          keyField="id"
          fetchData={fetchUsers}
          searchPlaceholder="Search users by name, email, username..."
          refreshKey={refreshKey}
        />
      </Card>

      <Card title="Security">
        <p className="text-muted">
          Protect your admin account with authenticator-based two-factor authentication.{' '}
          <button type="button" className="link-button" onClick={open2FaSetup}>
            Set up 2FA
          </button>
        </p>
        <p className="text-muted">
          <Link to="/app/dashboard">← Back to dashboard</Link>
        </p>
      </Card>

      <Modal
        isOpen={userModalOpen}
        onClose={closeUserModal}
        title={editing ? `Edit ${config.modalTitle} — ${editing.userName}` : config.addButtonLabel}
        size="lg"
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={closeUserModal}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={submitting || uploadingField !== null}>
              {submitting ? 'Saving...' : uploadingField ? 'Uploading…' : editing ? 'Save Changes' : 'Create Account'}
            </Button>
          </div>
        }
      >
        <form className="form-grid" onSubmit={handleSaveUser}>
          {config.allowUploads && (
            <div className="full-width photo-upload-row photo-upload-row-three">
              <PhotoUploadField
                label="Profile photo"
                hint={editing ? 'Uploads immediately when you choose a file or capture.' : 'Uploads when you create the account.'}
                value={profilePhoto}
                onChange={(file) => void instantUpload('photo', file)}
                existingUrl={editing?.profileImageUrl}
                cacheBust={editing?.profileImageUrl ?? refreshKey}
                uploading={uploadingField === 'photo'}
              />
              <PhotoUploadField
                label="National ID — front"
                hint="Front side (JPG, PNG, or PDF)."
                value={nationalIdFront}
                onChange={(file) => void instantUpload('idFront', file)}
                acceptDocuments
                existingUrl={editing?.nationalIdFrontUrl}
                cacheBust={editing?.nationalIdFrontUrl ?? refreshKey}
                uploading={uploadingField === 'idFront'}
              />
              <PhotoUploadField
                label="National ID — back"
                hint="Back side (JPG, PNG, or PDF)."
                value={nationalIdBack}
                onChange={(file) => void instantUpload('idBack', file)}
                acceptDocuments
                existingUrl={editing?.nationalIdBackUrl}
                cacheBust={editing?.nationalIdBackUrl ?? refreshKey}
                uploading={uploadingField === 'idBack'}
              />
            </div>
          )}
          <Input label="Username" value={userForm.userName} onChange={(e) => setUserForm({ ...userForm, userName: e.target.value })} required />
          <Input label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
          {!editing ? (
            <Input label="Password" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required autoComplete="new-password" />
          ) : (
            <Input label="New Password" type="password" value={userForm.newPassword} onChange={(e) => setUserForm({ ...userForm, newPassword: e.target.value })} placeholder="Leave blank to keep current" autoComplete="new-password" />
          )}
          <Input label="First Name" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} />
          <Input label="Last Name" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} />
          <Select
            label="Role"
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}
            options={config.assignableRoles.map((r) => ({ value: r, label: roleLabel(r) }))}
            required
          />
          {editing && (
            <Select
              label="Account Status"
              value={userForm.isActive ? 'active' : 'inactive'}
              onChange={(e) => setUserForm({ ...userForm, isActive: e.target.value === 'active' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              required
            />
          )}
        </form>
      </Modal>

      <Modal
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="Two-Factor Authentication Setup"
      >
        {setupLoading && <p className="text-muted">Loading...</p>}
        {setupError && <Alert type="error" message={setupError} onClose={() => setSetupError('')} />}
        {setupMessage && (
          <Alert type="success" message={setupMessage} onClose={() => setSetupMessage('')} />
        )}
        {!setupLoading && setup && (
          <div className="twofa-setup">
            {setup.isEnabled ? (
              <p className="text-muted">Two-factor authentication is already enabled on your account.</p>
            ) : (
              <>
                <p>Add this key to your authenticator app (Google Authenticator, Authy, etc.):</p>
                <code className="twofa-key">{setup.sharedKey}</code>
                <p className="text-muted twofa-uri">{setup.authenticatorUri}</p>
                <form onSubmit={handleEnable2Fa} className="twofa-form">
                  <Input
                    label="Verification Code"
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value)}
                    placeholder="6-digit code"
                    required
                    autoComplete="one-time-code"
                  />
                  <Button type="submit">Verify & Enable</Button>
                </form>
              </>
            )}
          </div>
        )}
      </Modal>

      <ProfileViewModal
        isOpen={viewOpen}
        onClose={closeView}
        title={viewing ? [viewing.firstName, viewing.lastName].filter(Boolean).join(' ') || viewing.userName : config.modalTitle}
        subtitle={viewing?.userName}
        loading={viewLoading}
        showMedia={config.showMediaInView}
        profilePhotoUrl={viewing?.profileImageUrl}
        nationalIdFrontUrl={viewing?.nationalIdFrontUrl}
        nationalIdBackUrl={viewing?.nationalIdBackUrl}
        onEdit={viewing ? () => openEdit(viewing) : undefined}
        fields={viewing ? [
          { label: 'Email', value: viewing.email },
          { label: 'Roles', value: viewing.roles.map((r) => roleLabel(r)).join(', ') || '—' },
          { label: 'Status', value: viewing.isActive ? 'Active' : 'Inactive' },
          { label: 'Two-factor auth', value: viewing.twoFactorEnabled ? 'Enabled' : 'Off' },
          { label: 'Linked student', value: viewing.studentId ?? '—' },
        ] : []}
      />
    </div>
  );
}
