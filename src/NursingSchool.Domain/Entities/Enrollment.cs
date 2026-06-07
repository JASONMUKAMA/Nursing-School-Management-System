using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Enrollment : AuditableEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid CourseOfferingId { get; set; }
    public CourseOffering CourseOffering { get; set; } = null!;
    public DateOnly EnrollmentDate { get; set; }
    public string Status { get; set; } = string.Empty;
}
