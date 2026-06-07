namespace NursingSchool.Application.DTOs;

public record CreateStudentRequest(
    string FirstName, string LastName, string Gender, DateOnly DateOfBirth,
    string Phone, string Email, string Address, Guid ProgramId, DateOnly AdmissionDate,
    IReadOnlyList<CreateGuardianRequest>? Guardians);

public record UpdateStudentRequest(
    string FirstName, string LastName, string Gender, DateOnly DateOfBirth,
    string Phone, string Email, string Address, Guid ProgramId, DateOnly AdmissionDate, string Status);

public record CreateGuardianRequest(string FullName, string Relationship, string Phone, string? Email, string? Address);

public record GuardianResponse(Guid Id, string FullName, string Relationship, string Phone, string? Email, string? Address);

public record StudentResponse(
    Guid Id, string StudentNo, string FirstName, string LastName, string Gender,
    DateOnly DateOfBirth, string Phone, string Email, string Address,
    Guid ProgramId, string ProgramName, DateOnly AdmissionDate, string Status,
    IReadOnlyList<GuardianResponse> Guardians,
    string? ProfilePhotoUrl = null,
    string? NationalIdFrontUrl = null,
    string? NationalIdBackUrl = null);
