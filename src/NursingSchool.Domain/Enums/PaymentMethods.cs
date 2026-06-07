namespace NursingSchool.Domain.Enums;

public static class PaymentMethods
{
    public const string MtnMobileMoney = "MTN Mobile Money";
    public const string AirtelMoney = "Airtel Money";
    public const string BankTransfer = "Bank Transfer";
    public const string Cash = "Cash";
    public const string VisaCard = "Visa Card";

    public static readonly string[] All =
        [MtnMobileMoney, AirtelMoney, BankTransfer, Cash, VisaCard];
}
