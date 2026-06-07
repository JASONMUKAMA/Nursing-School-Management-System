using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class FinanceController(IFinanceService financeService, INotificationService notificationService) : ControllerBase
{
    [HttpGet("fee-structures")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer}")]
    public async Task<ActionResult<IReadOnlyList<FeeStructureResponse>>> GetFeeStructures(CancellationToken ct) =>
        Ok(await financeService.GetFeeStructuresAsync(ct));

    [HttpPost("fee-structures")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer}")]
    public async Task<ActionResult<FeeStructureResponse>> CreateFeeStructure([FromBody] CreateFeeStructureRequest request, CancellationToken ct) =>
        Ok(await financeService.CreateFeeStructureAsync(request, ct));

    [HttpGet("invoices")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer},{RoleNames.Registrar}")]
    public async Task<ActionResult<PagedResult<InvoiceResponse>>> GetInvoices([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await financeService.GetInvoicesAsync(query, ct));

    [HttpGet("invoices/{id:guid}")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer}")]
    public async Task<ActionResult<InvoiceResponse>> GetInvoice(Guid id, CancellationToken ct)
    {
        var invoice = await financeService.GetInvoiceByIdAsync(id, ct);
        return invoice is null ? NotFound() : Ok(invoice);
    }

    [HttpGet("students/{studentId:guid}/invoice-preview")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer},{RoleNames.Lecturer}")]
    public async Task<ActionResult<StudentInvoicePreviewResponse>> GetStudentInvoicePreview(Guid studentId, CancellationToken ct) =>
        Ok(await financeService.GetStudentInvoicePreviewAsync(studentId, ct));

    [HttpPost("invoices")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer}")]
    public async Task<ActionResult<InvoiceResponse>> CreateInvoice([FromBody] CreateInvoiceRequest request, CancellationToken ct)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var invoice = await financeService.CreateInvoiceAsync(request, userId, ct);
            await notificationService.BroadcastToStaffAsync(
                "New Invoice",
                $"Invoice {invoice.InvoiceNo} created for {invoice.StudentName} — UGX {invoice.TotalAmount:N0}.",
                "Finance",
                ct: ct);
            return Ok(invoice);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("payments")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer}")]
    public async Task<ActionResult<PaymentResponse>> RecordPayment([FromBody] CreatePaymentRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var payment = await financeService.RecordPaymentAsync(request, userId, ct);
        await notificationService.BroadcastToStaffAsync(
            "Payment Recorded",
            $"Receipt {payment.ReceiptNo} — UGX {payment.Amount:N0} via {payment.PaymentMethod}.",
            "Finance",
            ct: ct);
        return Ok(payment);
    }
}

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController(IFinanceService financeService, IResultsService resultsService) : ControllerBase
{
    [HttpGet("fee-balances")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer}")]
    public async Task<ActionResult<PagedResult<FeeBalanceReportRow>>> GetFeeBalances([FromQuery] Guid? programId, [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await financeService.GetFeeBalanceReportAsync(programId, query, ct));

    [HttpGet("results")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar},{RoleNames.Lecturer}")]
    public async Task<ActionResult> GetResultsReport([FromQuery] Guid studentId, CancellationToken ct) =>
        Ok(await resultsService.GetStudentResultsAsync(studentId, ct));
}
