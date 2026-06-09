namespace NursingSchool.Domain.Enums;

public static class PaymentGatewayStatuses
{
    public const string Pending = "Pending";
    public const string Successful = "Successful";
    public const string Failed = "Failed";
}

public static class PaymentSources
{
    public const string JpesaApi = "JPesa API";
    public const string Manual = "Manual";
}
