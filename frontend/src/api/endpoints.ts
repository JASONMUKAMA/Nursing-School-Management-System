import { api, apiUpload } from './client';
import type {
  AdminDashboard,
  AnalyticsCharts,
  Application,
  AssessmentComponent,
  ClassSession,
  ClinicalFacility,
  ClinicalPlacement,
  Course,
  CourseOffering,
  CreateApplicationRequest,
  CreateStudentRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateStudentRequest,
  DashboardSummary,
  EnableTwoFactorRequest,
  Enrollment,
  FeeBalanceRow,
  FinanceDashboard,
  GatewayTransaction,
  Invoice,
  LoginActivity,
  LoginRequest,
  LoginResponse,
  Mark,
  MlInsights,
  PagedResult,
  Payment,
  PaymentSummaryRow,
  PublicStudentFeeSummary,
  Program,
  PublicStats,
  SchoolEvent,
  Semester,
  Student,
  StudentDashboard,
  StudentInvoicePreview,
  StudentResult,
  StudentRiskRow,
  AppNotification,
  TwoFactorLoginRequest,
  TwoFactorSetupResponse,
  User,
} from '../types';
import { normalizeStudent } from '../utils/studentMedia';

function pageQuery(page: number, pageSize: number, search?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  return params.toString();
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/api/auth/login', data, true),
  login2Fa: (data: TwoFactorLoginRequest) =>
    api.post<LoginResponse>('/api/auth/login-2fa', data, true),
  get2FaSetup: () => api.get<TwoFactorSetupResponse>('/api/auth/2fa/setup'),
  enable2Fa: (data: EnableTwoFactorRequest) =>
    api.post<void>('/api/auth/2fa/enable', data),
};

export const activityLogsApi = {
  getAll: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<LoginActivity>>(`/api/auth/activity-logs?${pageQuery(page, pageSize, search)}`),
};

export const usersApi = {
  getAll: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<User>>(`/api/users?${pageQuery(page, pageSize, search)}`),
  getById: (id: string) => api.get<User>(`/api/users/${id}`),
  create: (data: CreateUserRequest) => api.post<User>('/api/users', data),
  update: (id: string, data: UpdateUserRequest) => api.put<User>(`/api/users/${id}`, data),
  uploadProfilePhoto: (userId: string, file: File) =>
    apiUpload<User>(`/api/users/${userId}/profile-photo`, file),
  uploadNationalIdFront: (userId: string, file: File) =>
    apiUpload<User>(`/api/users/${userId}/national-id/front`, file),
  uploadNationalIdBack: (userId: string, file: File) =>
    apiUpload<User>(`/api/users/${userId}/national-id/back`, file),
};

export const analyticsApi = {
  getCharts: () => api.get<AnalyticsCharts>('/api/analytics/charts'),
  getMlInsights: () => api.get<MlInsights>('/api/analytics/ml-insights'),
  getAtRiskStudents: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<StudentRiskRow>>(`/api/analytics/at-risk-students?${pageQuery(page, pageSize, search)}`),
};

export const dashboardApi = {
  getPublicStats: () => api.get<PublicStats>('/api/dashboard/public-stats', true),
  getSummary: () => api.get<DashboardSummary>('/api/dashboard/summary'),
  getAdmin: () => api.get<AdminDashboard>('/api/dashboard/admin'),
  getFinance: () => api.get<FinanceDashboard>('/api/dashboard/finance'),
  getStudent: (studentId: string) =>
    api.get<StudentDashboard>(`/api/dashboard/student/${studentId}`),
};

export const eventsApi = {
  getUpcoming: (count = 6) =>
    api.get<SchoolEvent[]>(`/api/events/upcoming?count=${count}`, true),
  getCalendar: (start: string, end: string) =>
    api.get<SchoolEvent[]>(`/api/events/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  getAll: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<SchoolEvent>>(`/api/events?${pageQuery(page, pageSize, search)}`),
  create: (data: {
    title: string;
    description: string;
    eventType: string;
    startDate: string;
    endDate: string;
    location: string;
    targetAudience: string;
    isPublished?: boolean;
  }) => api.post<{ event: SchoolEvent; invitationsQueued: boolean }>('/api/events', data),
  getNotifications: () => api.get<AppNotification[]>('/api/notifications'),
  markNotificationRead: (id: string) => api.post<void>(`/api/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => api.post<void>('/api/notifications/read-all', {}),
};

function normalizeStudentPage(result: PagedResult<Student>): PagedResult<Student> {
  return {
    ...result,
    items: result.items.map((s) => normalizeStudent(s as Student & Record<string, unknown>)),
  };
}

export const studentsApi = {
  getAll: async (page = 1, pageSize = 20, search?: string) =>
    normalizeStudentPage(
      await api.get<PagedResult<Student>>(`/api/students?${pageQuery(page, pageSize, search)}`),
    ),
  getById: async (id: string) =>
    normalizeStudent(await api.get<Student>(`/api/students/${id}`) as Student & Record<string, unknown>),
  create: async (data: CreateStudentRequest) =>
    normalizeStudent(await api.post<Student>('/api/students', data) as Student & Record<string, unknown>),
  update: async (id: string, data: UpdateStudentRequest) =>
    normalizeStudent(await api.put<Student>(`/api/students/${id}`, data) as Student & Record<string, unknown>),
  uploadProfilePhoto: async (studentId: string, file: File) =>
    normalizeStudent(
      await apiUpload<Student>(`/api/students/${studentId}/profile-photo`, file) as Student &
        Record<string, unknown>,
    ),
  uploadNationalIdFront: async (studentId: string, file: File) =>
    normalizeStudent(
      await apiUpload<Student>(`/api/students/${studentId}/national-id/front`, file) as Student &
        Record<string, unknown>,
    ),
  uploadNationalIdBack: async (studentId: string, file: File) =>
    normalizeStudent(
      await apiUpload<Student>(`/api/students/${studentId}/national-id/back`, file) as Student &
        Record<string, unknown>,
    ),
};

export const applicationsApi = {
  getAll: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<Application>>(`/api/applications?${pageQuery(page, pageSize, search)}`),
  create: (data: CreateApplicationRequest) =>
    api.post<Application>('/api/applications', data, true),
  approve: (id: string, createUserAccount: boolean, password?: string) =>
    api.post<Student>(`/api/applications/${id}/approve`, {
      createUserAccount,
      password: password ?? null,
    }),
};

export const academicApi = {
  getPrograms: (page = 1, pageSize = 50, search?: string) =>
    api.get<PagedResult<Program>>(`/api/programs?${pageQuery(page, pageSize, search)}`),
  createProgram: (data: { code: string; name: string; durationYears: number }) =>
    api.post<Program>('/api/programs', data),
  getSemesters: (programId?: string, page = 1, pageSize = 50, search?: string) => {
    const extra = programId ? { programId } : undefined;
    return api.get<PagedResult<Semester>>(`/api/semesters?${pageQuery(page, pageSize, search, extra)}`);
  },
  createSemester: (data: {
    programId: string;
    name: string;
    yearLevel: number;
    semesterNo: number;
    startDate: string;
    endDate: string;
  }) => api.post<Semester>('/api/semesters', data),
  getCourses: (page = 1, pageSize = 50, search?: string) =>
    api.get<PagedResult<Course>>(`/api/courses?${pageQuery(page, pageSize, search)}`),
  createCourse: (data: { code: string; name: string; creditUnits: number; courseType: string }) =>
    api.post<Course>('/api/courses', data),
  getCourseOfferings: (semesterId?: string, page = 1, pageSize = 50, search?: string) => {
    const extra = semesterId ? { semesterId } : undefined;
    return api.get<PagedResult<CourseOffering>>(`/api/course-offerings?${pageQuery(page, pageSize, search, extra)}`);
  },
  createCourseOffering: (data: {
    courseId: string;
    semesterId: string;
    lecturerId: string;
    academicYear: string;
  }) => api.post<CourseOffering>('/api/course-offerings', data),
  enroll: (data: { studentId: string; courseOfferingId: string; enrollmentDate: string }) =>
    api.post<Enrollment>('/api/enrollments', data),
};

export const attendanceApi = {
  getSessions: (courseOfferingId?: string, page = 1, pageSize = 20, search?: string) => {
    const extra = courseOfferingId ? { courseOfferingId } : undefined;
    return api.get<PagedResult<ClassSession>>(`/api/class-sessions?${pageQuery(page, pageSize, search, extra)}`);
  },
  createSession: (data: {
    courseOfferingId: string;
    sessionDate: string;
    topic: string;
    startTime: string;
    endTime: string;
  }) => api.post<ClassSession>('/api/class-sessions', data),
  submitAttendance: (
    sessionId: string,
    entries: { studentId: string; status: string; remarks?: string }[],
  ) =>
    api.post<void>(`/api/class-sessions/${sessionId}/attendance`, { entries }),
};

export const resultsApi = {
  getComponents: (courseOfferingId: string) =>
    api.get<AssessmentComponent[]>(`/api/course-offerings/${courseOfferingId}/assessment-components`),
  createComponent: (data: {
    courseOfferingId: string;
    name: string;
    weight: number;
    maxScore: number;
  }) => api.post<AssessmentComponent>('/api/assessment-components', data),
  submitMark: (data: { assessmentComponentId: string; studentId: string; score: number }) =>
    api.post<Mark>('/api/marks', data),
  getStudentResults: (studentId: string) =>
    api.get<StudentResult[]>(`/api/students/${studentId}/results`),
};

export const financeApi = {
  getInvoices: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<Invoice>>(`/api/invoices?${pageQuery(page, pageSize, search)}`),
  getInvoice: (id: string) => api.get<Invoice>(`/api/invoices/${id}`),
  getStudentInvoicePreview: (studentId: string) =>
    api.get<StudentInvoicePreview>(`/api/students/${studentId}/invoice-preview`),
  createInvoice: (data: {
    studentId: string;
    academicYear: string;
    semesterId?: string;
    dueDate: string;
    items: { description: string; amount: number }[];
  }) => api.post<Invoice>('/api/invoices', data),
  getPayments: (page = 1, pageSize = 20, search?: string, paymentMethod?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    return api.get<PagedResult<Payment>>(`/api/payments?${params}`);
  },
  isJpesaConfigured: () => api.get<{ configured: boolean }>('/api/payments/jpesa-configured'),
  initiateMobileMoney: (data: { invoiceId: string; amount: number; phoneNumber: string }) =>
    api.post<{
      transactionId: string;
      externalTransactionId: string;
      status: string;
      providerReference?: string | null;
      message?: string | null;
    }>('/api/payments/initiate-mobile-money', data),
  getGatewayTransaction: (id: string) =>
    api.get<GatewayTransaction>(`/api/payments/gateway-transactions/${id}`),
  recordPayment: (data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    transactionReference?: string;
    payerPhone?: string;
    cardLastFour?: string;
    bankReceiptNo?: string;
  }) => api.post<Payment>('/api/payments', data),
};

export const publicFinanceApi = {
  isJpesaConfigured: () => api.get<{ configured: boolean }>('/api/public/payments/jpesa-configured', true),
  getStudentFees: (studentNo: string) =>
    api.get<PublicStudentFeeSummary>(`/api/public/students/${encodeURIComponent(studentNo.trim())}/fees`, true),
  initiateMobileMoney: (data: {
    studentNo: string;
    invoiceId: string;
    amount: number;
    phoneNumber: string;
  }) =>
    api.post<{
      transactionId: string;
      externalTransactionId: string;
      status: string;
      providerReference?: string | null;
      message?: string | null;
    }>('/api/public/payments/initiate-mobile-money', data, true),
  getGatewayTransaction: (id: string, studentNo: string) =>
    api.get<GatewayTransaction>(
      `/api/public/payments/gateway-transactions/${id}?studentNo=${encodeURIComponent(studentNo.trim())}`,
      true,
    ),
};

export const clinicalApi = {
  getFacilities: (page = 1, pageSize = 20, search?: string) =>
    api.get<PagedResult<ClinicalFacility>>(`/api/clinical-facilities?${pageQuery(page, pageSize, search)}`),
  createFacility: (data: {
    name: string;
    facilityType: string;
    contactPerson: string;
    phone: string;
    address: string;
  }) => api.post<ClinicalFacility>('/api/clinical-facilities', data),
  getPlacements: (studentId?: string, page = 1, pageSize = 20, search?: string) => {
    const extra = studentId ? { studentId } : undefined;
    return api.get<PagedResult<ClinicalPlacement>>(`/api/clinical-placements?${pageQuery(page, pageSize, search, extra)}`);
  },
  createPlacement: (data: {
    studentId: string;
    facilityId: string;
    supervisorId?: string;
    startDate: string;
    endDate: string;
    department: string;
  }) => api.post<ClinicalPlacement>('/api/clinical-placements', data),
};

export const reportsApi = {
  getFeeBalances: (programId?: string, page = 1, pageSize = 20, search?: string) => {
    const extra = programId ? { programId } : undefined;
    return api.get<PagedResult<FeeBalanceRow>>(`/api/reports/fee-balances?${pageQuery(page, pageSize, search, extra)}`);
  },
  getResultsReport: (studentId: string) =>
    api.get<StudentResult[]>(`/api/reports/results?studentId=${studentId}`),
};

export type { PaymentSummaryRow };
