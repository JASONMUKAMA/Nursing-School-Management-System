using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NursingSchool.Application.Interfaces;

namespace NursingSchool.Infrastructure.HostedServices;

public class MlTrainingHostedService(IServiceScopeFactory scopeFactory, ILogger<MlTrainingHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(3000, cancellationToken);
                using var scope = scopeFactory.CreateScope();
                var ml = scope.ServiceProvider.GetRequiredService<IMlAnalyticsService>();
                await ml.TrainModelsAsync(cancellationToken);
                logger.LogInformation("ML.NET analytics models trained successfully.");
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "ML model training skipped or failed.");
            }
        }, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
