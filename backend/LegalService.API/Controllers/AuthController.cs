using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using LegalService.API.DTOs.LawyerMobile;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
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



  [HttpPost("signup")]
public async Task<IActionResult> Register([FromBody] RegisterRequest request)
{
    await using var transaction =
        await _context.Database.BeginTransactionAsync();

    try
    {
        // ---------------------------------------------------------
        // Basic validation
        // ---------------------------------------------------------

        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new
            {
                message = "Email and password are required."
            });
        }
        if (!new EmailAddressAttribute().IsValid(request.Email))
        {
            return BadRequest(new
            {
                message = "Invalid email format."
            });
        }

        if (string.IsNullOrWhiteSpace(request.Role))
        {
            return BadRequest(new
            {
                message = "Role is required."
            });
        }

        var normalizedEmail = request.Email
            .Trim()
            .ToLowerInvariant();

        // ---------------------------------------------------------
        // Check duplicate email
        // ---------------------------------------------------------

        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.Email.ToLower() == normalizedEmail);

        if (existingUser != null)
        {
            return BadRequest(new
            {
                message = "Email already exists."
            });
        }

        // ---------------------------------------------------------
        // Validate role
        // ---------------------------------------------------------

        var allowedRoles = new[]
        {
            "Lawyer",
            "Clerk",
            "Customer"
        };

        var roleName = allowedRoles.FirstOrDefault(r =>
            r.Equals(
                request.Role.Trim(),
                StringComparison.OrdinalIgnoreCase
            )
        );

        if (roleName == null)
        {
            return BadRequest(new
            {
                message = "Invalid role."
            });
        }

        // ---------------------------------------------------------
        // Lawyer validation BEFORE creating User
        // ---------------------------------------------------------

        if (roleName == "Customer")
        {
            var customer = await new LegalService.API.Services.Clients.ClientService(_context, _passwordService).RegisterAsync(
                new() { FullName = request.FullName, Email = request.Email, Password = request.Password });
            await transaction.CommitAsync();
            return Ok(new { message = "Customer registered successfully", userId = customer.UserId, name = customer.Name, email = customer.Email, role = "Customer", lawyerId = (string?)null });
        }

        string? normalizedLicense = null;

        if (roleName.Equals(
            "Lawyer",
            StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                return BadRequest(new
                {
                    message = "Phone number is required for lawyer registration."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Qualification))
            {
                return BadRequest(new
                {
                    message = "Qualification is required for lawyer registration."
                });
            }

            if (request.Experience < 0)
            {
                return BadRequest(new
                {
                    message = "Experience cannot be negative."
                });
            }

            if (string.IsNullOrWhiteSpace(request.LicenseNumber))
            {
                return BadRequest(new
                {
                    message = "License number is required for lawyer registration."
                });
            }

            normalizedLicense =
                request.LicenseNumber.Trim();

            var licenseExists = await _context.Lawyers
                .AnyAsync(l =>
                    l.LicenseNumber == normalizedLicense);

            if (licenseExists)
            {
                return BadRequest(new
                {
                    message = "This license number is already registered."
                });
            }
        }

        // ---------------------------------------------------------
        // Clerk validation BEFORE creating User
        // ---------------------------------------------------------

        if (roleName.Equals(
            "Clerk",
            StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.Contact))
            {
                return BadRequest(new
                {
                    message = "Contact number is required for clerk registration."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Department))
            {
                return BadRequest(new
                {
                    message = "Department is required for clerk registration."
                });
            }

            var existingClerk = await _context.Clerks
                .FirstOrDefaultAsync(c =>
                    c.Email != null &&
                    c.Email.ToLower() == normalizedEmail);

            if (existingClerk != null)
            {
                return BadRequest(new
                {
                    message = "A clerk account with this email already exists."
                });
            }
        }

        // ---------------------------------------------------------
        // Find role from Roles table
        // ---------------------------------------------------------

        var role = await _context.Roles
            .FirstOrDefaultAsync(r =>
                r.Name.ToLower() == roleName.ToLower());

        if (role == null)
        {
            return BadRequest(new
            {
                message =
                    $"Role '{roleName}' does not exist in the Roles table."
            });
        }

        // ---------------------------------------------------------
        // Build common account values
        // ---------------------------------------------------------

        var fullName =
            string.IsNullOrWhiteSpace(request.FullName)
                ? normalizedEmail.Split('@')[0]
                : request.FullName.Trim();

        var passwordHash =
            _passwordService.HashPassword(request.Password);

        // ---------------------------------------------------------
        // Create User
        // ---------------------------------------------------------

        var user = new User
        {
            Name = fullName,
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = roleName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);

        // Save so PostgreSQL generates UserId.
        // Still inside transaction.
        await _context.SaveChangesAsync();

        // ---------------------------------------------------------
        // Create UserRole
        // ---------------------------------------------------------

        var userRole = new UserRole
        {
            UserId = user.UserId,
            RoleId = role.Id
        };

        _context.UserRoles.Add(userRole);

        // ---------------------------------------------------------
        // Create Lawyer profile
        // ---------------------------------------------------------

        Guid? lawyerId = null;

        if (roleName.Equals(
            "Lawyer",
            StringComparison.OrdinalIgnoreCase))
        {
            lawyerId = Guid.NewGuid();

            var lawyer = new Lawyer
            {
                LawyerId = lawyerId.Value,

                UserId = user.UserId,

                Name = user.Name,
                Email = user.Email,

                PhoneNumber =
                    request.PhoneNumber!.Trim(),

                Qualification =
                    request.Qualification!.Trim(),

                Experience =
                    request.Experience,

                LicenseNumber =
                    normalizedLicense!,

                ProfileDescription =
                    request.ProfileDescription?.Trim()
                    ?? string.Empty,

                Status = "Pending",

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null
            };

            _context.Lawyers.Add(lawyer);
        }

        // ---------------------------------------------------------
        // Create Clerk profile
        // ---------------------------------------------------------


        if (roleName.Equals(
            "Clerk",
            StringComparison.OrdinalIgnoreCase))
        {
            var clerk = new Clerk
            {
                Name = user.Name,
                Email = user.Email,

                Contact =
                    request.Contact!.Trim(),

                Department =
                    request.Department!.Trim(),

                IsActive = true,

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,

                UserId = user.UserId,

            };

            _context.Clerks.Add(clerk);

            // ClerkId will be available after SaveChangesAsync()
        }

        // ---------------------------------------------------------
        // Save UserRole + Lawyer + Clerk
        // ---------------------------------------------------------

        await _context.SaveChangesAsync();

        // ---------------------------------------------------------
        // Commit everything
        // ---------------------------------------------------------

        await transaction.CommitAsync();

        // ---------------------------------------------------------
        // Success response
        // ---------------------------------------------------------

        return Ok(new
        {
            message = $"{roleName} registered successfully",
            userId = user.UserId,
            lawyerId = lawyerId?.ToString(),
            name = user.Name,
            email = user.Email,
            role = user.Role
        });
    }
    catch (LegalService.API.DTOs.Clients.DuplicateClientException)
    { await transaction.RollbackAsync(); return BadRequest(new { message = "Email already exists." }); }
    catch (LegalService.API.Infrastructure.ApiException error)
    { await transaction.RollbackAsync(); return StatusCode(error.Status, new { message = error.Message }); }
    catch (DbUpdateException ex)
    {
        await transaction.RollbackAsync();

        Console.WriteLine(
            "========== SIGNUP DATABASE ERROR =========="
        );

        Console.WriteLine(ex.ToString());

        Console.WriteLine("INNER ERROR:");

        Console.WriteLine(
            ex.InnerException?.Message
        );

        Console.WriteLine(
            "==========================================="
        );

        return StatusCode(500, new
        {
            message =
                ex.InnerException?.Message
                ?? "Database error occurred while creating the account."
        });
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();

        Console.WriteLine(
            "========== SIGNUP ERROR =========="
        );

        Console.WriteLine(ex.ToString());

        Console.WriteLine(
            "=================================="
        );

        return StatusCode(500, new
        {
            message = ex.Message
        });
    }
}
    /// <summary>
    /// Authenticate a user or clerk using their email/username and password.
    /// </summary>
    [HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Email) ||
        string.IsNullOrWhiteSpace(request.Password))
    {
        return BadRequest(new
        {
            message = "Email/Username and password are required."
        });
    }

    var email = request.Email
        .Trim()
        .ToLowerInvariant();

    // ---------------------------------------------------------
    // Authenticate from Users table only
    // ---------------------------------------------------------

    var user = await _context.Users
        .FirstOrDefaultAsync(u =>
            u.Email.ToLower() == email);

    if (user == null)
    {
        return Unauthorized(new
        {
            message = "No account found with this email/username."
        });
    }

    // ---------------------------------------------------------
    // Verify password
    // ---------------------------------------------------------

    var valid = !string.IsNullOrWhiteSpace(user.PasswordHash)
        && _passwordService.VerifyPassword(
            request.Password,
            user.PasswordHash
        );
    if (!valid)
        {
            return Unauthorized(new
            {
                message = "Invalid email or password."
            });
        }
    
   
     
    

    

    var role = user.Role ?? "Customer";

    // ---------------------------------------------------------
    // Role-specific profile data
    // ---------------------------------------------------------

    Guid? lawyerId = null;
    int? clerkId = null;

    string? department = null;
    string? contact = null;

    // ---------------------------------------------------------
    // Lawyer profile
    // ---------------------------------------------------------

    if (role.Equals(
        "Lawyer",
        StringComparison.OrdinalIgnoreCase))
    {
        var lawyer = await _context.Lawyers
            .FirstOrDefaultAsync(l =>
                l.UserId == user.UserId);

        if (lawyer == null)
        {
            return Unauthorized(new
            {
                message = "Lawyer profile not found."
            });
        }

        if (lawyer.Status != "Active")
            return Unauthorized(new { message = lawyer.Status == "Pending"
                ? "Your lawyer account is pending approval." : "Your lawyer account is inactive. Contact the administrator." });
        lawyerId = lawyer.LawyerId;
    }

    // ---------------------------------------------------------
    // Clerk profile
    // ---------------------------------------------------------

    if (role.Equals(
        "Clerk",
        StringComparison.OrdinalIgnoreCase))
    {
        var clerk = await _context.Clerks
            .FirstOrDefaultAsync(c =>
                c.UserId == user.UserId);

        if (clerk == null)
        {
            return Unauthorized(new
            {
                message = "Clerk profile not found."
            });
        }

        if (!clerk.IsActive)
        {
            return Unauthorized(new
            {
                message = "Clerk account is currently deactivated."
            });
        }

        clerkId = clerk.ClerkId;
        department = clerk.Department;
        contact = clerk.Contact;
    }

    // ---------------------------------------------------------
    // Generate JWT
    // ---------------------------------------------------------

    var token = _jwtService.GenerateToken(
        user.UserId,
        user.Email,
        role
    );

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return Ok(new
    {
        token,

        userId = user.UserId,

        lawyerId = lawyerId?.ToString(),

        clerkId,

        name = user.Name,
        email = user.Email,
        role,

        department,
        contact,

        mustChangePassword = user.MustChangePassword,
        message = "Login successful"
    });
}

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return Unauthorized();
        var user = await _context.Users.SingleOrDefaultAsync(u => u.UserId == id);
        if (user == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(user.PasswordHash) || !_passwordService.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "The current password is incorrect." });
        if (request.NewPassword != request.ConfirmPassword)
            return BadRequest(new { message = "The new passwords do not match." });
        if (request.CurrentPassword == request.NewPassword || System.Text.Encoding.UTF8.GetByteCount(request.NewPassword) > 72 ||
            !request.NewPassword.Any(char.IsLetter) || !request.NewPassword.Any(char.IsDigit))
            return BadRequest(new { message = "Use a different password with letters and numbers, at most 72 UTF-8 bytes." });
        user.PasswordHash = _passwordService.HashPassword(request.NewPassword);
        user.MustChangePassword = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Password changed successfully.", mustChangePassword = false });
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