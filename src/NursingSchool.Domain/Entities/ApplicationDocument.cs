using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class ApplicationDocument : AuditableEntity
{
    public Guid ApplicationId { get; set; }
    public Application Application { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
}
