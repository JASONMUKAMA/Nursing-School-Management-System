using Microsoft.ML;
using Microsoft.ML.Data;
using NursingSchool.ML.Models;

namespace NursingSchool.ML;

public class MlAnalyticsEngine
{
    private readonly MLContext _ml = new(seed: 42);
    private ITransformer? _feeModel;
    private ITransformer? _academicModel;
    private double _feeAccuracy;
    private double _academicAccuracy;

    public bool IsTrained => _feeModel != null && _academicModel != null;
    public double FeeModelAccuracy => _feeAccuracy;
    public double AcademicModelAccuracy => _academicAccuracy;

    public void TrainFeeModel(IReadOnlyList<FeeRiskInput> data)
    {
        if (data.Count < 20) return;
        var split = _ml.Data.TrainTestSplit(_ml.Data.LoadFromEnumerable(data), testFraction: 0.2);
        var pipeline = _ml.Transforms.Concatenate("Features", nameof(FeeRiskInput.BalanceRatio), nameof(FeeRiskInput.PaymentCount), nameof(FeeRiskInput.DaysEnrolled), nameof(FeeRiskInput.InvoiceCount))
            .Append(_ml.BinaryClassification.Trainers.FastTree(numberOfLeaves: 20, numberOfTrees: 100));
        _feeModel = pipeline.Fit(split.TrainSet);
        var predictions = _feeModel.Transform(split.TestSet);
        var metrics = _ml.BinaryClassification.Evaluate(predictions);
        _feeAccuracy = metrics.Accuracy;
    }

    public void TrainAcademicModel(IReadOnlyList<AcademicRiskInput> data)
    {
        if (data.Count < 20) return;
        var split = _ml.Data.TrainTestSplit(_ml.Data.LoadFromEnumerable(data), testFraction: 0.2);
        var pipeline = _ml.Transforms.Concatenate("Features", nameof(AcademicRiskInput.AverageMark), nameof(AcademicRiskInput.AttendanceRate), nameof(AcademicRiskInput.CoursesEnrolled))
            .Append(_ml.BinaryClassification.Trainers.FastTree(numberOfLeaves: 20, numberOfTrees: 100));
        _academicModel = pipeline.Fit(split.TrainSet);
        var predictions = _academicModel.Transform(split.TestSet);
        var metrics = _ml.BinaryClassification.Evaluate(predictions);
        _academicAccuracy = metrics.Accuracy;
    }

    public (bool AtRisk, float Probability) PredictFeeRisk(FeeRiskInput input)
    {
        if (_feeModel == null) return (input.BalanceRatio > 0.5f, input.BalanceRatio);
        var engine = _ml.Model.CreatePredictionEngine<FeeRiskInput, FeeRiskPrediction>(_feeModel);
        var result = engine.Predict(input);
        return (result.IsAtRisk, result.Probability);
    }

    public (bool AtRisk, float Probability) PredictAcademicRisk(AcademicRiskInput input)
    {
        if (_academicModel == null) return (input.AverageMark < 50 || input.AttendanceRate < 75, 0.5f);
        var engine = _ml.Model.CreatePredictionEngine<AcademicRiskInput, AcademicRiskPrediction>(_academicModel);
        var result = engine.Predict(input);
        return (result.IsAtRisk, result.Probability);
    }
}
