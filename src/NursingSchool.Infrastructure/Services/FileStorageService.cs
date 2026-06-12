using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace NursingSchool.Infrastructure.Services;

public class FileStorageService(IWebHostEnvironment environment) : IFileStorageService
{
    private const long MaxImageBytes = 5 * 1024 * 1024;
    private const long MaxDocumentBytes = 10 * 1024 * 1024;
    private const long MaxComplaintAttachmentBytes = 1024 * 1024;

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp" };

    private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };

    private static readonly HashSet<string> ComplaintAttachmentExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };

    public async Task<string> SaveImageAsync(IFormFile file, string folder, CancellationToken ct = default) =>
        await SaveAsync(file, folder, ImageExtensions, MaxImageBytes, ct);

    public async Task<string> SaveDocumentAsync(IFormFile file, string folder, CancellationToken ct = default) =>
        await SaveAsync(file, folder, DocumentExtensions, MaxDocumentBytes, ct);

    public Task<string> SaveComplaintAttachmentAsync(IFormFile file, CancellationToken ct = default) =>
        SaveAsync(file, "complaints", ComplaintAttachmentExtensions, MaxComplaintAttachmentBytes, ct);

    public void DeleteIfExists(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl) || !relativeUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return;

        var fullPath = Path.Combine(environment.ContentRootPath, relativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    private async Task<string> SaveAsync(
        IFormFile file,
        string folder,
        HashSet<string> allowedExtensions,
        long maxBytes,
        CancellationToken ct)
    {
        if (file.Length == 0)
            throw new InvalidOperationException("File is empty.");

        if (file.Length > maxBytes)
        {
            var limitLabel = maxBytes < 1024 * 1024
                ? $"{maxBytes / 1024} KB"
                : $"{maxBytes / (1024 * 1024)} MB";
            throw new InvalidOperationException($"File exceeds the maximum size of {limitLabel}.");
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
            extension = GuessExtension(file.ContentType);

        if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
            throw new InvalidOperationException("File type is not allowed. Use JPG, PNG, or PDF.");

        var uploadsRoot = Path.Combine(environment.ContentRootPath, "uploads", folder);
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(uploadsRoot, fileName);

        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        return $"/uploads/{folder}/{fileName}";
    }

    private static string GuessExtension(string? contentType) =>
        contentType?.ToLowerInvariant() switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "application/pdf" => ".pdf",
            _ => string.Empty,
        };
}
