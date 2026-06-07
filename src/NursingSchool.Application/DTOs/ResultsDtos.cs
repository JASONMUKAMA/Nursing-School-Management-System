namespace NursingSchool.Application.DTOs;

public record CreateAssessmentComponentRequest(Guid CourseOfferingId, string Name, decimal Weight, decimal MaxScore);
public record AssessmentComponentResponse(Guid Id, Guid CourseOfferingId, string Name, decimal Weight, decimal MaxScore);

public record CreateMarkRequest(Guid AssessmentComponentId, Guid StudentId, decimal Score);
public record MarkResponse(Guid Id, Guid AssessmentComponentId, string ComponentName, Guid StudentId, string StudentName, decimal Score, decimal MaxScore, decimal Weight);

public record StudentResultResponse(
    Guid CourseOfferingId, string CourseCode, string CourseName,
    decimal FinalScore, string Grade, IReadOnlyList<MarkResponse> Marks);
