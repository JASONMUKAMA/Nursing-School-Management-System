using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Invoice : AuditableEntity
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public string InvoiceNo { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public Guid? SemesterId { get; set; }
    public Semester? Semester { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateOnly? DueDate { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}
