using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Program : AuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int DurationYears { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Student> Students { get; set; } = [];
    public ICollection<Semester> Semesters { get; set; } = [];
    public ICollection<Application> Applications { get; set; } = [];
    public ICollection<FeeStructure> FeeStructures { get; set; } = [];
}
