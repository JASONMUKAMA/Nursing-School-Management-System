using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Application : AuditableEntity
{
    public string ApplicationNo { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public Guid ProgramId { get; set; }
    public Program Program { get; set; } = null!;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public Guid? ReviewedBy { get; set; }
    public ApplicationUser? Reviewer { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public ICollection<ApplicationDocument> Documents { get; set; } = [];
}
