using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class OnlineExamsService(IApplicationDbContext db) : IOnlineExamsService
{
    public async Task<PagedResult<OnlineExamListItemResponse>> GetExamsAsync(
        Guid? courseOfferingId, Guid userId, bool isStudent, PaginationQuery query, CancellationToken ct = default)
    {
        var exams = db.OnlineExams
            .Include(e => e.CourseOffering).ThenInclude(o => o.Course)
            .Include(e => e.CreatedByUser)
            .Include(e => e.Questions)
            .AsQueryable();

        if (courseOfferingId.HasValue)
            exams = exams.Where(e => e.CourseOfferingId == courseOfferingId);

        if (isStudent)
        {
            var studentId = await TryGetStudentIdAsync(userId, ct);
            if (studentId == null)
            {
                return new PagedResult<OnlineExamListItemResponse>
                {
                    Items = [],
                    TotalCount = 0,
                    Page = query.Page,
                    PageSize = query.PageSize
                };
            }

            exams = exams.Where(e =>
                e.Status != QuizStatuses.Draft &&
                db.Enrollments.Any(en => en.StudentId == studentId && en.CourseOfferingId == e.CourseOfferingId));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            exams = exams.Where(e =>
                e.Title.ToLower().Contains(term) ||
                e.CourseOffering.Course.Name.ToLower().Contains(term) ||
                e.CourseOffering.Course.Code.ToLower().Contains(term));
        }

        var total = await exams.CountAsync(ct);
        var items = await exams
            .OrderByDescending(e => e.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<OnlineExamListItemResponse>
        {
            Items = items.Select(ToListItem).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<OnlineExamResponse?> GetExamAsync(
        Guid id, Guid userId, bool isStudent, bool includeAnswers, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(id, ct);
        if (exam == null) return null;

        if (isStudent)
        {
            var studentId = await TryGetStudentIdAsync(userId, ct);
            if (studentId == null) return null;

            var enrolled = await db.Enrollments.AnyAsync(
                e => e.StudentId == studentId && e.CourseOfferingId == exam.CourseOfferingId, ct);
            if (!enrolled) return null;
            if (exam.Status == QuizStatuses.Draft) return null;
            includeAnswers = false;
        }

        return ToExamResponse(exam, includeAnswers);
    }

    public async Task<OnlineExamResponse> CreateExamAsync(CreateOnlineExamRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var offering = await db.CourseOfferings.Include(o => o.Course)
            .FirstOrDefaultAsync(o => o.Id == request.CourseOfferingId, ct)
            ?? throw new InvalidOperationException("Course offering not found.");

        if (request.Questions.Count == 0)
            throw new InvalidOperationException("An exam needs at least one objective question.");

        var exam = new OnlineExam
        {
            CourseOfferingId = offering.Id,
            CreatedByUserId = createdBy,
            Title = request.Title.Trim(),
            Instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim(),
            Status = QuizStatuses.Draft
        };

        var order = 0;
        foreach (var q in request.Questions)
        {
            ValidateQuestion(q);
            var question = new OnlineExamQuestion
            {
                Text = q.Text.Trim(),
                QuestionType = q.QuestionType,
                Points = q.Points,
                SortOrder = order++
            };
            var optOrder = 0;
            foreach (var o in q.Options)
                question.Options.Add(new OnlineExamOption { Text = o.Text.Trim(), IsCorrect = o.IsCorrect, SortOrder = optOrder++ });
            exam.Questions.Add(question);
        }

        db.OnlineExams.Add(exam);
        await db.SaveChangesAsync(ct);

        exam.CourseOffering = offering;
        return ToExamResponse(exam, includeAnswers: true);
    }

    public async Task<OnlineExamResponse> UpdateExamAsync(
        Guid id, UpdateOnlineExamRequest request, Guid userId, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(id, ct)
            ?? throw new InvalidOperationException("Exam not found.");

        if (exam.Status == QuizStatuses.Closed)
            throw new InvalidOperationException("Closed exams cannot be edited.");

        if (await db.OnlineExamSubmissions.AnyAsync(s => s.OnlineExamId == id, ct))
            throw new InvalidOperationException("This exam already has student submissions and cannot be edited.");

        var offering = await db.CourseOfferings.Include(o => o.Course)
            .FirstOrDefaultAsync(o => o.Id == request.CourseOfferingId, ct)
            ?? throw new InvalidOperationException("Course offering not found.");

        if (request.Questions.Count == 0)
            throw new InvalidOperationException("An exam needs at least one objective question.");

        exam.CourseOfferingId = offering.Id;
        exam.Title = request.Title.Trim();
        exam.Instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim();
        exam.UpdatedBy = userId;

        foreach (var question in exam.Questions.ToList())
        {
            db.OnlineExamOptions.RemoveRange(question.Options);
            db.OnlineExamQuestions.Remove(question);
        }

        var order = 0;
        foreach (var q in request.Questions)
        {
            ValidateQuestion(q);
            var question = new OnlineExamQuestion
            {
                OnlineExamId = exam.Id,
                Text = q.Text.Trim(),
                QuestionType = q.QuestionType,
                Points = q.Points,
                SortOrder = order++,
                CreatedBy = userId,
            };
            var optOrder = 0;
            foreach (var o in q.Options)
                question.Options.Add(new OnlineExamOption
                {
                    Text = o.Text.Trim(),
                    IsCorrect = o.IsCorrect,
                    SortOrder = optOrder++,
                    CreatedBy = userId,
                });
            db.OnlineExamQuestions.Add(question);
        }

        await db.SaveChangesAsync(ct);

        exam = await LoadExamAsync(id, ct)!;
        return ToExamResponse(exam!, includeAnswers: true);
    }

    public async Task<OnlineExamResponse> PublishExamAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(id, ct)
            ?? throw new InvalidOperationException("Exam not found.");

        exam.Status = QuizStatuses.Published;
        exam.PublishedAt ??= DateTime.UtcNow;
        exam.ClosedAt = null;
        await db.SaveChangesAsync(ct);
        return ToExamResponse(exam, includeAnswers: true);
    }

    public async Task<OnlineExamResponse> CloseExamAsync(Guid id, Guid userId, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(id, ct)
            ?? throw new InvalidOperationException("Exam not found.");

        exam.Status = QuizStatuses.Closed;
        exam.ClosedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToExamResponse(exam, includeAnswers: true);
    }

    public async Task<OnlineExamResultResponse> SubmitExamAsync(
        Guid examId, Guid studentId, SubmitOnlineExamRequest request, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(examId, ct)
            ?? throw new InvalidOperationException("Exam not found.");

        if (exam.Status != QuizStatuses.Published)
            throw new InvalidOperationException("This exam is not accepting submissions.");

        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == studentId, ct)
            ?? throw new InvalidOperationException("Student record not found.");

        var enrolled = await db.Enrollments.AnyAsync(
            e => e.StudentId == studentId && e.CourseOfferingId == exam.CourseOfferingId, ct);
        if (!enrolled)
            throw new InvalidOperationException("You are not enrolled in this course.");

        if (await db.OnlineExamSubmissions.AnyAsync(s => s.OnlineExamId == examId && s.StudentId == studentId, ct))
            throw new InvalidOperationException("You have already submitted this exam.");

        var submission = new OnlineExamSubmission
        {
            OnlineExamId = examId,
            StudentId = studentId,
            SubmittedAt = DateTime.UtcNow,
            MaxScore = exam.Questions.Sum(q => q.Points)
        };

        foreach (var question in exam.Questions)
        {
            var answer = request.Answers.FirstOrDefault(a => a.QuestionId == question.Id);
            var (isCorrect, awarded) = Grade(question, answer);
            submission.Score += awarded;
            submission.Answers.Add(new OnlineExamAnswer
            {
                OnlineExamQuestionId = question.Id,
                SelectedOptionId = answer?.SelectedOptionId,
                IsCorrect = isCorrect,
                PointsAwarded = awarded
            });
        }

        db.OnlineExamSubmissions.Add(submission);
        await db.SaveChangesAsync(ct);

        return ToResultResponse(submission, exam, student);
    }

    public async Task<IReadOnlyList<OnlineExamResultResponse>> GetExamResultsAsync(Guid examId, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(examId, ct)
            ?? throw new InvalidOperationException("Exam not found.");

        var submissions = await db.OnlineExamSubmissions
            .Where(s => s.OnlineExamId == examId)
            .Include(s => s.Student)
            .Include(s => s.Answers)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync(ct);

        return submissions.Select(s => ToResultResponse(s, exam, s.Student)).ToList();
    }

    public async Task<OnlineExamResultResponse?> GetMyExamResultAsync(Guid examId, Guid studentId, CancellationToken ct = default)
    {
        var exam = await LoadExamAsync(examId, ct);
        if (exam == null) return null;

        var submission = await db.OnlineExamSubmissions
            .Where(s => s.OnlineExamId == examId && s.StudentId == studentId)
            .Include(s => s.Student)
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(ct);

        return submission == null ? null : ToResultResponse(submission, exam, submission.Student);
    }

    private static (bool IsCorrect, decimal Awarded) Grade(OnlineExamQuestion question, OnlineExamAnswerRequest? answer)
    {
        if (answer?.SelectedOptionId == null) return (false, 0);
        var selected = question.Options.FirstOrDefault(o => o.Id == answer.SelectedOptionId);
        var isCorrect = selected?.IsCorrect == true;
        return (isCorrect, isCorrect ? question.Points : 0);
    }

    private static void ValidateQuestion(OnlineExamQuestionRequest q)
    {
        if (string.IsNullOrWhiteSpace(q.Text))
            throw new InvalidOperationException("Every question needs text.");
        if (q.Points <= 0)
            throw new InvalidOperationException("Question points must be greater than zero.");
        if (q.QuestionType is not (OnlineExamQuestionTypes.MultipleChoice or OnlineExamQuestionTypes.TrueFalse))
            throw new InvalidOperationException("Online exams only support objective (multiple choice) questions.");
        if (q.Options.Count < 2)
            throw new InvalidOperationException($"Question \"{q.Text}\" needs at least two options.");
        if (!q.Options.Any(o => o.IsCorrect))
            throw new InvalidOperationException($"Question \"{q.Text}\" needs a correct option marked.");
    }

    private async Task<Guid?> TryGetStudentIdAsync(Guid userId, CancellationToken ct) =>
        await StudentAccountResolver.ResolveStudentIdAsync(db, userId, null, ct);

    private async Task<OnlineExam?> LoadExamAsync(Guid examId, CancellationToken ct) =>
        await db.OnlineExams
            .Include(e => e.CourseOffering).ThenInclude(o => o.Course)
            .Include(e => e.Questions.OrderBy(x => x.SortOrder)).ThenInclude(x => x.Options.OrderBy(o => o.SortOrder))
            .FirstOrDefaultAsync(e => e.Id == examId, ct);

    private static string PersonName(ApplicationUser user) =>
        $"{user.FirstName} {user.LastName}".Trim() is { Length: > 0 } name ? name : user.UserName ?? "Unknown";

    private static OnlineExamListItemResponse ToListItem(OnlineExam exam) =>
        new(
            exam.Id, exam.CourseOfferingId,
            exam.CourseOffering.Course.Code, exam.CourseOffering.Course.Name,
            exam.Title, exam.Status, PersonName(exam.CreatedByUser),
            exam.CreatedAt, exam.PublishedAt, exam.ClosedAt,
            exam.Questions.Count, exam.Questions.Sum(q => q.Points));

    private static OnlineExamResponse ToExamResponse(OnlineExam exam, bool includeAnswers)
    {
        var questions = exam.Questions
            .OrderBy(q => q.SortOrder)
            .Select(q => new OnlineExamQuestionResponse(
                q.Id, q.Text, q.QuestionType, q.Points, q.SortOrder,
                q.Options.OrderBy(o => o.SortOrder)
                    .Select(o => new OnlineExamOptionResponse(o.Id, o.Text, includeAnswers ? o.IsCorrect : null))
                    .ToList()))
            .ToList();

        return new OnlineExamResponse(
            exam.Id, exam.CourseOfferingId,
            exam.CourseOffering.Course.Code, exam.CourseOffering.Course.Name,
            exam.Title, exam.Instructions, exam.Status,
            exam.PublishedAt, exam.ClosedAt,
            questions.Count, exam.Questions.Sum(q => q.Points), questions);
    }

    private static OnlineExamResultResponse ToResultResponse(
        OnlineExamSubmission submission, OnlineExam exam, Student student)
    {
        var answers = exam.Questions
            .OrderBy(q => q.SortOrder)
            .Select(q =>
            {
                var a = submission.Answers.FirstOrDefault(x => x.OnlineExamQuestionId == q.Id);
                var correctAnswer = q.Options.FirstOrDefault(o => o.IsCorrect)?.Text;
                return new OnlineExamAnswerResultResponse(
                    q.Id, q.Text, a?.SelectedOptionId,
                    a?.IsCorrect ?? false, a?.PointsAwarded ?? 0, q.Points, correctAnswer);
            })
            .ToList();

        return new OnlineExamResultResponse(
            submission.Id, exam.Id, exam.Title,
            student.Id, $"{student.FirstName} {student.LastName}".Trim(), student.StudentNo,
            submission.Score, submission.MaxScore, submission.SubmittedAt, answers);
    }
}
