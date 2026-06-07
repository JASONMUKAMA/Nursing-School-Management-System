using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace NursingSchool.Infrastructure.Email;

public class SmtpEmailSender(IOptions<EmailSettings> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    private readonly EmailSettings _settings = options.Value;

    public async Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null, byte[]? calendarAttachment = null, CancellationToken ct = default)
    {
        if (!_settings.IsConfigured)
        {
            logger.LogWarning("SMTP host not configured; skipping email to {Email}: {Subject}", toEmail, subject);
            return;
        }

        var message = BuildMessage(_settings, toEmail, subject, htmlBody, textBody, calendarAttachment);
        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.SmtpServer, _settings.Port, _settings.UseSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto, ct);
        if (!string.IsNullOrWhiteSpace(_settings.Username))
            await client.AuthenticateAsync(_settings.Username, _settings.Password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }

    internal static MimeMessage BuildMessage(EmailSettings settings, string toEmail, string subject, string htmlBody, string? textBody, byte[]? calendarAttachment)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = htmlBody, TextBody = textBody ?? StripHtml(htmlBody) };
        if (calendarAttachment is { Length: > 0 })
            builder.Attachments.Add("invite.ics", calendarAttachment, ContentType.Parse("text/calendar"));
        message.Body = builder.ToMessageBody();
        return message;
    }

    private static string StripHtml(string html) =>
        System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ").Trim();
}

public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null, byte[]? calendarAttachment = null, CancellationToken ct = default)
    {
        logger.LogInformation(
            "📧 [Email] To: {To} | Subject: {Subject} | Calendar: {HasIcs}",
            toEmail, subject, calendarAttachment is { Length: > 0 });
        return Task.CompletedTask;
    }
}
