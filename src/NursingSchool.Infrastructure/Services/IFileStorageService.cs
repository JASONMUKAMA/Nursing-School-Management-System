using Microsoft.AspNetCore.Http;

namespace NursingSchool.Infrastructure.Services;

public interface IFileStorageService
{
    Task<string> SaveImageAsync(IFormFile file, string folder, CancellationToken ct = default);
    Task<string> SaveDocumentAsync(IFormFile file, string folder, CancellationToken ct = default);
    Task<string> SaveComplaintAttachmentAsync(IFormFile file, CancellationToken ct = default);
    void DeleteIfExists(string? relativeUrl);
}
