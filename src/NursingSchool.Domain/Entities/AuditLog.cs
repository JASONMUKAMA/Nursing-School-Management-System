using NursingSchool.Domain.Common;

namespace NursingSchool.Domain.Entities;

public class AuditLog : AuditableEntity
{
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string Details { get; set; } = string.Empty;
}
