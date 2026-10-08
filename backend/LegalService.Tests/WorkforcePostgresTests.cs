using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Moq;
using Npgsql;

namespace LegalService.Tests;
public sealed class WorkforcePostgresTests
{
    [PostgresTheory] [InlineData(false)] [InlineData(true)]
    public async Task RealProviderMigrationPreservesCareersAndConcurrentApprovalsCreateOneOpening(bool separateWorkflows)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var database = "workforce_verify_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(maintenance.ConnectionString); await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", connection)) await create.ExecuteNonQueryAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = database }.ConnectionString).Options;
        try
        {
            await using var f = new WorkforceHiringTests.Fixture(options); await f.Db.Database.EnsureCreatedAsync();
            // Reconstruct the prior schema, exercise the new migration's real SQL, and preserve a manual posting.
            var migration = new LegalService.API.Migrations.AddWorkforceHiringIntelligence();
            var sql = f.Db.GetService<IMigrationsSqlGenerator>();
            foreach (var command in sql.Generate(migration.DownOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            await f.Db.Database.ExecuteSqlRawAsync("INSERT INTO \"Careers\" (\"JobTitle\", \"Description\", \"CreatedAt\", \"UpdatedAt\") VALUES ('Existing manual role', 'Recorded manual posting', NOW(), NOW())");
            foreach (var command in sql.Generate(migration.UpOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            var manual = await f.Db.Careers.SingleAsync(); Assert.Null(manual.PracticeAreaId); Assert.Equal("Existing manual role", manual.JobTitle);
            await f.Seed();
            var area = (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == 70);
            Assert.Equal(1, area.ActiveLawyerCount); Assert.Equal(10, area.FutureAvailableSlotCount); Assert.Equal(7, area.RecentDemandCount);
            var workflow = await f.Service().GenerateAsync(new() { PracticeAreaId = 70 }, 1, default);
            var second = separateWorkflows ? await f.Service().GenerateAsync(new() { PracticeAreaId = 70 }, 2, default) : workflow;
            var entered = 0; var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            async Task Wait() { if (Interlocked.Increment(ref entered) == 2) gate.TrySetResult(); await gate.Task.WaitAsync(TimeSpan.FromSeconds(15)); }
            async Task<bool> Approve(Guid id, int owner)
            {
                await using var concurrent = new WorkforceHiringTests.Fixture(options);
                concurrent.Careers.Setup(x => x.CreateCareerAsync(It.IsAny<CreateCareerRequest>())).Returns<CreateCareerRequest>(async request => { await Wait(); return await new CareerService(concurrent.Db).CreateCareerAsync(request); });
                try { await concurrent.Service().ApproveAsync(id, concurrent.Approval(), owner, default); return true; }
                catch (ApiException exception) { Assert.Equal(409, exception.Status); return false; }
            }
            var results = await Task.WhenAll(Approve(workflow.WorkflowId, 1), Approve(second.WorkflowId, separateWorkflows ? 2 : 1));
            Assert.Single(results, x => x);
            f.Db.ChangeTracker.Clear(); Assert.Equal(1, await f.Db.Careers.CountAsync(x => x.PracticeAreaId == 70));
            Assert.Equal(1, await f.Db.HiringSuggestionWorkflows.CountAsync(x => x.Status == "CAREER_OPENING_CREATED"));
            var normalList = await new CareerService(f.Db).GetAllCareersAsync(); Assert.Equal(2, normalList.Count());
            Assert.Equal("Existing manual role", normalList.Single(x => x.PracticeAreaId == null).JobTitle);
            // Updating a stale tracked draft after another context completed approval must fail.
            await using var stale = new ApplicationDbContext(options);
            var completed = await stale.HiringSuggestionWorkflows.SingleAsync(x => x.Status == "CAREER_OPENING_CREATED");
            completed.Status = "AWAITING_APPROVAL";
            stale.Entry(completed).Property(x => x.Status).OriginalValue = "AWAITING_APPROVAL";
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => stale.SaveChangesAsync());
        }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE \"{database}\" WITH (FORCE)", connection); await drop.ExecuteNonQueryAsync(); }
    }
}
