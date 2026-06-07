using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class CourseOffering : AuditableEntity
{
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public Guid SemesterId { get; set; }
    public Semester Semester { get; set; } = null!;
    public Guid LecturerId { get; set; }
    public ApplicationUser Lecturer { get; set; } = null!;
    public string AcademicYear { get; set; } = string.Empty;

    public ICollection<Enrollment> Enrollments { get; set; } = [];
    public ICollection<ClassSession> ClassSessions { get; set; } = [];
    public ICollection<AssessmentComponent> AssessmentComponents { get; set; } = [];
}
