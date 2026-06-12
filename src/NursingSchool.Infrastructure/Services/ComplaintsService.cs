using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Hubs;

namespace NursingSchool.Infrastructure.Services;

public class ComplaintsService(
    IApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    IHubContext<ComplaintsHub> hub) : IComplaintsService
{
    private static readonly string[] RolePriority =
        [RoleNames.Admin, RoleNames.Registrar, RoleNames.Lecturer, RoleNames.ClinicalCoordinator, RoleNames.FinanceOfficer, RoleNames.Student];

    public async Task<PagedResult<ComplaintResponse>> GetMessagesAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Complaints.Include(c => c.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(c => c.Message.ToLower().Contains(term));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(c => c.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        var responses = new List<ComplaintResponse>();
        foreach (var item in items)
            responses.Add(await MapAsync(item, ct));

        return new PagedResult<ComplaintResponse>
        {
            Items = responses,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<ComplaintResponse> PostAsync(Guid userId, PostComplaintRequest request, CancellationToken ct = default)
    {
        var text = request.Message?.Trim() ?? string.Empty;
        var hasAttachment = !string.IsNullOrWhiteSpace(request.AttachmentUrl);
        if (string.IsNullOrEmpty(text) && !hasAttachment)
            throw new InvalidOperationException("Enter a message or attach a photo/PDF.");
        if (text.Length > 2000)
            throw new InvalidOperationException("Message cannot exceed 2000 characters.");
        if (hasAttachment && request.AttachmentKind is not ("Image" or "Pdf"))
            throw new InvalidOperationException("Invalid attachment type.");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException("User not found.");

        var complaint = new Complaint
        {
            UserId = userId,
            Message = text,
            AttachmentUrl = request.AttachmentUrl,
            AttachmentFileName = request.AttachmentFileName,
            AttachmentKind = request.AttachmentKind,
        };
        db.Complaints.Add(complaint);
        await db.SaveChangesAsync(ct);

        complaint.User = user;
        var response = await MapAsync(complaint, ct);

        await hub.Clients.Group(ComplaintsHub.RoomGroup).SendAsync("ComplaintPosted", response, ct);
        return response;
    }

    private async Task<ComplaintResponse> MapAsync(Complaint complaint, CancellationToken ct)
    {
        var user = complaint.User ?? await db.Users.FirstAsync(u => u.Id == complaint.UserId, ct);
        var roles = await userManager.GetRolesAsync(user);
        var primaryRole = RolePriority.FirstOrDefault(roles.Contains) ?? roles.FirstOrDefault();
        var name = $"{user.FirstName} {user.LastName}".Trim();
        if (string.IsNullOrEmpty(name)) name = user.UserName ?? "User";

        return new ComplaintResponse(
            complaint.Id, complaint.UserId, name, primaryRole, complaint.Message, complaint.CreatedAt,
            complaint.AttachmentUrl, complaint.AttachmentFileName, complaint.AttachmentKind);
    }
}
