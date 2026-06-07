using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class ClinicalSupervisor : AuditableEntity
{
    public Guid FacilityId { get; set; }
    public ClinicalFacility Facility { get; set; } = null!;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }

    public ICollection<ClinicalPlacement> Placements { get; set; } = [];
}
