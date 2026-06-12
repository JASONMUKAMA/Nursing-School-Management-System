using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NursingSchool.Domain.Entities;
using NursingSchool.Domain.Enums;

namespace NursingSchool.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        await db.Database.MigrateAsync();

        foreach (var roleName in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
                await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
        }

        if (await userManager.FindByNameAsync("admin") == null)
        {
            var admin = new ApplicationUser
            {
                UserName = "admin",
                Email = "admin@nursingschool.local",
                EmailConfirmed = true,
                FirstName = "System",
                LastName = "Administrator",
                IsActive = true
            };
            await userManager.CreateAsync(admin, "Admin@123");
            await userManager.AddToRoleAsync(admin, RoleNames.Admin);
        }

        if (!await db.GradeScales.AnyAsync())
        {
            db.GradeScales.AddRange(
                new GradeScale { MinScore = 70, MaxScore = 100, Grade = "A", Remark = "Excellent" },
                new GradeScale { MinScore = 60, MaxScore = 69.99m, Grade = "B", Remark = "Good" },
                new GradeScale { MinScore = 50, MaxScore = 59.99m, Grade = "C", Remark = "Pass" },
                new GradeScale { MinScore = 40, MaxScore = 49.99m, Grade = "D", Remark = "Weak Pass" },
                new GradeScale { MinScore = 0, MaxScore = 39.99m, Grade = "F", Remark = "Fail" }
            );
            await db.SaveChangesAsync();
        }

        await BulkDataSeeder.SeedAsync(services);
        await BulkDataSeeder.EnsureStudentPortalAccountsAsync(services);
        await BulkDataSeeder.EnsureOnlineExamsAsync(services);
    }
}
