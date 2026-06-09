import type { Role } from '../../types';
import { ROLES } from '../../utils/roles';

export type UserManagementMode = 'identity' | 'administrators' | 'teachers';

export const ADMINISTRATOR_ROLES: Role[] = ['Admin', 'Registrar', 'FinanceOfficer', 'ClinicalCoordinator'];
export const TEACHER_ROLES: Role[] = ['Lecturer'];
export const IDENTITY_ASSIGNABLE_ROLES: Role[] = [
  'Admin',
  'Registrar',
  'Lecturer',
  'ClinicalCoordinator',
  'FinanceOfficer',
  'Student',
];

export interface UserManagementConfig {
  mode: UserManagementMode;
  title: string;
  subtitle: string;
  cardTitle: string;
  addButtonLabel: string;
  modalTitle: string;
  roleFilter: Role[] | null;
  assignableRoles: Role[];
  defaultRole: Role;
  allowUploads: boolean;
  showPhotoColumn: boolean;
  showNationalIdColumn: boolean;
  showMediaInView: boolean;
}

export function getUserManagementMode(pathname: string): UserManagementMode {
  if (pathname.includes('/teachers')) return 'teachers';
  if (pathname.includes('/admin/administrators')) return 'administrators';
  return 'identity';
}

export function getUserManagementConfig(pathname: string): UserManagementConfig {
  const mode = getUserManagementMode(pathname);

  if (mode === 'teachers') {
    return {
      mode,
      title: 'Teachers',
      subtitle: 'Manage lecturer accounts, profile photos, and national ID documents.',
      cardTitle: 'Teacher Registry',
      addButtonLabel: 'Add Teacher',
      modalTitle: 'Teacher',
      roleFilter: TEACHER_ROLES,
      assignableRoles: TEACHER_ROLES,
      defaultRole: 'Lecturer',
      allowUploads: true,
      showPhotoColumn: true,
      showNationalIdColumn: true,
      showMediaInView: true,
    };
  }

  if (mode === 'administrators') {
    return {
      mode,
      title: 'Administrators',
      subtitle:
        'Manage bursar, principal, system administrators, clinical coordinators, and other leadership staff.',
      cardTitle: 'Administrator Registry',
      addButtonLabel: 'Add Administrator',
      modalTitle: 'Administrator',
      roleFilter: ADMINISTRATOR_ROLES,
      assignableRoles: ADMINISTRATOR_ROLES,
      defaultRole: 'Registrar',
      allowUploads: true,
      showPhotoColumn: true,
      showNationalIdColumn: true,
      showMediaInView: true,
    };
  }

  return {
    mode,
    title: 'User Identity',
    subtitle:
      'Manage login accounts, roles, passwords, and security. Photos and documents are managed under Students, Teachers, and Administrators.',
    cardTitle: 'Account Directory',
    addButtonLabel: 'Add Account',
    modalTitle: 'Account',
    roleFilter: null,
    assignableRoles: IDENTITY_ASSIGNABLE_ROLES,
    defaultRole: 'Admin',
    allowUploads: false,
    showPhotoColumn: false,
    showNationalIdColumn: false,
    showMediaInView: false,
  };
}

export function roleLabel(role: Role): string {
  return ROLES[role] ?? role;
}

export function userMatchesMode(user: { roles: Role[] }, config: UserManagementConfig): boolean {
  if (!config.roleFilter) return true;
  return user.roles.some((role) => config.roleFilter!.includes(role));
}
