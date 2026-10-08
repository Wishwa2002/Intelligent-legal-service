using LegalService.API.Data;
using LegalService.API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using Npgsql;
using UglyToad.PdfPig.Writer;
using UglyToad.PdfPig.Content;
namespace LegalService.Tests;
public sealed class QmseDocumentPostgresTests
{
    [PostgresTheory][InlineData(true)]
    public async Task AttachmentCommitFailureRollsBackFileAndRequestStatus(bool isolated)
    {
        Assert.True(isolated);await WithDatabase(async db=>{
            db.DocumentationServices.Add(new(){ServiceId=9001,Name="Synthetic",IsActive=true});
            db.DocumentationRequests.Add(new(){RequestId=1,ServiceId=9001,CustomerId=42,DocumentType="Synthetic",Status="PENDING"});await db.SaveChangesAsync();
            await db.Database.ExecuteSqlRawAsync("""
                CREATE FUNCTION qmse_fail_attach() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN RAISE EXCEPTION 'Synthetic attachment commit failure'; END; $$;
                CREATE TRIGGER qmse_fail_attach BEFORE INSERT ON "DocumentFiles" FOR EACH ROW EXECUTE FUNCTION qmse_fail_attach();
                """);
            var b=new PdfDocumentBuilder();b.AddPage(PageSize.A4);var bytes=b.Build();
            var file=new FormFile(new MemoryStream(bytes),0,bytes.Length,"file","synthetic.pdf"){Headers=new HeaderDictionary(),ContentType="application/pdf"};
            var s=new DocumentFileService(db,Mock.Of<IWebHostEnvironment>(x=>x.EnvironmentName=="Staging"));
            await Assert.ThrowsAsync<DbUpdateException>(()=>s.UploadFileAsync(1,file));db.ChangeTracker.Clear();
            Assert.Empty(await db.DocumentFiles.ToListAsync());Assert.Equal("PENDING",(await db.DocumentationRequests.SingleAsync()).Status);
            // Existing request remains legitimate; no invented atomic request+3-files API.
        });
    }
    [PostgresTheory][InlineData(true)]
    public async Task ExplicitCallerTransactionRollsBackRequestWhenAttachmentValidationFails(bool isolated)
    {
        Assert.True(isolated);await WithDatabase(async db=>{
            db.DocumentationServices.Add(new(){ServiceId=9001,Name="Synthetic",IsActive=true});await db.SaveChangesAsync();
            await using(var tx=await db.Database.BeginTransactionAsync())
            {
                var r=await new DocumentationRequestService(db).CreateRequestAsync(42,new(){ServiceId=9001,DocumentType="Synthetic"});
                var bad=new FormFile(new MemoryStream("MZ inert"u8.ToArray()),0,8,"file","bad.pdf"){Headers=new HeaderDictionary(),ContentType="application/pdf"};
                await Assert.ThrowsAsync<ArgumentException>(()=>new DocumentFileService(db,Mock.Of<IWebHostEnvironment>(x=>x.EnvironmentName=="Staging")).UploadFileAsync(r.RequestId,bad));
                await tx.RollbackAsync();
            }
            db.ChangeTracker.Clear();Assert.Empty(await db.DocumentationRequests.ToListAsync());Assert.Empty(await db.DocumentFiles.ToListAsync());
            // Proves service composability with a caller transaction, not existing HTTP batch semantics.
        });
    }
    private static async Task WithDatabase(Func<ApplicationDbContext,Task> execute)
    {
        var maintenance=new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));Assert.True(maintenance.Host is "127.0.0.1" or "localhost");
        var name="qmse_docs_"+Guid.NewGuid().ToString("N");await using var c=new NpgsqlConnection(maintenance.ConnectionString);await c.OpenAsync();await new NpgsqlCommand($"CREATE DATABASE \"{name}\"",c).ExecuteNonQueryAsync();
        try {await using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString){Database=name}.ConnectionString).Options);await db.Database.MigrateAsync();await execute(db);}
        finally {NpgsqlConnection.ClearAllPools();await new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)",c).ExecuteNonQueryAsync();}
    }
}
