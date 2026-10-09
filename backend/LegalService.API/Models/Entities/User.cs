using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LegalService.API.Models.Entities;

public class User
{
    [Key]
    public int UserId { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = "Customer";

    public string? PasswordHash { get; set; }

    public bool MustChangePassword { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; }
        = new List<UserRole>();

    [NotMapped]
    public string FullName
    {
        get => Name;
        set => Name = value;
    }

    [NotMapped]
    public string Id => UserId.ToString();
}