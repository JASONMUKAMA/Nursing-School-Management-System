using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Common;
using NursingSchool.Domain.Entities;
using AdmissionApplication = NursingSchool.Domain.Entities.Application;

namespace NursingSchool.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Student> Students => Set<Student>();
    public DbSet<Guardian> Guardians => Set<Guardian>();
    public DbSet<StudentDocument> StudentDocuments => Set<StudentDocument>();
    public DbSet<AdmissionApplication> Applications => Set<AdmissionApplication>();
    public DbSet<ApplicationDocument> ApplicationDocuments => Set<ApplicationDocument>();
    public DbSet<Program> Programs => Set<Program>();
    public DbSet<Semester> Semesters => Set<Semester>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseOffering> CourseOfferings => Set<CourseOffering>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<ClassSession> ClassSessions => Set<ClassSession>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<AssessmentComponent> AssessmentComponents => Set<AssessmentComponent>();
    public DbSet<Mark> Marks => Set<Mark>();
    public DbSet<GradeScale> GradeScales => Set<GradeScale>();
    public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ClinicalFacility> ClinicalFacilities => Set<ClinicalFacility>();
    public DbSet<ClinicalSupervisor> ClinicalSupervisors => Set<ClinicalSupervisor>();
    public DbSet<ClinicalPlacement> ClinicalPlacements => Set<ClinicalPlacement>();
    public DbSet<ClinicalEvaluation> ClinicalEvaluations => Set<ClinicalEvaluation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SchoolEvent> SchoolEvents => Set<SchoolEvent>();
    public DbSet<AppNotification> AppNotifications => Set<AppNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("Users");
            b.Property(u => u.Id).ValueGeneratedOnAdd();
        });
        modelBuilder.Entity<IdentityRole<Guid>>().ToTable("Roles");
        modelBuilder.Entity<IdentityUserRole<Guid>>().ToTable("UserRoles");
        modelBuilder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        modelBuilder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        modelBuilder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
        modelBuilder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");

        modelBuilder.Entity<Student>().HasIndex(x => x.StudentNo).IsUnique();
        modelBuilder.Entity<AdmissionApplication>().HasIndex(x => x.ApplicationNo).IsUnique();
        modelBuilder.Entity<Program>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Course>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(x => x.InvoiceNo).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(x => x.ReceiptNo).IsUnique();

        modelBuilder.Entity<Student>()
            .HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Guardian>()
            .HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<AdmissionApplication>()
            .HasOne(x => x.Reviewer).WithMany().HasForeignKey(x => x.ReviewedBy).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Mark>()
            .HasOne(x => x.EnteredByUser).WithMany().HasForeignKey(x => x.EnteredBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Payment>()
            .HasOne(x => x.RecordedByUser).WithMany().HasForeignKey(x => x.RecordedBy).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ClinicalEvaluation>()
            .HasOne(x => x.Evaluator).WithMany().HasForeignKey(x => x.EvaluatorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CourseOffering>()
            .HasOne(x => x.Lecturer).WithMany(x => x.CourseOfferings).HasForeignKey(x => x.LecturerId).OnDelete(DeleteBehavior.Restrict);

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(AuditableEntity).IsAssignableFrom(entity.ClrType))
            {
                modelBuilder.Entity(entity.ClrType)
                    .HasQueryFilter(CreateSoftDeleteFilter(entity.ClrType));
            }
        }
    }

    private static System.Linq.Expressions.LambdaExpression CreateSoftDeleteFilter(Type type)
    {
        var param = System.Linq.Expressions.Expression.Parameter(type, "e");
        var prop = System.Linq.Expressions.Expression.Property(param, nameof(AuditableEntity.IsDeleted));
        var body = System.Linq.Expressions.Expression.Equal(prop, System.Linq.Expressions.Expression.Constant(false));
        return System.Linq.Expressions.Expression.Lambda(body, param);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
