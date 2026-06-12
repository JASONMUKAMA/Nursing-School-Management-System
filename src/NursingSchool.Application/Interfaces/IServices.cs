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
    Task<InitiateMobileMoneyPaymentResponse> InitiateMobileMoneyPaymentAsync(InitiateMobileMoneyPaymentRequest request, Guid initiatedBy, CancellationToken ct = default);
    Task<GatewayTransactionResponse?> GetGatewayTransactionAsync(Guid id, CancellationToken ct = default);
    Task<object> ProcessJpesaCallbackAsync(string body, CancellationToken ct = default);
    Task<PagedResult<PaymentResponse>> GetPaymentsAsync(string? paymentMethod, PaginationQuery query, CancellationToken ct = default);
    Task<PagedResult<FeeBalanceReportRow>> GetFeeBalanceReportAsync(Guid? programId, FeeBalanceReportQuery query, CancellationToken ct = default);
    Task<decimal> GetStudentOutstandingBalanceAsync(Guid studentId, CancellationToken ct = default);
    Task<StudentInvoicePreviewResponse> GetStudentInvoicePreviewAsync(Guid studentId, CancellationToken ct = default);
    Task<PublicStudentFeeSummaryResponse?> GetPublicStudentFeesByStudentNoAsync(string studentNo, CancellationToken ct = default);
    Task<InitiateMobileMoneyPaymentResponse> InitiatePublicMobileMoneyPaymentAsync(PublicInitiateMobileMoneyPaymentRequest request, CancellationToken ct = default);
    Task<GatewayTransactionResponse?> GetPublicGatewayTransactionAsync(Guid id, string studentNo, CancellationToken ct = default);
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

public interface IClassroomService
{
    // Live sessions
    Task<LiveSessionResponse> CreateSessionAsync(CreateLiveSessionRequest request, Guid hostUserId, CancellationToken ct = default);
    Task<PagedResult<LiveSessionResponse>> GetSessionsAsync(Guid? courseOfferingId, Guid userId, bool isStudent, PaginationQuery query, CancellationToken ct = default);
    Task<LiveSessionDetailResponse?> GetSessionAsync(Guid id, Guid userId, bool isStudent, CancellationToken ct = default);
    Task<LiveSessionDetailResponse> StartSessionAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<LiveSessionDetailResponse> EndSessionAsync(Guid id, Guid userId, CancellationToken ct = default);

    // Lecture files
    Task<LectureFileResponse> AddFileAsync(Guid sessionId, string fileName, string fileUrl, long sizeBytes, Guid uploadedBy, CancellationToken ct = default);
    Task<IReadOnlyList<LectureFileResponse>> GetFilesAsync(Guid sessionId, CancellationToken ct = default);

    // Quizzes (teacher authors questions + correct answers)
    Task<QuizResponse> CreateQuizAsync(CreateQuizRequest request, Guid createdBy, CancellationToken ct = default);
    Task<IReadOnlyList<QuizResponse>> GetQuizzesAsync(Guid sessionId, bool includeAnswers, CancellationToken ct = default);
    Task<QuizResponse?> GetQuizAsync(Guid quizId, bool includeAnswers, CancellationToken ct = default);
    Task<QuizResponse> PublishQuizAsync(Guid quizId, Guid userId, CancellationToken ct = default);
    Task<QuizResponse> CloseQuizAsync(Guid quizId, Guid userId, CancellationToken ct = default);

    // Submissions — auto-graded against the stored correct answers
    Task<QuizResultResponse> SubmitQuizAsync(Guid quizId, Guid studentId, SubmitQuizRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<QuizResultResponse>> GetQuizResultsAsync(Guid quizId, CancellationToken ct = default);
    Task<QuizResultResponse?> GetMyQuizResultAsync(Guid quizId, Guid studentId, CancellationToken ct = default);
}

public interface IComplaintsService
{
    Task<PagedResult<ComplaintResponse>> GetMessagesAsync(PaginationQuery query, CancellationToken ct = default);
    Task<ComplaintResponse> PostAsync(Guid userId, PostComplaintRequest request, CancellationToken ct = default);
}

public interface IOnlineExamsService
{
    Task<PagedResult<OnlineExamListItemResponse>> GetExamsAsync(Guid? courseOfferingId, Guid userId, bool isStudent, PaginationQuery query, CancellationToken ct = default);
    Task<OnlineExamResponse?> GetExamAsync(Guid id, Guid userId, bool isStudent, bool includeAnswers, CancellationToken ct = default);
    Task<OnlineExamResponse> CreateExamAsync(CreateOnlineExamRequest request, Guid createdBy, CancellationToken ct = default);
    Task<OnlineExamResponse> PublishExamAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<OnlineExamResponse> CloseExamAsync(Guid id, Guid userId, CancellationToken ct = default);
    Task<OnlineExamResultResponse> SubmitExamAsync(Guid examId, Guid studentId, SubmitOnlineExamRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<OnlineExamResultResponse>> GetExamResultsAsync(Guid examId, CancellationToken ct = default);
    Task<OnlineExamResultResponse?> GetMyExamResultAsync(Guid examId, Guid studentId, CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardSummary> GetSummaryAsync(CancellationToken ct = default);
    Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken ct = default);
    Task<FinanceDashboardDto> GetFinanceDashboardAsync(CancellationToken ct = default);
    Task<StudentDashboardDto> GetStudentDashboardAsync(Guid studentId, CancellationToken ct = default);
    Task<object> GetPublicStatsAsync(CancellationToken ct = default);
}
