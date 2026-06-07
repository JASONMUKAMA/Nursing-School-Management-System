using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class AcademicService(IApplicationDbContext db) : IAcademicService
{
    public async Task<PagedResult<ProgramResponse>> GetProgramsAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Programs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(p => p.Code.ToLower().Contains(s) || p.Name.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(p => p.Code).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(p => new ProgramResponse(p.Id, p.Code, p.Name, p.DurationYears, p.IsActive)).ToListAsync(ct);
        return new PagedResult<ProgramResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ProgramResponse> CreateProgramAsync(CreateProgramRequest request, CancellationToken ct = default)
    {
        var program = new Program { Code = request.Code, Name = request.Name, DurationYears = request.DurationYears };
        db.Programs.Add(program);
        await db.SaveChangesAsync(ct);
        return new ProgramResponse(program.Id, program.Code, program.Name, program.DurationYears, program.IsActive);
    }

    public async Task<PagedResult<SemesterResponse>> GetSemestersAsync(Guid? programId, PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Semesters.Include(s => s.Program).AsQueryable();
        if (programId.HasValue) q = q.Where(s => s.ProgramId == programId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(x => x.Name.ToLower().Contains(s) || x.Program.Name.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(s => s.YearLevel).ThenBy(s => s.SemesterNo).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(s => new SemesterResponse(s.Id, s.ProgramId, s.Program.Name, s.Name, s.YearLevel, s.SemesterNo, s.StartDate, s.EndDate))
            .ToListAsync(ct);
        return new PagedResult<SemesterResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<SemesterResponse> CreateSemesterAsync(CreateSemesterRequest request, CancellationToken ct = default)
    {
        var semester = new Semester
        {
            ProgramId = request.ProgramId, Name = request.Name, YearLevel = request.YearLevel,
            SemesterNo = request.SemesterNo, StartDate = request.StartDate, EndDate = request.EndDate
        };
        db.Semesters.Add(semester);
        await db.SaveChangesAsync(ct);
        var program = await db.Programs.FirstAsync(p => p.Id == semester.ProgramId, ct);
        return new SemesterResponse(semester.Id, semester.ProgramId, program.Name, semester.Name, semester.YearLevel, semester.SemesterNo, semester.StartDate, semester.EndDate);
    }

    public async Task<PagedResult<CourseResponse>> GetCoursesAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Courses.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(c => c.Code.ToLower().Contains(s) || c.Name.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(c => c.Code).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(c => new CourseResponse(c.Id, c.Code, c.Name, c.CreditUnits, c.CourseType)).ToListAsync(ct);
        return new PagedResult<CourseResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request, CancellationToken ct = default)
    {
        var course = new Course { Code = request.Code, Name = request.Name, CreditUnits = request.CreditUnits, CourseType = request.CourseType };
        db.Courses.Add(course);
        await db.SaveChangesAsync(ct);
        return new CourseResponse(course.Id, course.Code, course.Name, course.CreditUnits, course.CourseType);
    }

    public async Task<PagedResult<CourseOfferingResponse>> GetCourseOfferingsAsync(Guid? semesterId, PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.CourseOfferings.Include(o => o.Course).Include(o => o.Semester).Include(o => o.Lecturer).AsQueryable();
        if (semesterId.HasValue) q = q.Where(o => o.SemesterId == semesterId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(o => o.Course.Name.ToLower().Contains(s) || o.Course.Code.ToLower().Contains(s) || o.AcademicYear.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(o => o.AcademicYear).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(o => new CourseOfferingResponse(
                o.Id, o.CourseId, o.Course.Code, o.Course.Name, o.SemesterId, o.Semester.Name,
                o.LecturerId, o.Lecturer.UserName ?? "", o.AcademicYear)).ToListAsync(ct);
        return new PagedResult<CourseOfferingResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<CourseOfferingResponse> CreateCourseOfferingAsync(CreateCourseOfferingRequest request, CancellationToken ct = default)
    {
        var offering = new CourseOffering
        {
            CourseId = request.CourseId, SemesterId = request.SemesterId,
            LecturerId = request.LecturerId, AcademicYear = request.AcademicYear
        };
        db.CourseOfferings.Add(offering);
        await db.SaveChangesAsync(ct);
        var result = await GetCourseOfferingsAsync(null, new PaginationQuery { Page = 1, PageSize = 1 }, ct);
        var item = await db.CourseOfferings.Include(o => o.Course).Include(o => o.Semester).Include(o => o.Lecturer)
            .Where(o => o.Id == offering.Id)
            .Select(o => new CourseOfferingResponse(
                o.Id, o.CourseId, o.Course.Code, o.Course.Name, o.SemesterId, o.Semester.Name,
                o.LecturerId, o.Lecturer.UserName ?? "", o.AcademicYear)).FirstAsync(ct);
        return item;
    }

    public async Task<EnrollmentResponse> EnrollAsync(CreateEnrollmentRequest request, CancellationToken ct = default)
    {
        var enrollment = new Enrollment
        {
            StudentId = request.StudentId,
            CourseOfferingId = request.CourseOfferingId,
            EnrollmentDate = request.EnrollmentDate,
            Status = EnrollmentStatuses.Enrolled
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync(ct);

        var student = await db.Students.FirstAsync(s => s.Id == enrollment.StudentId, ct);
        var offering = await db.CourseOfferings.Include(o => o.Course).FirstAsync(o => o.Id == enrollment.CourseOfferingId, ct);
        return new EnrollmentResponse(enrollment.Id, enrollment.StudentId, $"{student.FirstName} {student.LastName}",
            enrollment.CourseOfferingId, offering.Course.Name, enrollment.EnrollmentDate, enrollment.Status);
    }
}
