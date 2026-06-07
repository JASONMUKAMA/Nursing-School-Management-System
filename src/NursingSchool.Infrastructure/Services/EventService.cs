using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Email;

namespace NursingSchool.Infrastructure.Services;

public interface IEventService
{
    Task<IReadOnlyList<SchoolEventResponse>> GetUpcomingAsync(int count = 10, CancellationToken ct = default);
    Task<IReadOnlyList<SchoolEventResponse>> GetCalendarAsync(DateTime start, DateTime end, CancellationToken ct = default);
    Task<PagedResult<SchoolEventResponse>> GetAllAsync(PaginationQuery query, CancellationToken ct = default);
    Task<CreateSchoolEventResponse> CreateAsync(CreateSchoolEventRequest request, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<AppNotificationResponse>> GetNotificationsAsync(Guid userId, IReadOnlyList<string> roles, CancellationToken ct = default);
    Task MarkNotificationReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllNotificationsReadAsync(Guid userId, IReadOnlyList<string> roles, CancellationToken ct = default);
}

public class EventService(
    IApplicationDbContext db,
    IEventCalendarNotifier calendarNotifier,
    NotificationDigestService digestService) : IEventService
{
    public async Task<IReadOnlyList<SchoolEventResponse>> GetUpcomingAsync(int count = 10, CancellationToken ct = default) =>
        await db.SchoolEvents.Where(e => e.StartDate >= DateTime.UtcNow && e.IsPublished)
            .OrderBy(e => e.StartDate).Take(count)
            .Select(MapEvent)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<SchoolEventResponse>> GetCalendarAsync(DateTime start, DateTime end, CancellationToken ct = default)
    {
        var startUtc = ToUtc(start);
        var endUtc = ToUtc(end);
        return await db.SchoolEvents
            .Where(e => e.StartDate <= endUtc && e.EndDate >= startUtc)
            .OrderBy(e => e.StartDate)
            .Select(MapEvent)
            .ToListAsync(ct);
    }

    public async Task<PagedResult<SchoolEventResponse>> GetAllAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.SchoolEvents.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.ToLower();
            q = q.Where(e =>
                e.Title.ToLower().Contains(term) ||
                e.Description.ToLower().Contains(term) ||
                e.EventType.ToLower().Contains(term) ||
                e.Location.ToLower().Contains(term) ||
                e.TargetAudience.ToLower().Contains(term));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(e => e.StartDate)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(MapEvent)
            .ToListAsync(ct);

        return new PagedResult<SchoolEventResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<CreateSchoolEventResponse> CreateAsync(CreateSchoolEventRequest request, Guid userId, CancellationToken ct = default)
    {
        var entity = new SchoolEvent
        {
            Title = request.Title,
            Description = request.Description,
            EventType = request.EventType,
            StartDate = ToUtc(request.StartDate),
            EndDate = ToUtc(request.EndDate),
            Location = request.Location,
            TargetAudience = request.TargetAudience,
            IsPublished = request.IsPublished,
            CreatedBy = userId,
        };
        db.SchoolEvents.Add(entity);
        await db.SaveChangesAsync(ct);

        var response = new SchoolEventResponse(
            entity.Id, entity.Title, entity.Description, entity.EventType,
            entity.StartDate, entity.EndDate, entity.Location, entity.TargetAudience, entity.IsPublished);

        var invitationsQueued = false;
        if (entity.IsPublished)
        {
            calendarNotifier.QueueInvitations(entity.Id);
            invitationsQueued = true;
        }

        return new CreateSchoolEventResponse(response, invitationsQueued);
    }

    public async Task<IReadOnlyList<AppNotificationResponse>> GetNotificationsAsync(
        Guid userId,
        IReadOnlyList<string> roles,
        CancellationToken ct = default)
    {
        if (IsStaff(roles))
            await digestService.SyncDailyDigestsAsync(ct);

        return await NotificationQuery(userId, roles)
            .OrderByDescending(n => n.SentAt).Take(50)
            .Select(n => new AppNotificationResponse(n.Id, n.Title, n.Message, n.Category, n.LinkUrl, n.IsRead, n.SentAt))
            .ToListAsync(ct);
    }

    public async Task MarkNotificationReadAsync(Guid id, CancellationToken ct = default)
    {
        var n = await db.AppNotifications.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (n != null) { n.IsRead = true; await db.SaveChangesAsync(ct); }
    }

    public async Task MarkAllNotificationsReadAsync(
        Guid userId,
        IReadOnlyList<string> roles,
        CancellationToken ct = default)
    {
        var unread = await NotificationQuery(userId, roles).Where(n => !n.IsRead).ToListAsync(ct);
        if (unread.Count == 0) return;
        foreach (var n in unread) n.IsRead = true;
        await db.SaveChangesAsync(ct);
    }

    private IQueryable<AppNotification> NotificationQuery(Guid userId, IReadOnlyList<string> roles) =>
        IsStaff(roles)
            ? db.AppNotifications.Where(n => n.UserId == null || n.UserId == userId)
            : db.AppNotifications.Where(n => n.UserId == userId);

    private static bool IsStaff(IReadOnlyList<string> roles) =>
        roles.Any(r => !string.Equals(r, RoleNames.Student, StringComparison.OrdinalIgnoreCase));

    private static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static readonly System.Linq.Expressions.Expression<Func<SchoolEvent, SchoolEventResponse>> MapEvent =
        e => new SchoolEventResponse(e.Id, e.Title, e.Description, e.EventType, e.StartDate, e.EndDate, e.Location, e.TargetAudience, e.IsPublished);
}
