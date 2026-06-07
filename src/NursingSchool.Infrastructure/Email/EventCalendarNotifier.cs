using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Infrastructure.Email;

public interface IEventCalendarNotifier
{
    void QueueInvitations(Guid eventId);
}

public class EventCalendarNotifier(
    IServiceScopeFactory scopeFactory,
    ILogger<EventCalendarNotifier> logger) : IEventCalendarNotifier
{
    public void QueueInvitations(Guid eventId)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var worker = scope.ServiceProvider.GetRequiredService<EventInvitationWorker>();
                await worker.SendAsync(eventId, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send event invitations for {EventId}", eventId);
            }
        });
    }
}

public class EventInvitationWorker(
    IApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    IEmailSender emailSender,
    INotificationService notificationService,
    ILogger<EventInvitationWorker> logger)
{
    public async Task SendAsync(Guid eventId, CancellationToken ct)
    {
        var entity = await db.SchoolEvents.FirstOrDefaultAsync(e => e.Id == eventId, ct);
        if (entity is null || !entity.IsPublished) return;

        var recipients = await CollectRecipientsAsync(ct);
        if (recipients.Count == 0)
        {
            logger.LogWarning("No email recipients found for event {EventId}", eventId);
            return;
        }

        var subject = $"[NSMS Calendar] {entity.Title}";
        var html = CalendarInviteBuilder.BuildHtmlBody(entity);
        var ics = CalendarInviteBuilder.BuildIcs(entity);
        var sent = 0;

        foreach (var (email, role) in recipients)
        {
            try
            {
                var personalizedHtml = html.Replace(
                    "— Nursing School Management System",
                    $"<p style=\"color:#64748b;font-size:12px\">Sent to: {System.Net.WebUtility.HtmlEncode(role)}</p>— Nursing School Management System");
                await emailSender.SendAsync(email, subject, personalizedHtml, calendarAttachment: ics, ct: ct);
                sent++;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to email {Email} for event {EventId}", email, eventId);
            }
        }

        await notificationService.BroadcastToStaffAsync(
            "Event Scheduled",
            $"\"{entity.Title}\" was added to the calendar. Invitations emailed to {sent} students, parents, and staff.",
            "Scheduling",
            ct: ct);

        logger.LogInformation("Event {EventId}: sent {Sent}/{Total} calendar invitations", eventId, sent, recipients.Count);
    }

    private async Task<List<(string Email, string Role)>> CollectRecipientsAsync(CancellationToken ct)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var studentEmails = await db.Students
            .Where(s => s.Email != null && s.Email != "")
            .Select(s => s.Email)
            .Distinct()
            .ToListAsync(ct);
        foreach (var e in studentEmails)
            map.TryAdd(e, "Student");

        var parentEmails = await db.Guardians
            .Where(g => g.Email != null && g.Email != "")
            .Select(g => g.Email!)
            .Distinct()
            .ToListAsync(ct);
        foreach (var e in parentEmails)
            map.TryAdd(e, "Parent/Guardian");

        foreach (var role in new[] { RoleNames.Lecturer, RoleNames.Admin, RoleNames.Registrar, RoleNames.ClinicalCoordinator, RoleNames.FinanceOfficer })
        {
            var users = await userManager.GetUsersInRoleAsync(role);
            foreach (var u in users)
            {
                if (!string.IsNullOrWhiteSpace(u.Email))
                    map.TryAdd(u.Email, role);
            }
        }

        return map.Select(kv => (kv.Key, kv.Value)).ToList();
    }
}
