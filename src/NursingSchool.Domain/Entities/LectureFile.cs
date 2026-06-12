using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class LectureFile : AuditableEntity
{
    public Guid LiveSessionId { get; set; }
    public LiveSession LiveSession { get; set; } = null!;
    public Guid UploadedByUserId { get; set; }
    public ApplicationUser UploadedByUser { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
}
