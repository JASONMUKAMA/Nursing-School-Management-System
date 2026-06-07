using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api")]
public class EventsController(IEventService eventService) : ControllerBase
{
    [HttpGet("events/upcoming")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<SchoolEventResponse>>> GetUpcoming(CancellationToken ct, [FromQuery] int count = 10) =>
        Ok(await eventService.GetUpcomingAsync(count, ct));

    [HttpGet("events/calendar")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar},{RoleNames.Lecturer},{RoleNames.ClinicalCoordinator},{RoleNames.Student}")]
    public async Task<ActionResult<IReadOnlyList<SchoolEventResponse>>> GetCalendar(
        CancellationToken ct,
        [FromQuery] DateTime start,
        [FromQuery] DateTime end) =>
        Ok(await eventService.GetCalendarAsync(start, end, ct));

    [HttpGet("events")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar},{RoleNames.Lecturer},{RoleNames.ClinicalCoordinator}")]
    public async Task<ActionResult<PagedResult<SchoolEventResponse>>> GetAll([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await eventService.GetAllAsync(query, ct));

    [HttpPost("events")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<CreateSchoolEventResponse>> Create([FromBody] CreateSchoolEventRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await eventService.CreateAsync(request, userId, ct));
    }

    [HttpGet("notifications")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<AppNotificationResponse>>> GetNotifications(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        return Ok(await eventService.GetNotificationsAsync(userId, roles, ct));
    }

    [HttpPost("notifications/{id:guid}/read")]
    [Authorize]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await eventService.MarkNotificationReadAsync(id, ct);
        return NoContent();
    }

    [HttpPost("notifications/read-all")]
    [Authorize]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        await eventService.MarkAllNotificationsReadAsync(userId, roles, ct);
        return NoContent();
    }
}
