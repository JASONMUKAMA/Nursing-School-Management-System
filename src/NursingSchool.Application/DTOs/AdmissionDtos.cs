namespace NursingSchool.Application.DTOs;

public record CreateApplicationRequest(
    string FirstName, string LastName, string Email, string Phone, Guid ProgramId);

public record ApplicationResponse(
    Guid Id, string ApplicationNo, string FirstName, string LastName, string Email,
    string Phone, Guid ProgramId, string ProgramName, string Status,
    DateTime SubmittedAt, DateTime? ReviewedAt);

public record ApproveApplicationRequest(bool CreateUserAccount, string? Password);
