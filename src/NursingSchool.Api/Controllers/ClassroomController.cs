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
[Route("api")]
[Authorize]
public class ClassroomController(IClassroomService classroomService, IFileStorageService fileStorage) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsStaff => User.IsInRole(RoleNames.Admin) || User.IsInRole(RoleNames.Lecturer) || User.IsInRole(RoleNames.Registrar);
    private Guid? StudentId =>
        Guid.TryParse(User.FindFirst("studentId")?.Value, out var id) ? id : null;

    // ---------- Live sessions ----------

    [HttpPost("live-sessions")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<LiveSessionResponse>> CreateSession([FromBody] CreateLiveSessionRequest request, CancellationToken ct)
    {
        try { return Ok(await classroomService.CreateSessionAsync(request, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("live-sessions")]
    public async Task<ActionResult<PagedResult<LiveSessionResponse>>> GetSessions(
        [FromQuery] Guid? courseOfferingId, [FromQuery] PaginationQuery query, CancellationToken ct)
    {
        try { return Ok(await classroomService.GetSessionsAsync(courseOfferingId, UserId, !IsStaff, query, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("live-sessions/{id:guid}")]
    public async Task<ActionResult<LiveSessionDetailResponse>> GetSession(Guid id, CancellationToken ct)
    {
        try
        {
            var session = await classroomService.GetSessionAsync(id, UserId, !IsStaff, ct);
            return session == null ? NotFound() : Ok(session);
        }
        catch (InvalidOperationException ex) { return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message }); }
    }

    [HttpPost("live-sessions/{id:guid}/start")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<LiveSessionDetailResponse>> StartSession(Guid id, CancellationToken ct)
    {
        try { return Ok(await classroomService.StartSessionAsync(id, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("live-sessions/{id:guid}/end")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<LiveSessionDetailResponse>> EndSession(Guid id, CancellationToken ct)
    {
        try { return Ok(await classroomService.EndSessionAsync(id, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ---------- Lecture files ----------

    [HttpPost("live-sessions/{id:guid}/files")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<LectureFileResponse>> UploadFile(Guid id, IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await fileStorage.SaveDocumentAsync(file, "lectures", ct);
            return Ok(await classroomService.AddFileAsync(id, file.FileName, url, file.Length, UserId, ct));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("live-sessions/{id:guid}/files")]
    public async Task<ActionResult<IReadOnlyList<LectureFileResponse>>> GetFiles(Guid id, CancellationToken ct) =>
        Ok(await classroomService.GetFilesAsync(id, ct));

    // ---------- Quizzes ----------

    [HttpPost("quizzes")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<QuizResponse>> CreateQuiz([FromBody] CreateQuizRequest request, CancellationToken ct)
    {
        try { return Ok(await classroomService.CreateQuizAsync(request, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("live-sessions/{id:guid}/quizzes")]
    public async Task<ActionResult<IReadOnlyList<QuizResponse>>> GetQuizzes(Guid id, CancellationToken ct) =>
        Ok(await classroomService.GetQuizzesAsync(id, includeAnswers: IsStaff, ct));

    [HttpGet("quizzes/{id:guid}")]
    public async Task<ActionResult<QuizResponse>> GetQuiz(Guid id, CancellationToken ct)
    {
        var quiz = await classroomService.GetQuizAsync(id, includeAnswers: IsStaff, ct);
        return quiz == null ? NotFound() : Ok(quiz);
    }

    [HttpPost("quizzes/{id:guid}/publish")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<QuizResponse>> PublishQuiz(Guid id, CancellationToken ct)
    {
        try { return Ok(await classroomService.PublishQuizAsync(id, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("quizzes/{id:guid}/close")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<QuizResponse>> CloseQuiz(Guid id, CancellationToken ct)
    {
        try { return Ok(await classroomService.CloseQuizAsync(id, UserId, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    // ---------- Submissions ----------

    [HttpPost("quizzes/{id:guid}/submit")]
    [Authorize(Roles = RoleNames.Student)]
    public async Task<ActionResult<QuizResultResponse>> SubmitQuiz(Guid id, [FromBody] SubmitQuizRequest request, CancellationToken ct)
    {
        if (StudentId is not { } studentId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No student record is linked to this account." });

        try { return Ok(await classroomService.SubmitQuizAsync(id, studentId, request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("quizzes/{id:guid}/results")]
    [Authorize(Roles = $"{RoleNames.Admin},{RoleNames.Lecturer}")]
    public async Task<ActionResult<IReadOnlyList<QuizResultResponse>>> GetQuizResults(Guid id, CancellationToken ct)
    {
        try { return Ok(await classroomService.GetQuizResultsAsync(id, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("quizzes/{id:guid}/my-result")]
    [Authorize(Roles = RoleNames.Student)]
    public async Task<ActionResult<QuizResultResponse>> GetMyQuizResult(Guid id, CancellationToken ct)
    {
        if (StudentId is not { } studentId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No student record is linked to this account." });

        var result = await classroomService.GetMyQuizResultAsync(id, studentId, ct);
        return result == null ? NotFound() : Ok(result);
    }
}
