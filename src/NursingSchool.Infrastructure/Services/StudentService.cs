using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Infrastructure.Services;

public class StudentService(IApplicationDbContext db, IFileStorageService fileStorage) : IStudentService
{
    public async Task<PagedResult<StudentResponse>> GetAllAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Students.Include(s => s.Program).Include(s => s.Guardians).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(x => x.FirstName.ToLower().Contains(s) || x.LastName.ToLower().Contains(s) || x.StudentNo.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(x => x.LastName).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(ct);
        return new PagedResult<StudentResponse> { Items = items.Select(Map).ToList(), TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<StudentResponse?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var student = await db.Students.Include(s => s.Program).Include(s => s.Guardians).FirstOrDefaultAsync(s => s.Id == id, ct);
        return student == null ? null : Map(student);
    }

    public async Task<StudentResponse> CreateAsync(CreateStudentRequest request, Guid createdBy, CancellationToken ct = default)
    {
        var studentNo = await GenerateStudentNoAsync(ct);
        var student = new Student
        {
            StudentNo = studentNo,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Gender = request.Gender,
            DateOfBirth = request.DateOfBirth,
            Phone = request.Phone,
            Email = request.Email,
            Address = request.Address,
            ProgramId = request.ProgramId,
            AdmissionDate = request.AdmissionDate,
            Status = StudentStatuses.Active,
            CreatedBy = createdBy
        };
        db.Students.Add(student);

        if (request.Guardians != null)
        {
            foreach (var g in request.Guardians)
            {
                db.Guardians.Add(new Guardian
                {
                    StudentId = student.Id,
                    FullName = g.FullName,
                    Relationship = g.Relationship,
                    Phone = g.Phone,
                    Email = g.Email,
                    Address = g.Address,
                    CreatedBy = createdBy
                });
            }
        }

        await db.SaveChangesAsync(ct);
        await db.Programs.FirstAsync(p => p.Id == student.ProgramId, ct);
        return (await GetByIdAsync(student.Id, ct))!;
    }

    public async Task<StudentResponse?> UpdateAsync(Guid id, UpdateStudentRequest request, Guid updatedBy, CancellationToken ct = default)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (student == null) return null;

        student.FirstName = request.FirstName;
        student.LastName = request.LastName;
        student.Gender = request.Gender;
        student.DateOfBirth = request.DateOfBirth;
        student.Phone = request.Phone;
        student.Email = request.Email;
        student.Address = request.Address;
        student.ProgramId = request.ProgramId;
        student.AdmissionDate = request.AdmissionDate;
        student.Status = request.Status;
        student.UpdatedAt = DateTime.UtcNow;
        student.UpdatedBy = updatedBy;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<StudentResponse?> SetProfilePhotoUrlAsync(Guid id, string url, Guid updatedBy, CancellationToken ct = default)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (student == null) return null;
        fileStorage.DeleteIfExists(student.ProfilePhotoUrl);
        student.ProfilePhotoUrl = url;
        student.UpdatedAt = DateTime.UtcNow;
        student.UpdatedBy = updatedBy;
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<StudentResponse?> SetNationalIdFrontUrlAsync(Guid id, string url, Guid updatedBy, CancellationToken ct = default)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (student == null) return null;
        fileStorage.DeleteIfExists(student.NationalIdFrontUrl);
        student.NationalIdFrontUrl = url;
        student.UpdatedAt = DateTime.UtcNow;
        student.UpdatedBy = updatedBy;
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<StudentResponse?> SetNationalIdBackUrlAsync(Guid id, string url, Guid updatedBy, CancellationToken ct = default)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (student == null) return null;
        fileStorage.DeleteIfExists(student.NationalIdBackUrl);
        student.NationalIdBackUrl = url;
        student.UpdatedAt = DateTime.UtcNow;
        student.UpdatedBy = updatedBy;
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    private async Task<string> GenerateStudentNoAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var count = await db.Students.CountAsync(s => s.AdmissionDate.Year == year, ct);
        return $"NS{year}{(count + 1):D4}";
    }

    private static StudentResponse Map(Student s) => new(
        s.Id, s.StudentNo, s.FirstName, s.LastName, s.Gender, s.DateOfBirth,
        s.Phone, s.Email, s.Address, s.ProgramId, s.Program.Name, s.AdmissionDate, s.Status,
        s.Guardians.Select(g => new GuardianResponse(g.Id, g.FullName, g.Relationship, g.Phone, g.Email, g.Address)).ToList(),
        s.ProfilePhotoUrl, s.NationalIdFrontUrl, s.NationalIdBackUrl);
}
