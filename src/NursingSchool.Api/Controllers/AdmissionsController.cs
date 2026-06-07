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
[Route("api/applications")]
public class ApplicationsController(IAdmissionService admissionService, INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<PagedResult<ApplicationResponse>>> GetAll([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await admissionService.GetAllAsync(query, ct));

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ApplicationResponse>> Create([FromBody] CreateApplicationRequest request, CancellationToken ct)
    {
        var application = await admissionService.CreateAsync(request, ct);
        await notificationService.BroadcastToStaffAsync(
            "New Application",
            $"{application.FirstName} {application.LastName} applied for {application.ProgramName}.",
            "Admissions",
            ct: ct);
        return Ok(application);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<StudentResponse>> Approve(Guid id, [FromBody] ApproveApplicationRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var student = await admissionService.ApproveAsync(id, request, userId, ct);
        await notificationService.BroadcastToStaffAsync(
            "Admission Approved",
            $"{student.FirstName} {student.LastName} ({student.StudentNo}) enrolled successfully.",
            "Admissions",
            ct: ct);
        return Ok(student);
    }
}
