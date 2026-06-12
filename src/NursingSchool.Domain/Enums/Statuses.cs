namespace NursingSchool.Domain.Enums;

public static class StudentStatuses
{
    public const string Active = "Active";
    public const string Graduated = "Graduated";
    public const string Suspended = "Suspended";
    public const string Withdrawn = "Withdrawn";
}

public static class ApplicationStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}

public static class EnrollmentStatuses
{
    public const string Enrolled = "Enrolled";
    public const string Dropped = "Dropped";
    public const string Completed = "Completed";
}

public static class AttendanceStatuses
{
    public const string Present = "Present";
    public const string Absent = "Absent";
    public const string Late = "Late";
    public const string Excused = "Excused";
}

public static class InvoiceStatuses
{
    public const string Unpaid = "Unpaid";
    public const string Partial = "Partial";
    public const string Paid = "Paid";
    public const string Overdue = "Overdue";
}

public static class LiveSessionStatuses
{
    public const string Scheduled = "Scheduled";
    public const string Live = "Live";
    public const string Ended = "Ended";
}

public static class QuizStatuses
{
    public const string Draft = "Draft";
    public const string Published = "Published";
    public const string Closed = "Closed";
}

public static class QuizQuestionTypes
{
    public const string MultipleChoice = "MultipleChoice";
    public const string TrueFalse = "TrueFalse";
    public const string ShortAnswer = "ShortAnswer";
}

public static class OnlineExamQuestionTypes
{
    public const string MultipleChoice = "MultipleChoice";
    public const string TrueFalse = "TrueFalse";
}

public static class PlacementStatuses
{
    public const string Scheduled = "Scheduled";
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}
