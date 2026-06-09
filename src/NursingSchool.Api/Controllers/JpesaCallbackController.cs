using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Interfaces;

namespace NursingSchool.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/jpesa")]
public class JpesaCallbackController(IFinanceService financeService) : ControllerBase
{
    [HttpGet("callback")]
    public IActionResult Test() => Ok("JPesa callback endpoint is working.");

    [HttpPost("callback")]
    public async Task<IActionResult> Callback(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);
        var result = await financeService.ProcessJpesaCallbackAsync(body, ct);
        return Ok(result);
    }
}
