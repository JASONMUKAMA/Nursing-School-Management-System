using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Quiz : AuditableEntity
{
    public Guid LiveSessionId { get; set; }
    public LiveSession LiveSession { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<QuizQuestion> Questions { get; set; } = [];
    public ICollection<QuizSubmission> Submissions { get; set; } = [];
}

public class QuizQuestion : AuditableEntity
{
    public Guid QuizId { get; set; }
    public Quiz Quiz { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    public string QuestionType { get; set; } = string.Empty;
    public decimal Points { get; set; } = 1;
    public int SortOrder { get; set; }
    /// <summary>Expected answer for short-answer questions (matched case-insensitively).</summary>
    public string? CorrectAnswerText { get; set; }

    public ICollection<QuizOption> Options { get; set; } = [];
}

public class QuizOption : AuditableEntity
{
    public Guid QuizQuestionId { get; set; }
    public QuizQuestion Question { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int SortOrder { get; set; }
}

public class QuizSubmission : AuditableEntity
{
    public Guid QuizId { get; set; }
    public Quiz Quiz { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public DateTime SubmittedAt { get; set; }
    public decimal Score { get; set; }
    public decimal MaxScore { get; set; }

    public ICollection<QuizAnswer> Answers { get; set; } = [];
}

public class QuizAnswer : AuditableEntity
{
    public Guid QuizSubmissionId { get; set; }
    public QuizSubmission Submission { get; set; } = null!;
    public Guid QuizQuestionId { get; set; }
    public QuizQuestion Question { get; set; } = null!;
    public Guid? SelectedOptionId { get; set; }
    public string? AnswerText { get; set; }
    public bool IsCorrect { get; set; }
    public decimal PointsAwarded { get; set; }
}
