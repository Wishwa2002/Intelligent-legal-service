using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LegalService.API.Authentication.Services;
using LegalService.API.Controllers;
using LegalService.API.Data;
using LegalService.API.DTOs.Scheduling;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Scheduling;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
namespace LegalService.Tests;

public sealed class LawyerMobilePostgresTheoryAttribute : TheoryAttribute
{
    public LawyerMobilePostgresTheoryAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("LAWYER_MOBILE_TEST_POSTGRES")))
            Skip = "Set LAWYER_MOBILE_TEST_POSTGRES to a local PostgreSQL maintenance database; each test creates and drops an isolated database.";
    }
}

public sealed class LawyerMobileHttpTests : IAsyncLifetime
{
    private WebApplication app = null!;
    private HttpClient client = null!;
    private readonly Guid lawyerA = Guid.NewGuid(), lawyerB = Guid.NewGuid();
    private readonly Guid customer = Guid.Parse("00000000-0000-0000-0000-00000000002a");
    private readonly DateOnly today = new(2030, 1, 7);
    private const string Password = "InitialLawyer123!";
    private const string Key = "lawyer-mobile-test-signing-key-12345678901234567890";
    private readonly List<Guid> own = [];
    private Guid other, otherLeave;
    private int specId;
    private NpgsqlConnection? postgresAdmin;
    private string? postgresDatabase;
    public async Task InitializeAsync()
    {
        var pg = Environment.GetEnvironmentVariable("LAWYER_MOBILE_TEST_POSTGRES");
        string? isolatedConnection = null;
        if (!string.IsNullOrWhiteSpace(pg))
        {
            postgresDatabase = "lawyer_mobile_verify_" + Guid.NewGuid().ToString("N");
            postgresAdmin = new NpgsqlConnection(pg); await postgresAdmin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{postgresDatabase}\"", postgresAdmin); await create.ExecuteNonQueryAsync();
            isolatedConnection = new NpgsqlConnectionStringBuilder(pg) { Database = postgresDatabase }.ConnectionString;
        }
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders(); builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> {
            ["Jwt:Key"] = Key, ["Jwt:Issuer"] = "tests", ["Jwt:Audience"] = "tests", ["Jwt:ExpiryMinutes"] = "10" });
        builder.Services.AddControllers(o => o.Filters.Add<LawyerAccessFilter>()).AddApplicationPart(typeof(LawyerMeController).Assembly);
        var database = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(o => { if (isolatedConnection == null) o.UseInMemoryDatabase(database); else o.UseNpgsql(isolatedConnection); });
        builder.Services.AddSingleton<TimeProvider>(new RecurringSchedulingTests.Clock());
        builder.Services.AddScoped<AvailabilityService>(); builder.Services.AddScoped<LawyerScheduleService>();
        builder.Services.AddScoped<IAppointmentService, AppointmentService>();
        builder.Services.AddScoped<IPasswordService, PasswordService>(); builder.Services.AddScoped<JwtService>();
        builder.Services.AddExceptionHandler<ApiExceptionHandler>(); builder.Services.AddProblemDetails();
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => o.TokenValidationParameters = new() {
            ValidateIssuer = true, ValidIssuer = "tests", ValidateAudience = true, ValidAudience = "tests", ValidateLifetime = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)), ClockSkew = TimeSpan.Zero });
        builder.Services.AddAuthorization();
        app = builder.Build(); app.UseExceptionHandler(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); await app.StartAsync();
        client = new HttpClient { BaseAddress = new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (isolatedConnection != null) await db.Database.EnsureCreatedAsync();
        db.Users.AddRange(new User { UserId = 1, Name = "Lawyer A", Email = "a@example.test", Role = "Lawyer", PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password) },
            new User { UserId = 2, Name = "Lawyer B", Email = "b@example.test", Role = "Lawyer", PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password) },
            new User { UserId = 42, Name = "Test Client", Email = "client@example.test", Role = "Customer" },
            new User { UserId = 3, Name = "Admin", Email = "admin@example.test", Role = "Admin" });
        var area = new Specialization { SpecializationId = 10, Name = "Property", Description = "Property" }; db.Specializations.Add(area); await db.SaveChangesAsync(); specId = area.SpecializationId;
        db.Lawyers.AddRange(new Lawyer { LawyerId = lawyerA, UserId = 1, Name = "Lawyer A", Email = "a@example.test", Status = "Active", LicenseNumber = "A", LawyerSpecializations = [new() { SpecializationId = specId }] },
            new Lawyer { LawyerId = lawyerB, UserId = 2, Name = "Lawyer B", Status = "Active", LicenseNumber = "B", LawyerSpecializations = [new() { SpecializationId = specId }] });
        foreach (var id in new[] { lawyerA, lawyerB }) for (var day = 0; day < 7; day++) db.LawyerWorkingSchedules.Add(new() { LawyerId = id, DayOfWeek = (DayOfWeek)day, IsWorkingDay = true, StartTime = new(9, 0), EndTime = new(17, 0) });
        own.Add(AddAppointment(db, lawyerA, today, new(10, 0), "Requested"));
        own.Add(AddAppointment(db, lawyerA, today.AddDays(1), new(10, 0), "Confirmed"));
        own.Add(AddAppointment(db, lawyerA, today.AddDays(-1), new(10, 0), "Completed"));
        own.Add(AddAppointment(db, lawyerA, today.AddDays(2), new(10, 0), "Cancelled"));
        other = AddAppointment(db, lawyerB, today, new(10, 0), "Requested");
        var leave = new LawyerUnavailability { LawyerId = lawyerB, StartDateTime = today.AddDays(5).ToDateTime(TimeOnly.MinValue), EndDateTime = today.AddDays(6).ToDateTime(TimeOnly.MinValue), IsFullDay = true, Reason = "Other lawyer" };
        db.LawyerUnavailabilities.Add(leave); otherLeave = leave.Id; await db.SaveChangesAsync();
        if (isolatedConnection != null) await db.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('\"Users\"', 'UserId'), 42, true)");
        SignIn();
    }
    private Guid AddAppointment(ApplicationDbContext db, Guid id, DateOnly date, TimeOnly start, string status)
    {
        var window = new LawyerAvailability { LawyerId = id, AvailabilityId = Guid.NewGuid(), Date = date, StartTime = start, EndTime = start.AddMinutes(30) };
        var slot = new AvailabilitySlot { SlotId = Guid.NewGuid(), LawyerAvailability = window, StartTime = start, EndTime = start.AddMinutes(30), IsBooked = status != "Cancelled" };
        var appointment = new Appointment { AppointmentId = Guid.NewGuid(), LawyerId = id, CustomerId = customer, AvailabilitySlot = slot, SlotId = slot.SlotId, Status = status, LegalServiceCategory = "Property", AppointmentSource = "AI_FRONT_DESK" };
        db.Appointments.Add(appointment); return appointment.AppointmentId;
    }
    private void SignIn(int id = 1, string role = "Lawyer")
    {
        using var scope = app.Services.CreateScope();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", scope.ServiceProvider.GetRequiredService<JwtService>().GenerateToken(id, "test@example.test", role));
    }
    private async Task Mutate(Func<ApplicationDbContext, Task> mutation)
    { using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(); await mutation(db); await db.SaveChangesAsync(); }
    private async Task<JsonElement> Get(string path) { var r = await client.GetAsync(path); r.EnsureSuccessStatusCode(); return await r.Content.ReadFromJsonAsync<JsonElement>(); }
    private ScheduleRequest Schedule(bool working = true) => new() { Days = Enumerable.Range(0, 7).Select(d => new WorkingDayDto((DayOfWeek)d, working, new(9, 0), new(17, 0))).ToList() };
    private UnavailabilityRequest Leave(int day = 3) => new() { StartDateTime = today.AddDays(day).ToDateTime(TimeOnly.MinValue), EndDateTime = today.AddDays(day + 1).ToDateTime(TimeOnly.MinValue), IsFullDay = true, Reason = "Court appearance" };
    [Fact] public async Task DashboardCountsNextAndClientAreScoped()
    {
        var data = await Get("/api/lawyer/me/dashboard"); Assert.Equal(lawyerA, data.GetProperty("lawyer").GetProperty("lawyerId").GetGuid());
        var counts = data.GetProperty("counts"); Assert.Equal(1, counts.GetProperty("today").GetInt32()); Assert.Equal(2, counts.GetProperty("upcoming").GetInt32());
        Assert.Equal(1, counts.GetProperty("pending").GetInt32()); Assert.Equal(1, counts.GetProperty("completed").GetInt32());
        Assert.Equal(own[0], data.GetProperty("nextAppointment").GetProperty("appointmentId").GetGuid()); Assert.Equal("Test Client", data.GetProperty("nextAppointment").GetProperty("customerName").GetString());
    }
    [Fact] public async Task EmptyDashboard()
    {
        await Mutate(async db => db.Appointments.RemoveRange(await db.Appointments.Where(a => a.LawyerId == lawyerA).ToListAsync()));
        var data = await Get("/api/lawyer/me/dashboard"); Assert.Equal(0, data.GetProperty("counts").GetProperty("today").GetInt32()); Assert.Equal(JsonValueKind.Null, data.GetProperty("nextAppointment").ValueKind);
    }
    [Theory] [InlineData("today", 1)] [InlineData("upcoming", 2)] [InlineData("pending", 1)] [InlineData("completed", 1)] [InlineData("cancelled", 1)] [InlineData("all", 4)]
    public async Task AppointmentFilters(string filter, int count) { var rows = await Get($"/api/lawyer/me/appointments?filter={filter}&lawyerId={lawyerB}"); Assert.Equal(count, rows.GetArrayLength()); Assert.DoesNotContain(rows.EnumerateArray(), a => a.GetProperty("appointmentId").GetGuid() == other); }
    [Fact] public async Task DetailsHideUnnecessaryClientData()
    { var row = await Get($"/api/lawyer/me/appointments/{own[0]}"); Assert.Equal("Test Client", row.GetProperty("customerName").GetString()); Assert.False(row.TryGetProperty("customerEmail", out _)); Assert.False(row.TryGetProperty("customerId", out _)); }
    [Fact] public async Task ForeignAppointmentAndLeaveDenied()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/lawyer/me/appointments/{other}")).StatusCode);
        foreach (var action in new[] { "confirm", "complete" }) Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync($"/api/lawyer/me/appointments/{other}/{action}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/lawyer/me/unavailability/{otherLeave}", Leave())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/lawyer/me/unavailability/{otherLeave}")).StatusCode);
    }
    [Fact] public async Task ActionsUseCentralLifecycleAndHistory()
    {
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/api/lawyer/me/appointments/{own[0]}/complete", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/lawyer/me/appointments/{own[0]}/confirm", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/lawyer/me/appointments/{own[0]}/complete", null)).StatusCode);
        await Mutate(async db => { Assert.Equal("Completed", (await db.Appointments.FindAsync(own[0]))!.Status); Assert.Equal(2, await db.AppointmentStatusHistories.CountAsync(h => h.AppointmentId == own[0])); });
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/api/lawyer/me/appointments/{own[0]}/confirm", null)).StatusCode);
    }
    [Theory] [InlineData("Inactive")] [InlineData("Pending")]
    public async Task DisabledStatusBlocksLoginAndExistingToken(string status)
    {
        await Mutate(async db => (await db.Lawyers.FindAsync(lawyerA))!.Status = status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new { email = "a@example.test", password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/lawyer/me/dashboard")).StatusCode);
    }
    [Fact] public async Task MissingProfileDenied()
    {
        await Mutate(async db => { var l = (await db.Lawyers.FindAsync(lawyerA))!; l.UserId = null; });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new { email = "a@example.test", password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/lawyer/me/profile")).StatusCode);
    }
    [Theory] [InlineData("Customer")] [InlineData("Admin")] [InlineData("Clerk")]
    public async Task OtherRolesDenied(string role) { SignIn(42, role); Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/lawyer/me/dashboard")).StatusCode); }
    [Fact] public async Task UnauthenticatedAndExpiredDenied()
    {
        client.DefaultRequestHeaders.Authorization = null; Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/lawyer/me/profile")).StatusCode);
        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(issuer: "tests", audience: "tests", claims: [new(ClaimTypes.NameIdentifier, "1"), new(ClaimTypes.Role, "Lawyer")],
            expires: DateTime.UtcNow.AddMinutes(-5), signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)), SecurityAlgorithms.HmacSha256));
        client.DefaultRequestHeaders.Authorization = new("Bearer", new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/lawyer/me/dashboard")).StatusCode);
    }
    [Fact] public async Task LegacyApiCannotBypassOwnershipOrForbiddenActions()
    {
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/appointments")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/appointments/{other}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync($"/api/appointments/{own[0]}")).StatusCode);
        client.DefaultRequestHeaders.Authorization = null; Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/appointments/{other}")).StatusCode);
    }
    [Fact] public async Task ScheduleOwnershipValidationAndConflict()
    {
        var row = await Get("/api/lawyer/me/schedule"); Assert.Equal(lawyerA, row.GetProperty("lawyerId").GetGuid());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync("/api/lawyer/me/schedule", Schedule(false))).StatusCode);
        var invalid = Schedule(); invalid.Days[1] = new(DayOfWeek.Monday, true, new(12, 0), new(9, 0));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/lawyer/me/schedule", invalid)).StatusCode);
        var valid = Schedule(); valid.AppointmentDurationMinutes = 60;
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/lawyer/me/schedule", valid)).StatusCode);
        await Mutate(async db => { Assert.Equal(60, (await db.Lawyers.FindAsync(lawyerA))!.DefaultAppointmentDurationMinutes); Assert.Equal(30, (await db.Lawyers.FindAsync(lawyerB))!.DefaultAppointmentDurationMinutes); });
    }
    [Fact] public async Task LeaveCrudConflictsAndDerivedCapacity()
    {
        Assert.Equal(0, (await Get("/api/lawyer/me/unavailability")).GetArrayLength());
        var conflict = await client.PostAsJsonAsync("/api/lawyer/me/unavailability", Leave(0)); Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Equal(own[0], (await conflict.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("conflicts")[0].GetProperty("appointmentId").GetGuid());
        var result = await client.PostAsJsonAsync("/api/lawyer/me/unavailability", Leave()); result.EnsureSuccessStatusCode(); var id = (await result.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        using (var scope = app.Services.CreateScope()) {
            var availability = scope.ServiceProvider.GetRequiredService<AvailabilityService>();
            Assert.Empty((await availability.GetAsync(lawyerA, today.AddDays(3))).AvailableSlots);
            Assert.NotEmpty((await availability.GetAsync(lawyerB, today.AddDays(3))).AvailableSlots);
            Assert.True((await availability.CapacityAsync(7))[lawyerA] < (await availability.CapacityAsync(7))[lawyerB]);
        }
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/lawyer/me/unavailability/{id}", Leave(4))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/lawyer/me/unavailability/{id}")).StatusCode);
        using var last = app.Services.CreateScope(); Assert.NotEmpty((await last.ServiceProvider.GetRequiredService<AvailabilityService>().GetAsync(lawyerA, today.AddDays(3))).AvailableSlots);
    }
    [Fact] public async Task ProfileWhitelistProtectsVerifiedFields()
    {
        var response = await client.PutAsJsonAsync("/api/lawyer/me/profile", new { phoneNumber = "+94 77", profileDescription = "Updated", status = "Inactive", licenseNumber = "HACK", role = "Admin", userId = 2, specializationId = 999, experience = 70 }); response.EnsureSuccessStatusCode();
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal("+94 77", profile.GetProperty("phoneNumber").GetString()); Assert.Equal("Active", profile.GetProperty("status").GetString()); Assert.Equal("A", profile.GetProperty("licenseNumber").GetString()); Assert.Equal(0, profile.GetProperty("experience").GetInt32()); Assert.Equal("Property", profile.GetProperty("practiceArea").GetString());
    }
    [Fact] public async Task InitialPasswordGateAndSecurePasswordChange()
    {
        await Mutate(async db => (await db.Users.FindAsync(1))!.MustChangePassword = true);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "a@example.test", password = Password }); login.EnsureSuccessStatusCode(); Assert.True((await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("mustChangePassword").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/lawyer/me/dashboard")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = "wrong", newPassword = "PersonalLawyer456!", confirmPassword = "PersonalLawyer456!" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Password, newPassword = "short", confirmPassword = "short" })).StatusCode);
        var success = await client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Password, newPassword = "PersonalLawyer456!", confirmPassword = "PersonalLawyer456!" }); success.EnsureSuccessStatusCode();
        await Mutate(async db => { var account = (await db.Users.FindAsync(1))!; Assert.False(account.MustChangePassword); Assert.NotEqual("PersonalLawyer456!", account.PasswordHash); Assert.True(BCrypt.Net.BCrypt.Verify("PersonalLawyer456!", account.PasswordHash)); });
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/lawyer/me/dashboard")).StatusCode);
    }
    [Fact] public async Task AdminCreationRequiresPasswordChangeAndCreatesSchedule()
    {
        SignIn(3, "Admin"); var response = await client.PostAsJsonAsync("/api/lawyers", new { name = "Created Lawyer", email = "created@example.test", licenseNumber = "NEW", specializationId = specId, password = Password }); response.EnsureSuccessStatusCode();
        await Mutate(async db => { var l = await db.Lawyers.SingleAsync(l => l.Email == "created@example.test"); Assert.NotNull(l.UserId); Assert.True((await db.Users.FindAsync(l.UserId))!.MustChangePassword); Assert.Equal(7, await db.LawyerWorkingSchedules.CountAsync(s => s.LawyerId == l.LawyerId)); });
    }
    [Fact] public async Task CentralAiSourceAppointmentAppearsAndBlocksBooking()
    {
        using var scope = app.Services.CreateScope(); var service = scope.ServiceProvider.GetRequiredService<IAppointmentService>();
        var date = today.AddDays(6); var slot = (await service.GetAvailableSlotsAsync(lawyerA, date)).First();
        var result = await service.BookAppointmentAsync(new() { LawyerId = lawyerA, CustomerId = customer, SlotId = slot.SlotId, AppointmentSource = "AI_FRONT_DESK", LegalServiceCategory = "Property" });
        var data = await Get("/api/lawyer/me/appointments?filter=upcoming"); Assert.Contains(data.EnumerateArray(), a => a.GetProperty("appointmentId").GetGuid() == result.AppointmentId);
        Assert.DoesNotContain(await service.GetAvailableSlotsAsync(lawyerA, date), s => s.StartTime == slot.StartTime);
    }
    [LawyerMobilePostgresTheory] [InlineData(0)] public async Task PasswordMigrationIsAdditiveAndRequiresExistingLawyersToChange(int _)
    {
        Assert.NotNull(postgresAdmin);
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var originalHash = (await db.Users.FindAsync(1))!.PasswordHash;
        var migration = new LegalService.API.Migrations.AddLawyerInitialPasswordChange();
        var sql = db.GetService<IMigrationsSqlGenerator>();
        foreach (var command in sql.Generate(migration.DownOperations)) await db.Database.ExecuteSqlRawAsync(command.CommandText);
        foreach (var command in sql.Generate(migration.UpOperations)) await db.Database.ExecuteSqlRawAsync(command.CommandText);
        db.ChangeTracker.Clear();
        Assert.True((await db.Users.FindAsync(1))!.MustChangePassword); Assert.True((await db.Users.FindAsync(2))!.MustChangePassword);
        Assert.False((await db.Users.FindAsync(42))!.MustChangePassword); Assert.Equal(originalHash, (await db.Users.FindAsync(1))!.PasswordHash);
        Assert.Equal(5, await db.Appointments.CountAsync()); Assert.Equal(14, await db.LawyerWorkingSchedules.CountAsync());
    }
    public async Task DisposeAsync()
    {
        client?.Dispose(); if (app != null) { await app.StopAsync(); await app.DisposeAsync(); }
        if (postgresAdmin != null) { await using var drop = new NpgsqlCommand($"DROP DATABASE \"{postgresDatabase}\" WITH (FORCE)", postgresAdmin); await drop.ExecuteNonQueryAsync(); await postgresAdmin.DisposeAsync(); }
    }
}
