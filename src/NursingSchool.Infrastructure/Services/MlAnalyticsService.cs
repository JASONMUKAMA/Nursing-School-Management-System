using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Enums;
using NursingSchool.ML;
using NursingSchool.ML.Models;

namespace NursingSchool.Infrastructure.Services;

public class MlAnalyticsService(IApplicationDbContext db, MlAnalyticsEngine engine) : IMlAnalyticsService
{
    private readonly MlAnalyticsEngine _engine = engine;

    public async Task TrainModelsAsync(CancellationToken ct = default)
    {
        var students = await db.Students
            .Include(s => s.Invoices).ThenInclude(i => i.Payments)
            .Include(s => s.Enrollments)
            .ToListAsync(ct);

        var marksByStudent = await LoadAverageMarksAsync(students.Select(s => s.Id).ToList(), ct);
        var attendanceByStudent = await LoadAttendanceRatesAsync(students.Select(s => s.Id).ToList(), ct);

        var feeData = students.Select(s => BuildFeeInput(s)).ToList();
        var academicData = students.Select(s => BuildAcademicInput(s, marksByStudent, attendanceByStudent)).ToList();

        _engine.TrainFeeModel(feeData);
        _engine.TrainAcademicModel(academicData);
    }

    public async Task<MlInsightsDto> GetInsightsAsync(CancellationToken ct = default)
    {
        var (feeCount, academicCount) = await CountAtRiskAsync(ct);
        var total = feeCount + academicCount;
        var summary = total switch
        {
            0 => "No students currently flagged for follow-up.",
            1 => "1 student needs attention — review the list below.",
            _ => $"{feeCount} fee follow-ups and {academicCount} academic support cases recommended."
        };

        return new MlInsightsDto(
            feeCount,
            academicCount,
            _engine.FeeModelAccuracy,
            _engine.AcademicModelAccuracy,
            _engine.IsTrained,
            summary);
    }

    public async Task<PagedResult<StudentRiskRow>> GetAtRiskStudentsAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var students = await db.Students.Include(s => s.Program)
            .Include(s => s.Invoices).ThenInclude(i => i.Payments)
            .Include(s => s.Enrollments)
            .ToListAsync(ct);

        var marksByStudent = await LoadAverageMarksAsync(students.Select(s => s.Id).ToList(), ct);
        var attendanceByStudent = await LoadAttendanceRatesAsync(students.Select(s => s.Id).ToList(), ct);

        var rows = new List<StudentRiskRow>();
        foreach (var s in students)
        {
            var assessment = AssessStudent(s, marksByStudent, attendanceByStudent);
            if (!assessment.FeeFlagged && !assessment.AcademicFlagged) continue;

            var riskType = assessment.FeeFlagged && assessment.AcademicFlagged ? "Fee & Academic" :
                assessment.FeeFlagged ? "Fee Default" : "Academic";
            var score = Math.Max(assessment.FeeProb, assessment.AcademicProb);
            var rec = assessment.FeeFlagged && assessment.AcademicFlagged
                ? "Schedule finance counselling and academic support."
                : assessment.FeeFlagged ? "Contact guardian — offer mobile money payment plan."
                : "Assign mentor and monitor attendance.";

            rows.Add(new StudentRiskRow(s.Id, s.StudentNo, $"{s.FirstName} {s.LastName}", s.Program.Name, riskType, score, rec));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.ToLower();
            rows = rows.Where(r => r.StudentName.ToLower().Contains(term) || r.StudentNo.ToLower().Contains(term)).ToList();
        }

        var total = rows.Count;
        var items = rows.OrderByDescending(r => r.RiskScore)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToList();

        return new PagedResult<StudentRiskRow> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    private async Task<(int Fee, int Academic)> CountAtRiskAsync(CancellationToken ct)
    {
        var students = await db.Students
            .Include(s => s.Invoices).ThenInclude(i => i.Payments)
            .Include(s => s.Enrollments)
            .ToListAsync(ct);

        if (students.Count == 0) return (0, 0);

        var marksByStudent = await LoadAverageMarksAsync(students.Select(s => s.Id).ToList(), ct);
        var attendanceByStudent = await LoadAttendanceRatesAsync(students.Select(s => s.Id).ToList(), ct);

        var feeCount = 0;
        var academicCount = 0;
        foreach (var s in students)
        {
            var assessment = AssessStudent(s, marksByStudent, attendanceByStudent);
            if (assessment.FeeFlagged) feeCount++;
            if (assessment.AcademicFlagged) academicCount++;
        }

        return (feeCount, academicCount);
    }

    private StudentRiskAssessment AssessStudent(
        Domain.Entities.Student s,
        Dictionary<Guid, decimal> marksByStudent,
        Dictionary<Guid, float> attendanceByStudent)
    {
        var feeInput = BuildFeeInput(s);
        var hasOverdue = s.Invoices.Any(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue);
        var (feeRisk, feeProb) = _engine.PredictFeeRisk(feeInput);
        var feeFlagged = feeRisk || feeProb > 0.45f || feeInput.BalanceRatio > 0.55f || hasOverdue;

        marksByStudent.TryGetValue(s.Id, out var avgMark);
        var hasMarks = marksByStudent.ContainsKey(s.Id);
        attendanceByStudent.TryGetValue(s.Id, out var attRate);
        var hasAttendance = attendanceByStudent.ContainsKey(s.Id);
        var academicInput = BuildAcademicInput(s, marksByStudent, attendanceByStudent);
        var (academicRisk, academicProb) = _engine.PredictAcademicRisk(academicInput);
        var hasAcademicData = hasMarks || hasAttendance;
        var academicFlagged = hasAcademicData && (
            academicRisk
            || academicProb > 0.45f
            || (hasMarks && avgMark < 55)
            || (hasAttendance && attRate < 78));

        return new StudentRiskAssessment(feeFlagged, academicFlagged, feeProb, academicProb);
    }

    private static FeeRiskInput BuildFeeInput(Domain.Entities.Student s)
    {
        var invoiced = s.Invoices.Sum(i => i.TotalAmount);
        var paid = s.Invoices.SelectMany(i => i.Payments).Sum(p => p.Amount);
        var ratio = invoiced > 0 ? (float)((invoiced - paid) / invoiced) : 0f;
        return new FeeRiskInput
        {
            BalanceRatio = ratio,
            PaymentCount = s.Invoices.SelectMany(i => i.Payments).Count(),
            DaysEnrolled = (float)(DateTime.UtcNow - s.AdmissionDate.ToDateTime(TimeOnly.MinValue)).TotalDays,
            InvoiceCount = s.Invoices.Count,
            IsAtRisk = s.Invoices.Any(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue) || ratio > 0.6f
        };
    }

    private static AcademicRiskInput BuildAcademicInput(
        Domain.Entities.Student s,
        Dictionary<Guid, decimal> marksByStudent,
        Dictionary<Guid, float> attendanceByStudent)
    {
        marksByStudent.TryGetValue(s.Id, out var avgMark);
        attendanceByStudent.TryGetValue(s.Id, out var attRate);
        var enrolled = s.Enrollments.Count(e => e.Status == EnrollmentStatuses.Enrolled);
        return new AcademicRiskInput
        {
            AverageMark = (float)avgMark,
            AttendanceRate = attRate,
            CoursesEnrolled = enrolled,
            IsAtRisk = avgMark < 50 || attRate < 75
        };
    }

    private async Task<Dictionary<Guid, decimal>> LoadAverageMarksAsync(List<Guid> studentIds, CancellationToken ct) =>
        studentIds.Count == 0
            ? []
            : await db.Marks
                .Include(m => m.AssessmentComponent)
                .Where(m => studentIds.Contains(m.StudentId))
                .GroupBy(m => m.StudentId)
                .Select(g => new { StudentId = g.Key, Avg = g.Average(m => m.Score / m.AssessmentComponent.MaxScore * 100) })
                .ToDictionaryAsync(x => x.StudentId, x => (decimal)x.Avg, ct);

    private async Task<Dictionary<Guid, float>> LoadAttendanceRatesAsync(List<Guid> studentIds, CancellationToken ct) =>
        studentIds.Count == 0
            ? []
            : await db.AttendanceRecords
                .Where(a => studentIds.Contains(a.StudentId))
                .GroupBy(a => a.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    Rate = g.Count(x => x.Status == AttendanceStatuses.Present) * 100f / Math.Max(1, g.Count())
                })
                .ToDictionaryAsync(x => x.StudentId, x => x.Rate, ct);

    private sealed record StudentRiskAssessment(bool FeeFlagged, bool AcademicFlagged, float FeeProb, float AcademicProb);
}
