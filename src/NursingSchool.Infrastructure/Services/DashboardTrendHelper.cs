using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

internal static class DashboardTrendHelper
{
    private static DateTime MonthStartUtc(DateOnly month) =>
        DateTime.SpecifyKind(month.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

    public static StatTrend Compute(decimal current, decimal previous, bool lowerIsBetter = false)
    {
        decimal pct;
        string dir;
        if (previous == 0)
        {
            if (current == 0)
                return new StatTrend(0, "neutral", lowerIsBetter);
            // Avoid misleading "100%" when there was no baseline last month.
            return new StatTrend(0, "neutral", lowerIsBetter);
        }

        pct = Math.Round((current - previous) / Math.Abs(previous) * 100, 1);
        dir = Math.Abs(pct) < 0.5m ? "neutral" : pct > 0 ? "up" : "down";
        return new StatTrend(Math.Abs(pct), dir, lowerIsBetter);
    }

    public static async Task<DashboardStatTrends> BuildAdminTrendsAsync(IApplicationDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var thisMonth = new DateOnly(now.Year, now.Month, 1);
        var lastMonth = thisMonth.AddMonths(-1);

        var admissionsThisMonth = await db.Students.CountAsync(
            s => s.AdmissionDate >= thisMonth, ct);
        var admissionsLastMonth = await db.Students.CountAsync(
            s => s.AdmissionDate >= lastMonth && s.AdmissionDate < thisMonth, ct);

        var activeThisMonth = await db.Students.CountAsync(
            s => s.Status == StudentStatuses.Active && s.AdmissionDate >= thisMonth, ct);
        var activeLastMonth = await db.Students.CountAsync(
            s => s.Status == StudentStatuses.Active && s.AdmissionDate >= lastMonth && s.AdmissionDate < thisMonth, ct);

        var collectedThisMonth = await db.Payments
            .Where(p => p.PaymentDate >= thisMonth)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var collectedLastMonth = await db.Payments
            .Where(p => p.PaymentDate >= lastMonth && p.PaymentDate < thisMonth)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0;

        var overdueThisMonth = await db.Invoices
            .Include(i => i.Payments)
            .Where(i => i.IssuedAt >= MonthStartUtc(thisMonth))
            .ToListAsync(ct);
        var overdueLastMonth = await db.Invoices
            .Include(i => i.Payments)
            .Where(i => i.IssuedAt >= MonthStartUtc(lastMonth) && i.IssuedAt < MonthStartUtc(thisMonth))
            .ToListAsync(ct);
        var outstandingThis = overdueThisMonth.Sum(InvoiceCalculator.GetBalance);
        var outstandingLast = overdueLastMonth.Sum(InvoiceCalculator.GetBalance);

        var placementsThis = await db.ClinicalPlacements.CountAsync(
            p => p.StartDate >= thisMonth && (p.Status == PlacementStatuses.Active || p.Status == PlacementStatuses.Scheduled), ct);
        var placementsLast = await db.ClinicalPlacements.CountAsync(
            p => p.StartDate >= lastMonth && p.StartDate < thisMonth, ct);

        var appsThis = await db.Applications.CountAsync(
            a => a.SubmittedAt >= MonthStartUtc(thisMonth) && a.Status == ApplicationStatuses.Pending, ct);
        var appsLast = await db.Applications.CountAsync(
            a => a.SubmittedAt >= MonthStartUtc(lastMonth) && a.SubmittedAt < MonthStartUtc(thisMonth) && a.Status == ApplicationStatuses.Pending, ct);

        return new DashboardStatTrends(
            Students: Compute(admissionsThisMonth, admissionsLastMonth),
            Active: Compute(activeThisMonth, activeLastMonth),
            Collected: Compute(collectedThisMonth, collectedLastMonth),
            Outstanding: Compute(outstandingThis, outstandingLast, lowerIsBetter: true),
            Placements: Compute(placementsThis, placementsLast),
            Applications: Compute(appsThis, appsLast, lowerIsBetter: true));
    }

    public static async Task<DashboardStatTrends> BuildFinanceTrendsAsync(IApplicationDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var thisMonth = new DateOnly(now.Year, now.Month, 1);
        var lastMonth = thisMonth.AddMonths(-1);

        var invoicedThis = await db.Invoices
            .Where(i => i.IssuedAt >= MonthStartUtc(thisMonth))
            .SumAsync(i => (decimal?)i.TotalAmount, ct) ?? 0;
        var invoicedLast = await db.Invoices
            .Where(i => i.IssuedAt >= MonthStartUtc(lastMonth) && i.IssuedAt < MonthStartUtc(thisMonth))
            .SumAsync(i => (decimal?)i.TotalAmount, ct) ?? 0;

        var collectedThis = await db.Payments
            .Where(p => p.PaymentDate >= thisMonth)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var collectedLast = await db.Payments
            .Where(p => p.PaymentDate >= lastMonth && p.PaymentDate < thisMonth)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0;

        var overdueThis = await db.Invoices.Include(i => i.Payments)
            .Where(i => i.IssuedAt >= MonthStartUtc(thisMonth))
            .ToListAsync(ct);
        var overdueLast = await db.Invoices.Include(i => i.Payments)
            .Where(i => i.IssuedAt >= MonthStartUtc(lastMonth) && i.IssuedAt < MonthStartUtc(thisMonth))
            .ToListAsync(ct);

        var outstandingThis = overdueThis.Sum(InvoiceCalculator.GetBalance);
        var outstandingLast = overdueLast.Sum(InvoiceCalculator.GetBalance);
        var overdueCountThis = overdueThis.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue);
        var overdueCountLast = overdueLast.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue);

        var rateThis = invoicedThis > 0 ? collectedThis / invoicedThis * 100 : 0;
        var rateLast = invoicedLast > 0 ? collectedLast / invoicedLast * 100 : 0;

        return new DashboardStatTrends(
            Collected: Compute(collectedThis, collectedLast),
            Outstanding: Compute(outstandingThis, outstandingLast, lowerIsBetter: true),
            Invoiced: Compute(invoicedThis, invoicedLast),
            Overdue: Compute(overdueCountThis, overdueCountLast, lowerIsBetter: true),
            CollectionRate: Compute(rateThis, rateLast));
    }

    public static async Task<DashboardStatTrends> BuildSummaryTrendsAsync(IApplicationDbContext db, CancellationToken ct) =>
        await BuildAdminTrendsAsync(db, ct);
}
