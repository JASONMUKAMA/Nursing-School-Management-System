using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Application.Helpers;

public static class InvoiceCalculator
{
    public static decimal GetBalance(Invoice invoice) =>
        invoice.TotalAmount - invoice.Payments.Sum(p => p.Amount);

    public static string GetStatus(Invoice invoice)
    {
        var balance = GetBalance(invoice);
        if (balance <= 0) return InvoiceStatuses.Paid;
        if (invoice.Payments.Count == 0) return InvoiceStatuses.Unpaid;
        if (invoice.DueDate.HasValue && invoice.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow) && balance > 0)
            return InvoiceStatuses.Overdue;
        return InvoiceStatuses.Partial;
    }
}
