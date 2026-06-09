export type Role =
  | 'Admin'
  | 'Registrar'
  | 'Lecturer'
  | 'ClinicalCoordinator'
  | 'FinanceOfficer'
  | 'Student';

export interface User {
  id: string;
  userName: string;
  email: string;
  isActive: boolean;
  roles: Role[];
  studentId: string | null;
  twoFactorEnabled?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  nationalIdFrontUrl?: string | null;
  nationalIdBackUrl?: string | null;
}

export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
}

export interface TwoFactorLoginRequest {
  userId: string;
  code: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  requiresTwoFactor?: boolean;
  twoFactorUserId?: string | null;
}

export interface TwoFactorSetupResponse {
  sharedKey: string;
  authenticatorUri: string;
  isEnabled: boolean;
}

export interface EnableTwoFactorRequest {
  code: string;
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
}

export interface UpdateUserRequest {
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  roles: Role[];
  newPassword?: string;
}

export interface UpdateStudentRequest {
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
}

export interface PublicStats {
  students: number;
  programs: number;
  lecturers: number;
  clinicalPartners: number;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  targetAudience: string;
  isPublished?: boolean;
}

export interface PaymentSummaryRow {
  receiptNo: string;
  studentName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
}

export interface FeeBalanceReportRow {
  studentId: string;
  studentNo: string;
  studentName: string;
  programName: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface MonthlyCollectionPoint {
  month: string;
  amount: number;
}

export interface MlInsights {
  atRiskFeeStudents: number;
  atRiskAcademicStudents: number;
  feeModelAccuracy: number;
  academicModelAccuracy: number;
  modelsTrained: boolean;
  summary: string;
}

export interface AnalyticsCharts {
  enrollmentByProgram: ChartDataPoint[];
  feeStatusBreakdown: ChartDataPoint[];
  monthlyCollections: MonthlyCollectionPoint[];
  paymentMethods: ChartDataPoint[];
  studentStatusBreakdown: ChartDataPoint[];
  mlInsights: MlInsights;
}

export interface StudentRiskRow {
  studentId: string;
  studentNo: string;
  studentName: string;
  programName: string;
  riskType: string;
  riskScore: number;
  recommendation: string;
}

export interface AdminDashboard {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  pendingApplications: number;
  outstandingFees: number;
  collectedFees: number;
  upcomingEvents: number;
  activePlacements: number;
  events: SchoolEvent[];
  topBalances: FeeBalanceReportRow[];
  charts: AnalyticsCharts | null;
  trends?: DashboardStatTrends | null;
}

export interface FinanceDashboard {
  totalInvoiced: number;
  totalCollected: number;
  outstanding: number;
  overdueCount: number;
  topDebtors: FeeBalanceReportRow[];
  recentPayments: PaymentSummaryRow[];
  charts: AnalyticsCharts | null;
  trends?: DashboardStatTrends | null;
}

export interface StudentDashboard {
  studentId: string;
  studentName: string;
  programName: string;
  feeBalance: number;
  feeStatus: string;
  coursesEnrolled: number;
  attendancePercent: number;
  recentResults: StudentResult[];
  upcomingEvents: SchoolEvent[];
}

export interface AppNotificationPayload {
  id: string;
  title: string;
  message: string;
  category: string;
  linkUrl?: string | null;
  sentAt: string;
}

export interface AppNotification extends AppNotificationPayload {
  isRead: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface StatTrend {
  changePercent: number;
  direction: 'up' | 'down' | 'neutral';
  lowerIsBetter?: boolean;
}

export interface DashboardStatTrends {
  students?: StatTrend | null;
  active?: StatTrend | null;
  collected?: StatTrend | null;
  outstanding?: StatTrend | null;
  placements?: StatTrend | null;
  applications?: StatTrend | null;
  invoiced?: StatTrend | null;
  overdue?: StatTrend | null;
  collectionRate?: StatTrend | null;
}

export interface DashboardSummary {
  totalStudents: number;
  activeStudents: number;
  pendingApplications: number;
  totalInvoices: number;
  outstandingBalance: number;
  activePlacements: number;
  trends?: DashboardStatTrends | null;
}

export interface Guardian {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string | null;
  address: string | null;
}

export interface Student {
  id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  programId: string;
  programName: string;
  admissionDate: string;
  status: string;
  guardians: Guardian[];
  profilePhotoUrl?: string | null;
  nationalIdFrontUrl?: string | null;
  nationalIdBackUrl?: string | null;
}

export interface CreateStudentRequest {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  programId: string;
  admissionDate: string;
  guardians?: CreateGuardianRequest[];
}

export interface CreateGuardianRequest {
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface Application {
  id: string;
  applicationNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  programId: string;
  programName: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface CreateApplicationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  programId: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  durationYears: number;
  isActive: boolean;
}

export interface Semester {
  id: string;
  programId: string;
  programName: string;
  name: string;
  yearLevel: number;
  semesterNo: number;
  startDate: string;
  endDate: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
  courseType: string;
}

export interface CourseOffering {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterId: string;
  semesterName: string;
  lecturerId: string;
  lecturerName: string;
  academicYear: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  courseOfferingId: string;
  courseName: string;
  enrollmentDate: string;
  status: string;
}

export interface ClassSession {
  id: string;
  courseOfferingId: string;
  courseName: string;
  sessionDate: string;
  topic: string;
  startTime: string;
  endTime: string;
}

export interface AssessmentComponent {
  id: string;
  courseOfferingId: string;
  name: string;
  weight: number;
  maxScore: number;
}

export interface Mark {
  id: string;
  assessmentComponentId: string;
  componentName: string;
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  weight: number;
}

export interface StudentResult {
  courseOfferingId: string;
  courseCode: string;
  courseName: string;
  finalScore: number;
  grade: string;
  marks: Mark[];
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  academicYear: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  issuedAt: string;
  dueDate: string | null;
  lastPaymentDate: string | null;
  items: InvoiceItem[];
}

export interface StudentInvoicePreview {
  studentId: string;
  studentName: string;
  programName: string;
  outstandingBalance: number;
  feeStatus: string;
  suggestedAmount: number;
  suggestedAcademicYear: string;
  nextDueDate: string | null;
  lastPaymentDate: string | null;
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface Payment {
  id: string;
  receiptNo: string;
  invoiceId: string;
  invoiceNo: string;
  studentName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  paymentSource: string;
  transactionReference?: string | null;
  payerPhone?: string | null;
  cardLastFour?: string | null;
  bankReceiptNo?: string | null;
  providerReference?: string | null;
}

export interface GatewayTransaction {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  studentName: string;
  amount: number;
  phoneNumber: string;
  externalTransactionId: string;
  providerReference?: string | null;
  status: string;
  failureReason?: string | null;
  receiptNo?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface FeeBalanceRow {
  studentId: string;
  studentNo: string;
  studentName: string;
  programName: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  feeStatus: string;
  nextDueDate: string | null;
  lastPaymentDate: string | null;
}

export interface PublicStudentFeeInvoice {
  id: string;
  invoiceNo: string;
  academicYear: string;
  balance: number;
  status: string;
  dueDate: string | null;
}

export interface PublicStudentFeeSummary {
  studentId: string;
  studentNo: string;
  studentName: string;
  programName: string;
  outstandingBalance: number;
  feeStatus: string;
  openInvoices: PublicStudentFeeInvoice[];
}

export interface ClinicalFacility {
  id: string;
  name: string;
  facilityType: string;
  contactPerson: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export interface ClinicalPlacement {
  id: string;
  studentId: string;
  studentName: string;
  facilityId: string;
  facilityName: string;
  supervisorId: string | null;
  supervisorName: string | null;
  startDate: string;
  endDate: string;
  department: string;
  status: string;
}

export interface ApiError {
  message: string;
}
