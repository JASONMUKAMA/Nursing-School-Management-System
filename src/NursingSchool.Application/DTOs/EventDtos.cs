namespace NursingSchool.Application.DTOs;

public record SchoolEventResponse(Guid Id, string Title, string Description, string EventType, DateTime StartDate, DateTime EndDate, string Location, string TargetAudience, bool IsPublished = true);
public record CreateSchoolEventRequest(string Title, string Description, string EventType, DateTime StartDate, DateTime EndDate, string Location, string TargetAudience, bool IsPublished = true);
public record CreateSchoolEventResponse(SchoolEventResponse Event, bool InvitationsQueued);
public record AppNotificationResponse(Guid Id, string Title, string Message, string Category, string? LinkUrl, bool IsRead, DateTime SentAt);

public record RegistrarDashboardDto(int TotalStudents, int NewAdmissionsThisMonth, int PendingApplications, int EnrollmentsThisSemester, IReadOnlyList<ApplicationResponse> RecentApplications);
public record LecturerDashboardDto(int AssignedCourses, int SessionsThisWeek, int StudentsToMark, IReadOnlyList<CourseOfferingResponse> Courses);
public record StudentDashboardDto(Guid StudentId, string StudentName, string ProgramName, decimal FeeBalance, string FeeStatus, int CoursesEnrolled, decimal AttendancePercent, IReadOnlyList<StudentResultResponse> RecentResults, IReadOnlyList<SchoolEventResponse> UpcomingEvents);
public record ClinicalDashboardDto(int ActivePlacements, int FacilitiesCount, int PendingEvaluations, IReadOnlyList<ClinicalPlacementResponse> ActiveList);
public record PaymentSummaryRow(string ReceiptNo, string StudentName, decimal Amount, string PaymentMethod, DateOnly PaymentDate);
