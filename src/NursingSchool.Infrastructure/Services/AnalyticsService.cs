using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class AnalyticsService(IApplicationDbContext db, IMlAnalyticsService ml) : IAnalyticsService
{
    public async Task<AnalyticsChartsDto> GetChartsAsync(CancellationToken ct = default)
    {
        var enrollment = await db.Students
            .GroupBy(s => s.Program.Name)
            .Select(g => new ChartDataPoint(g.Key, g.Count()))
            .ToListAsync(ct);

        var invoices = await db.Invoices.Include(i => i.Payments).ToListAsync(ct);
        var paid = invoices.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Paid);
        var partial = invoices.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Partial);
        var unpaid = invoices.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Unpaid);
        var overdue = invoices.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue);
        var feeStatus = new List<ChartDataPoint>
        {
            new("Paid", paid),
            new("Partial", partial),
            new("Unpaid", unpaid),
            new("Overdue", overdue)
        };

        var monthly = await db.Payments
            .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new MonthlyCollectionPoint(
                $"{g.Key.Year}-{g.Key.Month:D2}",
                g.Sum(p => p.Amount)))
            .Take(12)
            .ToListAsync(ct);

        var methods = await db.Payments
            .GroupBy(p => p.PaymentMethod)
            .Select(g => new ChartDataPoint(g.Key, g.Count()))
            .ToListAsync(ct);

        var statusBreakdown = await db.Students
            .GroupBy(s => s.Status)
            .Select(g => new ChartDataPoint(g.Key, g.Count()))
            .ToListAsync(ct);

        var insights = await ml.GetInsightsAsync(ct);

        return new AnalyticsChartsDto(enrollment, feeStatus, monthly, methods, statusBreakdown, insights);
    }
}
