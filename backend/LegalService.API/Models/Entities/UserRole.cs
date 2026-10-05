namespace LegalService.API.Models.Entities;


public class UserRole
{
    public int UserId { get; set; }

    public User User { get; set; } = null!;


    public Guid RoleId { get; set; }

    public Role Role { get; set; } = null!;
}