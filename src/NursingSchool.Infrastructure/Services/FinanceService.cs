using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Application.Helpers;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Gateways;

namespace NursingSchool.Infrastructure.Services;

public partial class FinanceService(IApplicationDbContext db, JpesaGateway jpesaGateway) : IFinanceService
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
        ValidatePaymentRequest(request);

        var invoice = await db.Invoices
            .Include(i => i.Payments)
            .Include(i => i.Student)
            .FirstAsync(i => i.Id == request.InvoiceId, ct);

        if (request.Amount <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");

        var balance = InvoiceCalculator.GetBalance(invoice);
        if (request.Amount > balance)
            throw new InvalidOperationException($"Payment exceeds invoice balance of UGX {balance:N0}.");

        var count = await db.Payments.CountAsync(ct);
        var payment = new Payment
        {
            InvoiceId = request.InvoiceId,
            ReceiptNo = $"RCP{DateTime.UtcNow:yyyyMMdd}{(count + 1):D4}",
            Amount = request.Amount,
            PaymentMethod = request.PaymentMethod,
            PaymentDate = request.PaymentDate,
            TransactionReference = string.IsNullOrWhiteSpace(request.TransactionReference) ? null : request.TransactionReference.Trim(),
            PayerPhone = string.IsNullOrWhiteSpace(request.PayerPhone) ? null : request.PayerPhone.Trim(),
            CardLastFour = string.IsNullOrWhiteSpace(request.CardLastFour) ? null : request.CardLastFour.Trim(),
            BankReceiptNo = string.IsNullOrWhiteSpace(request.BankReceiptNo) ? null : request.BankReceiptNo.Trim(),
            PaymentSource = PaymentSources.Manual,
            RecordedBy = recordedBy,
            CreatedBy = recordedBy
        };
        db.Payments.Add(payment);
        invoice.Payments.Add(payment);
        invoice.Status = InvoiceCalculator.GetStatus(invoice);
        await db.SaveChangesAsync(ct);
        return MapPayment(payment, invoice.InvoiceNo, $"{invoice.Student.FirstName} {invoice.Student.LastName}");
    }

    public async Task<PagedResult<PaymentResponse>> GetPaymentsAsync(string? paymentMethod, PaginationQuery query, CancellationToken ct = default)
    {
        var q = db.Payments
            .Include(p => p.Invoice).ThenInclude(i => i.Student)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(paymentMethod))
            q = q.Where(p => p.PaymentMethod == paymentMethod);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(p =>
                p.ReceiptNo.ToLower().Contains(s)
                || p.Invoice.InvoiceNo.ToLower().Contains(s)
                || p.Invoice.Student.FirstName.ToLower().Contains(s)
                || p.Invoice.Student.LastName.ToLower().Contains(s)
                || (p.TransactionReference != null && p.TransactionReference.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var rows = await q
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);
        var items = rows
            .Select(p => MapPayment(
                p,
                p.Invoice.InvoiceNo,
                $"{p.Invoice.Student.FirstName} {p.Invoice.Student.LastName}"))
            .ToList();

        return new PagedResult<PaymentResponse> { Items = items, TotalCount = total, Page = query.Page, PageSize = query.PageSize };
    }

    private static void ValidatePaymentRequest(CreatePaymentRequest request)
    {
        if (!PaymentMethods.All.Contains(request.PaymentMethod))
            throw new InvalidOperationException($"Invalid payment method. Allowed: {string.Join(", ", PaymentMethods.All)}.");

        if (request.PaymentMethod is PaymentMethods.AirtelMoney or PaymentMethods.MtnMobileMoney)
        {
            if (string.IsNullOrWhiteSpace(request.PayerPhone))
                throw new InvalidOperationException($"{request.PaymentMethod} phone number is required.");
            if (string.IsNullOrWhiteSpace(request.TransactionReference))
                throw new InvalidOperationException($"{request.PaymentMethod} transaction ID is required.");
        }

        if (request.PaymentMethod == PaymentMethods.VisaCard)
        {
            if (string.IsNullOrWhiteSpace(request.TransactionReference))
                throw new InvalidOperationException("Visa authorization / reference number is required.");
            if (!string.IsNullOrWhiteSpace(request.CardLastFour) && request.CardLastFour.Trim().Length != 4)
                throw new InvalidOperationException("Card last four digits must be exactly 4 characters.");
        }

        if (request.PaymentMethod == PaymentMethods.BankTransfer)
        {
            if (string.IsNullOrWhiteSpace(request.BankReceiptNo) && string.IsNullOrWhiteSpace(request.TransactionReference))
                throw new InvalidOperationException("Bank receipt number or transaction reference is required.");
        }
    }

    private static PaymentResponse MapPayment(Payment payment, string invoiceNo, string studentName) =>
        new(
            payment.Id,
            payment.ReceiptNo,
            payment.InvoiceId,
            invoiceNo,
            studentName,
            payment.Amount,
            payment.PaymentMethod,
            payment.PaymentDate,
            payment.PaymentSource,
            payment.TransactionReference,
            payment.PayerPhone,
            payment.CardLastFour,
            payment.BankReceiptNo,
            payment.ProviderReference);

    public async Task<PagedResult<FeeBalanceReportRow>> GetFeeBalanceReportAsync(Guid? programId, FeeBalanceReportQuery query, CancellationToken ct = default)
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
            .Where(x => x.Balance > 0 || x.TotalInvoiced > 0);

        if (!string.IsNullOrWhiteSpace(query.FeeStatus))
        {
            var status = query.FeeStatus.Trim();
            rows = rows.Where(x => x.FeeStatus.Equals(status, StringComparison.OrdinalIgnoreCase));
        }

        var sortedRows = ApplyFeeBalanceSort(rows, query.SortBy, query.SortDir).ToList();

        var total = sortedRows.Count;
        var page = sortedRows
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

    private static IEnumerable<FeeBalanceReportRow> ApplyFeeBalanceSort(
        IEnumerable<FeeBalanceReportRow> rows, string? sortBy, string? sortDir)
    {
        var desc = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        return (sortBy ?? "balance").ToLowerInvariant() switch
        {
            "studentname" or "name" => desc
                ? rows.OrderByDescending(x => x.StudentName, StringComparer.OrdinalIgnoreCase)
                : rows.OrderBy(x => x.StudentName, StringComparer.OrdinalIgnoreCase),
            "studentno" => desc
                ? rows.OrderByDescending(x => x.StudentNo, StringComparer.OrdinalIgnoreCase)
                : rows.OrderBy(x => x.StudentNo, StringComparer.OrdinalIgnoreCase),
            "program" or "programname" => desc
                ? rows.OrderByDescending(x => x.ProgramName, StringComparer.OrdinalIgnoreCase)
                : rows.OrderBy(x => x.ProgramName, StringComparer.OrdinalIgnoreCase),
            "invoiced" or "totalinvoiced" => desc
                ? rows.OrderByDescending(x => x.TotalInvoiced)
                : rows.OrderBy(x => x.TotalInvoiced),
            "paid" or "totalpaid" => desc
                ? rows.OrderByDescending(x => x.TotalPaid)
                : rows.OrderBy(x => x.TotalPaid),
            "status" or "feestatus" => desc
                ? rows.OrderByDescending(x => x.FeeStatus, StringComparer.OrdinalIgnoreCase)
                : rows.OrderBy(x => x.FeeStatus, StringComparer.OrdinalIgnoreCase),
            "nextdue" or "nextduedate" => desc
                ? rows.OrderByDescending(x => x.NextDueDate ?? DateOnly.MinValue)
                : rows.OrderBy(x => x.NextDueDate ?? DateOnly.MaxValue),
            "lastpayment" or "lastpaymentdate" => desc
                ? rows.OrderByDescending(x => x.LastPaymentDate ?? DateOnly.MinValue)
                : rows.OrderBy(x => x.LastPaymentDate ?? DateOnly.MaxValue),
            _ => desc
                ? rows.OrderByDescending(x => x.Balance)
                : rows.OrderBy(x => x.Balance),
        };
    }
}
