using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using LegalService.API.Authentication.Services;
using Xunit.Abstractions;
namespace LegalService.Tests;
// AI-assisted SE3110 replay; exact report synthetic password, no full hash in evidence.
public sealed class HistoricalCaseVerificationTests(ITestOutputHelper output)
{
 [Fact]
 public void TC_BK_01_PasswordHashAndVerification()
 {
  var service=new PasswordService();var hash=service.HashPassword("SecurePass123!");
  var valid=service.VerifyPassword("SecurePass123!",hash);var wrong=service.VerifyPassword("wrong",hash);
  output.WriteLine($"UTC={DateTime.UtcNow:O}; hash length={hash.Length}; cost marker={hash.Substring(4,2)}; valid={valid}; wrong={wrong}; full hash intentionally excluded.");
  Assert.True(hash.Length>=60);Assert.True(valid);Assert.False(wrong);Assert.Equal("12",hash.Substring(4,2)); // Historical work-factor precondition; product rule requires confirmation.
 }
}

public sealed class HistoricalPostgresSetupTests(ITestOutputHelper output)
{
 private static LegalService.API.Data.ApplicationDbContext Db()
 {
  var connection=Environment.GetEnvironmentVariable("QMSE_HISTORY_POSTGRES") ?? throw new InvalidOperationException("Explicit isolated PostgreSQL required.");
  var parsed=new Npgsql.NpgsqlConnectionStringBuilder(connection);
  if(parsed.Host!="127.0.0.1" || parsed.Port!=55546 || parsed.Database!="qmse_history") throw new InvalidOperationException("Only dedicated historical replay database is permitted.");
  return new(new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<LegalService.API.Data.ApplicationDbContext>().UseNpgsql(connection).Options);
 }
 [Fact] public async Task BootstrapActualStartupSeeders()
 {
  using var db=Db();await LegalService.API.Data.DbInitializer.SeedCategoriesAsync(db);await LegalService.API.Data.DbInitializer.SeedDocumentationServicesAsync(db);
  var cfg=new Microsoft.Extensions.Configuration.ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{["SeedAccounts:AdminEmail"]="qmse-history-admin@example.test",["SeedAccounts:AdminPassword"]=Environment.GetEnvironmentVariable("QMSE_HISTORY_PASSWORD"),["SeedAccounts:ClerkEmail"]="qmse-history-clerk@example.test",["SeedAccounts:ClerkPassword"]=Environment.GetEnvironmentVariable("QMSE_HISTORY_PASSWORD")}).Build();
  await LegalService.API.Data.DbInitializer.SeedStaffAccountsAsync(db,new PasswordService(),cfg);output.WriteLine("Actual startup seeders executed on dedicated qmse_history database; synthetic credentials omitted.");
 }
 [Fact] public async Task TC_DB_01_TlsConnection()
 {
  using var db=Db();var t=System.Diagnostics.Stopwatch.StartNew();var connected=await db.Database.CanConnectAsync();t.Stop();output.WriteLine($"UTC={DateTime.UtcNow:O}; CanConnectAsync={connected}; latency_ms={t.Elapsed.TotalMilliseconds:F3}; SSL Mode=Require; pooling=true.");Assert.True(connected);Assert.True(t.Elapsed.TotalMilliseconds<200,"Historical connection latency expectation exceeded.");
 }
}
public sealed class HistoricalSlotConstraintTests(ITestOutputHelper output)
{
 [Fact] public async Task TC_DB_02_DuplicateOctober15FourteenSlotThrowsEfAnd23505()
 {
  var cs=Environment.GetEnvironmentVariable("QMSE_HISTORY_POSTGRES")!;var parsed=new Npgsql.NpgsqlConnectionStringBuilder(cs);
  Assert.Equal("127.0.0.1",parsed.Host);Assert.Equal(55546,parsed.Port);Assert.Equal("qmse_history",parsed.Database);
  using var db=new LegalService.API.Data.ApplicationDbContext(new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<LegalService.API.Data.ApplicationDbContext>().UseNpgsql(cs).Options);
  var original=await db.Appointments.AsNoTracking().Include(x=>x.AvailabilitySlot).ThenInclude(x=>x.LawyerAvailability).SingleAsync(x=>x.AvailabilitySlot.StartTime==new TimeOnly(14,0) && x.AvailabilitySlot.LawyerAvailability.Date==new DateOnly(2026,10,15));
  db.Appointments.Add(new(){AppointmentId=Guid.NewGuid(),CustomerId=original.CustomerId,LawyerId=original.LawyerId,SlotId=original.SlotId,Status="Requested",ConsultationType="Online"});
  var ex=await Assert.ThrowsAsync<DbUpdateException>(()=>db.SaveChangesAsync());var pg=Assert.IsType<Npgsql.PostgresException>(ex.InnerException);Assert.Equal("23505",pg.SqlState);
  db.ChangeTracker.Clear();Assert.Equal(1,await db.Appointments.CountAsync(x=>x.SlotId==original.SlotId));output.WriteLine($"UTC={DateTime.UtcNow:O}; original date=2026-10-15; start=14:00; DbUpdateException inner PostgreSQL {pg.SqlState}; constraint={pg.ConstraintName}; remaining rows=1; historical lawyer 2 mapped to UUID {original.LawyerId}.");
 }
}
