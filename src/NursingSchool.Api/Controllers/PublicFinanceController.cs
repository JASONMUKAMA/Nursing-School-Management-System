using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Infrastructure.Gateways;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicFinanceController(IFinanceService financeService) : ControllerBase
{
    [HttpGet("payments/jpesa-configured")]
    public ActionResult<object> IsJpesaConfigured([FromServices] JpesaGateway gateway) =>
        Ok(new { configured = gateway.IsConfigured });

    [HttpGet("students/{studentNo}/fees")]
    public async Task<ActionResult<PublicStudentFeeSummaryResponse>> GetStudentFees(string studentNo, CancellationToken ct)
    {
        var summary = await financeService.GetPublicStudentFeesByStudentNoAsync(studentNo, ct);
        if (summary is null)
            return NotFound(new { message = "Student number not found. Check the number on your ID card or fee statement." });

        return Ok(summary);
    }

    [HttpPost("payments/initiate-mobile-money")]
    public async Task<ActionResult<InitiateMobileMoneyPaymentResponse>> InitiateMobileMoney(
        [FromBody] PublicInitiateMobileMoneyPaymentRequest request,
        CancellationToken ct)
    {
        try
        {
            return Ok(await financeService.InitiatePublicMobileMoneyPaymentAsync(request, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("payments/gateway-transactions/{id:guid}")]
    public async Task<ActionResult<GatewayTransactionResponse>> GetGatewayTransaction(
        Guid id,
        [FromQuery] string studentNo,
        CancellationToken ct)
    {
        var tx = await financeService.GetPublicGatewayTransactionAsync(id, studentNo, ct);
        return tx is null ? NotFound() : Ok(tx);
    }
}
