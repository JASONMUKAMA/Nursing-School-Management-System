using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class AttendanceRecord : AuditableEntity
{
    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}
