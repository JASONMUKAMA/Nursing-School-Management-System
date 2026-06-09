using System.Text.Json;
using System.Xml.Linq;

namespace NursingSchool.Infrastructure.Gateways;

public static class JpesaCallbackParser
{
    public static string? GetValue(string body, string name)
    {
        if (string.IsNullOrWhiteSpace(body)) return null;
        body = body.Trim();

        if (body.StartsWith('{'))
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                if (TryGetJsonValue(doc.RootElement, name, out var value))
                    return value;
            }
            catch { /* ignore */ }
        }

        if (body.StartsWith('<'))
        {
            try
            {
                var xml = XDocument.Parse(body);
                var element = xml.Descendants()
                    .FirstOrDefault(x => string.Equals(x.Name.LocalName, name, StringComparison.OrdinalIgnoreCase));
                return element?.Value;
            }
            catch { /* ignore */ }
        }

        if (body.Contains('='))
        {
            foreach (var part in body.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var pair = part.Split('=', 2);
                if (pair.Length == 2 && string.Equals(pair[0], name, StringComparison.OrdinalIgnoreCase))
                    return Uri.UnescapeDataString(pair[1]);
            }
        }

        return null;
    }

    public static bool IsSuccess(string? status, string? reason, string body)
    {
        var value = $"{status} {reason} {body}".Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(value)) return false;
        return value.Contains("success") || value.Contains("completed") || value.Contains("paid")
            || value.Contains("approved") || value.Contains("processed") || value == "1";
    }

    public static bool IsFailed(string? status, string? reason, string body)
    {
        var value = $"{status} {reason} {body}".Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(value)) return false;
        return value.Contains("fail") || value.Contains("cancel") || value.Contains("declined")
            || value.Contains("rejected") || value.Contains("error") || value == "0";
    }

    private static bool TryGetJsonValue(JsonElement element, string name, out string? value)
    {
        value = null;
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value.ToString();
                    return true;
                }
                if (TryGetJsonValue(property.Value, name, out value))
                    return true;
            }
        }
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                if (TryGetJsonValue(item, name, out value))
                    return true;
            }
        }
        return false;
    }
}
