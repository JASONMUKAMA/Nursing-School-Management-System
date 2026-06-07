using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class SchoolEvent : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = string.Empty;
    public bool IsPublished { get; set; } = true;
}
