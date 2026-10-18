using LegalService.API.Data;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Moq;
namespace LegalService.Tests;
public sealed class QmseDocumentTests
{
    private static ApplicationDbContext Database()=>new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static DocumentFileService Service(ApplicationDbContext db) { var env=new Mock<IWebHostEnvironment>(); env.SetupGet(x=>x.EnvironmentName).Returns(Environments.Staging); return new(db,env.Object); }
    private static FormFile File(byte[] bytes)=>new(new MemoryStream(bytes),0,bytes.Length,"file","sample.pdf") { Headers=new HeaderDictionary(),ContentType="application/pdf" };
    [Theory] [InlineData(10485760,true)] [InlineData(10485761,false)]
    public async Task Qmse_TC_C3_09_ExactTenMiBBoundary(int length,bool accepted)
    {
        using var db=Database(); db.DocumentationServices.Add(new(){ServiceId=1,Name="Test",IsActive=true}); db.DocumentationRequests.Add(new(){RequestId=1,ServiceId=1,CustomerId=42,DocumentType="Test",Status="PENDING"}); await db.SaveChangesAsync();
        var bytes=Enumerable.Repeat((byte)32,length).ToArray(); var builder=new UglyToad.PdfPig.Writer.PdfDocumentBuilder(); builder.AddPage(UglyToad.PdfPig.Content.PageSize.A4); builder.Build().CopyTo(bytes,0); var file=File(bytes);
        if(accepted) { var r=await Service(db).UploadFileAsync(1,file); Assert.NotNull(r); Assert.Single(await db.DocumentFiles.ToListAsync()); }
        else { await Assert.ThrowsAsync<ArgumentException>(()=>Service(db).UploadFileAsync(1,file)); Assert.Empty(await db.DocumentFiles.ToListAsync()); }
    }
    [Fact] public async Task Qmse_DEF12_SpoofedPdfMustBeRejected()
    {
        using var db=Database(); db.DocumentationRequests.Add(new(){RequestId=1,ServiceId=1,CustomerId=42,DocumentType="Test",Status="PENDING"}); await db.SaveChangesAsync();
        // Inert ASCII bytes beginning MZ; no executable is created or run.
        var file=File(System.Text.Encoding.ASCII.GetBytes("MZ inert synthetic non-PDF bytes"));
        await Assert.ThrowsAsync<ArgumentException>(()=>Service(db).UploadFileAsync(1,file));
    }
    [Fact] public async Task Qmse_TC_C3_10_UnknownServiceRejectedBeforeInsert()
    {
        using var db=Database(); await Assert.ThrowsAsync<ArgumentException>(()=>new DocumentationRequestService(db).CreateRequestAsync(42,new(){ServiceId=9999,DocumentType="Test"})); Assert.Empty(await db.DocumentationRequests.ToListAsync());
    }
    [Fact] public async Task Qmse_DEF13_SeedsTwelveServicesIdempotently()
    {
        using var db=Database(); await DbInitializer.SeedDocumentationServicesAsync(db); Assert.Equal(12,await db.DocumentationServices.CountAsync());
        await DbInitializer.SeedDocumentationServicesAsync(db); Assert.Equal(12,await db.DocumentationServices.CountAsync());
    }
    [Fact] public void Qmse_PasswordHashRejectsWrongPasswordAndReportsCost()
    {
        var service=new LegalService.API.Authentication.Services.PasswordService(); var hash=service.HashPassword("SyntheticPass123!");
        Assert.True(service.VerifyPassword("SyntheticPass123!",hash)); Assert.False(service.VerifyPassword("wrong",hash));
        Assert.DoesNotContain("SyntheticPass123!",hash); System.Console.WriteLine("QMSE BCrypt prefix/cost: "+hash[..7]);
    }
}
