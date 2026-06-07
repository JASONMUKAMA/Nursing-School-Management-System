using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class FeeStructure : AuditableEntity
{
    public Guid ProgramId { get; set; }
    public Program Program { get; set; } = null!;
    public string AcademicYear { get; set; } = string.Empty;
    public string FeeName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
