using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;

namespace NursingSchool.Application.Interfaces;

public interface IAnalyticsService
{
    Task<AnalyticsChartsDto> GetChartsAsync(CancellationToken ct = default);
}

public interface IMlAnalyticsService
{
    Task TrainModelsAsync(CancellationToken ct = default);
    Task<MlInsightsDto> GetInsightsAsync(CancellationToken ct = default);
    Task<PagedResult<StudentRiskRow>> GetAtRiskStudentsAsync(PaginationQuery query, CancellationToken ct = default);
}
