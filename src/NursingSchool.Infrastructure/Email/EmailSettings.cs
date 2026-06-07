namespace NursingSchool.Infrastructure.Email;

public class EmailSettings
{
    public const string SectionName = "EmailSettings";

    /// <summary>SMTP host (e.g. smtp.gmail.com). Also bound from legacy <c>Host</c>.</summary>
    public string SmtpServer { get; set; } = string.Empty;

    public string Host
    {
        get => SmtpServer;
        set => SmtpServer = value ?? string.Empty;
    }

    public int Port { get; set; } = 587;

    public string Username { get; set; } = string.Empty;

    public string? UserName
    {
        get => Username;
        set => Username = value ?? string.Empty;
    }

    public string? Password { get; set; }

    public string FromEmail { get; set; } = string.Empty;

    public string FromAddress
    {
        get => string.IsNullOrWhiteSpace(FromEmail) ? Username : FromEmail;
        set => FromEmail = value ?? string.Empty;
    }

    public string FromName { get; set; } = "NSMS Scheduling";

    public bool UseSsl { get; set; } = true;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SmtpServer);
}
