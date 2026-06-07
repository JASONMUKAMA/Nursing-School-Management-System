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
public class AttendanceController(IAttendanceService attendanceService) : ControllerBase
{
    [HttpPost("class-sessions")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<ClassSessionResponse>> CreateSession([FromBody] CreateClassSessionRequest request, CancellationToken ct) =>
        Ok(await attendanceService.CreateSessionAsync(request, ct));

    [HttpGet("class-sessions")]
    public async Task<ActionResult<PagedResult<ClassSessionResponse>>> GetSessions([FromQuery] Guid? courseOfferingId, [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await attendanceService.GetSessionsAsync(courseOfferingId, query, ct));

    [HttpPost("class-sessions/{id:guid}/attendance")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<IActionResult> SubmitAttendance(Guid id, [FromBody] SubmitAttendanceRequest request, CancellationToken ct)
    {
        await attendanceService.SubmitAttendanceAsync(id, request, ct);
        return NoContent();
    }
}
