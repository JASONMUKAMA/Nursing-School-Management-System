using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class ClinicalService(IApplicationDbContext db) : IClinicalService
{
    public async Task<ClinicalFacilityResponse> CreateFacilityAsync(CreateClinicalFacilityRequest request, CancellationToken ct = default)
    {
        var facility = new ClinicalFacility
        {
            Name = request.Name, FacilityType = request.FacilityType,
            ContactPerson = request.ContactPerson, Phone = request.Phone, Address = request.Address
        };
        db.ClinicalFacilities.Add(facility);
        await db.SaveChangesAsync(ct);
        return new ClinicalFacilityResponse(facility.Id, facility.Name, facility.FacilityType, facility.ContactPerson, facility.Phone, facility.Address, facility.IsActive);
    }

    public async Task<PagedResult<ClinicalFacilityResponse>> GetFacilitiesAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.ClinicalFacilities.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(f => f.Name.ToLower().Contains(s) || f.FacilityType.ToLower().Contains(s) || f.Address.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(f => f.Name).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(f => new ClinicalFacilityResponse(f.Id, f.Name, f.FacilityType, f.ContactPerson, f.Phone, f.Address, f.IsActive))
            .ToListAsync(ct);
        return new PagedResult<ClinicalFacilityResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ClinicalSupervisorResponse> CreateSupervisorAsync(CreateClinicalSupervisorRequest request, CancellationToken ct = default)
    {
        var supervisor = new ClinicalSupervisor
        {
            FacilityId = request.FacilityId, FullName = request.FullName, Phone = request.Phone, Email = request.Email
        };
        db.ClinicalSupervisors.Add(supervisor);
        await db.SaveChangesAsync(ct);
        var facility = await db.ClinicalFacilities.FirstAsync(f => f.Id == supervisor.FacilityId, ct);
        return new ClinicalSupervisorResponse(supervisor.Id, supervisor.FacilityId, facility.Name, supervisor.FullName, supervisor.Phone, supervisor.Email);
    }

    public async Task<ClinicalPlacementResponse> CreatePlacementAsync(CreateClinicalPlacementRequest request, CancellationToken ct = default)
    {
        var placement = new ClinicalPlacement
        {
            StudentId = request.StudentId, FacilityId = request.FacilityId,
            SupervisorId = request.SupervisorId, StartDate = request.StartDate,
            EndDate = request.EndDate, Department = request.Department,
            Status = PlacementStatuses.Scheduled
        };
        db.ClinicalPlacements.Add(placement);
        await db.SaveChangesAsync(ct);
        var item = await db.ClinicalPlacements.Include(p => p.Student).Include(p => p.Facility).Include(p => p.Supervisor)
            .Where(p => p.Id == placement.Id)
            .Select(p => new ClinicalPlacementResponse(
                p.Id, p.StudentId, $"{p.Student.FirstName} {p.Student.LastName}",
                p.FacilityId, p.Facility.Name, p.SupervisorId, p.Supervisor != null ? p.Supervisor.FullName : null,
                p.StartDate, p.EndDate, p.Department, p.Status)).FirstAsync(ct);
        return item;
    }

    public async Task<PagedResult<ClinicalPlacementResponse>> GetPlacementsAsync(Guid? studentId, PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.ClinicalPlacements.AsQueryable();
        if (studentId.HasValue) q = q.Where(p => p.StudentId == studentId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(p =>
                (p.Student.FirstName + " " + p.Student.LastName).ToLower().Contains(s) ||
                p.Facility.Name.ToLower().Contains(s) ||
                p.Department.ToLower().Contains(s) ||
                p.Status.ToLower().Contains(s));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(p => p.StartDate)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => new ClinicalPlacementResponse(
                p.Id,
                p.StudentId,
                p.Student.FirstName + " " + p.Student.LastName,
                p.FacilityId,
                p.Facility.Name,
                p.SupervisorId,
                p.Supervisor != null ? p.Supervisor.FullName : null,
                p.StartDate,
                p.EndDate,
                p.Department,
                p.Status))
            .ToListAsync(ct);

        return new PagedResult<ClinicalPlacementResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ClinicalEvaluationResponse> SubmitEvaluationAsync(CreateClinicalEvaluationRequest request, Guid evaluatorId, CancellationToken ct = default)
    {
        var placement = await db.ClinicalPlacements.Include(p => p.Student).FirstAsync(p => p.Id == request.PlacementId, ct);
        var evaluation = new ClinicalEvaluation
        {
            PlacementId = request.PlacementId,
            EvaluatorId = evaluatorId,
            ProfessionalismScore = request.ProfessionalismScore,
            SkillScore = request.SkillScore,
            CommunicationScore = request.CommunicationScore,
            AttendanceScore = request.AttendanceScore,
            Comments = request.Comments,
            EvaluatedAt = DateTime.UtcNow,
            CreatedBy = evaluatorId
        };
        db.ClinicalEvaluations.Add(evaluation);
        await db.SaveChangesAsync(ct);
        var total = evaluation.ProfessionalismScore + evaluation.SkillScore + evaluation.CommunicationScore + evaluation.AttendanceScore;
        return new ClinicalEvaluationResponse(
            evaluation.Id, evaluation.PlacementId, $"{placement.Student.FirstName} {placement.Student.LastName}",
            evaluation.ProfessionalismScore, evaluation.SkillScore, evaluation.CommunicationScore,
            evaluation.AttendanceScore, total, evaluation.Comments, evaluation.EvaluatedAt);
    }
}
