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

        modelBuilder.Entity<UserRole>()
            .HasKey(x => new
            {
                x.UserId,
                x.RoleId
            });


        base.OnModelCreating(modelBuilder);
    }
}