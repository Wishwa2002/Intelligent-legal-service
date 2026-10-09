using System.Security.Claims;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Services.Workforce;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LegalService.API.Controllers;

[ApiController, Route("api/workforce-analysis"), Authorize(Roles = "Admin")]
public sealed class WorkforceAnalysisController(WorkforceAnalysisService analysis, HiringSuggestionService hiring) : ControllerBase
{
    private int Owner => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) && id > 0
        ? id : throw new ApiException(401, "A valid Admin identity is required.");
    [HttpGet] public async Task<IActionResult> Get(CancellationToken ct) => Ok(await analysis.AnalyzeAsync(ct));
    [HttpPost("suggestions")] public async Task<IActionResult> Generate(GenerateHiringRequest request, CancellationToken ct) => Ok(await hiring.GenerateAsync(request, Owner, ct));
    [HttpGet("suggestions/{id:guid}")] public async Task<IActionResult> Restore(Guid id, CancellationToken ct) => Ok(await hiring.GetAsync(id, Owner, ct));
    [HttpPut("suggestions/{id:guid}/draft")] public async Task<IActionResult> SaveDraft(Guid id, HiringDraft draft, CancellationToken ct) => Ok(await hiring.SaveDraftAsync(id, draft, Owner, ct));
    [HttpPost("suggestions/{id:guid}/dismiss")] public async Task<IActionResult> Dismiss(Guid id, CancellationToken ct) => Ok(await hiring.DismissAsync(id, Owner, ct));
    [HttpPost("suggestions/{id:guid}/approve")] public async Task<IActionResult> Approve(Guid id, ApproveHiringRequest request, CancellationToken ct) => Ok(await hiring.ApproveAsync(id, request, Owner, ct));
}
