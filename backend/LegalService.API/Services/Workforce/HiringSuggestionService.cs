using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LegalService.API.Services.Workforce;

public sealed class HiringSuggestionService(HttpClient client, IConfiguration config, ApplicationDbContext db,
    WorkforceAnalysisService analysis, ICareerService careers, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly Regex UnprovidedTerms = new(@"\b(salary|salaries|benefits?|vacancies|vacancy|degree|licen[cs]e|full[ -]?time|part[ -]?time|employment type|working hours|office location|located in|based in|minimum experience|years? of experience)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    public static void ValidateDraft(HiringDraft draft, string area, bool generated)
    {
        var errors = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        if (!Validator.TryValidateObject(draft, new(draft), errors, true) ||
            new[] { draft.SuggestedTitle, draft.OperationalReason, draft.Summary }.Any(x => string.IsNullOrWhiteSpace(x) || x.Trim().Length < 3) ||
            draft.Responsibilities.Concat(draft.FocusAreas).Any(x => string.IsNullOrWhiteSpace(x) || x.Trim().Length < 3 || x.Length > 500))
            throw new ApiException(422, "Hiring content is incomplete or exceeds the allowed length.");
        if (generated && (UnprovidedTerms.IsMatch(string.Join(" ", new[] { draft.SuggestedTitle, draft.OperationalReason, draft.Summary }.Concat(draft.Responsibilities).Concat(draft.FocusAreas))) ||
            draft.FocusAreas.Any(x => !string.Equals(x, area, StringComparison.Ordinal))))
            throw new ApiException(422, "AI hiring content contains unprovided employment conditions or focus areas. Try again.");
    }

    private async Task<HiringSuggestionWorkflow> Owned(Guid id, int owner, CancellationToken ct) =>
        await db.HiringSuggestionWorkflows.SingleOrDefaultAsync(x => x.WorkflowId == id && x.OwnerUserId == owner, ct)
        ?? throw new ApiException(404, "Hiring workflow not found or unavailable to this Admin.");
    private static HiringWorkflowResponse Response(HiringSuggestionWorkflow w) => new(w.WorkflowId, w.PracticeAreaId, w.Status,
        JsonSerializer.Deserialize<WorkforceArea>(w.SystemSnapshotJson, Json)!,
        JsonSerializer.Deserialize<HiringDraft>(string.IsNullOrEmpty(w.ReviewedDraftJson) || w.ReviewedDraftJson == "{}" ? w.AiDraftJson : w.ReviewedDraftJson, Json)!,
        w.CareerOpeningId, w.ApprovedTitle, w.CreatedAt, w.UpdatedAt, w.ApprovedAt);
    public async Task<HiringWorkflowResponse> GetAsync(Guid id, int owner, CancellationToken ct) => Response(await Owned(id, owner, ct));

    public async Task<HiringWorkflowResponse> GenerateAsync(GenerateHiringRequest request, int owner, CancellationToken ct)
    {
        var report = await analysis.AnalyzeAsync(ct);
        var area = report.PracticeAreas.SingleOrDefault(x => x.PracticeAreaId == request.PracticeAreaId)
            ?? throw new ApiException(404, "Practice Area does not exist.");
        if (area.OpenCareerOpeningCount > 0) throw new ApiException(409, "Recruitment already in progress. View the existing opening in Careers.");
        HiringSuggestionWorkflow? workflow = null;
        if (request.WorkflowId.HasValue)
        {
            workflow = await Owned(request.WorkflowId.Value, owner, ct);
            if (workflow.Status != "AWAITING_APPROVAL" || workflow.PracticeAreaId != area.PracticeAreaId)
                throw new ApiException(409, "Only this Practice Area's pending workflow can be regenerated.");
        }
        else
        {
            // Opening an existing pending suggestion restores it rather than silently generating a duplicate.
            workflow = await db.HiringSuggestionWorkflows.SingleOrDefaultAsync(x => x.OwnerUserId == owner &&
                x.PracticeAreaId == area.PracticeAreaId && x.Status == "AWAITING_APPROVAL", ct);
            if (workflow != null) return Response(workflow);
        }
        if (!Uri.TryCreate(config["Ai:BaseUrl"], UriKind.Absolute, out var url) || string.IsNullOrWhiteSpace(config["Ai:InternalKey"]))
            throw new ApiException(503, "AI hiring assistance is not configured.");
        HiringDraft draft;
        try
        {
            // Only aggregate facts and the catalog name leave the API; no people, IDs or private requirements.
            using var message = new HttpRequestMessage(HttpMethod.Post, new Uri(url, "hiring-suggestions")) { Content = JsonContent.Create(new
            {
                practiceArea = area.PracticeAreaName, area.ActiveLawyerCount, area.LegalServiceCount,
                area.RecentDemandCount, area.RecentAppointmentCount, area.FutureAvailableSlotCount,
                area.Status, area.Reasons, report.RecentWindowDays, report.FutureWindowDays,
                minimumActiveLawyers = area.PlanningRules!.MinimumActiveLawyers, targetActiveLawyers = area.PlanningRules.TargetActiveLawyers,
                minimumFutureSlots = area.PlanningRules.MinimumFutureSlots, highDemandThreshold = area.PlanningRules.HighDemandThreshold,
                watchCapacityRatio = area.PlanningRules.WatchCapacityRatio, settingsSource = area.PlanningRules.Source
            }) };
            message.Headers.Add("X-Internal-Key", config["Ai:InternalKey"]);
            using var response = await client.SendAsync(message, ct);
            if ((int)response.StatusCode == 422) throw new ApiException(422, "AI returned invalid hiring content. Please retry.");
            if (!response.IsSuccessStatusCode) throw new ApiException(503, "AI hiring assistance is temporarily unavailable.");
            draft = await response.Content.ReadFromJsonAsync<HiringDraft>(Json, ct) ?? throw new JsonException();
            ValidateDraft(draft, area.PracticeAreaName, true);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        { throw new ApiException(503, "AI hiring assistance is temporarily unavailable."); }
        catch (JsonException) { throw new ApiException(422, "AI returned invalid structured hiring content. Please retry."); }
        workflow ??= new() { WorkflowId = Guid.NewGuid(), OwnerUserId = owner, PracticeAreaId = area.PracticeAreaId, CreatedAt = clock.GetUtcNow().UtcDateTime };
        workflow.SystemSnapshotJson = JsonSerializer.Serialize(area, Json);
        workflow.AiDraftJson = JsonSerializer.Serialize(draft, Json);
        workflow.ReviewedDraftJson = "{}";
        workflow.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        if (db.Entry(workflow).State == EntityState.Detached) db.HiringSuggestionWorkflows.Add(workflow);
        await db.SaveChangesAsync(ct);
        return Response(workflow);
    }

    public async Task<HiringWorkflowResponse> SaveDraftAsync(Guid id, HiringDraft draft, int owner, CancellationToken ct)
    {
        var w = await Owned(id, owner, ct);
        if (w.Status != "AWAITING_APPROVAL") throw new ApiException(409, "This workflow is no longer awaiting approval.");
        ValidateDraft(draft, Response(w).Snapshot.PracticeAreaName, false);
        w.ReviewedDraftJson = JsonSerializer.Serialize(draft, Json);
        // Editing text must not extend the freshness of the system snapshot.
        await db.SaveChangesAsync(ct);
        return Response(w);
    }

    public async Task<HiringWorkflowResponse> DismissAsync(Guid id, int owner, CancellationToken ct)
    {
        var w = await Owned(id, owner, ct);
        if (w.Status != "AWAITING_APPROVAL") throw new ApiException(409, "Only pending suggestions can be dismissed.");
        w.Status = "DISMISSED"; await db.SaveChangesAsync(ct); return Response(w);
    }

    public async Task<HiringWorkflowResponse> ApproveAsync(Guid id, ApproveHiringRequest request, int owner, CancellationToken ct)
    {
        try { return await ApproveCore(id, request, owner, ct); }
        catch (Exception ex) when (DatabaseConflict(ex))
        { throw new ApiException(409, "Recruitment changed during approval. Refresh the analysis and check Careers."); }
    }
    private static bool DatabaseConflict(Exception error)
    {
        for (Exception? current = error; current != null; current = current.InnerException)
            if (current is PostgresException { SqlState: "40001" or "23505" or "23503" } or DbUpdateConcurrencyException) return true;
        return false;
    }

    private async Task<HiringWorkflowResponse> ApproveCore(Guid id, ApproveHiringRequest request, int owner, CancellationToken ct)
    {
        var errors = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        if (!Validator.TryValidateObject(request, new(request), errors, true) || request.JobTitle.Trim().Length < 3 || request.Description.Trim().Length < 3)
            throw new ApiException(400, "Review and supply the required Career title and description.");
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct) : null;
        var w = await Owned(id, owner, ct);
        if (w.Status != "AWAITING_APPROVAL") throw new ApiException(409, "This workflow is no longer awaiting approval.");
        var snapshot = Response(w).Snapshot;
        ValidateDraft(request.Draft, snapshot.PracticeAreaName, false);
        var report = await analysis.AnalyzeAsync(ct);
        var current = report.PracticeAreas.SingleOrDefault(x => x.PracticeAreaId == w.PracticeAreaId)
            ?? throw new ApiException(409, "Practice Area no longer exists. Refresh the analysis.");
        if (current.OpenCareerOpeningCount > 0) throw new ApiException(409, "Recruitment already in progress for this Practice Area.");
        if (report.UnmappedCareerOpeningCount > 0 && !request.ReviewedExistingCareers)
            throw new ApiException(400, "Review unlinked existing Career postings before approving recruitment.");
        if (clock.GetUtcNow().UtcDateTime - w.UpdatedAt > TimeSpan.FromHours(analysis.Rules.SnapshotMaxAgeHours) ||
            current.PracticeAreaName != snapshot.PracticeAreaName || current.ActiveLawyerCount != snapshot.ActiveLawyerCount ||
            current.LegalServiceCount != snapshot.LegalServiceCount || current.RecentDemandCount != snapshot.RecentDemandCount ||
            current.RecentAppointmentCount != snapshot.RecentAppointmentCount || current.FutureAvailableSlotCount != snapshot.FutureAvailableSlotCount ||
            current.Status != snapshot.Status ||
            current.PlanningRules != (snapshot.PlanningRules ?? WorkforceSettingsService.Resolve(null, analysis.Rules)))
            throw new ApiException(409, "Workforce facts changed or expired. Regenerate the suggestion before approval.");
        var created = await careers.CreateCareerAsync(new CreateCareerRequest
        { JobTitle = request.JobTitle.Trim(), Description = request.Description.Trim(), PracticeAreaId = current.PracticeAreaId });
        w.CareerOpeningId = created.CareerId; w.ApprovedTitle = created.JobTitle;
        w.Status = "CAREER_OPENING_CREATED"; w.ApprovedAt = clock.GetUtcNow().UtcDateTime; w.ApprovedBy = owner;
        w.ReviewedDraftJson = JsonSerializer.Serialize(request.Draft, Json);
        await db.SaveChangesAsync(ct);
        if (transaction != null) await transaction.CommitAsync(ct);
        return Response(w);
    }
}
