using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Course : AuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int CreditUnits { get; set; }
    public string CourseType { get; set; } = string.Empty;

    public ICollection<CourseOffering> CourseOfferings { get; set; } = [];
}
