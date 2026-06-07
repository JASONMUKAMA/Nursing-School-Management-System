using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;

namespace NursingSchool.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<LoginResponse> LoginWith2FaAsync(TwoFactorLoginRequest request, CancellationToken ct = default);
    Task<LoginResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task<UserResponse> CreateUserAsync(CreateUserRequest request, Guid createdBy, CancellationToken ct = default);
    Task<UserResponse?> GetUserByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserResponse?> UpdateUserAsync(Guid id, UpdateUserRequest request, CancellationToken ct = default);
    Task<PagedResult<UserResponse>> GetUsersAsync(PaginationQuery query, CancellationToken ct = default);
    Task<TwoFactorSetupResponse> GetTwoFactorSetupAsync(Guid userId, CancellationToken ct = default);
    Task EnableTwoFactorAsync(Guid userId, string code, CancellationToken ct = default);
    Task<IReadOnlyList<RoleResponse>> GetRolesAsync(CancellationToken ct = default);
    Task AssignRolesAsync(Guid userId, IReadOnlyList<string> roles, CancellationToken ct = default);
    Task<UserResponse?> SetProfileImageUrlAsync(Guid userId, string url, CancellationToken ct = default);
    Task<UserResponse?> SetNationalIdFrontUrlAsync(Guid userId, string url, CancellationToken ct = default);
    Task<UserResponse?> SetNationalIdBackUrlAsync(Guid userId, string url, CancellationToken ct = default);
}
