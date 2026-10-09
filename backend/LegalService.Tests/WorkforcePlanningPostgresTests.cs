using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Services.Workforce;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
using Npgsql;
namespace LegalService.Tests;
public sealed class WorkforcePlanningPostgresTests
{
    [PostgresTheory] [InlineData(true)]
    public async Task MigrationAppliesAndRealProviderDemoIsReversible(bool _)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var database = "planning_verify_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(maintenance.ConnectionString); await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", connection)) await create.ExecuteNonQueryAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = database }.ConnectionString).Options;
        try
        {
            await using var f = new WorkforceHiringTests.Fixture(options); await f.Db.Database.EnsureCreatedAsync();
            // Reconstruct the immediately previous schema in a disposable database.
            // Then use EF's real migrator and migration history, rather than manual table edits.
            var migration = new LegalService.API.Migrations.AddWorkforcePlanningSettings();
            foreach (var command in f.Db.GetService<IMigrationsSqlGenerator>().Generate(migration.DownOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            var history = f.Db.GetService<IHistoryRepository>();
            await f.Db.Database.ExecuteSqlRawAsync(history.GetCreateScript());
            var migrations = f.Db.Database.GetMigrations().ToArray();
            foreach (var id in migrations.Where(x => !x.EndsWith("_AddWorkforcePlanningSettings")))
                await f.Db.Database.ExecuteSqlRawAsync(history.GetInsertScript(new HistoryRow(id, "8.0.11")));
            await f.Db.Database.MigrateAsync(); Assert.Contains(migrations.Last(), await f.Db.Database.GetAppliedMigrationsAsync());
            await f.Seed(); var settings = new WorkforceSettingsService(f.Db, Options.Create(new WorkforceOptions()), f.Clock);
            await settings.SaveAsync(70, new() { MinimumActiveLawyers = 4, TargetActiveLawyers = 6, MinimumFutureSlots = 12, HighDemandThreshold = 10, WatchCapacityRatio = .75 }, 1);
            var env = new Mock<IHostEnvironment>(); env.SetupGet(x => x.EnvironmentName).Returns("Development");
            var demo = new WorkforceDemoService(f.Db, settings, f.Careers.Object, env.Object, f.Clock);
            var originalSlots = await f.Db.AvailabilitySlots.Select(x => x.SlotId).ToArrayAsync();
            var result = await demo.ApplyAsync(new() { Scenario = "RECRUITMENT_NEEDED", PracticeAreaId = 70 }, 1);
            var area = (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == result.PracticeAreaId);
            Assert.Equal("CAPACITY_CONCERN", area.Status); Assert.Contains("BELOW_MINIMUM_LAWYERS", area.Reasons);
            // Real DB proposal approval creates the ordinary Careers entity. No Gemini network call.
            var draft = WorkforceHiringTests.Draft(); draft.FocusAreas = [area.PracticeAreaName];
            f.Handler = new(draft); var service = f.Service(); var proposal = await service.GenerateAsync(new() { PracticeAreaId = area.PracticeAreaId }, 1, default);
            Assert.Equal(4, f.Handler.Payload.GetProperty("minimumActiveLawyers").GetInt32());
            var approval = f.Approval(); approval.Draft = draft;
            var approved = await service.ApproveAsync(proposal.WorkflowId, approval, 1, default); Assert.NotNull(approved.CareerOpeningId);
            await demo.ApplyAsync(new() { Scenario = "EXISTING_RECRUITMENT", PracticeAreaId = 70 }, 1);
            Assert.Equal(1, await f.Db.Careers.CountAsync(x => x.PracticeAreaId == result.PracticeAreaId));
            await demo.ResetAsync(1); Assert.NotNull(await f.Db.Careers.FindAsync(approved.CareerOpeningId));
            Assert.All((await f.Analysis.AnalyzeAsync()).PracticeAreas.Where(x => x.PracticeAreaName.StartsWith("[Demo] ")), x => Assert.Equal("HEALTHY", x.Status));
            foreach (var slot in originalSlots) Assert.NotNull(await f.Db.AvailabilitySlots.FindAsync(slot));
            // A seed-owned Career is removed on reset, without touching the approved opening.
            await demo.ApplyAsync(new() { Scenario = "EXISTING_RECRUITMENT", PracticeAreaId = 71 }, 1);
            Assert.Equal(2, await f.Db.Careers.CountAsync()); await demo.ResetAsync(1); Assert.Single(f.Db.Careers);
            Assert.Equal("CUSTOM", (await settings.GetAsync(70)).Source);
        }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE \"{database}\" WITH (FORCE)", connection); await drop.ExecuteNonQueryAsync(); }
    }
}
