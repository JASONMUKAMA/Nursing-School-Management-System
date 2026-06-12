using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

/// <summary>Shared school complaints chat message — visible to all authenticated users.</summary>
public class Complaint : AuditableEntity
{
    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    /// <summary>Image or Pdf</summary>
    public string? AttachmentKind { get; set; }
}
