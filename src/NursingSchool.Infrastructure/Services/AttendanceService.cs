using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;

namespace NursingSchool.Infrastructure.Services;

public class AttendanceService(IApplicationDbContext db) : IAttendanceService
{
    public async Task<ClassSessionResponse> CreateSessionAsync(CreateClassSessionRequest request, CancellationToken ct = default)
    {
        var session = new ClassSession
        {
            CourseOfferingId = request.CourseOfferingId,
            SessionDate = request.SessionDate,
            Topic = request.Topic,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };
        db.ClassSessions.Add(session);
        await db.SaveChangesAsync(ct);
        var offering = await db.CourseOfferings.Include(o => o.Course).FirstAsync(o => o.Id == session.CourseOfferingId, ct);
        return new ClassSessionResponse(session.Id, session.CourseOfferingId, offering.Course.Name, session.SessionDate, session.Topic, session.StartTime, session.EndTime);
    }

    public async Task SubmitAttendanceAsync(Guid sessionId, SubmitAttendanceRequest request, CancellationToken ct = default)
    {
        foreach (var entry in request.Entries)
        {
            db.AttendanceRecords.Add(new AttendanceRecord
            {
                ClassSessionId = sessionId,
                StudentId = entry.StudentId,
                Status = entry.Status,
                Remarks = entry.Remarks
            });
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<ClassSessionResponse>> GetSessionsAsync(Guid? courseOfferingId, PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.ClassSessions.Include(s => s.CourseOffering).ThenInclude(o => o.Course).AsQueryable();
        if (courseOfferingId.HasValue) q = q.Where(s => s.CourseOfferingId == courseOfferingId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(x => x.Topic.ToLower().Contains(s) || x.CourseOffering.Course.Name.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(s => s.SessionDate).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(s => new ClassSessionResponse(s.Id, s.CourseOfferingId, s.CourseOffering.Course.Name, s.SessionDate, s.Topic, s.StartTime, s.EndTime))
            .ToListAsync(ct);
        return new PagedResult<ClassSessionResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }
}
