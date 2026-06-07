using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Student : AuditableEntity
{
    public string StudentNo { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public string District { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public Guid ProgramId { get; set; }
    public Program Program { get; set; } = null!;
    public DateOnly AdmissionDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public string? NationalIdFrontUrl { get; set; }
    public string? NationalIdBackUrl { get; set; }

    public ICollection<Guardian> Guardians { get; set; } = [];
    public ICollection<StudentDocument> Documents { get; set; } = [];
    public ICollection<Enrollment> Enrollments { get; set; } = [];
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = [];
    public ICollection<Mark> Marks { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<ClinicalPlacement> ClinicalPlacements { get; set; } = [];
}
