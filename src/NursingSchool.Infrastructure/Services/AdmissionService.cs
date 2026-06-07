using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using AdmissionApplication = NursingSchool.Domain.Entities.Application;

namespace NursingSchool.Infrastructure.Services;

public class AdmissionService(IApplicationDbContext db, UserManager<ApplicationUser> userManager) : IAdmissionService
{
    public async Task<PagedResult<ApplicationResponse>> GetAllAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Applications.Include(a => a.Program).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(x => x.FirstName.ToLower().Contains(s) || x.LastName.ToLower().Contains(s) || x.ApplicationNo.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(x => x.SubmittedAt).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(ct);
        return new PagedResult<ApplicationResponse> { Items = items.Select(Map).ToList(), TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public async Task<ApplicationResponse> CreateAsync(CreateApplicationRequest request, CancellationToken ct = default)
    {
        var count = await db.Applications.CountAsync(ct);
        var app = new AdmissionApplication
        {
            ApplicationNo = $"APP{DateTime.UtcNow:yyyyMM}{(count + 1):D4}",
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            ProgramId = request.ProgramId,
            Status = ApplicationStatuses.Pending,
            SubmittedAt = DateTime.UtcNow
        };
        db.Applications.Add(app);
        await db.SaveChangesAsync(ct);
        await db.Programs.FirstAsync(p => p.Id == app.ProgramId, ct);
        return Map(app);
    }

    public async Task<StudentResponse> ApproveAsync(Guid id, ApproveApplicationRequest request, Guid reviewedBy, CancellationToken ct = default)
    {
        var app = await db.Applications.Include(a => a.Program).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException("Application not found.");
        if (app.Status != ApplicationStatuses.Pending)
            throw new InvalidOperationException("Application already reviewed.");

        var year = DateTime.UtcNow.Year;
        var count = await db.Students.CountAsync(s => s.AdmissionDate.Year == year, ct);
        var studentNo = $"NS{year}{(count + 1):D4}";

        Guid? userId = null;
        if (request.CreateUserAccount)
        {
            var password = request.Password ?? "Student@123";
            var user = new ApplicationUser
            {
                UserName = app.Email,
                Email = app.Email,
                EmailConfirmed = true,
                FirstName = app.FirstName,
                LastName = app.LastName
            };
            await userManager.CreateAsync(user, password);
            await userManager.AddToRoleAsync(user, RoleNames.Student);
            userId = user.Id;
        }

        var student = new Student
        {
            StudentNo = studentNo,
            UserId = userId,
            FirstName = app.FirstName,
            LastName = app.LastName,
            Gender = "Unknown",
            DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-20)),
            Phone = app.Phone,
            Email = app.Email,
            Address = "",
            ProgramId = app.ProgramId,
            AdmissionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = StudentStatuses.Active,
            CreatedBy = reviewedBy
        };
        db.Students.Add(student);

        var feeStructures = await db.FeeStructures
            .Where(f => f.ProgramId == app.ProgramId)
            .ToListAsync(ct);
        if (feeStructures.Count > 0)
        {
            var invoiceNo = $"INV{DateTime.UtcNow:yyyyMMdd}{count + 1:D4}";
            var invoice = new Invoice
            {
                StudentId = student.Id,
                InvoiceNo = invoiceNo,
                AcademicYear = DateTime.UtcNow.Year.ToString(),
                TotalAmount = feeStructures.Sum(f => f.Amount),
                Status = InvoiceStatuses.Unpaid,
                IssuedAt = DateTime.UtcNow,
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)),
                CreatedBy = reviewedBy
            };
            db.Invoices.Add(invoice);
            foreach (var fee in feeStructures)
            {
                db.InvoiceItems.Add(new InvoiceItem
                {
                    InvoiceId = invoice.Id,
                    Description = fee.FeeName,
                    Amount = fee.Amount,
                    CreatedBy = reviewedBy
                });
            }
        }

        app.Status = ApplicationStatuses.Approved;
        app.ReviewedBy = reviewedBy;
        app.ReviewedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        var guardians = await db.Guardians.Where(g => g.StudentId == student.Id).ToListAsync(ct);
        return new StudentResponse(
            student.Id, student.StudentNo, student.FirstName, student.LastName, student.Gender,
            student.DateOfBirth, student.Phone, student.Email, student.Address,
            student.ProgramId, app.Program.Name, student.AdmissionDate, student.Status,
            guardians.Select(g => new GuardianResponse(g.Id, g.FullName, g.Relationship, g.Phone, g.Email, g.Address)).ToList());
    }

    private static ApplicationResponse Map(AdmissionApplication a) => new(
        a.Id, a.ApplicationNo, a.FirstName, a.LastName, a.Email, a.Phone,
        a.ProgramId, a.Program.Name, a.Status, a.SubmittedAt, a.ReviewedAt);
}
