import type { Role, User } from '../types';



export const ROLES: Record<Role, string> = {

  Admin: 'Administrator',

  Registrar: 'Registrar',

  Lecturer: 'Lecturer',

  ClinicalCoordinator: 'Clinical Coordinator',

  FinanceOfficer: 'Finance Officer',

  Student: 'Student',

};



export function hasRole(user: User | null, ...roles: Role[]): boolean {

  if (!user) return false;

  return roles.some((role) => user.roles.includes(role));

}



export function hasAnyRole(user: User | null, roles: Role[]): boolean {

  return hasRole(user, ...roles);

}



export interface NavItem {

  path?: string;

  label: string;

  icon: string;

  roles: Role[];

  children?: NavItem[];

}



export interface NavGroup {

  id: string;

  label: string;

  items: NavItem[];

}



const schedulingRoles: Role[] = ['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator'];

const academicRoles: Role[] = ['Admin', 'Registrar', 'Lecturer'];

const clinicalRoles: Role[] = ['Admin', 'ClinicalCoordinator', 'Lecturer'];

const resultsViewRoles: Role[] = ['Admin', 'Lecturer', 'Registrar', 'Student'];

const resultsManageRoles: Role[] = ['Admin', 'Lecturer'];



export const NAV_GROUPS: NavGroup[] = [

  {

    id: 'overview',

    label: 'Overview',

    items: [

      {

        path: '/app/dashboard',

        label: 'Dashboard',

        icon: '📊',

        roles: ['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator', 'FinanceOfficer', 'Student'],

      },

    ],

  },

  {

    id: 'enrollment',

    label: 'Enrollment',

    items: [

      {

        path: '/app/students',

        label: 'Students',

        icon: '👨‍🎓',

        roles: ['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator', 'FinanceOfficer'],

      },

      {

        path: '/app/admissions',

        label: 'Admissions',

        icon: '📝',

        roles: ['Admin', 'Registrar'],

      },

      {

        path: '/app/teachers',

        label: 'Teachers',

        icon: '👩‍🏫',

        roles: ['Admin', 'Registrar'],

      },

    ],

  },

  {

    id: 'academic',

    label: 'Academic',

    items: [

      {

        label: 'Programs & Courses',

        icon: '📚',

        path: '/app/academic/programs',

        roles: academicRoles,

        children: [

          { path: '/app/academic/programs', label: 'Programs', icon: '🎓', roles: academicRoles },

          { path: '/app/academic/courses', label: 'Courses', icon: '📖', roles: academicRoles },

          { path: '/app/academic/offerings', label: 'Offerings', icon: '🗓️', roles: academicRoles },

          { path: '/app/academic/enrollments', label: 'Enrollments', icon: '✅', roles: academicRoles },

        ],

      },

      {

        path: '/app/attendance',

        label: 'Attendance',

        icon: '📅',

        roles: ['Admin', 'Lecturer'],

      },

      {

        label: 'Results',

        icon: '🏆',

        path: '/app/results/view',

        roles: resultsViewRoles,

        children: [

          { path: '/app/results/view', label: 'View Results', icon: '📋', roles: resultsViewRoles },

          { path: '/app/results/marks', label: 'Enter Marks', icon: '✏️', roles: resultsManageRoles },

        ],

      },

    ],

  },

  {

    id: 'operations',

    label: 'Operations',

    items: [

      {

        label: 'Clinical',

        icon: '🏥',

        path: '/app/clinical/facilities',

        roles: clinicalRoles,

        children: [

          { path: '/app/clinical/facilities', label: 'Facilities', icon: '🏥', roles: clinicalRoles },

          { path: '/app/clinical/placements', label: 'Placements', icon: '🩺', roles: clinicalRoles },

        ],

      },

      {

        label: 'Scheduling',

        icon: '🗓️',

        path: '/app/scheduling/calendar',

        roles: schedulingRoles,

        children: [

          { path: '/app/scheduling/calendar', label: 'Calendar', icon: '📅', roles: schedulingRoles },

          { path: '/app/scheduling/events', label: 'Events', icon: '📋', roles: schedulingRoles },

          { path: '/app/scheduling/programs', label: 'Programs', icon: '🎓', roles: schedulingRoles },

          { path: '/app/scheduling/semesters', label: 'Semesters', icon: '📆', roles: schedulingRoles },

          { path: '/app/scheduling/offerings', label: 'Course Offerings', icon: '📚', roles: schedulingRoles },

        ],

      },

      {

        path: '/app/finance',

        label: 'Finance',

        icon: '💰',

        roles: ['Admin', 'FinanceOfficer', 'Registrar'],

      },

      {

        path: '/app/ids',

        label: 'IDs',

        icon: '🪪',

        roles: ['Admin', 'Registrar'],

      },

      {

        label: 'Reports',

        icon: '📈',

        path: '/app/reports/fee-balances',

        roles: ['Admin', 'FinanceOfficer', 'Registrar', 'Lecturer'],

        children: [

          {

            path: '/app/reports/fee-balances',

            label: 'Fee Balances',

            icon: '💰',

            roles: ['Admin', 'FinanceOfficer'],

          },

          {

            path: '/app/reports/results',

            label: 'Student Results',

            icon: '🏆',

            roles: ['Admin', 'Registrar', 'Lecturer'],

          },

        ],

      },

    ],

  },

  {

    id: 'admin',

    label: 'Administration',

    items: [

      {

        path: '/app/admin/users',

        label: 'User Identity',

        icon: '🔐',

        roles: ['Admin'],

      },

    ],

  },

];



function filterNavItem(item: NavItem, user: User): NavItem | null {

  if (!hasAnyRole(user, item.roles)) return null;



  if (item.children?.length) {

    const children = item.children

      .map((child) => filterNavItem(child, user))

      .filter((child): child is NavItem => child !== null);

    if (children.length === 0) return null;

    return {

      ...item,

      children,

      path: item.path ?? children[0].path,

    };

  }



  if (!item.path) return null;

  return item;

}



/** @deprecated Use getNavGroupsForUser instead */

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);



export function getNavGroupsForUser(user: User | null): NavGroup[] {

  if (!user) return [];

  return NAV_GROUPS.map((group) => ({

    ...group,

    items: group.items

      .map((item) => filterNavItem(item, user))

      .filter((item): item is NavItem => item !== null),

  })).filter((group) => group.items.length > 0);

}



function flattenNavItem(item: NavItem): NavItem[] {

  if (item.children?.length) return item.children;

  return item.path ? [item] : [];

}



export function getNavItemsForUser(user: User | null): NavItem[] {

  return getNavGroupsForUser(user).flatMap((g) => g.items.flatMap(flattenNavItem));

}



export function getPrimaryRole(user: User): Role {

  const priority: Role[] = ['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator', 'FinanceOfficer', 'Student'];

  return priority.find((r) => user.roles.includes(r)) ?? user.roles[0];

}


