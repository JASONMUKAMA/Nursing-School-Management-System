using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Hubs;

namespace NursingSchool.Infrastructure.Services;

public class ClassroomService(IApplicationDbContext db, IHubContext<ClassroomHub> hub) : IClassroomService
{
    // ---------- Live sessions ----------

    public async Task<LiveSessionResponse> CreateSessionAsync(CreateLiveSessionRequest request, Guid hostUserId, CancellationToken ct = default)
    {
        var offering = await db.CourseOfferings
            .Include(o => o.Course)
            .FirstOrDefaultAsync(o => o.Id == request.CourseOfferingId, ct)
            ?? throw new InvalidOperationException("Course offering not found.");

        var host = await db.Users.FirstAsync(u => u.Id == hostUserId, ct);

        var session = new LiveSession
        {
            CourseOfferingId = offering.Id,
            HostUserId = hostUserId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? offering.Course.Name : request.Title.Trim(),
            // Unguessable Jitsi room name — two GUIDs so it cannot be enumerated.
            RoomId = $"nsms-{Guid.NewGuid():N}{Guid.NewGuid():N}",
            Status = LiveSessionStatuses.Scheduled
        };

        db.LiveSessions.Add(session);
        await db.SaveChangesAsync(ct);

        return ToSessionResponse(session, offering, HostName(host));
    }

    public async Task<PagedResult<LiveSessionResponse>> GetSessionsAsync(Guid? courseOfferingId, Guid userId, bool isStudent, PaginationQuery query, CancellationToken ct = default)
    {
        var sessions = db.LiveSessions
            .Include(s => s.CourseOffering).ThenInclude(o => o.Course)
            .Include(s => s.Host)
            .AsQueryable();

        if (courseOfferingId.HasValue)
            sessions = sessions.Where(s => s.CourseOfferingId == courseOfferingId);

        if (isStudent)
        {
            var studentId = await GetStudentIdAsync(userId, ct);
            sessions = sessions.Where(s =>
                db.Enrollments.Any(e => e.StudentId == studentId && e.CourseOfferingId == s.CourseOfferingId));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            sessions = sessions.Where(s =>
                s.Title.ToLower().Contains(term) ||
                s.CourseOffering.Course.Name.ToLower().Contains(term) ||
                s.CourseOffering.Course.Code.ToLower().Contains(term));
        }

        var total = await sessions.CountAsync(ct);
        var items = await sessions
            .OrderByDescending(s => s.Status == LiveSessionStatuses.Live)
            .ThenByDescending(s => s.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<LiveSessionResponse>
        {
            Items = items.Select(s => ToSessionResponse(s, s.CourseOffering, HostName(s.Host))).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<LiveSessionDetailResponse?> GetSessionAsync(Guid id, Guid userId, bool isStudent, CancellationToken ct = default)
    {
        var session = await db.LiveSessions
            .Include(s => s.CourseOffering).ThenInclude(o => o.Course)
            .Include(s => s.Host)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
        if (session == null) return null;

        if (isStudent)
        {
            var studentId = await GetStudentIdAsync(userId, ct);
            var enrolled = await db.Enrollments.AnyAsync(
                e => e.StudentId == studentId && e.CourseOfferingId == session.CourseOfferingId, ct);
            if (!enrolled)
                throw new InvalidOperationException("You are not enrolled in this class.");
        }

        return ToSessionDetail(session);
    }

    public async Task<LiveSessionDetailResponse> StartSessionAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var session = await RequireHostedSessionAsync(id, userId, ct);
        if (session.Status == LiveSessionStatuses.Ended)
            throw new InvalidOperationException("This session has already ended.");

        session.Status = LiveSessionStatuses.Live;
        session.StartedAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await hub.Clients.Group(ClassroomHub.SessionGroup(id))
            .SendAsync("SessionStarted", new { sessionId = id }, ct);

        return ToSessionDetail(session);
    }

    public async Task<LiveSessionDetailResponse> EndSessionAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var session = await RequireHostedSessionAsync(id, userId, ct);
        session.Status = LiveSessionStatuses.Ended;
        session.EndedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await hub.Clients.Group(ClassroomHub.SessionGroup(id))
            .SendAsync("SessionEnded", new { sessionId = id }, ct);

        return ToSessionDetail(session);
    }

    // ---------- Lecture files ----------

    public async Task<LectureFileResponse> AddFileAsync(Guid sessionId, string fileName, string fileUrl, long sizeBytes, Guid uploadedBy, CancellationToken ct = default)
    {
        _ = await db.LiveSessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct)
            ?? throw new InvalidOperationException("Live session not found.");

        var user = await db.Users.FirstAsync(u => u.Id == uploadedBy, ct);
        var file = new LectureFile
        {
            LiveSessionId = sessionId,
            UploadedByUserId = uploadedBy,
            FileName = fileName,
            FileUrl = fileUrl,
            SizeBytes = sizeBytes
        };
        db.LectureFiles.Add(file);
        await db.SaveChangesAsync(ct);

        var response = new LectureFileResponse(file.Id, sessionId, fileName, fileUrl, sizeBytes, HostName(user), file.CreatedAt);
        await hub.Clients.Group(ClassroomHub.SessionGroup(sessionId)).SendAsync("FileUploaded", response, ct);
        return response;
    }

    public async Task<IReadOnlyList<LectureFileResponse>> GetFilesAsync(Guid sessionId, CancellationToken ct = default) =>
        await db.LectureFiles
            .Where(f => f.LiveSessionId == sessionId)
            .Include(f => f.UploadedByUser)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new LectureFileResponse(
                f.Id, f.LiveSessionId, f.FileName, f.FileUrl, f.SizeBytes,
                (f.UploadedByUser.FirstName + " " + f.UploadedByUser.LastName).Trim(), f.CreatedAt))
            .ToListAsync(ct);

    // ---------- Quizzes ----------

    public async Task<QuizResponse> CreateQuizAsync(CreateQuizRequest request, Guid createdBy, CancellationToken ct = default)
    {
        _ = await db.LiveSessions.FirstOrDefaultAsync(s => s.Id == request.LiveSessionId, ct)
            ?? throw new InvalidOperationException("Live session not found.");

        if (request.Questions.Count == 0)
            throw new InvalidOperationException("A quiz needs at least one question.");

        var quiz = new Quiz
        {
            LiveSessionId = request.LiveSessionId,
            CreatedByUserId = createdBy,
            Title = request.Title.Trim(),
            Status = QuizStatuses.Draft
        };

        var order = 0;
        foreach (var q in request.Questions)
        {
            ValidateQuestion(q);
            var question = new QuizQuestion
            {
                Text = q.Text.Trim(),
                QuestionType = q.QuestionType,
                Points = q.Points,
                SortOrder = order++,
                CorrectAnswerText = q.QuestionType == QuizQuestionTypes.ShortAnswer ? q.CorrectAnswerText?.Trim() : null
            };
            if (q.QuestionType != QuizQuestionTypes.ShortAnswer)
            {
                var optOrder = 0;
                foreach (var o in q.Options)
                    question.Options.Add(new QuizOption { Text = o.Text.Trim(), IsCorrect = o.IsCorrect, SortOrder = optOrder++ });
            }
            quiz.Questions.Add(question);
        }

        db.Quizzes.Add(quiz);
        await db.SaveChangesAsync(ct);

        return ToQuizResponse(quiz, includeAnswers: true);
    }

    public async Task<IReadOnlyList<QuizResponse>> GetQuizzesAsync(Guid sessionId, bool includeAnswers, CancellationToken ct = default)
    {
        var quizzes = await db.Quizzes
            .Where(q => q.LiveSessionId == sessionId)
            .Include(q => q.Questions).ThenInclude(x => x.Options)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync(ct);

        // Students only ever see published/closed quizzes, with the answer key stripped.
        if (!includeAnswers)
            quizzes = quizzes.Where(q => q.Status != QuizStatuses.Draft).ToList();

        return quizzes.Select(q => ToQuizResponse(q, includeAnswers)).ToList();
    }

    public async Task<QuizResponse?> GetQuizAsync(Guid quizId, bool includeAnswers, CancellationToken ct = default)
    {
        var quiz = await LoadQuizAsync(quizId, ct);
        if (quiz == null) return null;
        if (!includeAnswers && quiz.Status == QuizStatuses.Draft) return null;
        return ToQuizResponse(quiz, includeAnswers);
    }

    public async Task<QuizResponse> PublishQuizAsync(Guid quizId, Guid userId, CancellationToken ct = default)
    {
        var quiz = await LoadQuizAsync(quizId, ct)
            ?? throw new InvalidOperationException("Quiz not found.");

        quiz.Status = QuizStatuses.Published;
        quiz.PublishedAt ??= DateTime.UtcNow;
        quiz.ClosedAt = null;
        await db.SaveChangesAsync(ct);

        // Push the student-safe version to everyone in the room so quiz forms appear instantly.
        await hub.Clients.Group(ClassroomHub.SessionGroup(quiz.LiveSessionId))
            .SendAsync("QuizPublished", ToQuizResponse(quiz, includeAnswers: false), ct);

        return ToQuizResponse(quiz, includeAnswers: true);
    }

    public async Task<QuizResponse> CloseQuizAsync(Guid quizId, Guid userId, CancellationToken ct = default)
    {
        var quiz = await LoadQuizAsync(quizId, ct)
            ?? throw new InvalidOperationException("Quiz not found.");

        quiz.Status = QuizStatuses.Closed;
        quiz.ClosedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await hub.Clients.Group(ClassroomHub.SessionGroup(quiz.LiveSessionId))
            .SendAsync("QuizClosed", new { quizId }, ct);

        return ToQuizResponse(quiz, includeAnswers: true);
    }

    // ---------- Submissions & auto-grading ----------

    public async Task<QuizResultResponse> SubmitQuizAsync(Guid quizId, Guid studentId, SubmitQuizRequest request, CancellationToken ct = default)
    {
        var quiz = await LoadQuizAsync(quizId, ct)
            ?? throw new InvalidOperationException("Quiz not found.");

        if (quiz.Status != QuizStatuses.Published)
            throw new InvalidOperationException("This quiz is not accepting submissions.");

        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == studentId, ct)
            ?? throw new InvalidOperationException("Student record not found.");

        var alreadySubmitted = await db.QuizSubmissions.AnyAsync(s => s.QuizId == quizId && s.StudentId == studentId, ct);
        if (alreadySubmitted)
            throw new InvalidOperationException("You have already submitted this quiz.");

        var submission = new QuizSubmission
        {
            QuizId = quizId,
            StudentId = studentId,
            SubmittedAt = DateTime.UtcNow,
            MaxScore = quiz.Questions.Sum(q => q.Points)
        };

        foreach (var question in quiz.Questions)
        {
            var answer = request.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
            var (isCorrect, awarded) = Grade(question, answer);
            submission.Score += awarded;
            submission.Answers.Add(new QuizAnswer
            {
                QuizQuestionId = question.Id,
                SelectedOptionId = answer?.SelectedOptionId,
                AnswerText = answer?.AnswerText?.Trim(),
                IsCorrect = isCorrect,
                PointsAwarded = awarded
            });
        }

        db.QuizSubmissions.Add(submission);
        await db.SaveChangesAsync(ct);

        var result = ToResultResponse(submission, quiz, student);

        // Instantly inject the graded result into the teacher's live results view.
        await hub.Clients.Group(ClassroomHub.HostGroup(quiz.LiveSessionId))
            .SendAsync("SubmissionReceived", result, ct);

        return result;
    }

    public async Task<IReadOnlyList<QuizResultResponse>> GetQuizResultsAsync(Guid quizId, CancellationToken ct = default)
    {
        var quiz = await LoadQuizAsync(quizId, ct)
            ?? throw new InvalidOperationException("Quiz not found.");

        var submissions = await db.QuizSubmissions
            .Where(s => s.QuizId == quizId)
            .Include(s => s.Student)
            .Include(s => s.Answers)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync(ct);

        return submissions.Select(s => ToResultResponse(s, quiz, s.Student)).ToList();
    }

    public async Task<QuizResultResponse?> GetMyQuizResultAsync(Guid quizId, Guid studentId, CancellationToken ct = default)
    {
        var quiz = await LoadQuizAsync(quizId, ct);
        if (quiz == null) return null;

        var submission = await db.QuizSubmissions
            .Where(s => s.QuizId == quizId && s.StudentId == studentId)
            .Include(s => s.Student)
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(ct);

        return submission == null ? null : ToResultResponse(submission, quiz, submission.Student);
    }

    // ---------- Helpers ----------

    private static (bool IsCorrect, decimal Awarded) Grade(QuizQuestion question, QuizAnswerRequest? answer)
    {
        if (answer == null) return (false, 0);

        if (question.QuestionType == QuizQuestionTypes.ShortAnswer)
        {
            var expected = question.CorrectAnswerText?.Trim();
            var given = answer.AnswerText?.Trim();
            var correct = !string.IsNullOrEmpty(expected) && !string.IsNullOrEmpty(given) &&
                          string.Equals(expected, given, StringComparison.OrdinalIgnoreCase);
            return (correct, correct ? question.Points : 0);
        }

        var selected = question.Options.FirstOrDefault(o => o.Id == answer.SelectedOptionId);
        var isCorrect = selected?.IsCorrect == true;
        return (isCorrect, isCorrect ? question.Points : 0);
    }

    private static void ValidateQuestion(QuizQuestionRequest q)
    {
        if (string.IsNullOrWhiteSpace(q.Text))
            throw new InvalidOperationException("Every question needs text.");
        if (q.Points <= 0)
            throw new InvalidOperationException("Question points must be greater than zero.");

        if (q.QuestionType == QuizQuestionTypes.ShortAnswer)
        {
            if (string.IsNullOrWhiteSpace(q.CorrectAnswerText))
                throw new InvalidOperationException($"Short-answer question \"{q.Text}\" needs a correct answer.");
        }
        else if (q.QuestionType is QuizQuestionTypes.MultipleChoice or QuizQuestionTypes.TrueFalse)
        {
            if (q.Options.Count < 2)
                throw new InvalidOperationException($"Question \"{q.Text}\" needs at least two options.");
            if (!q.Options.Any(o => o.IsCorrect))
                throw new InvalidOperationException($"Question \"{q.Text}\" needs a correct option marked.");
        }
        else
        {
            throw new InvalidOperationException($"Unknown question type \"{q.QuestionType}\".");
        }
    }

    private async Task<Guid> GetStudentIdAsync(Guid userId, CancellationToken ct)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.UserId == userId, ct)
            ?? throw new InvalidOperationException("Student record not found for this account.");
        return student.Id;
    }

    private async Task<LiveSession> RequireHostedSessionAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var session = await db.LiveSessions
            .Include(s => s.CourseOffering).ThenInclude(o => o.Course)
            .Include(s => s.Host)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new InvalidOperationException("Live session not found.");
        return session;
    }

    private async Task<Quiz?> LoadQuizAsync(Guid quizId, CancellationToken ct) =>
        await db.Quizzes
            .Include(q => q.Questions.OrderBy(x => x.SortOrder)).ThenInclude(x => x.Options.OrderBy(o => o.SortOrder))
            .FirstOrDefaultAsync(q => q.Id == quizId, ct);

    private static string HostName(ApplicationUser user) =>
        $"{user.FirstName} {user.LastName}".Trim() is { Length: > 0 } name ? name : user.UserName ?? "Unknown";

    private static LiveSessionResponse ToSessionResponse(LiveSession s, CourseOffering offering, string hostName) =>
        new(s.Id, s.CourseOfferingId, offering.Course.Code, offering.Course.Name,
            s.Title, s.Status, hostName, s.HostUserId, s.CreatedAt, s.StartedAt, s.EndedAt);

    private static LiveSessionDetailResponse ToSessionDetail(LiveSession s) =>
        new(s.Id, s.CourseOfferingId, s.CourseOffering.Course.Code, s.CourseOffering.Course.Name,
            s.Title, s.Status, HostName(s.Host), s.HostUserId, s.RoomId, s.CreatedAt, s.StartedAt, s.EndedAt);

    private static QuizResponse ToQuizResponse(Quiz quiz, bool includeAnswers)
    {
        var questions = quiz.Questions
            .OrderBy(q => q.SortOrder)
            .Select(q => new QuizQuestionResponse(
                q.Id, q.Text, q.QuestionType, q.Points, q.SortOrder,
                includeAnswers ? q.CorrectAnswerText : null,
                q.Options.OrderBy(o => o.SortOrder)
                    .Select(o => new QuizOptionResponse(o.Id, o.Text, includeAnswers ? o.IsCorrect : null))
                    .ToList()))
            .ToList();

        return new QuizResponse(
            quiz.Id, quiz.LiveSessionId, quiz.Title, quiz.Status,
            quiz.PublishedAt, quiz.ClosedAt, questions.Count,
            quiz.Questions.Sum(q => q.Points), questions);
    }

    private static QuizResultResponse ToResultResponse(QuizSubmission submission, Quiz quiz, Student student)
    {
        var answers = quiz.Questions
            .OrderBy(q => q.SortOrder)
            .Select(q =>
            {
                var a = submission.Answers.FirstOrDefault(x => x.QuizQuestionId == q.Id);
                var correctAnswer = q.QuestionType == QuizQuestionTypes.ShortAnswer
                    ? q.CorrectAnswerText
                    : q.Options.FirstOrDefault(o => o.IsCorrect)?.Text;
                return new QuizAnswerResultResponse(
                    q.Id, q.Text, a?.SelectedOptionId, a?.AnswerText,
                    a?.IsCorrect ?? false, a?.PointsAwarded ?? 0, q.Points, correctAnswer);
            })
            .ToList();

        return new QuizResultResponse(
            submission.Id, quiz.Id, quiz.Title,
            student.Id, $"{student.FirstName} {student.LastName}".Trim(), student.StudentNo,
            submission.Score, submission.MaxScore, submission.SubmittedAt, answers);
    }
}
