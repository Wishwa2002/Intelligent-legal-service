using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.Authentication.Services;


var builder = WebApplication.CreateBuilder(args);


// Neon PostgreSQL Connection
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    );
});


// Authentication Services
builder.Services.AddScoped<IPasswordService, PasswordService>();


// Controllers
builder.Services.AddControllers();


// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


var app = builder.Build();


// Swagger UI
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseHttpsRedirection();

app.MapControllers();


app.Run();