using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;

namespace NursingSchool.Infrastructure.Services;

public class ResultsService(IApplicationDbContext db) : IResultsService
{
    public async Task<AssessmentComponentResponse> CreateComponentAsync(CreateAssessmentComponentRequest request, CancellationToken ct = default)
    {
        var component = new AssessmentComponent
        {
            CourseOfferingId = request.CourseOfferingId,
            Name = request.Name,
            Weight = request.Weight,
            MaxScore = request.MaxScore
        };
        db.AssessmentComponents.Add(component);
        await db.SaveChangesAsync(ct);
        return new AssessmentComponentResponse(component.Id, component.CourseOfferingId, component.Name, component.Weight, component.MaxScore);
    }

    public async Task<IReadOnlyList<AssessmentComponentResponse>> GetComponentsByOfferingAsync(Guid courseOfferingId, CancellationToken ct = default) =>
        await db.AssessmentComponents
            .Where(c => c.CourseOfferingId == courseOfferingId)
            .OrderBy(c => c.Name)
            .Select(c => new AssessmentComponentResponse(c.Id, c.CourseOfferingId, c.Name, c.Weight, c.MaxScore))
            .ToListAsync(ct);

    public async Task<MarkResponse> SubmitMarkAsync(CreateMarkRequest request, Guid enteredBy, CancellationToken ct = default)
    {
        var component = await db.AssessmentComponents.FirstAsync(c => c.Id == request.AssessmentComponentId, ct);
        var student = await db.Students.FirstAsync(s => s.Id == request.StudentId, ct);

        var existing = await db.Marks.FirstOrDefaultAsync(m =>
            m.AssessmentComponentId == request.AssessmentComponentId && m.StudentId == request.StudentId, ct);

        if (existing != null)
        {
            existing.Score = request.Score;
            existing.EnteredBy = enteredBy;
            existing.EnteredAt = DateTime.UtcNow;
        }
        else
        {
            db.Marks.Add(new Mark
            {
                AssessmentComponentId = request.AssessmentComponentId,
                StudentId = request.StudentId,
                Score = request.Score,
                EnteredBy = enteredBy,
                EnteredAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);
        return new MarkResponse(Guid.NewGuid(), component.Id, component.Name, student.Id,
            $"{student.FirstName} {student.LastName}", request.Score, component.MaxScore, component.Weight);
    }

    public async Task<IReadOnlyList<StudentResultResponse>> GetStudentResultsAsync(Guid studentId, CancellationToken ct = default)
    {
        var enrollments = await db.Enrollments
            .Where(e => e.StudentId == studentId)
            .Include(e => e.CourseOffering).ThenInclude(o => o.Course)
            .Include(e => e.CourseOffering).ThenInclude(o => o.AssessmentComponents)
            .ToListAsync(ct);

        var marks = await db.Marks
            .Where(m => m.StudentId == studentId)
            .Include(m => m.AssessmentComponent)
            .ToListAsync(ct);

        var scales = await db.GradeScales.ToListAsync(ct);
        var results = new List<StudentResultResponse>();

        foreach (var enrollment in enrollments)
        {
            var offering = enrollment.CourseOffering;
            var components = offering.AssessmentComponents;
            var componentData = components.Select(c =>
            {
                var mark = marks.FirstOrDefault(m => m.AssessmentComponentId == c.Id);
                return (Score: mark?.Score ?? 0, c.MaxScore, c.Weight);
            });
            var finalScore = GradeCalculator.CalculateFinalScore(componentData);
            var grade = GradeCalculator.GetGrade(finalScore, scales);

            var markResponses = components.Select(c =>
            {
                var mark = marks.FirstOrDefault(m => m.AssessmentComponentId == c.Id);
                return new MarkResponse(mark?.Id ?? Guid.Empty, c.Id, c.Name, studentId, "",
                    mark?.Score ?? 0, c.MaxScore, c.Weight);
            }).ToList();

            results.Add(new StudentResultResponse(
                offering.Id, offering.Course.Code, offering.Course.Name, finalScore, grade, markResponses));
        }

        return results;
    }
}
