using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class PaymentGatewayTransaction : AuditableEntity
{
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public decimal Amount { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string ExternalTransactionId { get; set; } = string.Empty;
    public string? ProviderReference { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? FailureReason { get; set; }
    public string? RawResponse { get; set; }
    public DateTime? CallbackReceivedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public bool IsReconciled { get; set; }
    public Guid InitiatedBy { get; set; }
    public ApplicationUser InitiatedByUser { get; set; } = null!;
    public Guid? PaymentId { get; set; }
    public Payment? Payment { get; set; }
}
