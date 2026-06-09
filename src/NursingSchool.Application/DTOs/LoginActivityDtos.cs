namespace NursingSchool.Application.DTOs;

public record LoginClientInfo(string? IpAddress, string? UserAgent);

public record LoginActivityResponse(
    Guid Id,
    Guid UserId,
    string UserName,
    string? FullName,
    string Email,
    string Roles,
    string? IpAddress,
    string? UserAgent,
    DateTime LoggedInAt);
