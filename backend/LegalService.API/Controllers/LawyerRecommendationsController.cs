using LegalService.API.Services.Lawyers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using LegalService.API.Infrastructure;
using LegalService.API.Data;
using Microsoft.EntityFrameworkCore;
namespace LegalService.API.Controllers;
[ApiController, Route("api/lawyer-recommendations"), Authorize(Roles = "Admin")]
public sealed class LawyerRecommendationsController(ILawyerRecommendationService service, ApplicationDbContext db) : ControllerBase
{
    private int UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
        ? id : throw new ApiException(401, "A valid staff identity is required.");

    [HttpPost]
    public async Task<IActionResult> Recommend(RecommendationRequest request, CancellationToken ct) => Ok(await service.RecommendAsync(request, UserId, ct));

    [HttpGet("{workflowId:guid}")]
    public async Task<IActionResult> Get(Guid workflowId, CancellationToken ct) => Ok(await service.GetAsync(workflowId, UserId, ct));

    [HttpGet("customers")]
    public async Task<IActionResult> SearchCustomers([FromQuery] string? search, CancellationToken ct)
    {
        var term = search?.Trim() ?? "";
        var query = db.Users.AsNoTracking().Where(u => u.Role == "Customer");
        if (term.Length > 0)
            query = query.Where(u => u.Name.ToLower().Contains(term.ToLower()) || u.Email.ToLower().Contains(term.ToLower()));
        var users = await query.OrderBy(u => u.Name).Take(20)
            .Select(u => new { u.UserId, u.Name, u.Email }).ToListAsync(ct);
        return Ok(users.Select(u => new
        {
            customerId = Guid.Parse($"00000000-0000-0000-0000-{u.UserId:x12}"),
            u.Name, u.Email
        }));
    }

    [HttpPut("{workflowId:guid}/review")]
    public async Task<IActionResult> Review(Guid workflowId, SaveRecommendationReviewRequest request, CancellationToken ct) => Ok(await service.SaveReviewAsync(workflowId, request, UserId, ct));

    [HttpPost("{workflowId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid workflowId, ApproveRecommendationRequest request, CancellationToken ct)
        => Ok(await service.ApproveAsync(workflowId, request, UserId, ct));
}
