using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class StudentDocument : AuditableEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
}
