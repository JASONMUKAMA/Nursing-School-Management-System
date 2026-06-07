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
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        try { return Ok(await authService.LoginAsync(request, ct)); }
        catch (TwoFactorRequiredException ex)
        {
            return Ok(new LoginResponse("", "", DateTime.UtcNow,
                new UserResponse(ex.UserId, "", "", true, [], null), true, ex.UserId));
        }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
    }

    [HttpPost("login-2fa")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login2Fa([FromBody] TwoFactorLoginRequest request, CancellationToken ct)
    {
        try { return Ok(await authService.LoginWith2FaAsync(request, ct)); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); }
    }

    [HttpGet("2fa/setup")]
    [Authorize]
    public async Task<ActionResult<TwoFactorSetupResponse>> Get2FaSetup(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await authService.GetTwoFactorSetupAsync(userId, ct));
    }

    [HttpPost("2fa/enable")]
    [Authorize]
    public async Task<IActionResult> Enable2Fa([FromBody] EnableTwoFactorRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await authService.EnableTwoFactorAsync(userId, request.Code, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/users")]
[Authorize(Policy = PolicyNames.ManageUsers)]
public class UsersController(IAuthService authService, IFileStorageService fileStorage) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserResponse>>> GetAll([FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await authService.GetUsersAsync(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponse>> GetById(Guid id, CancellationToken ct)
    {
        var user = await authService.GetUserByIdAsync(id, ct);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await authService.CreateUserAsync(request, userId, ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        try
        {
            var user = await authService.UpdateUserAsync(id, request, ct);
            return user == null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/profile-photo")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<UserResponse>> UploadProfilePhoto(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "Profile photo is required." });
        try
        {
            var url = await fileStorage.SaveImageAsync(file, "users/photos", ct);
            var user = await authService.SetProfileImageUrlAsync(id, url, ct);
            return user == null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/national-id/front")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<UserResponse>> UploadNationalIdFront(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "National ID front is required." });
        try
        {
            var url = await fileStorage.SaveDocumentAsync(file, "users/national-ids/front", ct);
            var user = await authService.SetNationalIdFrontUrlAsync(id, url, ct);
            return user == null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/national-id/back")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<UserResponse>> UploadNationalIdBack(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "National ID back is required." });
        try
        {
            var url = await fileStorage.SaveDocumentAsync(file, "users/national-ids/back", ct);
            var user = await authService.SetNationalIdBackUrlAsync(id, url, ct);
            return user == null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/roles")]
    public async Task<IActionResult> AssignRoles(Guid id, [FromBody] AssignRolesRequest request, CancellationToken ct)
    {
        await authService.AssignRolesAsync(id, request.Roles, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/roles")]
[Authorize(Policy = PolicyNames.ManageRoles)]
public class RolesController(IAuthService authService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> GetAll(CancellationToken ct) =>
        Ok(await authService.GetRolesAsync(ct));
}
