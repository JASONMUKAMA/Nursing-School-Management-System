import type { Role, User } from '../types';
import { hasAnyRole } from './roles';

export type DashboardStatLinkKey =
  | 'program'
  | 'courses'
  | 'attendance'
  | 'balance'
  | 'feeStatus'
  | 'students'
  | 'activeStudents'
  | 'collected'
  | 'outstanding'
  | 'placements'
  | 'applications'
  | 'invoiced'
  | 'overdue'
  | 'collectionRate';

function linkForRoles(user: User, roles: Role[], path: string): string | null {
  return hasAnyRole(user, roles) ? path : null;
}

/** Resolves a dashboard stat card destination based on the signed-in user's roles. */
export function getDashboardStatHref(user: User, key: DashboardStatLinkKey): string | null {
  switch (key) {
    case 'program':
      return linkForRoles(user, ['Admin', 'Registrar', 'Lecturer', 'Student'], '/app/academic/programs');
    case 'courses':
      return linkForRoles(user, ['Admin', 'Registrar', 'Lecturer', 'Student'], '/app/academic/offerings');
    case 'attendance':
      if (hasAnyRole(user, ['Admin', 'Lecturer'])) return '/app/attendance';
      if (hasAnyRole(user, ['Student'])) return '/app/results/view';
      return null;
    case 'balance':
    case 'feeStatus':
      if (hasAnyRole(user, ['Admin', 'FinanceOfficer', 'Registrar'])) return '/app/finance';
      if (hasAnyRole(user, ['Student'])) return '/#pay';
      return null;
    case 'students':
    case 'activeStudents':
      return linkForRoles(
        user,
        ['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator', 'FinanceOfficer'],
        '/app/students',
      );
    case 'collected':
    case 'invoiced':
      return linkForRoles(user, ['Admin', 'FinanceOfficer', 'Registrar'], '/app/finance');
    case 'outstanding':
      if (hasAnyRole(user, ['Admin', 'FinanceOfficer'])) return '/app/reports/fee-balances';
      if (hasAnyRole(user, ['Registrar'])) return '/app/finance';
      return null;
    case 'overdue':
      return (
        linkForRoles(user, ['Admin', 'FinanceOfficer'], '/app/reports/fee-balances') ??
        linkForRoles(user, ['Admin', 'FinanceOfficer', 'Registrar'], '/app/finance')
      );
    case 'placements':
      return linkForRoles(user, ['Admin', 'ClinicalCoordinator', 'Lecturer'], '/app/clinical/placements');
    case 'applications':
      return linkForRoles(user, ['Admin', 'Registrar'], '/app/admissions');
    case 'collectionRate':
      return (
        linkForRoles(user, ['Admin', 'FinanceOfficer'], '/app/reports/fee-balances') ??
        linkForRoles(user, ['Admin', 'FinanceOfficer', 'Registrar'], '/app/finance')
      );
    default:
      return null;
  }
}
