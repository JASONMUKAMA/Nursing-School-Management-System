using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Semester : AuditableEntity
{
    public Guid ProgramId { get; set; }
    public Program Program { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public int YearLevel { get; set; }
    public int SemesterNo { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    public ICollection<CourseOffering> CourseOfferings { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
}
