using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api/online-exams")]
[Authorize]
public class OnlineExamsController(IOnlineExamsService onlineExamsService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsStudent => User.IsInRole(RoleNames.Student);
    private bool IsStaff => User.IsInRole(RoleNames.Admin) || User.IsInRole(RoleNames.Lecturer);
    private Guid? StudentId =>
        Guid.TryParse(User.FindFirst("studentId")?.Value, out var id) ? id : null;

    [HttpGet]
    public async Task<ActionResult<PagedResult<OnlineExamListItemResponse>>> GetExams(
        [FromQuery] Guid? courseOfferingId, [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await onlineExamsService.GetExamsAsync(courseOfferingId, UserId, IsStudent, query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OnlineExamResponse>> GetExam(Guid id, CancellationToken ct)
    {
        var exam = await onlineExamsService.GetExamAsync(id, UserId, IsStudent, includeAnswers: IsStaff, ct);
        return exam == null ? NotFound() : Ok(exam);
    }

    [HttpPost]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<OnlineExamResponse>> CreateExam(
        [FromBody] CreateOnlineExamRequest request, CancellationToken ct)
    {
        try { return Ok(await onlineExamsService.CreateExamAsync(request, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<OnlineExamResponse>> Publish(Guid id, CancellationToken ct)
    {
        try { return Ok(await onlineExamsService.PublishExamAsync(id, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/close")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<OnlineExamResponse>> Close(Guid id, CancellationToken ct)
    {
        try { return Ok(await onlineExamsService.CloseExamAsync(id, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = RoleNames.Student)]
    public async Task<ActionResult<OnlineExamResultResponse>> Submit(
        Guid id, [FromBody] SubmitOnlineExamRequest request, CancellationToken ct)
    {
        if (StudentId is not { } studentId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No student record is linked to this account." });

        try { return Ok(await onlineExamsService.SubmitExamAsync(id, studentId, request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/results")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<IReadOnlyList<OnlineExamResultResponse>>> GetResults(Guid id, CancellationToken ct) =>
        Ok(await onlineExamsService.GetExamResultsAsync(id, ct));

    [HttpGet("{id:guid}/my-result")]
    [Authorize(Roles = RoleNames.Student)]
    public async Task<ActionResult<OnlineExamResultResponse>> GetMyResult(Guid id, CancellationToken ct)
    {
        if (StudentId is not { } studentId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No student record is linked to this account." });

        var result = await onlineExamsService.GetMyExamResultAsync(id, studentId, ct);
        return result == null ? NotFound() : Ok(result);
    }
}
