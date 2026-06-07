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

public record CreatePaymentRequest(Guid InvoiceId, decimal Amount, string PaymentMethod, DateOnly PaymentDate);
public record PaymentResponse(Guid Id, string ReceiptNo, Guid InvoiceId, decimal Amount, string PaymentMethod, DateOnly PaymentDate);

public record FeeBalanceReportRow(Guid StudentId, string StudentNo, string StudentName, string ProgramName, decimal TotalInvoiced, decimal TotalPaid, decimal Balance, string FeeStatus, DateOnly? NextDueDate, DateOnly? LastPaymentDate);
