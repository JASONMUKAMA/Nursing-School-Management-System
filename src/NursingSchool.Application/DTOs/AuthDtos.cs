namespace NursingSchool.Application.DTOs;

public record LoginRequest(string UserNameOrEmail, string Password);
public record TwoFactorLoginRequest(Guid UserId, string Code);
public record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserResponse User, bool RequiresTwoFactor = false, Guid? TwoFactorUserId = null);
public record RefreshTokenRequest(string RefreshToken);
public record CreateUserRequest(string UserName, string Email, string Password, string? FirstName, string? LastName, IReadOnlyList<string> Roles);
public record UpdateUserRequest(
    string UserName, string Email, string? FirstName, string? LastName,
    bool IsActive, IReadOnlyList<string> Roles, string? NewPassword);
public record UserResponse(
    Guid Id, string UserName, string Email, bool IsActive, IReadOnlyList<string> Roles, Guid? StudentId,
    bool TwoFactorEnabled = false, string? FirstName = null, string? LastName = null,
    string? ProfileImageUrl = null, string? NationalIdFrontUrl = null, string? NationalIdBackUrl = null);
public record TwoFactorSetupResponse(string SharedKey, string AuthenticatorUri, bool IsEnabled);
public record EnableTwoFactorRequest(string Code);
public record RoleResponse(Guid Id, string Name);
public record AssignRolesRequest(IReadOnlyList<string> Roles);
