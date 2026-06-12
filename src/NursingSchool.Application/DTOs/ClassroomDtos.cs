namespace NursingSchool.Application.DTOs;

// ---- Live sessions ----

public record CreateLiveSessionRequest(Guid CourseOfferingId, string Title);

public record LiveSessionResponse(
    Guid Id, Guid CourseOfferingId, string CourseCode, string CourseName,
    string Title, string Status, string HostName, Guid HostUserId,
    DateTime CreatedAt, DateTime? StartedAt, DateTime? EndedAt);

/// <summary>Detail view including the unguessable Jitsi room id — only returned to authorized participants.</summary>
public record LiveSessionDetailResponse(
    Guid Id, Guid CourseOfferingId, string CourseCode, string CourseName,
    string Title, string Status, string HostName, Guid HostUserId, string RoomId,
    DateTime CreatedAt, DateTime? StartedAt, DateTime? EndedAt);

// ---- Lecture files ----

public record LectureFileResponse(
    Guid Id, Guid LiveSessionId, string FileName, string FileUrl,
    long SizeBytes, string UploadedByName, DateTime CreatedAt);

// ---- Quiz authoring (teacher uploads questions + correct answers) ----

public record QuizOptionRequest(string Text, bool IsCorrect);

public record QuizQuestionRequest(
    string Text, string QuestionType, decimal Points,
    string? CorrectAnswerText, IReadOnlyList<QuizOptionRequest> Options);

public record CreateQuizRequest(Guid LiveSessionId, string Title, IReadOnlyList<QuizQuestionRequest> Questions);

// ---- Quiz views ----

/// <summary>IsCorrect is null when serving the quiz to students.</summary>
public record QuizOptionResponse(Guid Id, string Text, bool? IsCorrect);

public record QuizQuestionResponse(
    Guid Id, string Text, string QuestionType, decimal Points, int SortOrder,
    string? CorrectAnswerText, IReadOnlyList<QuizOptionResponse> Options);

public record QuizResponse(
    Guid Id, Guid LiveSessionId, string Title, string Status,
    DateTime? PublishedAt, DateTime? ClosedAt, int QuestionCount, decimal MaxScore,
    IReadOnlyList<QuizQuestionResponse> Questions);

// ---- Submissions & grading ----

public record QuizAnswerRequest(Guid QuestionId, Guid? SelectedOptionId, string? AnswerText);

public record SubmitQuizRequest(IReadOnlyList<QuizAnswerRequest> Answers);

public record QuizAnswerResultResponse(
    Guid QuestionId, string QuestionText, Guid? SelectedOptionId, string? AnswerText,
    bool IsCorrect, decimal PointsAwarded, decimal Points, string? CorrectAnswer);

public record QuizResultResponse(
    Guid SubmissionId, Guid QuizId, string QuizTitle,
    Guid StudentId, string StudentName, string StudentNo,
    decimal Score, decimal MaxScore, DateTime SubmittedAt,
    IReadOnlyList<QuizAnswerResultResponse> Answers);
