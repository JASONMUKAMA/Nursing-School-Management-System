using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class ClassSession : AuditableEntity
{
    public Guid CourseOfferingId { get; set; }
    public CourseOffering CourseOffering { get; set; } = null!;
    public DateOnly SessionDate { get; set; }
    public string Topic { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = [];
}
