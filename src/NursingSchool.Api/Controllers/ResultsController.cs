using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ResultsController(IResultsService resultsService, IFinanceService financeService) : ControllerBase
{
    [HttpPost("assessment-components")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<AssessmentComponentResponse>> CreateComponent([FromBody] CreateAssessmentComponentRequest request, CancellationToken ct) =>
        Ok(await resultsService.CreateComponentAsync(request, ct));

    [HttpGet("course-offerings/{courseOfferingId:guid}/assessment-components")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<IReadOnlyList<AssessmentComponentResponse>>> GetComponents(Guid courseOfferingId, CancellationToken ct) =>
        Ok(await resultsService.GetComponentsByOfferingAsync(courseOfferingId, ct));

    [HttpPost("marks")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<MarkResponse>> SubmitMark([FromBody] CreateMarkRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await resultsService.SubmitMarkAsync(request, userId, ct));
    }

    [HttpGet("students/{id:guid}/results")]
    public async Task<ActionResult<IReadOnlyList<StudentResultResponse>>> GetStudentResults(Guid id, CancellationToken ct)
    {
        if (!CanViewStudentResults(id))
            return Forbid();

        if (User.IsInRole(RoleNames.Student))
        {
            var balance = await financeService.GetStudentOutstandingBalanceAsync(id, ct);
            if (balance > 0)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Results are withheld until tuition fees are paid in full. Outstanding balance: UGX {balance:N0}."
                });
            }
        }

        return Ok(await resultsService.GetStudentResultsAsync(id, ct));
    }

    private bool CanViewStudentResults(Guid studentId)
    {
        if (User.IsInRole(RoleNames.Admin) || User.IsInRole(RoleNames.Lecturer) || User.IsInRole(RoleNames.Registrar))
            return true;

        if (User.IsInRole(RoleNames.Student))
        {
            var claim = User.FindFirst("studentId")?.Value;
            return claim != null && Guid.Parse(claim) == studentId;
        }

        return false;
    }
}
