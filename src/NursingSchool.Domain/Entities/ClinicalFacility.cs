using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class ClinicalFacility : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string FacilityType { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<ClinicalSupervisor> Supervisors { get; set; } = [];
    public ICollection<ClinicalPlacement> Placements { get; set; } = [];
}
