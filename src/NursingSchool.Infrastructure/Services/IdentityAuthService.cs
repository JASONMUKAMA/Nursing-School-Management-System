using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Auth;

namespace NursingSchool.Infrastructure.Services;

public class IdentityAuthService(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    SignInManager<ApplicationUser> signInManager,
    IApplicationDbContext db,
    JwtTokenService jwt,
    IFileStorageService fileStorage,
    ILoginActivityService loginActivityService) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request, LoginClientInfo? client = null, CancellationToken ct = default)
    {
        var user = await userManager.FindByNameAsync(request.UserNameOrEmail)
            ?? await userManager.FindByEmailAsync(request.UserNameOrEmail)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is disabled.");

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (result.RequiresTwoFactor)
        {
            throw new TwoFactorRequiredException(user.Id);
        }
        if (!result.Succeeded)
            throw new UnauthorizedAccessException("Invalid credentials.");

        return await BuildLoginResponseAsync(user, client, ct);
    }

    public async Task<LoginResponse> LoginWith2FaAsync(TwoFactorLoginRequest request, LoginClientInfo? client = null, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(request.UserId.ToString())
            ?? throw new UnauthorizedAccessException("Invalid user.");

        var valid = await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, request.Code);
        if (!valid)
            throw new UnauthorizedAccessException("Invalid authenticator code.");

        return await BuildLoginResponseAsync(user, client, ct);
    }

    public Task<LoginResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Use login. Refresh tokens managed via Identity sessions in future release.");

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            Email = request.Email,
            EmailConfirmed = true,
            FirstName = request.FirstName,
            LastName = request.LastName,
            CreatedAt = DateTime.UtcNow
        };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        foreach (var roleName in request.Roles)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
                await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            await userManager.AddToRoleAsync(user, roleName);
        }

        var roles = await userManager.GetRolesAsync(user);
        return MapUser(user, roles.ToList(), null);
    }

    public async Task<PagedResult<UserResponse>> GetUsersAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = userManager.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(u =>
                (u.UserName != null && u.UserName.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                (u.FirstName != null && u.FirstName.ToLower().Contains(s)) ||
                (u.LastName != null && u.LastName.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var users = await q.OrderBy(u => u.UserName).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(ct);
        var studentMap = await db.Students.Where(s => s.UserId != null)
            .ToDictionaryAsync(s => s.UserId!.Value, s => (Guid?)s.Id, ct);

        var list = new List<UserResponse>();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            studentMap.TryGetValue(user.Id, out var sid);
            list.Add(MapUser(user, roles.ToList(), sid));
        }

        return new PagedResult<UserResponse> { Items = list, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<UserResponse?> GetUserByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user == null) return null;
        var roles = await userManager.GetRolesAsync(user);
        var studentId = await db.Students.Where(s => s.UserId == user.Id).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
        return MapUser(user, roles.ToList(), studentId);
    }

    public async Task<UserResponse?> UpdateUserAsync(Guid id, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user == null) return null;

        user.UserName = request.UserName;
        user.Email = request.Email;
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.IsActive = request.IsActive;

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new InvalidOperationException(string.Join("; ", updateResult.Errors.Select(e => e.Description)));

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var pwdResult = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
            if (!pwdResult.Succeeded)
                throw new InvalidOperationException(string.Join("; ", pwdResult.Errors.Select(e => e.Description)));
        }

        await AssignRolesAsync(id, request.Roles, ct);
        return await GetUserByIdAsync(id, ct);
    }

    public async Task<TwoFactorSetupResponse> GetTwoFactorSetupAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        var key = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(key))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            key = await userManager.GetAuthenticatorKeyAsync(user);
        }
        var email = user.Email ?? user.UserName ?? "user";
        return new TwoFactorSetupResponse(
            key!,
            $"otpauth://totp/NursingSchool:{email}?secret={key}&issuer=NursingSchool",
            user.TwoFactorEnabled);
    }

    public async Task EnableTwoFactorAsync(Guid userId, string code, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        var valid = await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code);
        if (!valid) throw new InvalidOperationException("Invalid verification code.");
        await userManager.SetTwoFactorEnabledAsync(user, true);
    }

    public async Task<IReadOnlyList<RoleResponse>> GetRolesAsync(CancellationToken ct = default) =>
        await roleManager.Roles.Select(r => new RoleResponse(r.Id, r.Name ?? "")).ToListAsync(ct);

    public async Task AssignRolesAsync(Guid userId, IReadOnlyList<string> roles, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        var current = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, current);
        await userManager.AddToRolesAsync(user, roles);
    }

    public async Task<UserResponse?> SetProfileImageUrlAsync(Guid userId, string url, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;
        fileStorage.DeleteIfExists(user.ProfileImageUrl);
        user.ProfileImageUrl = url;
        await userManager.UpdateAsync(user);
        var roles = await userManager.GetRolesAsync(user);
        var studentId = await db.Students.Where(s => s.UserId == user.Id).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
        return MapUser(user, roles.ToList(), studentId);
    }

    public async Task<UserResponse?> SetNationalIdFrontUrlAsync(Guid userId, string url, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;
        fileStorage.DeleteIfExists(user.NationalIdFrontUrl);
        user.NationalIdFrontUrl = url;
        await userManager.UpdateAsync(user);
        var roles = await userManager.GetRolesAsync(user);
        var studentId = await db.Students.Where(s => s.UserId == user.Id).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
        return MapUser(user, roles.ToList(), studentId);
    }

    public async Task<UserResponse?> SetNationalIdBackUrlAsync(Guid userId, string url, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;
        fileStorage.DeleteIfExists(user.NationalIdBackUrl);
        user.NationalIdBackUrl = url;
        await userManager.UpdateAsync(user);
        var roles = await userManager.GetRolesAsync(user);
        var studentId = await db.Students.Where(s => s.UserId == user.Id).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
        return MapUser(user, roles.ToList(), studentId);
    }

    private async Task<LoginResponse> BuildLoginResponseAsync(ApplicationUser user, LoginClientInfo? client, CancellationToken ct)
    {
        user.LastLoginAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);
        var roles = await userManager.GetRolesAsync(user);
        await loginActivityService.RecordLoginAsync(user, roles.ToList(), client, ct);
        var studentId = await db.Students.Where(s => s.UserId == user.Id).Select(s => (Guid?)s.Id).FirstOrDefaultAsync(ct);
        var (accessToken, expiresAt) = jwt.GenerateAccessToken(user, roles, studentId);
        return new LoginResponse(accessToken, "", expiresAt, MapUser(user, roles.ToList(), studentId));
    }

    private static UserResponse MapUser(ApplicationUser user, IReadOnlyList<string> roles, Guid? studentId) =>
        new(user.Id, user.UserName ?? "", user.Email ?? "", user.IsActive, roles, studentId, user.TwoFactorEnabled,
            user.FirstName, user.LastName, user.ProfileImageUrl, user.NationalIdFrontUrl, user.NationalIdBackUrl);
}

public class TwoFactorRequiredException(Guid userId) : Exception("Two-factor authentication required.")
{
    public Guid UserId { get; } = userId;
}
