namespace NursingSchool.Application.DTOs;

public record DashboardSummary(
    int TotalStudents, int ActiveStudents, int PendingApplications,
    int TotalInvoices, decimal OutstandingBalance, int ActivePlacements,
    DashboardStatTrends? Trends = null);

/// <summary>Month-over-month change. Direction: up, down, or neutral.</summary>
public record StatTrend(decimal ChangePercent, string Direction, bool LowerIsBetter = false);

public record DashboardStatTrends(
    StatTrend? Students = null,
    StatTrend? Active = null,
    StatTrend? Collected = null,
    StatTrend? Outstanding = null,
    StatTrend? Placements = null,
    StatTrend? Applications = null,
    StatTrend? Invoiced = null,
    StatTrend? Overdue = null,
    StatTrend? CollectionRate = null);
