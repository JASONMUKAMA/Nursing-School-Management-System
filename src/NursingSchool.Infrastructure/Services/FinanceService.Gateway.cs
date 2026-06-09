using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Gateways;

namespace NursingSchool.Infrastructure.Services;

public partial class FinanceService
{
    public async Task<InitiateMobileMoneyPaymentResponse> InitiateMobileMoneyPaymentAsync(
        InitiateMobileMoneyPaymentRequest request,
        Guid initiatedBy,
        CancellationToken ct = default)
    {
        var invoice = await db.Invoices
            .Include(i => i.Payments)
            .Include(i => i.Student)
            .FirstAsync(i => i.Id == request.InvoiceId, ct);

        if (request.Amount <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");

        var balance = InvoiceCalculator.GetBalance(invoice);
        if (request.Amount > balance)
            throw new InvalidOperationException($"Payment exceeds invoice balance of UGX {balance:N0}.");

        var phone = JpesaGateway.NormalizeMsisdn(request.PhoneNumber);
        var externalId = $"NS-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";

        var gatewayTx = new PaymentGatewayTransaction
        {
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            PhoneNumber = phone,
            ExternalTransactionId = externalId,
            Status = PaymentGatewayStatuses.Pending,
            InitiatedBy = initiatedBy,
            CreatedBy = initiatedBy
        };
        db.PaymentGatewayTransactions.Add(gatewayTx);
        await db.SaveChangesAsync(ct);

        try
        {
            var response = await jpesaGateway.RequestPaymentAsync(
                phone,
                request.Amount,
                externalId,
                $"Invoice {invoice.InvoiceNo}",
                ct);

            gatewayTx.RawResponse = response;
            gatewayTx.ProviderReference = JpesaGateway.GetTid(response) ?? JpesaGateway.GetSid(response);
            await db.SaveChangesAsync(ct);

            return new InitiateMobileMoneyPaymentResponse(
                gatewayTx.Id,
                externalId,
                gatewayTx.Status,
                gatewayTx.ProviderReference,
                JpesaGateway.GetMessage(response) ?? "Payment request sent. Approve on your phone.");
        }
        catch (Exception ex)
        {
            gatewayTx.Status = PaymentGatewayStatuses.Failed;
            gatewayTx.FailureReason = ex.Message;
            await db.SaveChangesAsync(ct);
            throw;
        }
    }

    public async Task<GatewayTransactionResponse?> GetGatewayTransactionAsync(Guid id, CancellationToken ct = default)
    {
        var tx = await db.PaymentGatewayTransactions
            .Include(t => t.Invoice).ThenInclude(i => i.Student)
            .Include(t => t.Payment)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        return tx is null ? null : MapGatewayTransaction(tx);
    }

    public async Task<object> ProcessJpesaCallbackAsync(string body, CancellationToken ct = default)
    {
        var reference =
            JpesaCallbackParser.GetValue(body, "tx") ??
            JpesaCallbackParser.GetValue(body, "reference") ??
            JpesaCallbackParser.GetValue(body, "transaction_id") ??
            JpesaCallbackParser.GetValue(body, "externalTransactionId");

        var providerReference =
            JpesaCallbackParser.GetValue(body, "tid") ??
            JpesaCallbackParser.GetValue(body, "sid") ??
            JpesaCallbackParser.GetValue(body, "receipt");

        var status = JpesaCallbackParser.GetValue(body, "status") ?? JpesaCallbackParser.GetValue(body, "api_status");
        var reason = JpesaCallbackParser.GetValue(body, "reason") ?? JpesaCallbackParser.GetValue(body, "msg");

        if (string.IsNullOrWhiteSpace(reference) && string.IsNullOrWhiteSpace(providerReference))
            return new { message = "Missing transaction reference.", raw = body };

        var tx = await db.PaymentGatewayTransactions
            .Include(t => t.Invoice).ThenInclude(i => i.Payments)
            .Include(t => t.Invoice).ThenInclude(i => i.Student)
            .FirstOrDefaultAsync(t =>
                t.ExternalTransactionId == reference
                || (providerReference != null && t.ProviderReference == providerReference), ct);

        if (tx is null)
            return new { message = "Transaction not found.", reference, providerReference, status };

        tx.CallbackReceivedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(providerReference))
            tx.ProviderReference = providerReference;

        if (tx.Status == PaymentGatewayStatuses.Successful && tx.IsReconciled)
        {
            await db.SaveChangesAsync(ct);
            return new { message = "Already processed.", reference = tx.ExternalTransactionId };
        }

        if (JpesaCallbackParser.IsFailed(status, reason, body))
        {
            tx.Status = PaymentGatewayStatuses.Failed;
            tx.FailureReason = reason ?? $"JPesa rejected payment. Status={status}";
            await db.SaveChangesAsync(ct);
            return new { message = "Failed payment recorded.", reference = tx.ExternalTransactionId };
        }

        if (!JpesaCallbackParser.IsSuccess(status, reason, body))
        {
            tx.FailureReason = $"Callback received, status not final. Status={status}. Reason={reason}";
            await db.SaveChangesAsync(ct);
            return new { message = "Callback received but status is not final.", reference = tx.ExternalTransactionId, status };
        }

        await ReconcileGatewayTransactionAsync(tx, ct);
        return new { message = "Successful payment processed.", reference = tx.ExternalTransactionId, receipt = tx.Payment?.ReceiptNo };
    }

    private async Task ReconcileGatewayTransactionAsync(PaymentGatewayTransaction tx, CancellationToken ct)
    {
        var invoice = tx.Invoice;
        var existing = await db.Payments.FirstOrDefaultAsync(
            p => p.ExternalTransactionId == tx.ExternalTransactionId, ct);

        if (existing is null)
        {
            var balance = InvoiceCalculator.GetBalance(invoice);
            var amountToApply = tx.Amount > balance ? balance : tx.Amount;
            if (amountToApply > 0)
            {
                var count = await db.Payments.CountAsync(ct);
                var payment = new Payment
                {
                    InvoiceId = invoice.Id,
                    ReceiptNo = $"RCP{DateTime.UtcNow:yyyyMMdd}{(count + 1):D4}",
                    Amount = amountToApply,
                    PaymentMethod = MobileMoneyMethodFromPhone(tx.PhoneNumber),
                    PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    PayerPhone = tx.PhoneNumber,
                    TransactionReference = tx.ProviderReference ?? tx.ExternalTransactionId,
                    ExternalTransactionId = tx.ExternalTransactionId,
                    ProviderReference = tx.ProviderReference,
                    PaymentSource = PaymentSources.JpesaApi,
                    GatewayTransactionId = tx.Id,
                    RecordedBy = tx.InitiatedBy,
                    CreatedBy = tx.InitiatedBy
                };
                db.Payments.Add(payment);
                invoice.Payments.Add(payment);
                invoice.Status = InvoiceCalculator.GetStatus(invoice);
                tx.Payment = payment;
                tx.PaymentId = payment.Id;
            }
        }

        tx.Status = PaymentGatewayStatuses.Successful;
        tx.VerifiedAt = DateTime.UtcNow;
        tx.IsReconciled = true;
        tx.FailureReason = null;
        await db.SaveChangesAsync(ct);
    }

    private static GatewayTransactionResponse MapGatewayTransaction(PaymentGatewayTransaction tx) =>
        new(
            tx.Id,
            tx.InvoiceId,
            tx.Invoice.InvoiceNo,
            $"{tx.Invoice.Student.FirstName} {tx.Invoice.Student.LastName}",
            tx.Amount,
            tx.PhoneNumber,
            tx.ExternalTransactionId,
            tx.ProviderReference,
            tx.Status,
            tx.FailureReason,
            tx.Payment?.ReceiptNo,
            tx.CreatedAt,
            tx.VerifiedAt);

    private static string MobileMoneyMethodFromPhone(string phone)
    {
        if (phone.StartsWith("25677") || phone.StartsWith("25678") || phone.StartsWith("25676")
            || phone.StartsWith("25639") || phone.StartsWith("25631"))
            return PaymentMethods.MtnMobileMoney;
        return PaymentMethods.AirtelMoney;
    }
}
