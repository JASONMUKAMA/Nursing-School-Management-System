using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class InvoiceItem : AuditableEntity
{
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
