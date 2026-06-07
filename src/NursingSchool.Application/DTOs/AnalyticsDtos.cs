namespace NursingSchool.Application.DTOs;

public record ChartDataPoint(string Label, decimal Value);

public record MonthlyCollectionPoint(string Month, decimal Amount);

public record MlInsightsDto(
    int AtRiskFeeStudents,
    int AtRiskAcademicStudents,
    double FeeModelAccuracy,
    double AcademicModelAccuracy,
    bool ModelsTrained,
    string Summary);

public record StudentRiskRow(
    Guid StudentId,
    string StudentNo,
    string StudentName,
    string ProgramName,
    string RiskType,
    float RiskScore,
    string Recommendation);

public record AnalyticsChartsDto(
    IReadOnlyList<ChartDataPoint> EnrollmentByProgram,
    IReadOnlyList<ChartDataPoint> FeeStatusBreakdown,
    IReadOnlyList<MonthlyCollectionPoint> MonthlyCollections,
    IReadOnlyList<ChartDataPoint> PaymentMethods,
    IReadOnlyList<ChartDataPoint> StudentStatusBreakdown,
    MlInsightsDto MlInsights);

public record AdminDashboardDto(
    int TotalStudents,
    int ActiveStudents,
    int TotalStaff,
    int PendingApplications,
    decimal OutstandingFees,
    decimal CollectedFees,
    int UpcomingEvents,
    int ActivePlacements,
    IReadOnlyList<SchoolEventResponse> Events,
    IReadOnlyList<FeeBalanceReportRow> TopBalances,
    AnalyticsChartsDto? Charts,
    DashboardStatTrends? Trends = null);

public record FinanceDashboardDto(
    decimal TotalInvoiced,
    decimal TotalCollected,
    decimal Outstanding,
    int OverdueCount,
    IReadOnlyList<FeeBalanceReportRow> TopDebtors,
    IReadOnlyList<PaymentSummaryRow> RecentPayments,
    AnalyticsChartsDto? Charts,
    DashboardStatTrends? Trends = null);
