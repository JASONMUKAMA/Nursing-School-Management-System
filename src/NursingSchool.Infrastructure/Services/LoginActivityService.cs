using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;

namespace NursingSchool.Infrastructure.Services;

public class LoginActivityService(IApplicationDbContext db) : ILoginActivityService
{
    private const int MaxUserAgentLength = 512;

    public async Task RecordLoginAsync(
        ApplicationUser user,
        IReadOnlyList<string> roles,
        LoginClientInfo? client,
        CancellationToken ct = default)
    {
        var fullName = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var userAgent = client?.UserAgent;
        if (!string.IsNullOrEmpty(userAgent) && userAgent.Length > MaxUserAgentLength)
            userAgent = userAgent[..MaxUserAgentLength];

        db.LoginActivities.Add(new LoginActivity
        {
            UserId = user.Id,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = string.IsNullOrWhiteSpace(fullName) ? null : fullName,
            Roles = string.Join(", ", roles),
            IpAddress = client?.IpAddress,
            UserAgent = userAgent,
            LoggedInAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<LoginActivityResponse>> GetLoginActivitiesAsync(
        PaginationQuery query,
        CancellationToken ct = default)
    {
        var q = db.LoginActivities.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(a =>
                a.UserName.ToLower().Contains(s) ||
                a.Email.ToLower().Contains(s) ||
                (a.FullName != null && a.FullName.ToLower().Contains(s)) ||
                (a.IpAddress != null && a.IpAddress.Contains(s)) ||
                a.Roles.ToLower().Contains(s));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(a => a.LoggedInAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(a => new LoginActivityResponse(
                a.Id,
                a.UserId,
                a.UserName,
                a.FullName,
                a.Email,
                a.Roles,
                a.IpAddress,
                a.UserAgent,
                a.LoggedInAt))
            .ToListAsync(ct);

        return new PagedResult<LoginActivityResponse>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize,
        };
    }
}
