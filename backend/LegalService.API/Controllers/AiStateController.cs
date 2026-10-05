using System.Text.Json;
using LegalService.API.Authentication;
using LegalService.API.Data;
using LegalService.API.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Controllers;

[ApiController]
[Route("internal/ai-state")]
[Authorize(Policy = "UserOrAi")]
public sealed class AiStateController(ApplicationDbContext db, IConfiguration config) : ControllerBase
{
    private bool ValidKind(string kind) => kind is "chat" or "scheduling";
    private bool Internal => RequestAccess.IsInternal(HttpContext, config);

    [HttpGet("{kind}")]
    public async Task<IActionResult> List(string kind, CancellationToken ct)
    {
        if (!Internal) return Forbid();
        if (!ValidKind(kind)) return BadRequest();
        var rows = await db.AgentSessionStates.AsNoTracking().Where(x => x.Kind == kind)
            .Select(x => new { x.SessionId, x.StateJson }).ToListAsync(ct);
        return Ok(rows.Select(x => new { sessionId = x.SessionId, state = JsonSerializer.Deserialize<JsonElement>(x.StateJson) }));
    }

    [HttpGet("{kind}/{sessionId}")]
    public async Task<IActionResult> Get(string kind, string sessionId, CancellationToken ct)
    {
        if (!Internal) return Forbid();
        if (!ValidKind(kind) || !Guid.TryParse(sessionId, out _)) return BadRequest();
        var value = await db.AgentSessionStates.AsNoTracking()
            .Where(x => x.Kind == kind && x.SessionId == sessionId)
            .Select(x => x.StateJson).SingleOrDefaultAsync(ct);
        return value is null ? NotFound() : Content(value, "application/json");
    }

    [HttpPut("{kind}/{sessionId}")]
    public async Task<IActionResult> Put(string kind, string sessionId, [FromBody] JsonElement state, CancellationToken ct)
    {
        if (!Internal) return Forbid();
        if (!ValidKind(kind) || !Guid.TryParse(sessionId, out _)) return BadRequest();
        if (state.ValueKind != JsonValueKind.Object) return BadRequest();
        var row = await db.AgentSessionStates.SingleOrDefaultAsync(x => x.Kind == kind && x.SessionId == sessionId, ct);
        if (row is null)
        {
            row = new AgentSessionState { Kind = kind, SessionId = sessionId };
            db.AgentSessionStates.Add(row);
        }
        row.StateJson = state.GetRawText();
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
