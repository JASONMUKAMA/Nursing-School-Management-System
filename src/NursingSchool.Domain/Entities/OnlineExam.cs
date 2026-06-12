using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

/// <summary>Standalone objective (MCQ) exam linked to a course offering — not tied to live classroom.</summary>
public class OnlineExam : AuditableEntity
{
    public Guid CourseOfferingId { get; set; }
    public CourseOffering CourseOffering { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<OnlineExamQuestion> Questions { get; set; } = [];
    public ICollection<OnlineExamSubmission> Submissions { get; set; } = [];
}

public class OnlineExamQuestion : AuditableEntity
{
    public Guid OnlineExamId { get; set; }
    public OnlineExam OnlineExam { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    /// <summary>MultipleChoice or TrueFalse only.</summary>
    public string QuestionType { get; set; } = string.Empty;
    public decimal Points { get; set; } = 1;
    public int SortOrder { get; set; }

    public ICollection<OnlineExamOption> Options { get; set; } = [];
}

public class OnlineExamOption : AuditableEntity
{
    public Guid OnlineExamQuestionId { get; set; }
    public OnlineExamQuestion Question { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int SortOrder { get; set; }
}

public class OnlineExamSubmission : AuditableEntity
{
    public Guid OnlineExamId { get; set; }
    public OnlineExam OnlineExam { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public DateTime SubmittedAt { get; set; }
    public decimal Score { get; set; }
    public decimal MaxScore { get; set; }

    public ICollection<OnlineExamAnswer> Answers { get; set; } = [];
}

public class OnlineExamAnswer : AuditableEntity
{
    public Guid OnlineExamSubmissionId { get; set; }
    public OnlineExamSubmission Submission { get; set; } = null!;
    public Guid OnlineExamQuestionId { get; set; }
    public OnlineExamQuestion Question { get; set; } = null!;
    public Guid? SelectedOptionId { get; set; }
    public bool IsCorrect { get; set; }
    public decimal PointsAwarded { get; set; }
}
