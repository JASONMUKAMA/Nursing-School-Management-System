using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace NursingSchool.Infrastructure.Hubs;

[Authorize]
public class ComplaintsHub : Hub
{
    public const string RoomGroup = "complaints-room";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, RoomGroup);
        await base.OnConnectedAsync();
    }
}
