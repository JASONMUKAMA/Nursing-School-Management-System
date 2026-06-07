using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class DashboardService(
    IApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    IFinanceService financeService,
    IAnalyticsService analyticsService) : IDashboardService
{
    public async Task<DashboardSummary> GetSummaryAsync(CancellationToken ct = default)
    {
        var totalStudents = await db.Students.CountAsync(ct);
        var activeStudents = await db.Students.CountAsync(s => s.Status == StudentStatuses.Active, ct);
        var pendingApplications = await db.Applications.CountAsync(a => a.Status == ApplicationStatuses.Pending, ct);
        var totalInvoices = await db.Invoices.CountAsync(ct);
        var activePlacements = await db.ClinicalPlacements.CountAsync(p => p.Status == PlacementStatuses.Active || p.Status == PlacementStatuses.Scheduled, ct);
        var invoices = await db.Invoices.Include(i => i.Payments).ToListAsync(ct);
        var outstanding = invoices.Sum(InvoiceCalculator.GetBalance);
        var trends = await DashboardTrendHelper.BuildSummaryTrendsAsync(db, ct);
        return new DashboardSummary(totalStudents, activeStudents, pendingApplications, totalInvoices, outstanding, activePlacements, trends);
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken ct = default)
    {
        var lecturers = await userManager.GetUsersInRoleAsync(RoleNames.Lecturer);
        var invoices = await db.Invoices.Include(i => i.Payments).ToListAsync(ct);
        var events = await db.SchoolEvents.Where(e => e.StartDate >= DateTime.UtcNow).OrderBy(e => e.StartDate).Take(6)
            .Select(e => new SchoolEventResponse(e.Id, e.Title, e.Description, e.EventType, e.StartDate, e.EndDate, e.Location, e.TargetAudience, e.IsPublished)).ToListAsync(ct);
        var topBalances = (await financeService.GetFeeBalanceReportAsync(null, new Application.Common.PaginationQuery { Page = 1, PageSize = 10 }, ct)).Items.ToList();
        var charts = await analyticsService.GetChartsAsync(ct);
        var trends = await DashboardTrendHelper.BuildAdminTrendsAsync(db, ct);
        return new AdminDashboardDto(
            await db.Students.CountAsync(ct),
            await db.Students.CountAsync(s => s.Status == StudentStatuses.Active, ct),
            lecturers.Count + 5,
            await db.Applications.CountAsync(a => a.Status == ApplicationStatuses.Pending, ct),
            invoices.Sum(InvoiceCalculator.GetBalance),
            invoices.SelectMany(i => i.Payments).Sum(p => p.Amount),
            await db.SchoolEvents.CountAsync(e => e.StartDate >= DateTime.UtcNow, ct),
            await db.ClinicalPlacements.CountAsync(p => p.Status == PlacementStatuses.Active, ct),
            events, topBalances, charts, trends);
    }

    public async Task<FinanceDashboardDto> GetFinanceDashboardAsync(CancellationToken ct = default)
    {
        var invoices = await db.Invoices.Include(i => i.Payments).Include(i => i.Student).ToListAsync(ct);
        var totalInvoiced = invoices.Sum(i => i.TotalAmount);
        var collected = invoices.SelectMany(i => i.Payments).Sum(p => p.Amount);
        var overdue = invoices.Count(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue);
        var topDebtors = (await financeService.GetFeeBalanceReportAsync(null, new Application.Common.PaginationQuery { Page = 1, PageSize = 10 }, ct)).Items.ToList();
        var recent = await db.Payments.Include(p => p.Invoice).ThenInclude(i => i.Student)
            .OrderByDescending(p => p.PaymentDate).Take(10)
            .Select(p => new PaymentSummaryRow(p.ReceiptNo, $"{p.Invoice.Student.FirstName} {p.Invoice.Student.LastName}", p.Amount, p.PaymentMethod, p.PaymentDate))
            .ToListAsync(ct);
        var charts = await analyticsService.GetChartsAsync(ct);
        var trends = await DashboardTrendHelper.BuildFinanceTrendsAsync(db, ct);
        return new FinanceDashboardDto(totalInvoiced, collected, totalInvoiced - collected, overdue, topDebtors, recent, charts, trends);
    }

    public async Task<StudentDashboardDto> GetStudentDashboardAsync(Guid studentId, CancellationToken ct = default)
    {
        var student = await db.Students.Include(s => s.Program).FirstAsync(s => s.Id == studentId, ct);
        var invoices = await db.Invoices.Include(i => i.Payments).Where(i => i.StudentId == studentId).ToListAsync(ct);
        var balance = invoices.Sum(InvoiceCalculator.GetBalance);
        var status = balance <= 0 ? "Paid" : invoices.Any(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue) ? "Overdue" : "Pending";
        var enrolled = await db.Enrollments.CountAsync(e => e.StudentId == studentId && e.Status == EnrollmentStatuses.Enrolled, ct);
        var events = await db.SchoolEvents.Where(e => e.StartDate >= DateTime.UtcNow).OrderBy(e => e.StartDate).Take(5)
            .Select(e => new SchoolEventResponse(e.Id, e.Title, e.Description, e.EventType, e.StartDate, e.EndDate, e.Location, e.TargetAudience, e.IsPublished)).ToListAsync(ct);
        return new StudentDashboardDto(studentId, $"{student.FirstName} {student.LastName}", student.Program.Name, balance, status, enrolled, 85m, [], events);
    }

    public async Task<object> GetPublicStatsAsync(CancellationToken ct = default) => new
    {
        students = await db.Students.CountAsync(ct),
        programs = await db.Programs.CountAsync(ct),
        lecturers = (await userManager.GetUsersInRoleAsync(RoleNames.Lecturer)).Count,
        clinicalPartners = await db.ClinicalFacilities.CountAsync(ct)
    };
}
