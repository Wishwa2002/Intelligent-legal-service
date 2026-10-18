using LegalService.API.Data;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using UglyToad.PdfPig.Writer;
using UglyToad.PdfPig.Content;
namespace LegalService.Tests;
public sealed class QmseUploadRegressionTests
{
    private static byte[] Pdf() { var b=new PdfDocumentBuilder(); b.AddPage(PageSize.A4); return b.Build(); }
    private static async Task<ApplicationDbContext> Db()
    {
        var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.DocumentationRequests.Add(new(){RequestId=1,CustomerId=42,ServiceId=1,DocumentType="Synthetic",Status="PENDING"});await db.SaveChangesAsync();return db;
    }
    private static DocumentFileService Service(ApplicationDbContext db)=>new(db,Mock.Of<IWebHostEnvironment>(x=>x.EnvironmentName=="Staging"));
    private static FormFile Upload(byte[] bytes,string name,string mime)=>new(new MemoryStream(bytes),0,bytes.Length,"file",name){Headers=new HeaderDictionary(),ContentType=mime};
    [Theory][InlineData("application/pdf")][InlineData("application/octet-stream")][InlineData("")]
    public async Task GenuinePdfIsStoredAndDownloadsUnchanged(string mime)
    {
        await using var db=await Db();var bytes=Pdf();var s=Service(db);var r=await s.UploadFileAsync(1,Upload(bytes,"valid.pdf",mime));
        Assert.Equal("application/pdf",r.ContentType);Assert.Equal("UNDER_REVIEW",(await db.DocumentationRequests.SingleAsync()).Status);
        var download=(await s.DownloadFileAsync(r.FileId))!.Value;using var copy=new MemoryStream();await download.fileStream.CopyToAsync(copy);download.fileStream.Dispose();Assert.Equal(bytes,copy.ToArray());
    }
    [Theory][InlineData("%PDF-1.7\nnot a PDF")][InlineData("MZ inert bytes")][InlineData("<html>not PDF</html>")]
    public async Task InvalidContentHasNoPersistenceOrStateTransition(string text)
    {
        await using var db=await Db();await Assert.ThrowsAsync<ArgumentException>(()=>Service(db).UploadFileAsync(1,Upload(System.Text.Encoding.ASCII.GetBytes(text),"bad.pdf","application/pdf")));
        Assert.Empty(await db.DocumentFiles.ToListAsync());Assert.Equal("PENDING",(await db.DocumentationRequests.SingleAsync()).Status);
    }
    [Theory][InlineData("valid.png","image/png")][InlineData("valid.jpg","image/jpeg")]
    public async Task PdfRenamedAsImageIsRejected(string name,string mime)
    {
        await using var db=await Db();await Assert.ThrowsAsync<ArgumentException>(()=>Service(db).UploadFileAsync(1,Upload(Pdf(),name,mime)));Assert.Empty(await db.DocumentFiles.ToListAsync());
    }
    [Fact]public async Task PdfWithImageMimeIsRejected()
    {
        await using var db=await Db();await Assert.ThrowsAsync<ArgumentException>(()=>Service(db).UploadFileAsync(1,Upload(Pdf(),"valid.pdf","image/png")));
    }
    [Fact]public async Task EveryRepositorySamplePdfPassesValidation()
    {
        await using var db=await Db();var dir=Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,"../../../../LegalService.API/Storage/SampleDocuments"));var files=Directory.GetFiles(dir,"*.pdf");Assert.NotEmpty(files);
        foreach(var path in files)await Service(db).UploadFileAsync(1,Upload(await System.IO.File.ReadAllBytesAsync(path),Path.GetFileName(path),"application/pdf"));
        Assert.Equal(files.Length,await db.DocumentFiles.CountAsync());Console.WriteLine($"Validated {files.Length} genuine repository sample PDFs.");
    }
    [Theory]
    [InlineData("png","image/png","iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGP88OEDAwMDEwMYAAAh6gLUQUR+wQAAAABJRU5ErkJggg==")]
    [InlineData("jpg","image/jpeg","/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3CiiigD//2Q==")]
    public async Task GenuineImageUploadStillPersists(string extension,string mime,string base64)
    {
        await using var db=await Db();var bytes=Convert.FromBase64String(base64);
        var result=await Service(db).UploadFileAsync(1,Upload(bytes,"synthetic."+extension,mime));
        Assert.Equal(mime,result.ContentType);Assert.Equal(bytes,(await db.DocumentFiles.SingleAsync()).FileContents);
    }
}
