using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Services;

public class FinanceService(IApplicationDbContext db) : IFinanceService
{
    public async Task<FeeStructureResponse> CreateFeeStructureAsync(CreateFeeStructureRequest request, CancellationToken ct = default)
    {
        var fee = new FeeStructure
        {
            ProgramId = request.ProgramId,
            AcademicYear = request.AcademicYear,
            FeeName = request.FeeName,
            Amount = request.Amount
        };
        db.FeeStructures.Add(fee);
        await db.SaveChangesAsync(ct);
        var program = await db.Programs.FirstAsync(p => p.Id == fee.ProgramId, ct);
        return new FeeStructureResponse(fee.Id, fee.ProgramId, program.Name, fee.AcademicYear, fee.FeeName, fee.Amount);
    }

    public async Task<IReadOnlyList<FeeStructureResponse>> GetFeeStructuresAsync(CancellationToken ct = default) =>
        await db.FeeStructures.Include(f => f.Program)
            .Select(f => new FeeStructureResponse(f.Id, f.ProgramId, f.Program.Name, f.AcademicYear, f.FeeName, f.Amount))
            .ToListAsync(ct);

    public async Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request, Guid createdBy, CancellationToken ct = default)
    {
        ValidateCreateInvoice(request);

        var count = await db.Invoices.CountAsync(ct);
        var invoice = new Invoice
        {
            StudentId = request.StudentId,
            InvoiceNo = $"INV{DateTime.UtcNow:yyyyMMdd}{(count + 1):D4}",
            AcademicYear = request.AcademicYear,
            SemesterId = request.SemesterId,
            TotalAmount = request.Items.Sum(i => i.Amount),
            Status = InvoiceStatuses.Unpaid,
            IssuedAt = DateTime.UtcNow,
            DueDate = request.DueDate,
            CreatedBy = createdBy
        };
        db.Invoices.Add(invoice);
        foreach (var item in request.Items)
        {
            db.InvoiceItems.Add(new InvoiceItem
            {
                InvoiceId = invoice.Id,
                Description = item.Description,
                Amount = item.Amount,
                CreatedBy = createdBy
            });
        }
        await db.SaveChangesAsync(ct);
        return (await MapInvoiceAsync(invoice.Id, ct))!;
    }

    public async Task<PagedResult<InvoiceResponse>> GetInvoicesAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Invoices.Include(i => i.Student).Include(i => i.Items).Include(i => i.Payments).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(i => i.InvoiceNo.ToLower().Contains(s)
                || i.Student.FirstName.ToLower().Contains(s)
                || i.Student.LastName.ToLower().Contains(s)
                || i.Student.StudentNo.ToLower().Contains(s));
        }
        var total = await q.CountAsync(ct);
        var ids = await q.OrderByDescending(i => i.IssuedAt).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).Select(i => i.Id).ToListAsync(ct);
        var items = new List<InvoiceResponse>();
        foreach (var id in ids) items.Add((await MapInvoiceAsync(id, ct))!);
        return new PagedResult<InvoiceResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    public Task<InvoiceResponse?> GetInvoiceByIdAsync(Guid id, CancellationToken ct = default) =>
        MapInvoiceAsync(id, ct);

    public async Task<PaymentResponse> RecordPaymentAsync(CreatePaymentRequest request, Guid recordedBy, CancellationToken ct = default)
    {
        var invoice = await db.Invoices.Include(i => i.Payments).FirstAsync(i => i.Id == request.InvoiceId, ct);
        var count = await db.Payments.CountAsync(ct);
        var payment = new Payment
        {
            InvoiceId = request.InvoiceId,
            ReceiptNo = $"RCP{DateTime.UtcNow:yyyyMMdd}{(count + 1):D4}",
            Amount = request.Amount,
            PaymentMethod = request.PaymentMethod,
            PaymentDate = request.PaymentDate,
            RecordedBy = recordedBy,
            CreatedBy = recordedBy
        };
        db.Payments.Add(payment);
        invoice.Payments.Add(payment);
        invoice.Status = InvoiceCalculator.GetStatus(invoice);
        await db.SaveChangesAsync(ct);
        return new PaymentResponse(payment.Id, payment.ReceiptNo, payment.InvoiceId, payment.Amount, payment.PaymentMethod, payment.PaymentDate);
    }

    public async Task<PagedResult<FeeBalanceReportRow>> GetFeeBalanceReportAsync(Guid? programId, PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Students
            .Include(s => s.Program)
            .Include(s => s.Invoices).ThenInclude(i => i.Payments)
            .AsQueryable();
        if (programId.HasValue) q = q.Where(s => s.ProgramId == programId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(x => x.FirstName.ToLower().Contains(s) || x.LastName.ToLower().Contains(s) || x.StudentNo.ToLower().Contains(s));
        }

        var candidates = await q
            .Where(s => s.Invoices.Count > 0)
            .ToListAsync(ct);

        var rows = candidates
            .Select(s =>
            {
                var totalInvoiced = s.Invoices.Sum(i => i.TotalAmount);
                var totalPaid = s.Invoices.SelectMany(i => i.Payments).Sum(p => p.Amount);
                var balance = s.Invoices.Sum(InvoiceCalculator.GetBalance);
                var feeStatus = balance <= 0 ? "Paid" :
                    s.Invoices.Any(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue) ? "Overdue" : "Due";
                var nextDue = s.Invoices
                    .Where(i => InvoiceCalculator.GetBalance(i) > 0 && i.DueDate.HasValue)
                    .Select(i => i.DueDate!.Value)
                    .OrderBy(d => d)
                    .Cast<DateOnly?>()
                    .FirstOrDefault();
                var lastPayment = s.Invoices
                    .SelectMany(i => i.Payments)
                    .Select(p => p.PaymentDate)
                    .OrderByDescending(d => d)
                    .Cast<DateOnly?>()
                    .FirstOrDefault();
                return new FeeBalanceReportRow(
                    s.Id, s.StudentNo, $"{s.FirstName} {s.LastName}", s.Program.Name,
                    totalInvoiced, totalPaid, balance, feeStatus, nextDue, lastPayment);
            })
            .Where(x => x.Balance > 0 || x.TotalInvoiced > 0)
            .OrderByDescending(x => x.Balance)
            .ToList();

        var total = rows.Count;
        var page = rows
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToList();

        return new PagedResult<FeeBalanceReportRow>
        {
            Items = page,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<StudentInvoicePreviewResponse> GetStudentInvoicePreviewAsync(Guid studentId, CancellationToken ct = default)
    {
        var student = await db.Students.Include(s => s.Program).FirstAsync(s => s.Id == studentId, ct);
        var invoices = await db.Invoices.Include(i => i.Payments).Where(i => i.StudentId == studentId).ToListAsync(ct);
        var balance = invoices.Sum(InvoiceCalculator.GetBalance);
        var feeStatus = balance <= 0 ? "Paid" :
            invoices.Any(i => InvoiceCalculator.GetStatus(i) == InvoiceStatuses.Overdue) ? "Overdue" : "Due";
        var nextDue = invoices
            .Where(i => InvoiceCalculator.GetBalance(i) > 0 && i.DueDate.HasValue)
            .Select(i => i.DueDate!.Value)
            .OrderBy(d => d)
            .Cast<DateOnly?>()
            .FirstOrDefault();
        var lastPayment = invoices
            .SelectMany(i => i.Payments)
            .Select(p => p.PaymentDate)
            .OrderByDescending(d => d)
            .Cast<DateOnly?>()
            .FirstOrDefault();

        const string defaultYear = "2025/2026";
        var latestInvoice = invoices.OrderByDescending(i => i.IssuedAt).FirstOrDefault();
        var academicYear = latestInvoice?.AcademicYear ?? defaultYear;

        var feeStructuresAll = await db.FeeStructures
            .Where(f => f.ProgramId == student.ProgramId)
            .ToListAsync(ct);
        var yearPrefix = academicYear.Length >= 4 ? academicYear[..4] : academicYear;
        var feeStructures = feeStructuresAll
            .Where(f => f.AcademicYear == academicYear || f.AcademicYear.StartsWith(yearPrefix))
            .ToList();
        var suggestedAmount = feeStructures.Sum(f => f.Amount);
        if (suggestedAmount < 100_000m && latestInvoice != null)
            suggestedAmount = latestInvoice.TotalAmount;
        if (suggestedAmount < 100_000m)
            suggestedAmount = 100_000m;

        return new StudentInvoicePreviewResponse(
            student.Id, $"{student.FirstName} {student.LastName}", student.Program.Name,
            balance, feeStatus, suggestedAmount, academicYear, nextDue, lastPayment);
    }

    public async Task<decimal> GetStudentOutstandingBalanceAsync(Guid studentId, CancellationToken ct = default)
    {
        var invoices = await db.Invoices
            .Include(i => i.Payments)
            .Where(i => i.StudentId == studentId)
            .ToListAsync(ct);
        return invoices.Sum(InvoiceCalculator.GetBalance);
    }

    private static void ValidateCreateInvoice(CreateInvoiceRequest request)
    {
        if (request.StudentId == Guid.Empty)
            throw new InvalidOperationException("Student is required.");

        if (request.DueDate == default)
            throw new InvalidOperationException("Due date is required.");

        if (request.Items is null || request.Items.Count == 0)
            throw new InvalidOperationException("At least one invoice item is required.");

        var total = request.Items.Sum(i => i.Amount);
        if (total < 100_000m)
            throw new InvalidOperationException("Invoice amount must be at least UGX 100,000.");

        if (request.Items.Any(i => string.IsNullOrWhiteSpace(i.Description)))
            throw new InvalidOperationException("Each invoice item must have a description.");
    }

    private async Task<InvoiceResponse?> MapInvoiceAsync(Guid id, CancellationToken ct)
    {
        var invoice = await db.Invoices.Include(i => i.Student).Include(i => i.Items).Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
        if (invoice == null) return null;
        var balance = InvoiceCalculator.GetBalance(invoice);
        var status = InvoiceCalculator.GetStatus(invoice);
        var amountPaid = invoice.TotalAmount - balance;
        var lastPayment = invoice.Payments
            .Select(p => p.PaymentDate)
            .OrderByDescending(d => d)
            .Cast<DateOnly?>()
            .FirstOrDefault();
        return new InvoiceResponse(
            invoice.Id, invoice.InvoiceNo, invoice.StudentId,
            $"{invoice.Student.FirstName} {invoice.Student.LastName}",
            invoice.AcademicYear, invoice.TotalAmount, amountPaid, balance, status,
            invoice.IssuedAt, invoice.DueDate, lastPayment,
            invoice.Items.Select(i => new InvoiceItemResponse(i.Id, i.Description, i.Amount)).ToList());
    }
}
