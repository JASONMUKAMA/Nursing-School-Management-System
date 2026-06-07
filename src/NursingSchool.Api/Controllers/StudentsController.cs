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
[Route("api/students")]
[Authorize]
public class StudentsController(IStudentService studentService, IFileStorageService fileStorage) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<PagedResult<StudentResponse>>> GetAll([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await studentService.GetAllAsync(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudentResponse>> GetById(Guid id, CancellationToken ct)
    {
        if (!CanAccessStudent(id)) return Forbid();
        var student = await studentService.GetByIdAsync(id, ct);
        return student == null ? NotFound() : Ok(student);
    }

    [HttpPost]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<StudentResponse>> Create([FromBody] CreateStudentRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await studentService.CreateAsync(request, userId, ct));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<StudentResponse>> Update(Guid id, [FromBody] UpdateStudentRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var student = await studentService.UpdateAsync(id, request, userId, ct);
        return student == null ? NotFound() : Ok(student);
    }

    [HttpPost("{id:guid}/profile-photo")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<StudentResponse>> UploadProfilePhoto(Guid id, [FromForm] IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "Profile photo is required." });
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var url = await fileStorage.SaveImageAsync(file, "students/photos", ct);
            var student = await studentService.SetProfilePhotoUrlAsync(id, url, userId, ct);
            return student == null ? NotFound() : Ok(student);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/national-id/front")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<StudentResponse>> UploadNationalIdFront(Guid id, [FromForm] IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "National ID front is required." });
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var url = await fileStorage.SaveDocumentAsync(file, "students/national-ids/front", ct);
            var student = await studentService.SetNationalIdFrontUrlAsync(id, url, userId, ct);
            return student == null ? NotFound() : Ok(student);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/national-id/back")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<StudentResponse>> UploadNationalIdBack(Guid id, [FromForm] IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "National ID back is required." });
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var url = await fileStorage.SaveDocumentAsync(file, "students/national-ids/back", ct);
            var student = await studentService.SetNationalIdBackUrlAsync(id, url, userId, ct);
            return student == null ? NotFound() : Ok(student);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private bool CanAccessStudent(Guid studentId)
    {
        if (User.IsInRole(RoleNames.Admin) || User.IsInRole(RoleNames.Registrar)) return true;
        if (User.IsInRole(RoleNames.Student))
        {
            var claim = User.FindFirst("studentId")?.Value;
            return claim != null && Guid.Parse(claim) == studentId;
        }
        return User.IsInRole(RoleNames.Lecturer) || User.IsInRole(RoleNames.FinanceOfficer) || User.IsInRole(RoleNames.ClinicalCoordinator);
    }
}
