using NursingSchool.Application.Common;
using NursingSchool.Application.DTOs;

namespace NursingSchool.Application.Interfaces;

public interface IStudentService
{
    Task<PagedResult<StudentResponse>> GetAllAsync(PaginationQuery query, CancellationToken ct = default);
    Task<StudentResponse?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<StudentResponse> CreateAsync(CreateStudentRequest request, Guid createdBy, CancellationToken ct = default);
    Task<StudentResponse?> UpdateAsync(Guid id, UpdateStudentRequest request, Guid updatedBy, CancellationToken ct = default);
    Task<StudentResponse?> SetProfilePhotoUrlAsync(Guid id, string url, Guid updatedBy, CancellationToken ct = default);
    Task<StudentResponse?> SetNationalIdFrontUrlAsync(Guid id, string url, Guid updatedBy, CancellationToken ct = default);
    Task<StudentResponse?> SetNationalIdBackUrlAsync(Guid id, string url, Guid updatedBy, CancellationToken ct = default);
}

public interface IAdmissionService
{
    Task<PagedResult<ApplicationResponse>> GetAllAsync(PaginationQuery query, CancellationToken ct = default);
    Task<ApplicationResponse> CreateAsync(CreateApplicationRequest request, CancellationToken ct = default);
    Task<StudentResponse> ApproveAsync(Guid id, ApproveApplicationRequest request, Guid reviewedBy, CancellationToken ct = default);
}

public interface IAcademicService
{
    Task<PagedResult<ProgramResponse>> GetProgramsAsync(PaginationQuery query, CancellationToken ct = default);
    Task<ProgramResponse> CreateProgramAsync(CreateProgramRequest request, CancellationToken ct = default);
    Task<PagedResult<SemesterResponse>> GetSemestersAsync(Guid? programId, PaginationQuery query, CancellationToken ct = default);
    Task<SemesterResponse> CreateSemesterAsync(CreateSemesterRequest request, CancellationToken ct = default);
    Task<PagedResult<CourseResponse>> GetCoursesAsync(PaginationQuery query, CancellationToken ct = default);
    Task<CourseResponse> CreateCourseAsync(CreateCourseRequest request, CancellationToken ct = default);
    Task<PagedResult<CourseOfferingResponse>> GetCourseOfferingsAsync(Guid? semesterId, PaginationQuery query, CancellationToken ct = default);
    Task<CourseOfferingResponse> CreateCourseOfferingAsync(CreateCourseOfferingRequest request, CancellationToken ct = default);
    Task<EnrollmentResponse> EnrollAsync(CreateEnrollmentRequest request, CancellationToken ct = default);
}

public interface IAttendanceService
{
    Task<ClassSessionResponse> CreateSessionAsync(CreateClassSessionRequest request, CancellationToken ct = default);
    Task SubmitAttendanceAsync(Guid sessionId, SubmitAttendanceRequest request, CancellationToken ct = default);
    Task<PagedResult<ClassSessionResponse>> GetSessionsAsync(Guid? courseOfferingId, PaginationQuery query, CancellationToken ct = default);
}

public interface IResultsService
{
    Task<AssessmentComponentResponse> CreateComponentAsync(CreateAssessmentComponentRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<AssessmentComponentResponse>> GetComponentsByOfferingAsync(Guid courseOfferingId, CancellationToken ct = default);
    Task<MarkResponse> SubmitMarkAsync(CreateMarkRequest request, Guid enteredBy, CancellationToken ct = default);
    Task<IReadOnlyList<StudentResultResponse>> GetStudentResultsAsync(Guid studentId, CancellationToken ct = default);
}

public interface IFinanceService
{
    Task<FeeStructureResponse> CreateFeeStructureAsync(CreateFeeStructureRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<FeeStructureResponse>> GetFeeStructuresAsync(CancellationToken ct = default);
    Task<InvoiceResponse> CreateInvoiceAsync(CreateInvoiceRequest request, Guid createdBy, CancellationToken ct = default);
    Task<PagedResult<InvoiceResponse>> GetInvoicesAsync(PaginationQuery query, CancellationToken ct = default);
    Task<InvoiceResponse?> GetInvoiceByIdAsync(Guid id, CancellationToken ct = default);
    Task<PaymentResponse> RecordPaymentAsync(CreatePaymentRequest request, Guid recordedBy, CancellationToken ct = default);
    Task<PagedResult<FeeBalanceReportRow>> GetFeeBalanceReportAsync(Guid? programId, PaginationQuery query, CancellationToken ct = default);
    Task<decimal> GetStudentOutstandingBalanceAsync(Guid studentId, CancellationToken ct = default);
    Task<StudentInvoicePreviewResponse> GetStudentInvoicePreviewAsync(Guid studentId, CancellationToken ct = default);
}

public interface IClinicalService
{
    Task<ClinicalFacilityResponse> CreateFacilityAsync(CreateClinicalFacilityRequest request, CancellationToken ct = default);
    Task<PagedResult<ClinicalFacilityResponse>> GetFacilitiesAsync(PaginationQuery query, CancellationToken ct = default);
    Task<ClinicalSupervisorResponse> CreateSupervisorAsync(CreateClinicalSupervisorRequest request, CancellationToken ct = default);
    Task<ClinicalPlacementResponse> CreatePlacementAsync(CreateClinicalPlacementRequest request, CancellationToken ct = default);
    Task<PagedResult<ClinicalPlacementResponse>> GetPlacementsAsync(Guid? studentId, PaginationQuery query, CancellationToken ct = default);
    Task<ClinicalEvaluationResponse> SubmitEvaluationAsync(CreateClinicalEvaluationRequest request, Guid evaluatorId, CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardSummary> GetSummaryAsync(CancellationToken ct = default);
    Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken ct = default);
    Task<FinanceDashboardDto> GetFinanceDashboardAsync(CancellationToken ct = default);
    Task<StudentDashboardDto> GetStudentDashboardAsync(Guid studentId, CancellationToken ct = default);
    Task<object> GetPublicStatsAsync(CancellationToken ct = default);
}
