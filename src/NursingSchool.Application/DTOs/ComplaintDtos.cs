namespace NursingSchool.Application.DTOs;

public record PostComplaintRequest(
    string Message,
    string? AttachmentUrl = null,
    string? AttachmentFileName = null,
    string? AttachmentKind = null);

public record ComplaintResponse(
    Guid Id,
    Guid UserId,
    string AuthorName,
    string? PrimaryRole,
    string Message,
    DateTime PostedAt,
    string? AttachmentUrl = null,
    string? AttachmentFileName = null,
    string? AttachmentKind = null);
