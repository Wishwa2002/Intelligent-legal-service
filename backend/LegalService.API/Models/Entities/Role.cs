namespace LegalService.API.Models.Entities;

public class Role
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;


    public ICollection<UserRole> UserRoles { get; set; }
        = new List<UserRole>();
}