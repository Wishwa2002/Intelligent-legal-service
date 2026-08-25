namespace LegalService.API.Models.Entities;

public class User
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;


    public bool IsActive { get; set; } = true;


    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
    
    public ICollection<UserRole> UserRoles { get; set; }
        = new List<UserRole>();

    // Extended profile relationships
    public Lawyer? Lawyer { get; set; }
    public Clerk? Clerk { get; set; }

    // Relationship navigation collections
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<DocumentationRequest> DocumentationRequests { get; set; } = new List<DocumentationRequest>();
    public ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
    public ICollection<ApprovalDecision> ApprovalDecisions { get; set; } = new List<ApprovalDecision>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}