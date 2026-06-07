namespace NursingSchool.Application.DTOs;

public record CreateClassSessionRequest(Guid CourseOfferingId, DateOnly SessionDate, string Topic, TimeOnly StartTime, TimeOnly EndTime);
public record ClassSessionResponse(Guid Id, Guid CourseOfferingId, string CourseName, DateOnly SessionDate, string Topic, TimeOnly StartTime, TimeOnly EndTime);

public record AttendanceEntryRequest(Guid StudentId, string Status, string? Remarks);
public record SubmitAttendanceRequest(IReadOnlyList<AttendanceEntryRequest> Entries);
public record AttendanceRecordResponse(Guid Id, Guid StudentId, string StudentName, string Status, string? Remarks);
