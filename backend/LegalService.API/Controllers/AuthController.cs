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

    private readonly JwtService _jwtService;


    public AuthController(
        ApplicationDbContext context,
        IPasswordService passwordService,
        JwtService jwtService)
    {
        _context = context;
        _passwordService = passwordService;
        _jwtService = jwtService;
    }



    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // Check existing email
        var existingUser = await _context.Users
         .FirstOrDefaultAsync(x => x.Email != null &&
                              x.Email.ToLower() == normalizedEmail);

        if (existingUser != null)
        {
            return BadRequest(new { message = "Email already exists." });
        }

        // Hash password
        var passwordHash = _passwordService.HashPassword(request.Password);

        var roleName = "Customer";

        var fullName = string.IsNullOrWhiteSpace(request.FullName)
            ? normalizedEmail.Split('@')[0]
            : request.FullName.Trim();

        // Create user
        var user = new User
        {
            Name = fullName,
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = roleName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "User registered successfully",
            userId = user.UserId,
            name = user.Name,
            email = user.Email,
            role = user.Role
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

            var token = _jwtService.GenerateToken(
                clerk.ClerkId,
                clerk.Email!,
                "Clerk"
            );

            return Ok(new
            {
                token,
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

            var role = user.Role ?? "Customer";

            var token = _jwtService.GenerateToken(
                user.UserId,
                user.Email,
                role
            );

            return Ok(new
            {
                token,
                userId = user.UserId,
                name = user.Name,
                email = user.Email,
                role,
                message = "Login successful"
            });
        }

        return Unauthorized(new { message = "No account found with this email/username." });
    }

    /// <summary>
    /// Retrieve user profile by user ID.
    /// </summary>
    [HttpGet("user/{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = $"User with ID {id} not found." });

        return Ok(new
        {
            userId = user.UserId,
            name = user.Name,
            email = user.Email,
            role = user.Role ?? "Customer"
        });
    }
}