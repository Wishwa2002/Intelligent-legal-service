using Microsoft.EntityFrameworkCore;
using LegalService.API.Models.Entities;


namespace LegalService.API.Data;


public class ApplicationDbContext : DbContext
{

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options
    ) : base(options)
    {

    }


    public DbSet<User> Users { get; set; }

    public DbSet<Role> Roles { get; set; }

    public DbSet<UserRole> UserRoles { get; set; }


    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {

        // Composite Primary Key
        modelBuilder.Entity<UserRole>()
            .HasKey(x => new
            {
                x.UserId,
                x.RoleId
            });


        // User -> UserRole relationship
        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.User)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.UserId);


        // Role -> UserRole relationship
        modelBuilder.Entity<UserRole>()
            .HasOne(x => x.Role)
            .WithMany(x => x.UserRoles)
            .HasForeignKey(x => x.RoleId);


        base.OnModelCreating(modelBuilder);
    }
}