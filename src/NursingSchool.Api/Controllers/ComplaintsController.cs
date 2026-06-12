using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Api.Controllers;

[ApiController]
[Route("api/complaints")]
[Authorize]
public class ComplaintsController(IComplaintsService complaintsService, IFileStorageService fileStorage) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ComplaintResponse>>> GetMessages(
        [FromQuery] PaginationQuery query, CancellationToken ct) =>
        Ok(await complaintsService.GetMessagesAsync(query, ct));

    [HttpPost]
    [RequestSizeLimit(1_100_000)]
    public async Task<ActionResult<ComplaintResponse>> Post(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            string message;
            string? attachmentUrl = null;
            string? attachmentFileName = null;
            string? attachmentKind = null;

            if (Request.HasFormContentType)
            {
                var form = await Request.ReadFormAsync(ct);
                message = form["message"].ToString();
                var file = form.Files.GetFile("file");
                if (file is { Length: > 0 })
                {
                    attachmentUrl = await fileStorage.SaveComplaintAttachmentAsync(file, ct);
                    attachmentFileName = file.FileName;
                    attachmentKind = IsPdf(file) ? "Pdf" : "Image";
                }
            }
            else
            {
                var body = await Request.ReadFromJsonAsync<PostComplaintRequest>(ct)
                    ?? throw new InvalidOperationException("Request body is required.");
                message = body.Message;
            }

            var request = new PostComplaintRequest(message, attachmentUrl, attachmentFileName, attachmentKind);
            return Ok(await complaintsService.PostAsync(userId, request, ct));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private static bool IsPdf(IFormFile file) =>
        Path.GetExtension(file.FileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase)
        || string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase);
}
