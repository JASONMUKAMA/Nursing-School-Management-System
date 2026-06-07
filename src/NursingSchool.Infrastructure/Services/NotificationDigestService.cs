using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class NotificationDigestService(IApplicationDbContext db)
{
    public async Task SyncDailyDigestsAsync(CancellationToken ct = default)
    {
        var dayStart = DateTime.UtcNow.Date;

        var invoices = await db.Invoices.Include(i => i.Payments).ToListAsync(ct);
        var overdueCount = invoices.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue);
        if (overdueCount > 0)
        {
            await UpsertDigestAsync(
                dayStart,
                "Overdue fee invoices",
                $"{overdueCount} invoice{(overdueCount == 1 ? "" : "s")} past due — review balances and follow up with students.",
                "Finance",
                "/app/finance",
                ct);
        }

        var pendingApps = await db.Applications.CountAsync(a => a.Status == ApplicationStatuses.Pending, ct);
        if (pendingApps > 0)
        {
            await UpsertDigestAsync(
                dayStart,
                "Pending admissions",
                $"{pendingApps} application{(pendingApps == 1 ? "" : "s")} waiting for review.",
                "Admissions",
                "/app/admissions",
                ct);
        }

        var weekEnd = DateTime.UtcNow.AddDays(7);
        var upcomingEvents = await db.SchoolEvents.CountAsync(
            e => e.IsPublished && e.StartDate >= DateTime.UtcNow && e.StartDate <= weekEnd,
            ct);
        if (upcomingEvents > 0)
        {
            await UpsertDigestAsync(
                dayStart,
                "Events this week",
                $"{upcomingEvents} school event{(upcomingEvents == 1 ? "" : "s")} in the next 7 days.",
                "Events",
                "/app/scheduling",
                ct);
        }

        var activePlacements = await db.ClinicalPlacements.CountAsync(
            p => p.Status == PlacementStatuses.Active || p.Status == PlacementStatuses.Scheduled,
            ct);
        if (activePlacements > 0)
        {
            await UpsertDigestAsync(
                dayStart,
                "Clinical placements",
                $"{activePlacements} active or scheduled placement{(activePlacements == 1 ? "" : "s")}.",
                "Clinical",
                "/app/clinical",
                ct);
        }
    }

    private async Task UpsertDigestAsync(
        DateTime dayStart,
        string title,
        string message,
        string category,
        string linkUrl,
        CancellationToken ct)
    {
        var existing = await db.AppNotifications
            .Where(n => n.UserId == null && n.Category == category && n.Title == title && n.SentAt >= dayStart)
            .OrderByDescending(n => n.SentAt)
            .FirstOrDefaultAsync(ct);

        if (existing is not null)
        {
            if (existing.Message == message) return;
            existing.Message = message;
            existing.LinkUrl = linkUrl;
            existing.IsRead = false;
            existing.SentAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return;
        }

        db.AppNotifications.Add(new AppNotification
        {
            UserId = null,
            Title = title,
            Message = message,
            Category = category,
            LinkUrl = linkUrl,
            SentAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }
}
