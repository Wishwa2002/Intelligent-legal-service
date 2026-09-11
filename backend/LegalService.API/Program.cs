using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.Authentication.Services;
using LegalService.API.Interfaces;
using LegalService.API.Services;
using LegalService.API.AgentIntegration;
using LegalService.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// ================================================================
// Database Connection (Neon PostgreSQL)
// ================================================================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    );
});

// ================================================================
// Authentication Services
// ================================================================
builder.Services.AddScoped<IPasswordService, PasswordService>();

// ================================================================
// Documentation & Clerk Management Services
// ================================================================
builder.Services.AddScoped<IClerkService, ClerkService>();
builder.Services.AddScoped<IDocumentationServiceService, DocumentationServiceService>();
builder.Services.AddScoped<IDocumentationRequestService, DocumentationRequestService>();
builder.Services.AddScoped<IDocumentFileService, DocumentFileService>();
builder.Services.AddScoped<ICareerService, CareerService>();

// Agentic AI Integration
builder.Services.AddHttpClient<IAgentIntegrationService, AgentIntegrationService>();

// ================================================================
// CORS Configuration
// ================================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ================================================================
// Controllers & JSON Serialization
// ================================================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// ================================================================
// Swagger / OpenAPI
// ================================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


var app = builder.Build();

// ================================================================
// HTTP Pipeline Configuration
// ================================================================
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Legal Service API v1");
    });
}

app.UseCors("AllowAll");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();