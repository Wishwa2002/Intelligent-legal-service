using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.Models.Entities;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/clients")]
public class ClientsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ClientsController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all registered clients/customers with their request counts and metadata.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search = null)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
        }

        var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync();

        var userIds = users.Select(u => u.UserId).ToList();
        var requestCounts = await _context.DocumentationRequests
            .Where(r => userIds.Contains(r.CustomerId))
            .GroupBy(r => r.CustomerId)
            .Select(g => new { CustomerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CustomerId, x => x.Count);

        var result = users.Select(u => new
        {
            userId = u.UserId,
            name = u.Name,
            email = u.Email,
            role = u.Role ?? "Customer",
            createdAt = u.CreatedAt,
            updatedAt = u.UpdatedAt,
            requestCount = requestCounts.TryGetValue(u.UserId, out var count) ? count : 0
        });

        return Ok(result);
    }

    /// <summary>
    /// Get client profile and associated requests by user ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = $"Client with ID '{id}' was not found." });

        var requests = await _context.DocumentationRequests
            .Include(r => r.DocumentationService)
            .Where(r => r.CustomerId == id)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                requestId = r.RequestId,
                serviceName = r.DocumentationService.Name,
                documentType = r.DocumentType,
                status = r.Status,
                createdAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            userId = user.UserId,
            name = user.Name,
            email = user.Email,
            role = user.Role ?? "Customer",
            createdAt = user.CreatedAt,
            updatedAt = user.UpdatedAt,
            requestCount = requests.Count,
            requests
        });
    }

    /// <summary>
    /// Delete a client/customer account and all associated documentation requests and files.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = $"Client with ID '{id}' was not found." });

        if (user.Role?.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true)
        {
            return BadRequest(new { message = "Cannot delete an Administrator account." });
        }

        // Retrieve and delete any documentation requests & files belonging to this client
        var requests = await _context.DocumentationRequests
            .Include(r => r.DocumentFiles)
            .Where(r => r.CustomerId == id)
            .ToListAsync();

        foreach (var req in requests)
        {
            foreach (var file in req.DocumentFiles)
            {
                try
                {
                    if (!string.IsNullOrEmpty(file.FilePath) && System.IO.File.Exists(file.FilePath))
                    {
                        System.IO.File.Delete(file.FilePath);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WARNING] Failed to delete file {file.FilePath}: {ex.Message}");
                }
            }
            _context.DocumentFiles.RemoveRange(req.DocumentFiles);
        }

        if (requests.Count > 0)
        {
            _context.DocumentationRequests.RemoveRange(requests);
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Client '{user.Name}' and all associated records deleted successfully." });
    }
}
