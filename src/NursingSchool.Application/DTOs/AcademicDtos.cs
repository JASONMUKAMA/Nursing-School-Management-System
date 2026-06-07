namespace NursingSchool.Application.DTOs;

public record CreateProgramRequest(string Code, string Name, int DurationYears);
public record ProgramResponse(Guid Id, string Code, string Name, int DurationYears, bool IsActive);

public record CreateSemesterRequest(Guid ProgramId, string Name, int YearLevel, int SemesterNo, DateOnly StartDate, DateOnly EndDate);
public record SemesterResponse(Guid Id, Guid ProgramId, string ProgramName, string Name, int YearLevel, int SemesterNo, DateOnly StartDate, DateOnly EndDate);

public record CreateCourseRequest(string Code, string Name, int CreditUnits, string CourseType);
public record CourseResponse(Guid Id, string Code, string Name, int CreditUnits, string CourseType);

public record CreateCourseOfferingRequest(Guid CourseId, Guid SemesterId, Guid LecturerId, string AcademicYear);
public record CourseOfferingResponse(Guid Id, Guid CourseId, string CourseCode, string CourseName, Guid SemesterId, string SemesterName, Guid LecturerId, string LecturerName, string AcademicYear);

public record CreateEnrollmentRequest(Guid StudentId, Guid CourseOfferingId, DateOnly EnrollmentDate);
public record EnrollmentResponse(Guid Id, Guid StudentId, string StudentName, Guid CourseOfferingId, string CourseName, DateOnly EnrollmentDate, string Status);
