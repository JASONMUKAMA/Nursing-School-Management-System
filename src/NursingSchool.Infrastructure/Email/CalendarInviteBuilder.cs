using System.Text;
using NursingSchool.Domain.Entities;

namespace NursingSchool.Infrastructure.Email;

public static class CalendarInviteBuilder
{
    public static byte[] BuildIcs(SchoolEvent e)
    {
        var uid = $"{e.Id}@nursingschool.ug";
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'");
        var start = e.StartDate.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'");
        var end = e.EndDate.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'");
        var summary = Escape(e.Title);
        var description = Escape($"{e.Description}\n\nAudience: {e.TargetAudience}\nType: {e.EventType}");
        var location = Escape(e.Location);

        var sb = new StringBuilder();
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//NSMS//School Scheduling//EN");
        sb.AppendLine("CALSCALE:GREGORIAN");
        sb.AppendLine("METHOD:REQUEST");
        sb.AppendLine("BEGIN:VEVENT");
        sb.AppendLine($"UID:{uid}");
        sb.AppendLine($"DTSTAMP:{stamp}");
        sb.AppendLine($"DTSTART:{start}");
        sb.AppendLine($"DTEND:{end}");
        sb.AppendLine($"SUMMARY:{summary}");
        sb.AppendLine($"DESCRIPTION:{description}");
        sb.AppendLine($"LOCATION:{location}");
        sb.AppendLine("STATUS:CONFIRMED");
        sb.AppendLine("END:VEVENT");
        sb.AppendLine("END:VCALENDAR");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public static string BuildHtmlBody(SchoolEvent e)
    {
        var start = e.StartDate.ToLocalTime().ToString("dddd, dd MMM yyyy HH:mm");
        var end = e.EndDate.ToLocalTime().ToString("dddd, dd MMM yyyy HH:mm");
        return $"""
            <div style="font-family:Inter,Arial,sans-serif;max-width:560px">
              <h2 style="color:#065a4e;margin:0 0 12px">{System.Net.WebUtility.HtmlEncode(e.Title)}</h2>
              <p style="color:#334155;margin:0 0 8px"><strong>When:</strong> {start} – {end}</p>
              <p style="color:#334155;margin:0 0 8px"><strong>Where:</strong> {System.Net.WebUtility.HtmlEncode(e.Location)}</p>
              <p style="color:#334155;margin:0 0 8px"><strong>Type:</strong> {System.Net.WebUtility.HtmlEncode(e.EventType)}</p>
              <p style="color:#334155;margin:0 0 16px"><strong>Audience:</strong> {System.Net.WebUtility.HtmlEncode(e.TargetAudience)}</p>
              <p style="color:#475569;line-height:1.5">{System.Net.WebUtility.HtmlEncode(e.Description)}</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
              <p style="color:#64748b;font-size:13px">Open the attached <strong>invite.ics</strong> file to add this event to Google Calendar, Outlook, or Apple Calendar.</p>
              <p style="color:#64748b;font-size:13px">— Nursing School Management System</p>
            </div>
            """;
    }

    private static string Escape(string value) =>
        value.Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\n", "\\n").Replace("\r", "");
}
