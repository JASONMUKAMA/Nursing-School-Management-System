import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/layout/AppLayout';

import { ProtectedRoute } from './components/ProtectedRoute';

import { ActivityLogsPage } from './features/admin/ActivityLogsPage';
import { AdminUsersPage } from './features/admin/AdminUsersPage';

import { LoginPage } from './features/auth/LoginPage';

import { LandingPage } from './features/landing/LandingPage';

import { DashboardPage } from './features/dashboard/DashboardPage';

import { StudentsPage } from './features/students/StudentsPage';

import { AdmissionsPage } from './features/admissions/AdmissionsPage';

import { AcademicPage } from './features/academic/AcademicPage';

import { AttendancePage } from './features/attendance/AttendancePage';

import { ClassroomPage } from './features/classroom/ClassroomPage';

import { LiveClassroomPage } from './features/classroom/LiveClassroomPage';

import { ResultsPage } from './features/results/ResultsPage';

import { FinancePage } from './features/finance/FinancePage';

import { ClinicalPage } from './features/clinical/ClinicalPage';

import { SchedulingPage } from './features/scheduling/SchedulingPage';

import { ReportsPage } from './features/reports/ReportsPage';

import { IdsPage } from './features/ids/IdsPage';

import { ComplaintsPage } from './features/complaints/ComplaintsPage';

import { OnlineExamsPage } from './features/online-exams/OnlineExamsPage';

import { TakeOnlineExamPage } from './features/online-exams/TakeOnlineExamPage';



export default function App() {

  return (

    <Routes>

      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<LoginPage />} />



      <Route path="/app" element={<ProtectedRoute />}>

        <Route element={<AppLayout />}>

          <Route index element={<Navigate to="/app/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="complaints" element={<ComplaintsPage />} />



          <Route element={<ProtectedRoute roles={['Admin']} />}>

            <Route path="admin/users" element={<AdminUsersPage />} />

            <Route path="admin/administrators" element={<AdminUsersPage />} />

            <Route path="admin/activity-logs" element={<ActivityLogsPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator', 'FinanceOfficer']} />}>

            <Route path="students" element={<StudentsPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Registrar']} />}>

            <Route path="admissions" element={<AdmissionsPage />} />

            <Route path="teachers" element={<AdminUsersPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Registrar', 'Lecturer', 'Student']} />}>

            <Route path="academic" element={<Navigate to="/app/academic/programs" replace />} />
            <Route path="academic/*" element={<AcademicPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Lecturer']} />}>

            <Route path="attendance" element={<AttendancePage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Lecturer', 'Student']} />}>

            <Route path="classroom" element={<ClassroomPage />} />

            <Route path="classroom/:sessionId" element={<LiveClassroomPage />} />

            <Route path="online-exams" element={<OnlineExamsPage />} />

            <Route path="online-exams/:examId" element={<TakeOnlineExamPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Lecturer', 'Registrar', 'Student']} />}>

            <Route path="results" element={<Navigate to="/app/results/view" replace />} />
            <Route path="results/*" element={<ResultsPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'FinanceOfficer', 'Registrar']} />}>

            <Route path="finance" element={<FinancePage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Registrar']} />}>

            <Route path="ids" element={<IdsPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'ClinicalCoordinator', 'Lecturer']} />}>

            <Route path="clinical" element={<Navigate to="/app/clinical/facilities" replace />} />
            <Route path="clinical/*" element={<ClinicalPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'Registrar', 'Lecturer', 'ClinicalCoordinator']} />}>

            <Route path="scheduling" element={<Navigate to="/app/scheduling/calendar" replace />} />
            <Route path="scheduling/*" element={<SchedulingPage />} />

          </Route>



          <Route element={<ProtectedRoute roles={['Admin', 'FinanceOfficer', 'Registrar', 'Lecturer']} />}>

            <Route path="reports" element={<Navigate to="/app/reports/fee-balances" replace />} />
            <Route path="reports/*" element={<ReportsPage />} />

          </Route>

        </Route>

      </Route>



      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>

  );

}


