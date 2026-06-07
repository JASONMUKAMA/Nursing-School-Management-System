using Microsoft.ML.Data;

namespace NursingSchool.ML.Models;

public class FeeRiskInput
{
    public float BalanceRatio { get; set; }
    public float PaymentCount { get; set; }
    public float DaysEnrolled { get; set; }
    public float InvoiceCount { get; set; }

    [ColumnName("Label")]
    public bool IsAtRisk { get; set; }
}

public class FeeRiskPrediction
{
    [ColumnName("PredictedLabel")]
    public bool IsAtRisk { get; set; }

    public float Probability { get; set; }

    public float Score { get; set; }
}

public class AcademicRiskInput
{
    public float AverageMark { get; set; }
    public float AttendanceRate { get; set; }
    public float CoursesEnrolled { get; set; }

    [ColumnName("Label")]
    public bool IsAtRisk { get; set; }
}

public class AcademicRiskPrediction
{
    [ColumnName("PredictedLabel")]
    public bool IsAtRisk { get; set; }

    public float Probability { get; set; }

    public float Score { get; set; }
}
