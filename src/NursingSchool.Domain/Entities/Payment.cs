using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class Payment : AuditableEntity
{
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public string ReceiptNo { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public DateOnly PaymentDate { get; set; }
    public Guid RecordedBy { get; set; }
    public ApplicationUser RecordedByUser { get; set; } = null!;
}
