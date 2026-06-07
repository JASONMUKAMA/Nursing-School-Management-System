using NursingSchool.Application.Helpers;
using NursingSchool.Domain.Entities;

namespace NursingSchool.UnitTests;

public class GradeCalculatorTests
{
    [Fact]
    public void CalculateFinalScore_WeightedAverage()
    {
        var components = new[] { (Score: 32m, MaxScore: 40m, Weight: 40m), (Score: 48m, MaxScore: 60m, Weight: 60m) };
        var result = GradeCalculator.CalculateFinalScore(components);
        Assert.Equal(80m, result);
    }

    [Fact]
    public void GetGrade_ReturnsCorrectGrade()
    {
        var scales = new List<GradeScale>
        {
            new() { MinScore = 70, MaxScore = 100, Grade = "A" },
            new() { MinScore = 50, MaxScore = 69.99m, Grade = "C" }
        };
        Assert.Equal("A", GradeCalculator.GetGrade(75, scales));
        Assert.Equal("C", GradeCalculator.GetGrade(55, scales));
    }
}
