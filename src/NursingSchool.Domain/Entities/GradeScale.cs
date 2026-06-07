using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class GradeScale : AuditableEntity
{
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public string Grade { get; set; } = string.Empty;
    public string Remark { get; set; } = string.Empty;
}
