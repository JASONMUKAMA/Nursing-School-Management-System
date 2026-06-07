namespace NursingSchool.Infrastructure.Email;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null, byte[]? calendarAttachment = null, CancellationToken ct = default);
}
