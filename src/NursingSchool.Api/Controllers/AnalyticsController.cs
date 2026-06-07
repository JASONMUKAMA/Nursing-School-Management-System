using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize(Roles = $"{RoleNames.Admin},{RoleNames.FinanceOfficer},{RoleNames.Registrar}")]
public class AnalyticsController(IAnalyticsService analytics, IMlAnalyticsService ml) : ControllerBase
{
    [HttpGet("charts")]
    public async Task<ActionResult<AnalyticsChartsDto>> GetCharts(CancellationToken ct) =>
        Ok(await analytics.GetChartsAsync(ct));

    [HttpGet("ml-insights")]
    public async Task<ActionResult<MlInsightsDto>> GetMlInsights(CancellationToken ct) =>
        Ok(await ml.GetInsightsAsync(ct));

    [HttpGet("at-risk-students")]
    public async Task<ActionResult<PagedResult<StudentRiskRow>>> GetAtRiskStudents([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await ml.GetAtRiskStudentsAsync(query, ct));

    [HttpPost("retrain")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<IActionResult> Retrain(CancellationToken ct)
    {
        await ml.TrainModelsAsync(ct);
        return NoContent();
    }
}
