using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class ClinicalPlacement : AuditableEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid FacilityId { get; set; }
    public ClinicalFacility Facility { get; set; } = null!;
    public Guid? SupervisorId { get; set; }
    public ClinicalSupervisor? Supervisor { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Department { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    public ICollection<ClinicalEvaluation> Evaluations { get; set; } = [];
}
