using Microsoft.EntityFrameworkCore;
using NursingSchool.Application.Interfaces;
using NursingSchool.Domain.Entities;

namespace NursingSchool.Infrastructure.Services;

public static class StudentAccountResolver
{
    /// <summary>
    /// Resolves the student record for a portal user. Handles the legacy demo login "student"
    /// by mapping it to the same profile as student1.
    /// </summary>
    public static async Task<Guid?> ResolveStudentIdAsync(
        IApplicationDbContext db,
        Guid userId,
        string? userName = null,
        CancellationToken ct = default)
    {
        var direct = await db.Students
            .Where(s => s.UserId == userId)
            .Select(s => (Guid?)s.Id)
            .FirstOrDefaultAsync(ct);
        if (direct != null) return direct;

        userName ??= await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.UserName)
            .FirstOrDefaultAsync(ct);

        if (string.Equals(userName, "student", StringComparison.OrdinalIgnoreCase))
        {
            return await db.Students
                .Where(s => s.UserId != null)
                .Join(
                    db.Users.Where(u => u.UserName == "student1"),
                    s => s.UserId!.Value,
                    u => u.Id,
                    (s, _) => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct);
        }

        return null;
    }

    public static Task<Guid?> ResolveStudentIdAsync(
        IApplicationDbContext db,
        ApplicationUser user,
        CancellationToken ct = default) =>
        ResolveStudentIdAsync(db, user.Id, user.UserName, ct);
}
