using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class ClinicalEvaluation : AuditableEntity
{
    public Guid PlacementId { get; set; }
    public ClinicalPlacement Placement { get; set; } = null!;
    public Guid EvaluatorId { get; set; }
    public ApplicationUser Evaluator { get; set; } = null!;
    public int ProfessionalismScore { get; set; }
    public int SkillScore { get; set; }
    public int CommunicationScore { get; set; }
    public int AttendanceScore { get; set; }
    public string Comments { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; }
}
