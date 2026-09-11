using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Authentication.Services;
using LegalService.API.Models.Entities;


namespace LegalService.API.Controllers;


[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{

    private readonly ApplicationDbContext _context;
    private readonly IPasswordService _passwordService;


    public AuthController(
        ApplicationDbContext context,
        IPasswordService passwordService)
    {
        _context = context;
        _passwordService = passwordService;
    }



    [HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequest request)
    {

        // Check existing email
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Email == request.Email
            );


        if(existingUser != null)
        {
            return BadRequest(
                "Email already exists"
            );
        }



        // Hash password
        var passwordHash =
            _passwordService.HashPassword(
                request.Password
            );



        // Create user
        var user = new User
        {
            Id = Guid.NewGuid(),

            FullName = request.FullName,

            Email = request.Email,

            PasswordHash = passwordHash,

            IsActive = true,

            CreatedAt = DateTime.UtcNow
        };


        await _context.Users.AddAsync(user);



        // Find role
        var role = await _context.Roles
            .FirstOrDefaultAsync(
                x => x.Name == request.Role
            );



        // Create role if not exists
        if(role == null)
        {
            role = new Role
            {
                Id = Guid.NewGuid(),

                Name = request.Role
            };


            await _context.Roles.AddAsync(role);
        }



        // Assign role
        var userRole = new UserRole
        {
            UserId = user.Id,

            RoleId = role.Id
        };


        await _context.UserRoles.AddAsync(userRole);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "User registered successfully",
            userId = user.Id,
            role = role.Name
        });
    }

    /// <summary>
    /// Authenticate a user or clerk using their email/username and password.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email/Username and password are required." });

        var email = request.Email.Trim().ToLowerInvariant();

        // 1. Check Clerks
        var clerk = await _context.Clerks.FirstOrDefaultAsync(c => c.Email != null && c.Email.ToLower() == email);
        if (clerk != null)
        {
            if (!clerk.IsActive)
                return Unauthorized(new { message = "Clerk account is currently deactivated." });

            bool passwordValid = !string.IsNullOrEmpty(clerk.PasswordHash)
                && _passwordService.VerifyPassword(request.Password, clerk.PasswordHash);

            if (!passwordValid)
                return Unauthorized(new { message = "Invalid email or password." });

            return Ok(new
            {
                userId = clerk.ClerkId,
                name = clerk.Name,
                email = clerk.Email,
                role = "Clerk",
                department = clerk.Department,
                contact = clerk.Contact,
                message = "Login successful"
            });
        }

        // 2. Check Users
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user != null)
        {
            bool valid = string.IsNullOrEmpty(user.PasswordHash)
                || _passwordService.VerifyPassword(request.Password, user.PasswordHash);

            if (!valid)
                return Unauthorized(new { message = "Invalid email or password." });

            return Ok(new
            {
                userId = user.Id,
                name = user.FullName,
                email = user.Email,
                role = "User",
                message = "Login successful"
            });
        }

        return Unauthorized(new { message = "No account found with this email/username." });
    }
}