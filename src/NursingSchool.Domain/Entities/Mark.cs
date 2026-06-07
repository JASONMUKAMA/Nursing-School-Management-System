using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Mark : AuditableEntity
{
    public Guid AssessmentComponentId { get; set; }
    public AssessmentComponent AssessmentComponent { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public decimal Score { get; set; }
    public Guid EnteredBy { get; set; }
    public ApplicationUser EnteredByUser { get; set; } = null!;
    public DateTime EnteredAt { get; set; }
}
