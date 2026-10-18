using System.ComponentModel.DataAnnotations;
using LegalService.API.Data;
using LegalService.API.Services;
using LegalService.API.Services.Lawyers;
using LegalService.API.Services.Workforce;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Npgsql;
using UglyToad.PdfPig.Writer;
using UglyToad.PdfPig.Content;
namespace LegalService.Tests;
public sealed class RequirementsDecisionTests
{
    [Theory][InlineData(2,false)][InlineData(3,true)][InlineData(9,true)][InlineData(10,true)][InlineData(1000,true)][InlineData(1001,true)][InlineData(4000,true)][InlineData(4001,false)]
    public void ExistingRecommendationLengthContract(int length,bool expected)
    {
        var request=new RecommendationRequest { Requirement=new string('x',length),ClientId=42 };
        Assert.Equal(expected,Validator.TryValidateObject(request,new(request),new List<ValidationResult>(),true));
    }
    [PostgresTheory][InlineData(true)]
    public async Task FailedDevelopmentUploadDoesNotLeaveAnOrphanFile(bool isolated)
    {
        await WithDatabase(async db=>{
            await Seed(db); await FailTrigger(db, "TRUE");
            var root=Path.Combine(Path.GetTempPath(),"qmse-orphan-"+Guid.NewGuid().ToString("N"));
            try {
                var env=Mock.Of<IWebHostEnvironment>(x=>x.EnvironmentName=="Development" && x.ContentRootPath==root);
                await Assert.ThrowsAsync<DbUpdateException>(()=>new DocumentFileService(db,env).UploadFileAsync(1,Pdf("valid.pdf")));
                db.ChangeTracker.Clear(); Assert.Empty(await db.DocumentFiles.ToListAsync());
                Assert.Equal("PENDING",(await db.DocumentationRequests.SingleAsync()).Status);
                Assert.Empty(Directory.Exists(root)?Directory.GetFiles(root,"*",SearchOption.AllDirectories):[]);
            } finally {if(Directory.Exists(root))Directory.Delete(root,true);}
        });
    }
    [Theory][InlineData(1439,false)][InlineData(1440,true)][InlineData(1441,true)][InlineData(0,false)][InlineData(-1,false)]
    public async Task ProposedCancellationNoticeAndUiCapabilityAgree(int minutes,bool allowed)
    {
        await using var f=new RecurringSchedulingTests.Fixture();await f.Seed();var a=await f.Occupy();
        f.Time.Now=new DateTimeOffset(2030,1,14,4,30,0,TimeSpan.Zero).AddMinutes(-minutes);
        var service=new AppointmentService(f.Db,NullLogger<AppointmentService>.Instance,f.Availability,Options.Create(new LegalService.API.Services.Scheduling.ProposedCancellationOptions{Enabled=true}));
        var details=await service.GetAppointmentByIdAsync(a.AppointmentId);Assert.Equal(allowed,details!.CanCancel);
        if(allowed) {Assert.Equal("Cancelled",(await service.CancelAppointmentAsync(a.AppointmentId,"Synthetic"))!.Status);Assert.False((await f.Db.AvailabilitySlots.SingleAsync()).IsBooked);}
        else {Assert.Equal(409,(await Assert.ThrowsAsync<LegalService.API.Infrastructure.ApiException>(()=>service.CancelAppointmentAsync(a.AppointmentId,"Synthetic"))).Status);Assert.Equal("Confirmed",a.Status);Assert.True((await f.Db.AvailabilitySlots.SingleAsync()).IsBooked);Assert.Empty(await f.Db.AppointmentStatusHistories.ToListAsync());}
    }
    [Theory][InlineData(79,"HEALTHY")][InlineData(80,"WATCH")][InlineData(81,"WATCH")][InlineData(99,"WATCH")][InlineData(100,"CAPACITY_CONCERN")]
    public void ProposedHeadroomUsesExactBoundaryAndAvoidsDoubleCounting(int demand,string expected)
    {
        var rules=new WorkforceOptions{ProposedHeadroomEnabled=true};
        Assert.Equal(expected,WorkforceAnalysisService.Assess(10,demand,demand,100,0,rules).Status);
    }
    [Theory][InlineData(false,0.8)][InlineData(true,0.66)]
    public void ProposedEffectiveRatioIsReportedAndPreservesCustomRules(bool custom,double expected)
    {
        var rules=new WorkforceOptions{ProposedHeadroomEnabled=true};
        var setting=custom?new LegalService.API.Models.Entities.PracticeAreaWorkforceSetting{WatchCapacityRatio=0.66,HighDemandThreshold=5}:null;
        var effective=WorkforceSettingsService.Resolve(setting,rules);
        Assert.Equal(expected,effective.WatchCapacityRatio,10);
        Assert.Equal("WATCH",WorkforceAnalysisService.Assess(10,80,80,100,0,rules,effective).Status);
        Assert.Equal(custom?"CUSTOM":"DEFAULT",effective.Source);
    }
    [Fact] public void WorkforceProposalIsDisabledByDefault()
    {
        var rules=new WorkforceOptions();Assert.False(rules.ProposedHeadroomEnabled);
        Assert.Equal("WATCH",WorkforceAnalysisService.Assess(10,75,75,100,0,rules).Status);
        Assert.Equal("HEALTHY",WorkforceAnalysisService.Assess(10,74,74,100,0,rules).Status);
    }
    [Fact] public void ProposedAtomicBatchIsDisabledByDefault()
    {
        using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        Assert.ThrowsAsync<NotSupportedException>(()=>new DocumentFileService(db,Mock.Of<IWebHostEnvironment>()).UploadFilesAtomicallyAsync(1,[Pdf("one.pdf")])).GetAwaiter().GetResult();
    }
    [PostgresTheory][InlineData("Development",false)][InlineData("Staging",false)][InlineData("Development",true)][InlineData("Staging",true)]
    public async Task ProposedBatchRollsBackAllMetadataAndBytesOnSecondFileFailure(string environment,bool persistenceFailure)
    {
        await WithDatabase(async db=>{
            await Seed(db);if(persistenceFailure)await FailTrigger(db,"NEW.\"FileName\" = 'second.pdf'");
            var root=Path.Combine(Path.GetTempPath(),"qmse-batch-"+Guid.NewGuid().ToString("N"));
            var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ProposedRules:AtomicDocumentBatch","true"}}).Build();
            try {
                var service=new DocumentFileService(db,Mock.Of<IWebHostEnvironment>(x=>x.EnvironmentName==environment && x.ContentRootPath==root),config);
                IFormFile second=persistenceFailure?Pdf("second.pdf"):new FormFile(new MemoryStream("MZ inert"u8.ToArray()),0,8,"file","bad.pdf"){Headers=new HeaderDictionary(),ContentType="application/pdf"};
                var error=await Record.ExceptionAsync(()=>service.UploadFilesAtomicallyAsync(1,[Pdf("first.pdf"),second]));Assert.NotNull(error);
                Assert.IsType(persistenceFailure?typeof(DbUpdateException):typeof(ArgumentException),error);
                db.ChangeTracker.Clear();Assert.Empty(await db.DocumentFiles.ToListAsync());Assert.Equal("PENDING",(await db.DocumentationRequests.SingleAsync()).Status);
                Assert.Empty(Directory.Exists(root)?Directory.GetFiles(root,"*",SearchOption.AllDirectories):[]);
            } finally {if(Directory.Exists(root))Directory.Delete(root,true);}
        });
    }
    [PostgresTheory][InlineData("Development")][InlineData("Staging")]
    public async Task ProposedValidBatchCommitsBothFilesAndStatus(string environment)
    {
        await WithDatabase(async db=>{
            await Seed(db);var root=Path.Combine(Path.GetTempPath(),"qmse-valid-batch-"+Guid.NewGuid().ToString("N"));
            var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ProposedRules:AtomicDocumentBatch","true"}}).Build();
            try {
                var service=new DocumentFileService(db,Mock.Of<IWebHostEnvironment>(x=>x.EnvironmentName==environment && x.ContentRootPath==root),config);
                var results=await service.UploadFilesAtomicallyAsync(1,[Pdf("first.pdf"),Pdf("second.pdf")]);Assert.Equal(2,results.Count);
                db.ChangeTracker.Clear();Assert.Equal(2,await db.DocumentFiles.CountAsync());Assert.Equal("UNDER_REVIEW",(await db.DocumentationRequests.SingleAsync()).Status);
                foreach(var r in results){var download=await service.DownloadFileAsync(r.FileId);Assert.NotNull(download);await download.Value.fileStream.DisposeAsync();}
            } finally {if(Directory.Exists(root))Directory.Delete(root,true);}
        });
    }
    private static FormFile Pdf(string name) {var b=new PdfDocumentBuilder();b.AddPage(PageSize.A4);var bytes=b.Build();return new(new MemoryStream(bytes),0,bytes.Length,"file",name){Headers=new HeaderDictionary(),ContentType="application/pdf"};}
    private static async Task Seed(ApplicationDbContext db) {db.DocumentationServices.Add(new(){ServiceId=9001,Name="Synthetic",IsActive=true});db.DocumentationRequests.Add(new(){RequestId=1,ServiceId=9001,CustomerId=42,DocumentType="Synthetic",Status="PENDING"});await db.SaveChangesAsync();}
    private static Task FailTrigger(ApplicationDbContext db,string predicate)=>db.Database.ExecuteSqlRawAsync("CREATE FUNCTION qmse_proposed_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF "+predicate+" THEN RAISE EXCEPTION 'Synthetic persistence failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER qmse_proposed_fail BEFORE INSERT ON \"DocumentFiles\" FOR EACH ROW EXECUTE FUNCTION qmse_proposed_fail();");
    private static async Task WithDatabase(Func<ApplicationDbContext,Task> execute)
    {
        var maintenance=new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));Assert.True(maintenance.Host is "127.0.0.1" or "localhost");
        var name="qmse_rules_"+Guid.NewGuid().ToString("N");await using var c=new NpgsqlConnection(maintenance.ConnectionString);await c.OpenAsync();await new NpgsqlCommand($"CREATE DATABASE \"{name}\"",c).ExecuteNonQueryAsync();
        try {await using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString){Database=name}.ConnectionString).Options);await db.Database.MigrateAsync();await execute(db);}
        finally {NpgsqlConnection.ClearAllPools();await new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)",c).ExecuteNonQueryAsync();}
    }
}
