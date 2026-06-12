namespace NursingSchool.Application.Common;

public class FeeBalanceReportQuery : PaginationQuery
{
    /// <summary>Paid, Due, or Overdue. Omit for all statuses.</summary>
    public string? FeeStatus { get; set; }

    /// <summary>balance, studentName, studentNo, totalInvoiced, totalPaid, feeStatus, nextDueDate, lastPaymentDate</summary>
    public string SortBy { get; set; } = "balance";

    public string SortDir { get; set; } = "desc";
}
