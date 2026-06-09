using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public partial class FinanceService
{
    public async Task<PublicStudentFeeSummaryResponse?> GetPublicStudentFeesByStudentNoAsync(
        string studentNo,
        CancellationToken ct = default)
    {
        var normalized = NormalizeStudentNo(studentNo);
        if (string.IsNullOrEmpty(normalized)) return null;

        var student = await db.Students
            .Include(s => s.Program)
            .Include(s => s.Invoices).ThenInclude(i => i.Payments)
            .FirstOrDefaultAsync(s => s.StudentNo.ToUpper() == normalized, ct);

        if (student is null) return null;

        var openInvoices = student.Invoices
            .Select(i => new { Invoice = i, Balance = InvoiceCalculator.GetBalance(i) })
            .Where(x => x.Balance > 0)
            .OrderByDescending(x => x.Invoice.IssuedAt)
            .Select(x => new PublicStudentFeeInvoiceResponse(
                x.Invoice.Id,
                x.Invoice.InvoiceNo,
                x.Invoice.AcademicYear,
                x.Balance,
                InvoiceCalculator.GetStatus(x.Invoice),
                x.Invoice.DueDate))
            .ToList();

        var balance = student.Invoices.Sum(InvoiceCalculator.GetBalance);
        var feeStatus = balance <= 0 ? "Paid" :
            student.Invoices.Any(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue) ? "Overdue" : "Due";

        return new PublicStudentFeeSummaryResponse(
            student.Id,
            student.StudentNo,
            $"{student.FirstName} {student.LastName}",
            student.Program.Name,
            balance,
            feeStatus,
            openInvoices);
    }

    public async Task<InitiateMobileMoneyPaymentResponse> InitiatePublicMobileMoneyPaymentAsync(
        PublicInitiateMobileMoneyPaymentRequest request,
        CancellationToken ct = default)
    {
        var normalized = NormalizeStudentNo(request.StudentNo);
        if (string.IsNullOrEmpty(normalized))
            throw new InvalidOperationException("Student number is required.");

        var student = await db.Students
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentNo.ToUpper() == normalized, ct)
            ?? throw new InvalidOperationException("Student number not found.");

        var invoice = await db.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId && i.StudentId == student.Id, ct)
            ?? throw new InvalidOperationException("Invoice not found for this student.");

        var initiatorId = await GetPublicPaymentInitiatorIdAsync(ct);
        return await InitiateMobileMoneyPaymentAsync(
            new InitiateMobileMoneyPaymentRequest(request.InvoiceId, request.Amount, request.PhoneNumber),
            initiatorId,
            ct);
    }

    public async Task<GatewayTransactionResponse?> GetPublicGatewayTransactionAsync(
        Guid id,
        string studentNo,
        CancellationToken ct = default)
    {
        var normalized = NormalizeStudentNo(studentNo);
        if (string.IsNullOrEmpty(normalized)) return null;

        var tx = await db.PaymentGatewayTransactions
            .Include(t => t.Invoice).ThenInclude(i => i.Student)
            .Include(t => t.Payment)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (tx is null || !string.Equals(tx.Invoice.Student.StudentNo, normalized, StringComparison.OrdinalIgnoreCase))
            return null;

        return MapGatewayTransaction(tx);
    }

    private async Task<Guid> GetPublicPaymentInitiatorIdAsync(CancellationToken ct)
    {
        var admin = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserName == "admin", ct);
        if (admin is null)
            throw new InvalidOperationException("Online payments are temporarily unavailable. Please contact the finance office.");

        return admin.Id;
    }

    private static string NormalizeStudentNo(string studentNo) =>
        string.IsNullOrWhiteSpace(studentNo) ? string.Empty : studentNo.Trim().ToUpperInvariant();
}
