namespace NursingSchool.Application.DTOs;

public record CreateOnlineExamRequest(
    Guid CourseOfferingId,
    string Title,
    string? Instructions,
    IReadOnlyList<OnlineExamQuestionRequest> Questions);

public record UpdateOnlineExamRequest(
    Guid CourseOfferingId,
    string Title,
    string? Instructions,
    IReadOnlyList<OnlineExamQuestionRequest> Questions);

public record OnlineExamQuestionRequest(
    string Text,
    string QuestionType,
    decimal Points,
    IReadOnlyList<OnlineExamOptionRequest> Options);

public record OnlineExamOptionRequest(string Text, bool IsCorrect);

public record OnlineExamListItemResponse(
    Guid Id,
    Guid CourseOfferingId,
    string CourseCode,
    string CourseName,
    string Title,
    string Status,
    string CreatedByName,
    DateTime CreatedAt,
    DateTime? PublishedAt,
    DateTime? ClosedAt,
    int QuestionCount,
    decimal MaxScore);

public record OnlineExamOptionResponse(Guid Id, string Text, bool? IsCorrect);

public record OnlineExamQuestionResponse(
    Guid Id,
    string Text,
    string QuestionType,
    decimal Points,
    int SortOrder,
    IReadOnlyList<OnlineExamOptionResponse> Options);

public record OnlineExamResponse(
    Guid Id,
    Guid CourseOfferingId,
    string CourseCode,
    string CourseName,
    string Title,
    string? Instructions,
    string Status,
    DateTime? PublishedAt,
    DateTime? ClosedAt,
    int QuestionCount,
    decimal MaxScore,
    IReadOnlyList<OnlineExamQuestionResponse> Questions);

public record OnlineExamAnswerRequest(Guid QuestionId, Guid? SelectedOptionId);

public record SubmitOnlineExamRequest(IReadOnlyList<OnlineExamAnswerRequest> Answers);

public record OnlineExamAnswerResultResponse(
    Guid QuestionId,
    string QuestionText,
    Guid? SelectedOptionId,
    bool IsCorrect,
    decimal PointsAwarded,
    decimal Points,
    string? CorrectAnswer);

public record OnlineExamResultResponse(
    Guid SubmissionId,
    Guid OnlineExamId,
    string ExamTitle,
    Guid StudentId,
    string StudentName,
    string StudentNo,
    decimal Score,
    decimal MaxScore,
    DateTime SubmittedAt,
    IReadOnlyList<OnlineExamAnswerResultResponse> Answers);
