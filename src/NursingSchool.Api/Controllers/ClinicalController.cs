using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ClinicalController(IClinicalService clinicalService) : ControllerBase
{
    [HttpGet("clinical-facilities")]
    public async Task<ActionResult<PagedResult<ClinicalFacilityResponse>>> GetFacilities([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await clinicalService.GetFacilitiesAsync(query, ct));

    [HttpPost("clinical-facilities")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.ClinicalCoordinator}")]
    public async Task<ActionResult<ClinicalFacilityResponse>> CreateFacility([FromBody] CreateClinicalFacilityRequest request, CancellationToken ct) =>
        Ok(await clinicalService.CreateFacilityAsync(request, ct));

    [HttpPost("clinical-supervisors")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.ClinicalCoordinator}")]
    public async Task<ActionResult<ClinicalSupervisorResponse>> CreateSupervisor([FromBody] CreateClinicalSupervisorRequest request, CancellationToken ct) =>
        Ok(await clinicalService.CreateSupervisorAsync(request, ct));

    [HttpGet("clinical-placements")]
    public async Task<ActionResult<PagedResult<ClinicalPlacementResponse>>> GetPlacements([FromQuery] Guid? studentId, [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await clinicalService.GetPlacementsAsync(studentId, query, ct));

    [HttpPost("clinical-placements")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.ClinicalCoordinator}")]
    public async Task<ActionResult<ClinicalPlacementResponse>> CreatePlacement([FromBody] CreateClinicalPlacementRequest request, CancellationToken ct) =>
        Ok(await clinicalService.CreatePlacementAsync(request, ct));

    [HttpPost("clinical-evaluations")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.ClinicalCoordinator}")]
    public async Task<ActionResult<ClinicalEvaluationResponse>> SubmitEvaluation([FromBody] CreateClinicalEvaluationRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await clinicalService.SubmitEvaluationAsync(request, userId, ct));
    }
}

[ApiController]
[Route("api/dashboard")]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet("public-stats")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> GetPublicStats(CancellationToken ct) =>
        Ok(await dashboardService.GetPublicStatsAsync(ct));

    [HttpGet("summary")]
    [Authorize]
    public async Task<ActionResult<DashboardSummary>> GetSummary(CancellationToken ct) =>
        Ok(await dashboardService.GetSummaryAsync(ct));

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AdminDashboardDto>> GetAdmin(CancellationToken ct) =>
        Ok(await dashboardService.GetAdminDashboardAsync(ct));

    [HttpGet("finance")]
    [Authorize(Roles = "Admin,FinanceOfficer")]
    public async Task<ActionResult<FinanceDashboardDto>> GetFinance(CancellationToken ct) =>
        Ok(await dashboardService.GetFinanceDashboardAsync(ct));

    [HttpGet("student/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<StudentDashboardDto>> GetStudent(Guid studentId, CancellationToken ct) =>
        Ok(await dashboardService.GetStudentDashboardAsync(studentId, ct));
}
