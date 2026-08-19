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

}