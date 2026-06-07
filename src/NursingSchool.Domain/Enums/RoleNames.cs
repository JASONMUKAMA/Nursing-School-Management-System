namespace NursingSchool.Domain.Enums;

public static class RoleNames
{
    public const string Admin = "Admin";
    public const string Registrar = "Registrar";
    public const string Lecturer = "Lecturer";
    public const string ClinicalCoordinator = "ClinicalCoordinator";
    public const string FinanceOfficer = "FinanceOfficer";
    public const string Student = "Student";

    public static readonly string[] All =
    [
        Admin, Registrar, Lecturer, ClinicalCoordinator, FinanceOfficer, Student
    ];
}
