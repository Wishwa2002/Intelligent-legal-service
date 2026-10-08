using LegalService.API.Infrastructure;
using LegalService.API.Services.Workforce;
using LegalService.API.Services.Lawyers;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.Authentication.Services;
using LegalService.API.Interfaces;
using LegalService.API.Services;
using LegalService.API.AgentIntegration;
using LegalService.API.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using LegalService.API.Services.AgentWorkflows;

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
builder.Services.AddScoped<JwtService>();
builder.Services.AddHttpClient<ILawyerRecommendationService, RecommendationService>(c => c.Timeout = TimeSpan.FromSeconds(45));
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

// ================================================================
// Documentation & Clerk Management Services
// ================================================================
builder.Services.AddScoped<IClerkService, ClerkService>();
builder.Services.AddScoped<IDocumentationServiceService, DocumentationServiceService>();
builder.Services.AddScoped<IDocumentationRequestService, DocumentationRequestService>();
builder.Services.AddScoped<IDocumentFileService, DocumentFileService>();
builder.Services.AddScoped<ICareerService, CareerService>();
builder.Services.AddScoped<LegalService.API.Services.Clients.ClientService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddOptions<WorkforceOptions>().BindConfiguration("Workforce")
    .Validate(o => o.RecentWindowDays is > 0 and <= 365 && o.FutureWindowDays is > 0 and <= 365 &&
        o.MinimumDemand > 0 && o.WatchRatio > 0 && o.ConcernRatio >= o.WatchRatio && o.SnapshotMaxAgeHours > 0,
        "Workforce windows and thresholds must be positive and concern ratio must exceed watch ratio.").ValidateOnStart();
builder.Services.AddScoped<WorkforceAnalysisService>();
builder.Services.AddScoped<WorkforceSettingsService>();
builder.Services.AddScoped<WorkforceDemoService>();
builder.Services.AddHttpClient<HiringSuggestionService>(c => c.Timeout = TimeSpan.FromSeconds(45));
builder.Services.AddScoped<IEmailNotificationService, EmailNotificationService>();

// ================================================================
// Customer Service Request Management
// ================================================================
builder.Services.AddScoped<IServiceRequestService, ServiceRequestService>();
builder.Services.AddScoped<IServiceRequestChatService,ServiceRequestChatService>();

// ================================================================
// Appointment & Booking Management
// ================================================================
builder.Services.AddScoped<LegalService.API.Services.Scheduling.AvailabilityService>();
builder.Services.AddScoped<LegalService.API.Services.Scheduling.LawyerScheduleService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();

// Agentic AI Integration
builder.Services.AddHttpClient<IAgentIntegrationService, AgentIntegrationService>();

//Condinator Agent Integration
builder.Services.AddScoped<
    IPlanningCoordinatorService,
    PlanningCoordinatorService>();

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
builder.Services.AddControllers(options => options.Filters.Add<LegalService.API.Infrastructure.LawyerAccessFilter>())
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// ================================================================
// Swagger / OpenAPI
// ================================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ================================================================
// JWT Authentication
// ================================================================
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ClockSkew = TimeSpan.FromSeconds(30),

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(
                builder.Configuration["Jwt:Key"]!
            ))
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            if (!int.TryParse(context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id))
            {
                context.Fail("Account unavailable.");
                return;
            }
            var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(
                account => account.UserId == id, context.HttpContext.RequestAborted);
            if (user is null)
            {
                context.Fail("Account unavailable.");
                return;
            }
            var identity = (ClaimsIdentity)context.Principal!.Identity!;
            foreach (var claim in identity.FindAll(ClaimTypes.Role).ToArray()) identity.RemoveClaim(claim);
            identity.AddClaim(new Claim(ClaimTypes.Role, user.Role));
        }
    };
});
builder.Services.AddAuthorization();

var app = builder.Build();

if (args.Contains("--backfill-lawyer-schedules"))
{
    if (!app.Environment.IsDevelopment())
        throw new InvalidOperationException("Schedule backfill command may only run in Development.");
    using var scope = app.Services.CreateScope();
    var result = await LawyerScheduleBackfill.RunAsync(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
    Console.WriteLine($"Schedule backfill: {result.Lawyers} lawyers, {result.Durations} unset durations configured.");
    return;
}

if (args.Contains("--seed-development-admin"))
{
    using var scope = app.Services.CreateScope();
    var created = await DevelopmentAdminSeeder.SeedAsync(
        scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(),
        scope.ServiceProvider.GetRequiredService<IPasswordService>(), app.Configuration, app.Environment);
    Console.WriteLine(created ? "Development Admin setup: created." : "Development Admin setup: already exists; unchanged.");
    return;
}

if (args.Contains("--seed-demo-lawyers") || args.Contains("--seed-demo-scheduling") || args.Contains("--report-demo-lawyers") ||
    args.Contains("--normalize-synthetic-lawyers"))
{
    if (!app.Environment.IsDevelopment())
        throw new InvalidOperationException("Demo data commands may only run in Development.");
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (args.Contains("--normalize-synthetic-lawyers"))
    {
        var result = await DemoLawyerSeeder.NormalizeSyntheticIdentitiesAsync(db);
        Console.WriteLine($"Synthetic identities normalized: {result.LawyerNamesChanged} lawyer names, " +
            $"{result.LicensesChanged} licenses, {result.AccountNamesChanged} account names.");
    }
    if (args.Contains("--seed-demo-scheduling")) {
        var result = await DemoLawyerSeeder.SeedExistingSchedulesAsync(db,
            scope.ServiceProvider.GetRequiredService<LegalService.API.Services.Scheduling.AvailabilityService>().Today);
        Console.WriteLine($"Scheduling demo: {result.Windows} appointment snapshots, {result.Slots} booked slots added; profiles/accounts preserved.");
    }
    if (args.Contains("--seed-demo-lawyers"))
    {
        var result = await DemoLawyerSeeder.SeedAsync(db,
            scope.ServiceProvider.GetRequiredService<IPasswordService>(),
            scope.ServiceProvider.GetRequiredService<LegalService.API.Services.Scheduling.AvailabilityService>().Today);
        Console.WriteLine($"Demo seed: {result.LawyersCreated} lawyers, {result.ServicesCreated} legal services, " +
            $"{result.AvailabilitiesCreated} appointment timing snapshots, {result.SlotsCreated} booked snapshot slots added. " +
            $"Customer created: {result.CustomerCreated}. Customer UUID: {result.CustomerId}");
    }
    Console.WriteLine(JsonSerializer.Serialize(await DemoLawyerSeeder.ReportAsync(db),
        new JsonSerializerOptions { WriteIndented = true }));
    return;
}

// ================================================================
// HTTP Pipeline Configuration
// ================================================================
app.UseMiddleware<ExceptionMiddleware>();
app.UseWhen(context => (context.Request.Path.StartsWithSegments("/api/lawyer-recommendations") || context.Request.Path.StartsWithSegments("/api/workforce-analysis") || context.Request.Path.StartsWithSegments("/api/careers") || context.Request.Path.StartsWithSegments("/api/workforce-settings") || context.Request.Path.StartsWithSegments("/api/clients") || context.Request.Path.StartsWithSegments("/api/dev/workforce-demo") || context.Request.Path.StartsWithSegments("/api/lawyers") || context.Request.Path.StartsWithSegments("/api/lawyer") || context.Request.Path.StartsWithSegments("/api/auth") || context.Request.Path.StartsWithSegments("/api/appointments")), branch => branch.UseExceptionHandler());

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Legal Service API v1");
    });
}

app.UseCors("AllowAll");

// Only redirect to HTTPS in production – in dev the HTTPS port is not configured,
// causing mobile HTTP requests to hang on the 307 redirect.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();   // Must be before UseAuthorization()
app.UseAuthorization();

app.MapControllers();
app.MapWorkforceDemoEndpoints();

if (!app.Configuration.GetValue<bool>("EfDesignTime"))
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var passwordService = scope.ServiceProvider.GetRequiredService<LegalService.API.Authentication.Services.IPasswordService>();
        await DbInitializer.SeedCategoriesAsync(dbContext);
        await DbInitializer.SeedDocumentationServicesAsync(dbContext);
        await DbInitializer.SeedStaffAccountsAsync(dbContext, passwordService,app.Configuration);
        if (app.Environment.IsDevelopment())
        {
            var result = await LawyerScheduleBackfill.RunAsync(dbContext);
            scope.ServiceProvider.GetRequiredService<ILogger<Program>>().LogInformation(
                "Schedule backfill: {Lawyers} lawyers, {Durations} unset durations configured.", result.Lawyers, result.Durations);
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Failed to seed lawyer categories, documentation services, or staff accounts in database.");
    }
}

if (!app.Configuration.GetValue<bool>("EfDesignTime"))
    app.Run();
