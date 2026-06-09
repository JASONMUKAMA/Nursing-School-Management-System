namespace NursingSchool.Api.Http;

public static class ClientIpHelper
{
    public static string? GetClientIpAddress(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp))
            return realIp.Trim();

        return context.Connection.RemoteIpAddress?.MapToIPv4().ToString()
            ?? context.Connection.RemoteIpAddress?.ToString();
    }

    public static string? GetUserAgent(HttpContext context)
    {
        var agent = context.Request.Headers.UserAgent.ToString();
        return string.IsNullOrWhiteSpace(agent) ? null : agent;
    }
}
