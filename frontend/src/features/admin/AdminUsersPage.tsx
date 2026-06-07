import { FormEvent, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError } from '../../api/client';
import { authApi, usersApi } from '../../api/endpoints';
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
import type { Role, TwoFactorSetupResponse, User } from '../../types';
import { ROLES } from '../../utils/roles';

const STAFF_ROLES: Role[] = ['Lecturer', 'Registrar', 'ClinicalCoordinator', 'FinanceOfficer', 'Admin'];

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

function toUserForm(user: User): UserForm {
  const primaryRole = user.roles.find((r) => STAFF_ROLES.includes(r)) ?? user.roles[0] ?? 'Lecturer';
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

  const fetchUsers = useCallback(
    (page: number, pageSize: number, search: string) =>
      usersApi.getAll(page, pageSize, search || undefined),
    [],
  );

  const openCreate = () => {
    setEditing(null);
    setUserForm(emptyUserForm());
    setProfilePhoto(null);
    setNationalIdFront(null);
    setNationalIdBack(null);
    setUserModalOpen(true);
  };

  const openEdit = (user: User) => {
    setViewOpen(false);
    setEditing(user);
    setUserForm(toUserForm(user));
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
      setViewing(full);
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

  const uploadDocuments = async (userId: string) => {
    if (profilePhoto) await usersApi.uploadProfilePhoto(userId, profilePhoto);
    if (nationalIdFront) await usersApi.uploadNationalIdFront(userId, nationalIdFront);
    if (nationalIdBack) await usersApi.uploadNationalIdBack(userId, nationalIdBack);
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (editing) {
        await usersApi.update(editing.id, {
          userName: userForm.userName,
          email: userForm.email,
          firstName: userForm.firstName || undefined,
          lastName: userForm.lastName || undefined,
          isActive: userForm.isActive,
          roles: [userForm.role],
          newPassword: userForm.newPassword || undefined,
        });
        await uploadDocuments(editing.id);
        setSuccess('User updated successfully.');
      } else {
        const user = await usersApi.create({
          userName: userForm.userName,
          email: userForm.email,
          password: userForm.password,
          firstName: userForm.firstName || undefined,
          lastName: userForm.lastName || undefined,
          roles: [userForm.role],
        });
        await uploadDocuments(user.id);
        setSuccess(`${ROLES[userForm.role]} account created.`);
      }
      closeUserModal();
      setRefreshKey((k) => k + 1);
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
    {
      key: 'photo',
      header: '',
      render: (row: User) => (
        <ProfileAvatar url={row.profileImageUrl} key={`${row.id}-${row.profileImageUrl ?? 'none'}-${refreshKey}`} />
      ),
    },
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
        row.roles.map((r) => ROLES[r] ?? r).join(', ') || '—',
    },
    {
      key: 'nationalId',
      header: 'National ID',
      render: (row: User) => (
        <span className="id-doc-status">
          <span className={`badge ${row.nationalIdFrontUrl ? 'badge-active' : 'badge-pending'}`}>Front</span>
          <span className={`badge ${row.nationalIdBackUrl ? 'badge-active' : 'badge-pending'}`}>Back</span>
        </span>
      ),
    },
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
        <h2>Identity & Users</h2>
        <p className="text-muted">Manage staff accounts, photos, and national ID documents.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <Card
        title="User Directory"
        actions={
          <div className="card-actions-row">
            <Button size="sm" onClick={openCreate}>Add Staff / Teacher</Button>
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
        title={editing ? `Edit User — ${editing.userName}` : 'Add Staff / Teacher'}
        size="lg"
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={closeUserModal}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={submitting}>
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Account'}
            </Button>
          </div>
        }
      >
        <form className="form-grid" onSubmit={handleSaveUser}>
          <div className="full-width photo-upload-row photo-upload-row-three">
            <PhotoUploadField
              label="Profile photo"
              hint="Upload or capture a staff photo."
              value={profilePhoto}
              onChange={setProfilePhoto}
              existingUrl={editing?.profileImageUrl}
            />
            <PhotoUploadField
              label="National ID — front"
              hint="Front side (JPG, PNG, or PDF)."
              value={nationalIdFront}
              onChange={setNationalIdFront}
              acceptDocuments
              existingUrl={editing?.nationalIdFrontUrl}
            />
            <PhotoUploadField
              label="National ID — back"
              hint="Back side (JPG, PNG, or PDF)."
              value={nationalIdBack}
              onChange={setNationalIdBack}
              acceptDocuments
              existingUrl={editing?.nationalIdBackUrl}
            />
          </div>
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
            options={STAFF_ROLES.map((r) => ({ value: r, label: ROLES[r] }))}
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
        title={viewing ? [viewing.firstName, viewing.lastName].filter(Boolean).join(' ') || viewing.userName : 'Staff profile'}
        subtitle={viewing?.userName}
        loading={viewLoading}
        profilePhotoUrl={viewing?.profileImageUrl}
        nationalIdFrontUrl={viewing?.nationalIdFrontUrl}
        nationalIdBackUrl={viewing?.nationalIdBackUrl}
        onEdit={viewing ? () => openEdit(viewing) : undefined}
        fields={viewing ? [
          { label: 'Email', value: viewing.email },
          { label: 'Roles', value: viewing.roles.map((r) => ROLES[r] ?? r).join(', ') || '—' },
          { label: 'Status', value: viewing.isActive ? 'Active' : 'Inactive' },
          { label: 'Two-factor auth', value: viewing.twoFactorEnabled ? 'Enabled' : 'Off' },
          { label: 'Linked student', value: viewing.studentId ?? '—' },
        ] : []}
      />
    </div>
  );
}
