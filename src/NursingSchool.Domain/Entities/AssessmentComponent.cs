using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class AssessmentComponent : AuditableEntity
{
    public Guid CourseOfferingId { get; set; }
    public CourseOffering CourseOffering { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal MaxScore { get; set; }

    public ICollection<Mark> Marks { get; set; } = [];
}
