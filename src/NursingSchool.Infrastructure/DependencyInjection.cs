using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;
using NursingSchool.Infrastructure.Auth;
using NursingSchool.Infrastructure.Data;
using NursingSchool.Infrastructure.Email;
using NursingSchool.ML;
using NursingSchool.Infrastructure.Gateways;
using NursingSchool.Infrastructure.HostedServices;
using NursingSchool.Infrastructure.Services;

namespace NursingSchool.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
        services.Configure<EmailSettings>(configuration.GetSection(EmailSettings.SectionName));
        services.AddSingleton<JwtTokenService>();

        var emailHost = configuration[$"{EmailSettings.SectionName}:SmtpServer"]
            ?? configuration[$"{EmailSettings.SectionName}:Host"];
        if (string.IsNullOrWhiteSpace(emailHost))
            services.AddSingleton<IEmailSender, LoggingEmailSender>();
        else
            services.AddSingleton<IEmailSender, SmtpEmailSender>();

        services.AddSingleton<IEventCalendarNotifier, EventCalendarNotifier>();
        services.AddScoped<EventInvitationWorker>();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireUppercase = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.SignIn.RequireConfirmedAccount = false;
                options.Tokens.AuthenticatorTokenProvider = TokenOptions.DefaultAuthenticatorProvider;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddScoped<IAuthService, IdentityAuthService>();
        services.AddScoped<ILoginActivityService, LoginActivityService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<IAdmissionService, AdmissionService>();
        services.AddScoped<IAcademicService, AcademicService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IResultsService, ResultsService>();
        services.AddScoped<IClassroomService, ClassroomService>();
        services.AddScoped<IComplaintsService, ComplaintsService>();
        services.AddScoped<IOnlineExamsService, OnlineExamsService>();
        services.AddHttpClient<JpesaGateway>();
        services.AddScoped<IFinanceService, FinanceService>();
        services.AddScoped<IClinicalService, ClinicalService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<NotificationDigestService>();
        services.AddScoped<IFileStorageService, FileStorageService>();
        services.AddScoped<IEventService, EventService>();
        services.AddSingleton<MlAnalyticsEngine>();
        services.AddScoped<IMlAnalyticsService, MlAnalyticsService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddHostedService<MlTrainingHostedService>();

        return services;
    }

    public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyNames.ManageUsers, p => p.RequireRole(RoleNames.Admin));
            options.AddPolicy(PolicyNames.ManageRoles, p => p.RequireRole(RoleNames.Admin));
            options.AddPolicy(PolicyNames.ManageStudents, p => p.RequireRole(RoleNames.Admin, RoleNames.Registrar));
            options.AddPolicy(PolicyNames.ManageFinance, p => p.RequireRole(RoleNames.Admin, RoleNames.FinanceOfficer));
            options.AddPolicy(PolicyNames.ManageAcademic, p => p.RequireRole(RoleNames.Admin, RoleNames.Registrar, RoleNames.Lecturer));
            options.AddPolicy(PolicyNames.ManageClinical, p => p.RequireRole(RoleNames.Admin, RoleNames.ClinicalCoordinator));
            options.AddPolicy(PolicyNames.ViewReports, p => p.RequireRole(RoleNames.Admin, RoleNames.FinanceOfficer, RoleNames.Registrar, RoleNames.Lecturer));
            options.AddPolicy(PolicyNames.EnterMarks, p => p.RequireRole(RoleNames.Admin, RoleNames.Lecturer));
        });
        return services;
    }
}
