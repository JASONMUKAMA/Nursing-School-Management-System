namespace NursingSchool.Application.DTOs;

public record CreateFeeStructureRequest(Guid ProgramId, string AcademicYear, string FeeName, decimal Amount);
public record FeeStructureResponse(Guid Id, Guid ProgramId, string ProgramName, string AcademicYear, string FeeName, decimal Amount);

public record CreateInvoiceItemRequest(string Description, decimal Amount);
public record CreateInvoiceRequest(Guid StudentId, string AcademicYear, Guid? SemesterId, DateOnly DueDate, IReadOnlyList<CreateInvoiceItemRequest> Items);
public record InvoiceResponse(Guid Id, string InvoiceNo, Guid StudentId, string StudentName, string AcademicYear, decimal TotalAmount, decimal AmountPaid, decimal Balance, string Status, DateTime IssuedAt, DateOnly? DueDate, DateOnly? LastPaymentDate, IReadOnlyList<InvoiceItemResponse> Items);
public record InvoiceItemResponse(Guid Id, string Description, decimal Amount);

public record StudentInvoicePreviewResponse(
    Guid StudentId, string StudentName, string ProgramName,
    decimal OutstandingBalance, string FeeStatus,
    decimal SuggestedAmount, string SuggestedAcademicYear,
    DateOnly? NextDueDate, DateOnly? LastPaymentDate);

public record CreatePaymentRequest(
    Guid InvoiceId,
    decimal Amount,
    string PaymentMethod,
    DateOnly PaymentDate,
    string? TransactionReference = null,
    string? PayerPhone = null,
    string? CardLastFour = null,
    string? BankReceiptNo = null);

public record InitiateMobileMoneyPaymentRequest(Guid InvoiceId, decimal Amount, string PhoneNumber);

public record InitiateMobileMoneyPaymentResponse(
    Guid TransactionId,
    string ExternalTransactionId,
    string Status,
    string? ProviderReference,
    string? Message);

public record GatewayTransactionResponse(
    Guid Id,
    Guid InvoiceId,
    string InvoiceNo,
    string StudentName,
    decimal Amount,
    string PhoneNumber,
    string ExternalTransactionId,
    string? ProviderReference,
    string Status,
    string? FailureReason,
    string? ReceiptNo,
    DateTime CreatedAt,
    DateTime? VerifiedAt);

public record PaymentResponse(
    Guid Id,
    string ReceiptNo,
    Guid InvoiceId,
    string InvoiceNo,
    string StudentName,
    decimal Amount,
    string PaymentMethod,
    DateOnly PaymentDate,
    string PaymentSource,
    string? TransactionReference,
    string? PayerPhone,
    string? CardLastFour,
    string? BankReceiptNo,
    string? ProviderReference);

public record FeeBalanceReportRow(Guid StudentId, string StudentNo, string StudentName, string ProgramName, decimal TotalInvoiced, decimal TotalPaid, decimal Balance, string FeeStatus, DateOnly? NextDueDate, DateOnly? LastPaymentDate);

public record PublicStudentFeeInvoiceResponse(
    Guid Id,
    string InvoiceNo,
    string AcademicYear,
    decimal Balance,
    string Status,
    DateOnly? DueDate);

public record PublicStudentFeeSummaryResponse(
    Guid StudentId,
    string StudentNo,
    string StudentName,
    string ProgramName,
    decimal OutstandingBalance,
    string FeeStatus,
    IReadOnlyList<PublicStudentFeeInvoiceResponse> OpenInvoices);

public record PublicInitiateMobileMoneyPaymentRequest(
    string StudentNo,
    Guid InvoiceId,
    decimal Amount,
    string PhoneNumber);
