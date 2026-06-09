using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;
using NursingSchool.Domain.Entities;

namespace NursingSchool.Application.Interfaces;

public interface ILoginActivityService
{
    Task RecordLoginAsync(ApplicationUser user, IReadOnlyList<string> roles, LoginClientInfo? client, CancellationToken ct = default);
    Task<PagedResult<LoginActivityResponse>> GetLoginActivitiesAsync(PaginationQuery query, CancellationToken ct = default);
}
