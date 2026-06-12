using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class LiveSession : AuditableEntity
{
    public Guid CourseOfferingId { get; set; }
    public CourseOffering CourseOffering { get; set; } = null!;
    public Guid HostUserId { get; set; }
    public ApplicationUser Host { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    /// <summary>Unguessable Jitsi room name (GUID-based), generated server-side.</summary>
    public string RoomId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    public ICollection<Quiz> Quizzes { get; set; } = [];
    public ICollection<LectureFile> Files { get; set; } = [];
}
