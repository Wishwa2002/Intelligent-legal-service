using System.Security.Claims;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Services.Workforce;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace LegalService.API.Controllers;
[ApiController, Route("api/workforce-settings"), Authorize(Roles = "Admin")]
public sealed class WorkforceSettingsController(WorkforceSettingsService settings) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await settings.ListAsync(ct));
    [HttpGet("{id:int}")] public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await settings.GetAsync(id, ct));
    [HttpPut("{id:int}")] public async Task<IActionResult> Save(int id, WorkforceSettingRequest request, CancellationToken ct) =>
        Ok(await settings.SaveAsync(id, request, int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var owner) && owner > 0 ? owner : throw new ApiException(401, "A valid Admin identity is required."), ct));
    [HttpDelete("{id:int}")] public async Task<IActionResult> Reset(int id, CancellationToken ct) => Ok(await settings.ResetAsync(id, ct));
}
