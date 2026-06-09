using Microsoft.EntityFrameworkCore;
using NursingSchool.Domain.Entities;
using AdmissionApplication = NursingSchool.Domain.Entities.Application;

namespace NursingSchool.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<ApplicationUser> Users { get; }
    DbSet<Student> Students { get; }
    DbSet<Guardian> Guardians { get; }
    DbSet<StudentDocument> StudentDocuments { get; }
    DbSet<AdmissionApplication> Applications { get; }
    DbSet<ApplicationDocument> ApplicationDocuments { get; }
    DbSet<Program> Programs { get; }
    DbSet<Semester> Semesters { get; }
    DbSet<Course> Courses { get; }
    DbSet<CourseOffering> CourseOfferings { get; }
    DbSet<Enrollment> Enrollments { get; }
    DbSet<ClassSession> ClassSessions { get; }
    DbSet<AttendanceRecord> AttendanceRecords { get; }
    DbSet<AssessmentComponent> AssessmentComponents { get; }
    DbSet<Mark> Marks { get; }
    DbSet<GradeScale> GradeScales { get; }
    DbSet<FeeStructure> FeeStructures { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<Payment> Payments { get; }
    DbSet<PaymentGatewayTransaction> PaymentGatewayTransactions { get; }
    DbSet<ClinicalFacility> ClinicalFacilities { get; }
    DbSet<ClinicalSupervisor> ClinicalSupervisors { get; }
    DbSet<ClinicalPlacement> ClinicalPlacements { get; }
    DbSet<ClinicalEvaluation> ClinicalEvaluations { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<LoginActivity> LoginActivities { get; }
    DbSet<SchoolEvent> SchoolEvents { get; }
    DbSet<AppNotification> AppNotifications { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
