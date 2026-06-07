using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Infrastructure.Hubs;

namespace NursingSchool.Infrastructure.Services;

public interface INotificationService
{
    Task SendAsync(Guid? userId, string title, string message, string category, string? linkUrl = null, CancellationToken ct = default);
    Task BroadcastToStaffAsync(string title, string message, string category, CancellationToken ct = default);
}

public class NotificationService(IApplicationDbContext db, IHubContext<NotificationHub> hub) : INotificationService
{
    public async Task SendAsync(Guid? userId, string title, string message, string category, string? linkUrl = null, CancellationToken ct = default)
    {
        var notification = new AppNotification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Category = category,
            LinkUrl = linkUrl,
            SentAt = DateTime.UtcNow
        };
        db.AppNotifications.Add(notification);
        await db.SaveChangesAsync(ct);

        var payload = new { notification.Id, title, message, category, linkUrl, sentAt = notification.SentAt };
        if (userId.HasValue)
            await hub.Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", payload, ct);
        else
            await hub.Clients.Group("all-staff").SendAsync("ReceiveNotification", payload, ct);
    }

    public Task BroadcastToStaffAsync(string title, string message, string category, CancellationToken ct = default) =>
        SendAsync(null, title, message, category, null, ct);
}
