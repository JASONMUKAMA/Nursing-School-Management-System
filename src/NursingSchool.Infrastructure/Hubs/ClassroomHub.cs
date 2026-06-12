using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Hubs;

[Authorize]
public class ClassroomHub : Hub
{
    public static string SessionGroup(Guid sessionId) => $"classroom-{sessionId}";
    public static string HostGroup(Guid sessionId) => $"classroom-{sessionId}-host";

    public async Task JoinSession(Guid sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, SessionGroup(sessionId));

        // Lecturers/admins also join a host-only group so live submission results
        // are never broadcast to student connections.
        if (Context.User?.IsInRole(RoleNames.Lecturer) == true || Context.User?.IsInRole(RoleNames.Admin) == true)
            await Groups.AddToGroupAsync(Context.ConnectionId, HostGroup(sessionId));

        var name = Context.User?.Identity?.Name ?? "Someone";
        await Clients.OthersInGroup(SessionGroup(sessionId))
            .SendAsync("ParticipantJoined", new { name, at = DateTime.UtcNow });
    }

    public async Task LeaveSession(Guid sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, SessionGroup(sessionId));
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, HostGroup(sessionId));
    }
}
