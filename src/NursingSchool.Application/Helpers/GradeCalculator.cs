using NursingSchool.Domain.Entities;

namespace NursingSchool.Application.Helpers;

public static class GradeCalculator
{
    public static decimal CalculateFinalScore(IEnumerable<(decimal Score, decimal MaxScore, decimal Weight)> components)
    {
        return components.Sum(c => c.MaxScore > 0 ? (c.Score / c.MaxScore) * c.Weight : 0);
    }

    public static string GetGrade(decimal finalScore, IEnumerable<GradeScale> scales)
    {
        var match = scales.FirstOrDefault(s => finalScore >= s.MinScore && finalScore <= s.MaxScore);
        return match?.Grade ?? "N/A";
    }
}
