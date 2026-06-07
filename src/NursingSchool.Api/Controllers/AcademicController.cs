using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Authorize]
public class AcademicController(IAcademicService academicService) : ControllerBase
{
    [HttpGet("api/programs")]
    public async Task<ActionResult<PagedResult<ProgramResponse>>> GetPrograms([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await academicService.GetProgramsAsync(query, ct));

    [HttpPost("api/programs")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<ProgramResponse>> CreateProgram([FromBody] CreateProgramRequest request, CancellationToken ct) =>
        Ok(await academicService.CreateProgramAsync(request, ct));

    [HttpGet("api/semesters")]
    public async Task<ActionResult<PagedResult<SemesterResponse>>> GetSemesters([FromQuery] Guid? programId, [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await academicService.GetSemestersAsync(programId, query, ct));

    [HttpPost("api/semesters")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<SemesterResponse>> CreateSemester([FromBody] CreateSemesterRequest request, CancellationToken ct) =>
        Ok(await academicService.CreateSemesterAsync(request, ct));

    [HttpGet("api/courses")]
    public async Task<ActionResult<PagedResult<CourseResponse>>> GetCourses([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await academicService.GetCoursesAsync(query, ct));

    [HttpPost("api/courses")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<CourseResponse>> CreateCourse([FromBody] CreateCourseRequest request, CancellationToken ct) =>
        Ok(await academicService.CreateCourseAsync(request, ct));

    [HttpGet("api/course-offerings")]
    public async Task<ActionResult<PagedResult<CourseOfferingResponse>>> GetCourseOfferings([FromQuery] Guid? semesterId, [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await academicService.GetCourseOfferingsAsync(semesterId, query, ct));

    [HttpPost("api/course-offerings")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<CourseOfferingResponse>> CreateCourseOffering([FromBody] CreateCourseOfferingRequest request, CancellationToken ct) =>
        Ok(await academicService.CreateCourseOfferingAsync(request, ct));

    [HttpPost("api/enrollments")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Registrar}")]
    public async Task<ActionResult<EnrollmentResponse>> Enroll([FromBody] CreateEnrollmentRequest request, CancellationToken ct) =>
        Ok(await academicService.EnrollAsync(request, ct));
}
