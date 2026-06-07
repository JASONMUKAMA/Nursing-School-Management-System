namespace NursingSchool.Application.DTOs;

public record CreateClinicalFacilityRequest(string Name, string FacilityType, string ContactPerson, string Phone, string Address);
public record ClinicalFacilityResponse(Guid Id, string Name, string FacilityType, string ContactPerson, string Phone, string Address, bool IsActive);

public record CreateClinicalSupervisorRequest(Guid FacilityId, string FullName, string Phone, string? Email);
public record ClinicalSupervisorResponse(Guid Id, Guid FacilityId, string FacilityName, string FullName, string Phone, string? Email);

public record CreateClinicalPlacementRequest(Guid StudentId, Guid FacilityId, Guid? SupervisorId, DateOnly StartDate, DateOnly EndDate, string Department);
public record ClinicalPlacementResponse(Guid Id, Guid StudentId, string StudentName, Guid FacilityId, string FacilityName, Guid? SupervisorId, string? SupervisorName, DateOnly StartDate, DateOnly EndDate, string Department, string Status);

public record CreateClinicalEvaluationRequest(Guid PlacementId, int ProfessionalismScore, int SkillScore, int CommunicationScore, int AttendanceScore, string Comments);
public record ClinicalEvaluationResponse(Guid Id, Guid PlacementId, string StudentName, int ProfessionalismScore, int SkillScore, int CommunicationScore, int AttendanceScore, int TotalScore, string Comments, DateTime EvaluatedAt);
