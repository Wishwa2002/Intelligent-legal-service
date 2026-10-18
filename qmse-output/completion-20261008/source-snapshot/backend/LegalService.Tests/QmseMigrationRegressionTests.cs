using LegalService.API.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
namespace LegalService.Tests;
public sealed class QmseMigrationRegressionTests
{
    [PostgresTheory][InlineData(true)]
    public async Task FreshMigrationsSupportAppointmentQueriesAndMatchAllModelColumns(bool fresh)
    {
        Assert.True(fresh);
        var maintenance=new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        Assert.True(maintenance.Host is "127.0.0.1" or "localhost","Only isolated loopback allowed.");
        var name="qmse_migration_"+Guid.NewGuid().ToString("N");await using var c=new NpgsqlConnection(maintenance.ConnectionString);await c.OpenAsync();await new NpgsqlCommand($"CREATE DATABASE \"{name}\"",c).ExecuteNonQueryAsync();
        try
        {
            var cs=new NpgsqlConnectionStringBuilder(maintenance.ConnectionString){Database=name}.ConnectionString;
            await using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(cs).Options);
            await db.Database.MigrateAsync();Assert.Empty(await db.Appointments.ToListAsync());
            await using var actual=new NpgsqlConnection(cs);await actual.OpenAsync();
            foreach(var table in db.Model.GetRelationalModel().Tables)
            foreach(var col in table.Columns)
            {
                await using var q=new NpgsqlCommand("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name=@table AND column_name=@column",actual);
                q.Parameters.AddWithValue("table",table.Name);q.Parameters.AddWithValue("column",col.Name);
                Assert.True(Convert.ToInt32(await q.ExecuteScalarAsync())==1,$"Fresh migration missing {table.Name}.{col.Name}");
            }
        }
        finally {NpgsqlConnection.ClearAllPools();await new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)",c).ExecuteNonQueryAsync();}
    }
}
