using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;

namespace NursingSchool.Infrastructure.Gateways;

public class JpesaGateway
{
    private readonly HttpClient _httpClient;
    private readonly string _endpoint;
    private readonly string _apiKey;
    private readonly string _callbackUrl;
    private readonly string _action;

    public JpesaGateway(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _endpoint = configuration["Jpesa:Endpoint"] ?? "https://my.jpesa.com/api/";
        _apiKey = configuration["Jpesa:ApiKey"] ?? string.Empty;
        _callbackUrl = configuration["Jpesa:CallbackUrl"] ?? string.Empty;
        _action = configuration["Jpesa:Action"] ?? "credit";

        _httpClient.Timeout = TimeSpan.FromSeconds(400);
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_apiKey) && !string.IsNullOrWhiteSpace(_callbackUrl);

    public async Task<string> RequestPaymentAsync(string msisdn, decimal amount, string reference, string description, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("JPesa is not configured. Set Jpesa:ApiKey and Jpesa:CallbackUrl.");

        if (amount <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");

        msisdn = NormalizeMsisdn(msisdn);

        var requestXml =
            "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>" +
            new XElement("g7bill",
                new XElement("_key_", _apiKey.Trim()),
                new XElement("cmd", "account"),
                new XElement("action", _action),
                new XElement("pt", "mm"),
                new XElement("mobile", msisdn),
                new XElement("amount", amount.ToString("0", CultureInfo.InvariantCulture)),
                new XElement("callback", _callbackUrl.Trim()),
                new XElement("tx", reference.Trim()),
                new XElement("description", description.Trim())
            ).ToString(SaveOptions.DisableFormatting);

        using var content = new StringContent(requestXml, Encoding.GetEncoding("ISO-8859-1"), "text/xml");
        using var response = await _httpClient.PostAsync(_endpoint, content, ct);
        var result = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"JPesa request failed ({(int)response.StatusCode}): {result}");

        if (string.IsNullOrWhiteSpace(result))
            throw new InvalidOperationException("JPesa returned an empty response.");

        var apiStatus = GetJsonValue(result, "api_status");
        if (string.Equals(apiStatus, "error", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(FormatApiError(GetJsonValue(result, "msg") ?? result));

        return result;
    }

    private static string FormatApiError(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return "JPesa rejected the request.";

        if (message.Contains("E000115", StringComparison.OrdinalIgnoreCase)
            || message.Contains("NOT permitted", StringComparison.OrdinalIgnoreCase))
        {
            return
                "JPesa blocked this server: your hosting IP must be whitelisted in your JPesa merchant account " +
                "(my.jpesa.com → API / security settings). Ask JPesa support to allow the IP shown in their error. " +
                $"Until then, use Record previous payment. ({message})";
        }

        return $"JPesa rejected the request: {message}";
    }

    public static string? GetTid(string jpesaResponse) => GetJsonValue(jpesaResponse, "tid");
    public static string? GetSid(string jpesaResponse) => GetJsonValue(jpesaResponse, "sid");
    public static string? GetMessage(string jpesaResponse) => GetJsonValue(jpesaResponse, "msg");

    private static string? GetJsonValue(string json, string propertyName)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(propertyName, out var value))
                return value.ToString();
        }
        catch { /* ignore */ }
        return null;
    }

    public static string NormalizeMsisdn(string msisdn)
    {
        if (string.IsNullOrWhiteSpace(msisdn))
            throw new InvalidOperationException("Mobile money phone number is required.");

        msisdn = msisdn.Trim().Replace(" ", "").Replace("-", "");
        if (msisdn.StartsWith('+')) msisdn = msisdn[1..];
        if (msisdn.StartsWith('0')) msisdn = "256" + msisdn[1..];
        if (!msisdn.StartsWith("256") || msisdn.Length != 12 || !msisdn.All(char.IsDigit))
            throw new InvalidOperationException("Use a valid Uganda mobile number (e.g. 0772123456).");

        return msisdn;
    }
}
