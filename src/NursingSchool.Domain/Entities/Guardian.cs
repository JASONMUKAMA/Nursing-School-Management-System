using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Guardian : AuditableEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public string FullName { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Address { get; set; }
    public Guid? UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public bool HasPortalAccess { get; set; }
}
