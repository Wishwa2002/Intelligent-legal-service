using System.ComponentModel.DataAnnotations;
using LegalService.API.Authentication.Services;
using LegalService.API.Data;
using LegalService.API.DTOs.Clients;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;
namespace LegalService.API.Services.Clients;
// Customer signup and Admin quick registration share the ordinary Users/UserRoles store.
public sealed class ClientService(ApplicationDbContext db, IPasswordService passwords)
{
    public async Task<ClientSummary[]> SearchAsync(string? search, CancellationToken ct = default)
    {
        var term = (search ?? "").Trim().ToLowerInvariant();
        return await db.Users.AsNoTracking().Where(x => x.Role == "Customer" &&
            (term == "" || x.Name.ToLower().Contains(term) || x.Email.ToLower().Contains(term)))
            .OrderBy(x => x.Name).Take(20).Select(x => new ClientSummary(x.UserId, x.Name, x.Email)).ToArrayAsync(ct);
    }
    public async Task<ClientSummary> GetAsync(int id, CancellationToken ct = default) =>
        await db.Users.AsNoTracking().Where(x => x.UserId == id && x.Role == "Customer")
            .Select(x => new ClientSummary(x.UserId, x.Name, x.Email)).SingleOrDefaultAsync(ct)
            ?? throw new ApiException(404, "Selected client no longer exists. Choose an existing client.");
    public async Task<ClientSummary> RegisterAsync(RegisterClientRequest request, CancellationToken ct = default)
    {
        request.Email = (request.Email ?? "").Trim().ToLowerInvariant();
        var errors = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        if (!Validator.TryValidateObject(request, new(request), errors, true) || string.IsNullOrWhiteSpace(request.Password))
            throw new ApiException(400, "A valid email and account password are required.");
        var email = request.Email.Trim().ToLowerInvariant();
        // Join an existing signup transaction rather than creating a competing account path.
        await using var transaction = db.Database.IsRelational() && db.Database.CurrentTransaction == null
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct) : null;
        try
        {
            var duplicate = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);
            if (duplicate != null) throw new DuplicateClientException(duplicate.Role == "Customer" ? new(duplicate.UserId, duplicate.Name, duplicate.Email) : null);
            var role = await db.Roles.SingleOrDefaultAsync(x => x.Name == "Customer", ct)
                ?? throw new ApiException(400, "The Customer role is not configured.");
            var name = string.IsNullOrWhiteSpace(request.FullName) ? email.Split('@')[0] : request.FullName.Trim();
            var user = new User { Name = name, Email = email, Role = "Customer", PasswordHash = passwords.HashPassword(request.Password) };
            db.Users.Add(user); await db.SaveChangesAsync(ct);
            db.UserRoles.Add(new() { UserId = user.UserId, RoleId = role.Id }); await db.SaveChangesAsync(ct);
            if (transaction != null) await transaction.CommitAsync(ct);
            return new(user.UserId, user.Name, user.Email);
        }
        catch (Exception error) when (error is PostgresException { SqlState: "40001" } || error is DbUpdateException { InnerException: PostgresException { SqlState: "23505" or "40001" } })
        { throw new ApiException(409, "Client records changed. Search by email before registering again."); }
    }
    public static Guid BookingId(int id) => Guid.Parse($"00000000-0000-0000-0000-{id:x12}");
}
