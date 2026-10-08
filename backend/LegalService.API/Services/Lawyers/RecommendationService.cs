using LegalService.API.Services.Scheduling;
using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using LegalService.API.Data;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LegalService.API.Services.Lawyers;

public class RecommendationRequest
{
    [Required, StringLength(4000, MinimumLength = 3)] public string Requirement { get; set; } = "";
    [Required, Range(1, int.MaxValue)] public int? ClientId { get; set; }
    public DateOnly? Date { get; set; }
    [Range(1, 20)] public int Limit { get; set; } = 5;
}

public class ApproveRecommendationRequest
{
    [Required] public Guid LawyerId { get; set; }
    [Required] public Guid CustomerId { get; set; }
    [Required] public Guid SlotId { get; set; }
}

public record Recommendation(Guid LawyerId, int Score, string Reason)
{
    public string? FullName { get; init; }
    public string? Qualification { get; init; }
    public int? YearsExperience { get; init; }
    public string? PracticeArea { get; init; }
}
public record ParsedLegalRequirement(string Requirement, int? CategoryId, string? CategoryName,
    string? Location, string? PreferredDate, List<string> Keywords)
{
    public int? LegalServiceId { get; init; }
    public string? LegalServiceName { get; init; }
    public string? MatterSummary { get; init; }
    public bool? Supported { get; init; }
}
public record WorkflowEvent(DateTime Timestamp, string Step, string Status, string Summary,
    string? InputSummary = null, string? OutputSummary = null, string? Error = null);
public record RecommendationResponse(List<Recommendation> Recommendations, List<string> Warnings,
    List<JsonElement> Trace, ParsedLegalRequirement? ParsedRequirement = null, DateOnly? Date = null,
    Guid? WorkflowId = null, string? Status = null, Guid? AppointmentId = null, Guid? ApprovedLawyerId = null,
    string? UserRequirement = null, int? ClientId = null, Guid? SelectedLawyerId = null,
    Guid? SelectedSlotId = null, DateOnly? BookingDate = null, string ReviewStage = "MATCHES");
[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed class SaveRecommendationReviewRequest
{
    [Range(1, int.MaxValue)] public int ClientId { get; set; }
    public Guid? LawyerId { get; set; }
    public Guid? SlotId { get; set; }
    public DateOnly? BookingDate { get; set; }
    [RegularExpression("^(MATCHES|REVIEW|APPOINTMENT)$")] public string Stage { get; set; } = "MATCHES";
    public bool ConfirmClientChange { get; set; }
}


public interface ILawyerRecommendationService
{
    Task<RecommendationResponse> RecommendAsync(RecommendationRequest request, int userId, CancellationToken ct);
    Task<RecommendationResponse> GetAsync(Guid workflowId, int userId, CancellationToken ct);
    Task<RecommendationResponse> SaveReviewAsync(Guid workflowId, SaveRecommendationReviewRequest request, int userId, CancellationToken ct);
    Task<RecommendationResponse> ApproveAsync(Guid workflowId, ApproveRecommendationRequest request, int userId, CancellationToken ct);
}

public sealed class RecommendationService(HttpClient client, IConfiguration config, ApplicationDbContext db,
    IAppointmentService appointments, ILogger<RecommendationService>? logger = null, AvailabilityService? scheduling = null) : ILawyerRecommendationService
{
    private readonly AvailabilityService availability = scheduling ?? new(db, config: config);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<RecommendationResponse> RecommendAsync(RecommendationRequest request, int userId, CancellationToken ct)
    {
        var errors = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        if (!Validator.TryValidateObject(request, new ValidationContext(request), errors, true) || request.Requirement.Trim().Length < 3)
            throw new ApiException(400, "Describe your legal requirement using at least three characters.");
        if (request.ClientId == null || !await db.Users.AsNoTracking().AnyAsync(x => x.UserId == request.ClientId && x.Role == "Customer", ct))
            throw new ApiException(400, "Select an existing client before analysing the requirement.");
        var now = DateTime.UtcNow;
        var today = availability.Today;
        var currentTime = TimeOnly.FromDateTime(now);
        if (request.Date < today)
            throw new ApiException(400, "Preferred date must not be in the past.");
        if (!Uri.TryCreate(config["Ai:BaseUrl"], UriKind.Absolute, out var url) || string.IsNullOrWhiteSpace(config["Ai:InternalKey"]))
        {
            logger?.LogWarning("Recommendation failure Stage={Stage} BaseUrlConfigured={BaseUrlConfigured} InternalKeyConfigured={InternalKeyConfigured}",
                "configuration", url is not null, !string.IsNullOrWhiteSpace(config["Ai:InternalKey"]));
            throw new ApiException(503, "Lawyer recommendations are not configured.");
        }

        var workflow = new LawyerRecommendationWorkflow
        {
            WorkflowId = Guid.NewGuid(), OwnerUserId = userId,
            ClientId = request.ClientId, UserRequirement = request.Requirement.Trim(), RequestedDate = request.Date
        };
        AddEvent(workflow, "client_selected", "COMPLETED", "Client selected by Administrator", input: $"Client {request.ClientId}");
        AddEvent(workflow, "received", "completed", "Recommendation requested by authenticated admin",
            input: $"Requirement length {workflow.UserRequirement.Length}; requested date {request.Date?.ToString() ?? "none"}",
            output: $"Workflow {workflow.WorkflowId} created");
        db.LawyerRecommendationWorkflows.Add(workflow);
        await db.SaveChangesAsync(ct);

        try
        {
            var specializations = await db.Specializations.AsNoTracking()
                .Select(s => new { id = s.SpecializationId, name = s.Name, description = s.Description }).ToListAsync(ct);
            var services = await db.LegalServices.AsNoTracking()
                .Select(s => new { id = s.LegalServiceId, name = s.ServiceName, description = s.Description, category = s.Category }).ToListAsync(ct);
            var candidateProfiles = await db.Lawyers.AsNoTracking().AsSplitQuery()
                .Where(l => l.Status == "Active" && l.LawyerSpecializations.Count == 1 && l.Experience >= 0 && l.Experience <= 70)
                .Select(l => new
                {
                    lawyerId = l.LawyerId, status = l.Status, experience = l.Experience,
                    specializations = l.LawyerSpecializations.Select(s => new { id = s.SpecializationId, name = s.Specialization.Name }).ToList(),
                }).ToListAsync(ct);
            var from = request.Date ?? today;
            var snapshot = await availability.LoadAsync(from, request.Date ?? today.AddDays(365), candidateProfiles.Select(l => l.lawyerId), ct);
            var candidates = candidateProfiles.Select(l => new {
                l.lawyerId, l.status, l.experience, l.specializations,
                availableDates = Enumerable.Range(0, request.Date is null ? 366 : 1)
                    .Select(offset => from.AddDays(offset)).Where(date => snapshot.Day(l.lawyerId, date).AvailableSlots.Count > 0).ToList()
            }).ToList();
            AddEvent(workflow, "snapshot_loaded", "completed", "Controlled database snapshot supplied to matcher",
                input: $"{specializations.Count} categories; {services.Count} services",
                output: JsonSerializer.Serialize(new { candidateCount = candidates.Count,
                    candidateIds = candidates.Select(c => c.lawyerId).ToArray() }, JsonOptions));

            using var message = new HttpRequestMessage(HttpMethod.Post, new Uri(url, "lawyer-recommendations"))
            {
                Content = JsonContent.Create(new { request.Requirement, request.Date, request.Limit, specializations, services, candidates })
            };
            message.Headers.Add("X-Internal-Key", config["Ai:InternalKey"]);
            message.Headers.Add("X-Correlation-ID", workflow.WorkflowId.ToString());
            using var response = await client.SendAsync(message, ct);
            // Never log headers, upstream bodies, URLs containing credentials, or requirement text.
            var upstreamStage = (int)response.StatusCode switch
            {
                401 or 403 => "internal_authentication", 404 => "route", 422 => "validation",
                503 => "classification_unavailable", >= 500 => "service_unavailable", _ => "response"
            };
            if (!response.IsSuccessStatusCode)
                logger?.LogWarning("Recommendation upstream failure Service={Service} Route={Route} Status={Status} Stage={Stage} CorrelationId={CorrelationId}",
                    "lawyer-recommendation", "/lawyer-recommendations", (int)response.StatusCode, upstreamStage, workflow.WorkflowId);
            else logger?.LogInformation("Recommendation upstream response Status={Status} CorrelationId={CorrelationId}", (int)response.StatusCode, workflow.WorkflowId);
            if ((int)response.StatusCode == 422) throw new ApiException(422, "The legal category was invalid. Refine the requirement.");
            if (!response.IsSuccessStatusCode) throw new ApiException(503, "Requirement understanding is temporarily unavailable.");
            var result = await response.Content.ReadFromJsonAsync<RecommendationResponse>(JsonOptions, ct)
                ?? throw new ApiException(502, "Invalid recommendation response.");
            if (result.ParsedRequirement is null || result.Recommendations is null || result.Warnings is null || result.Trace is null ||
                result.Recommendations.Count > request.Limit || result.Recommendations.Any(r => r.LawyerId == Guid.Empty || r.Score is < 0 or > 100 || string.IsNullOrWhiteSpace(r.Reason)))
                throw new ApiException(502, "Invalid recommendation response.");

            var parsed = result.ParsedRequirement;
            if (parsed.CategoryId is int categoryId)
            {
                if (!await db.Specializations.AsNoTracking().AnyAsync(s => s.SpecializationId == categoryId && s.Name == parsed.CategoryName, ct))
                    throw new ApiException(422, "The selected legal category no longer exists.");
            }
            else if (parsed.CategoryName is not null)
                throw new ApiException(422, "The legal category was invalid.");

            if (parsed.LegalServiceId is int serviceId)
            {
                if (parsed.CategoryId is null || !await db.LegalServices.AsNoTracking().AnyAsync(s =>
                    s.LegalServiceId == serviceId && s.ServiceName == parsed.LegalServiceName &&
                    s.Category.ToLower() == parsed.CategoryName!.ToLower(), ct))
                    throw new ApiException(422, "The interpreted Legal Service does not belong to the verified Practice Area.");
            }
            else if (parsed.LegalServiceName is not null)
                throw new ApiException(422, "The interpreted Legal Service was invalid.");
            if (parsed.MatterSummary?.Length > 300)
                throw new ApiException(502, "Invalid recommendation interpretation.");
            parsed = parsed with { Supported = parsed.CategoryId is not null };

            if (request.Date is null &&
                (!DateOnly.TryParseExact(parsed.PreferredDate, "yyyy-MM-dd", out var parsedDate)
                    ? result.Date is not null || parsed.PreferredDate is not null
                    : result.Date != parsedDate))
                throw new ApiException(502, "Recommendation date did not match the interpreted requirement.");
            var effectiveDate = request.Date ?? result.Date;
            if (effectiveDate < today)
                throw new ApiException(422, "Preferred date must not be in the past.");
            if (request.Date is not null && result.Date != request.Date)
                throw new ApiException(502, "Recommendation date did not match the requested date.");
            // The controlled snapshot covers one year when a date is inferred from text.
            // For a later interpreted date, calculate that single day and apply the same
            // recorded-experience / stable-ID ordering; never invent or persist future slots.
            if (request.Date is null && effectiveDate > today.AddDays(365) && result.Recommendations.Count == 0 && parsed.CategoryId is not null)
            {
                var later = await availability.LoadAsync(effectiveDate.Value, effectiveDate.Value, candidateProfiles.Select(l => l.lawyerId), ct);
                var ranked = candidateProfiles.Where(l => l.specializations.Any(s => s.id == parsed.CategoryId) && later.Day(l.lawyerId, effectiveDate.Value).AvailableSlots.Count > 0)
                    .OrderByDescending(l => l.experience).ThenBy(l => l.lawyerId.ToString(), StringComparer.Ordinal).Take(request.Limit)
                    .Select(l => new Recommendation(l.lawyerId, l.experience, "System-verified requested-date availability.")).ToList();
                result = result with { Recommendations = ranked };
            }
            var ids = result.Recommendations.Select(r => r.LawyerId).ToArray();
            if (ids.Distinct().Count() != ids.Length || (ids.Length > 0 && parsed.CategoryId is null))
                throw new ApiException(502, "Recommendation identities are invalid.");
            var valid = await db.Lawyers.AsNoTracking()
                .Where(l => ids.Contains(l.LawyerId) && l.Status == "Active" && l.Experience >= 0 && l.Experience <= 70 &&
                    l.LawyerSpecializations.Count == 1 && l.LawyerSpecializations.Any(s => s.SpecializationId == parsed.CategoryId))
                .Select(l => l.LawyerId).ToListAsync(ct);
            if (effectiveDate is not null) {
                var verified = await availability.LoadAsync(effectiveDate.Value, effectiveDate.Value, valid, ct);
                valid = valid.Where(id => verified.Day(id, effectiveDate.Value).AvailableSlots.Count > 0).ToList();
            }
            if (ids.Any(id => !valid.Contains(id)))
                throw new ApiException(409, "Lawyer data changed. Request fresh recommendations.");

            var profiles = await db.Lawyers.AsNoTracking().Where(l => ids.Contains(l.LawyerId))
                .Select(l => new { l.LawyerId, l.Name, l.Qualification, l.Experience })
                .ToDictionaryAsync(l => l.LawyerId, ct);
            // Recompute display points/reasons from verified profiles rather than trusting external text.
            var verifiedRecommendations = result.Recommendations.Select(r => new Recommendation(r.LawyerId,
                profiles[r.LawyerId].Experience,
                $"Practice Area match: {parsed.CategoryName}. {profiles[r.LawyerId].Experience} years of recorded experience. " +
                (effectiveDate is not null
                    ? $"Availability verified for requested date {effectiveDate:yyyy-MM-dd}; availability is rechecked at approval."
                    : "Availability Not Filtered: no preferred date supplied; check an actual slot before booking."))
            {
                FullName = profiles[r.LawyerId].Name,
                Qualification = profiles[r.LawyerId].Qualification,
                YearsExperience = profiles[r.LawyerId].Experience,
                PracticeArea = parsed.CategoryName
            }).OrderByDescending(r => r.Score).ThenBy(r => r.LawyerId.ToString(), StringComparer.Ordinal).ToList();
            workflow.Status = parsed.CategoryId is null ? "UNSUPPORTED" : ids.Length == 0 ? "NO_MATCH" : "AWAITING_APPROVAL";
            workflow.CategoryId = parsed.CategoryId;
            workflow.RequestedDate = effectiveDate;
            workflow.ParsedRequirementJson = JsonSerializer.Serialize(parsed, JsonOptions);
            workflow.RecommendationsJson = JsonSerializer.Serialize(verifiedRecommendations, JsonOptions);
            workflow.WarningsJson = JsonSerializer.Serialize(result.Warnings, JsonOptions);
            foreach (var step in result.Trace)
            {
                if (step.ValueKind != JsonValueKind.Object || !step.TryGetProperty("step", out var property) || property.ValueKind != JsonValueKind.String)
                    continue;
                var name = property.GetString() ?? "agent";
                // Persist public stage facts only, never arbitrary model output or hidden reasoning.
                var summary = name switch {
                    "parse_requirement" => "AI interpretation completed",
                    "validate_category" => "Catalog validation completed",
                    "search_lawyers" => "Eligible candidates retrieved",
                    "rank_candidates" => "Deterministic ranking completed",
                    "validate_recommendations" => "Agent results validated",
                    "await_human_approval" => "Awaiting administrator review",
                    _ => null
                };
                if (summary is null) continue;
                var facts = new Dictionary<string, int>();
                foreach (var field in new[] { "candidateCount", "eligibleCount", "validatedCount" })
                    if (step.TryGetProperty(field, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var count) && count >= 0)
                        facts[field] = count;
                AddEvent(workflow, name, name == "validate_category" && parsed.CategoryId is null ? "UNSUPPORTED" : "COMPLETED", summary,
                    output: JsonSerializer.Serialize(facts, JsonOptions));
            }
            if (parsed.CategoryId is not null)
                AddEvent(workflow, "backend_validation", "COMPLETED", $"{ids.Length} recommendation(s) revalidated against current database data");
            if (workflow.Status == "AWAITING_APPROVAL") AddEvent(workflow, "await_human_approval", workflow.Status, $"{ids.Length} validated recommendation(s); no booking made",
                input: $"Category {parsed.CategoryId?.ToString() ?? "unknown"}; date {effectiveDate?.ToString() ?? "none"}",
                output: $"Saved recommendation IDs: {string.Join(",", ids)}");
            await db.SaveChangesAsync(ct);
            logger?.LogInformation("Recommendation completed Status={Status} CandidateCount={CandidateCount} CorrelationId={CorrelationId}",
                workflow.Status, ids.Length, workflow.WorkflowId);
            return ToResponse(workflow);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            logger?.LogWarning("Recommendation failure Stage={Stage} ExceptionType={ExceptionType} CorrelationId={CorrelationId}",
                ex is JsonException ? "response_schema" : ex is TaskCanceledException ? "timeout" : ex is HttpRequestException ? "connection" : "validation_or_upstream",
                ex.GetType().Name, workflow.WorkflowId);
            workflow.Status = "FAILED";
            AddEvent(workflow, "failed", "FAILED", "Recommendation processing failed",
                error: ex is ApiException api ? api.Message : "Internal recommendation error");
            await db.SaveChangesAsync(ct);
            if (ex is ApiException) throw;
            if (ex is HttpRequestException or TaskCanceledException) throw new ApiException(503, "Recommendation service is unavailable.");
            if (ex is JsonException) throw new ApiException(502, "Invalid recommendation response.");
            throw;
        }
    }

    public async Task<RecommendationResponse> GetAsync(Guid workflowId, int userId, CancellationToken ct)
    {
        var workflow = await db.LawyerRecommendationWorkflows.AsNoTracking()
            .SingleOrDefaultAsync(w => w.WorkflowId == workflowId && w.OwnerUserId == userId, ct)
            ?? throw new ApiException(404, "Recommendation workflow not found.");
        return ToResponse(workflow);
    }

    public async Task<RecommendationResponse> SaveReviewAsync(Guid workflowId, SaveRecommendationReviewRequest request, int userId, CancellationToken ct)
    {
        var workflow = await db.LawyerRecommendationWorkflows.SingleOrDefaultAsync(x => x.WorkflowId == workflowId && x.OwnerUserId == userId, ct)
            ?? throw new ApiException(404, "Recommendation workflow not found.");
        if (workflow.Status != "AWAITING_APPROVAL") throw new ApiException(409, "This workflow cannot be reviewed.");
        if (!new[] { "MATCHES", "REVIEW", "APPOINTMENT" }.Contains(request.Stage)) throw new ApiException(400, "Invalid review stage.");
        if (!await db.Users.AsNoTracking().AnyAsync(x => x.UserId == request.ClientId && x.Role == "Customer", ct)) throw new ApiException(400, "Select an existing client.");
        var changedClient = workflow.ClientId != request.ClientId;
        if (changedClient && workflow.ReviewStage == "APPOINTMENT" && !request.ConfirmClientChange)
            throw new ApiException(409, "Confirm the client change and review the appointment again.");
        var recommendations = JsonSerializer.Deserialize<List<Recommendation>>(workflow.RecommendationsJson, JsonOptions) ?? [];
        if (request.Stage != "MATCHES" && request.LawyerId == null) throw new ApiException(400, "Select a recommended lawyer.");
        if (request.LawyerId.HasValue && !recommendations.Any(x => x.LawyerId == request.LawyerId)) throw new ApiException(400, "Select a lawyer from this recommendation.");
        var date = request.BookingDate ?? workflow.RequestedDate;
        if (date < availability.Today || workflow.RequestedDate.HasValue && date != workflow.RequestedDate) throw new ApiException(400, "Rerun analysis to change the preferred date.");
        if (request.SlotId.HasValue)
        {
            if (!request.LawyerId.HasValue || !date.HasValue) throw new ApiException(400, "Choose a lawyer and appointment date first.");
            var interval = await availability.ResolveSlotAsync(request.LawyerId.Value, request.SlotId.Value, ct);
            var day = await availability.GetAsync(request.LawyerId.Value, date.Value, ct);
            if (interval.Date != date || !day.AvailableSlots.Any(x => x.Start == interval.Start && x.End == interval.End)) throw new ApiException(409, "Selected slot is no longer available.");
        }
        if (changedClient) AddEvent(workflow, "client_selected", "COMPLETED", "Administrator changed the selected client", input: $"Client {request.ClientId}");
        if (workflow.SelectedLawyerId != request.LawyerId && request.LawyerId.HasValue) AddEvent(workflow, "lawyer_selected", "COMPLETED", "Administrator selected a recommended lawyer", input: $"Lawyer {request.LawyerId}");
        if (request.Stage == "APPOINTMENT" && workflow.ReviewStage != "APPOINTMENT") AddEvent(workflow, "appointment_review_started", "COMPLETED", "Administrator started appointment review");
        workflow.ClientId = request.ClientId; workflow.SelectedLawyerId = request.LawyerId;
        workflow.BookingDate = date; workflow.SelectedSlotId = changedClient ? null : request.SlotId;
        workflow.ReviewStage = changedClient && request.Stage == "APPOINTMENT" ? "REVIEW" : request.Stage;
        workflow.UpdatedAt = DateTime.UtcNow;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new ApiException(409, "The review changed. Reload the workflow before continuing."); }
        return ToResponse(workflow);
    }

    public async Task<RecommendationResponse> ApproveAsync(Guid workflowId, ApproveRecommendationRequest request, int userId, CancellationToken ct)
    {
        try { return await ApproveValidatedAsync(workflowId, request, userId, ct); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "40001" or "23505" })
        { throw new ApiException(409, "Booking data changed during approval. Refresh the workflow and available slots."); }
        catch (DbUpdateConcurrencyException) { throw new ApiException(409, "The workflow changed. Reload it before approving."); }
        catch (PostgresException ex) when (ex.SqlState == "40001")
        { throw new ApiException(409, "Booking data changed during approval. Refresh the workflow and available slots."); }
    }

    private async Task<RecommendationResponse> ApproveValidatedAsync(Guid workflowId, ApproveRecommendationRequest request, int userId, CancellationToken ct)
    {
        if (request.LawyerId == Guid.Empty || request.CustomerId == Guid.Empty || request.SlotId == Guid.Empty)
            throw new ApiException(400, "Lawyer, customer, and appointment slot IDs are required.");
        var initial = await db.LawyerRecommendationWorkflows.AsNoTracking()
            .SingleOrDefaultAsync(w => w.WorkflowId == workflowId && w.OwnerUserId == userId, ct)
            ?? throw new ApiException(404, "Recommendation workflow not found.");
        if (initial.Status != "AWAITING_APPROVAL")
            throw new ApiException(409, "This workflow is not awaiting approval.");
        if (!(JsonSerializer.Deserialize<List<Recommendation>>(initial.RecommendationsJson, JsonOptions) ?? [])
            .Any(r => r.LawyerId == request.LawyerId))
            throw new ApiException(400, "The selected lawyer was not recommended by this workflow.");
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct)
            : null;
        var workflow = await db.LawyerRecommendationWorkflows
            .SingleOrDefaultAsync(w => w.WorkflowId == workflowId && w.OwnerUserId == userId, ct)
            ?? throw new ApiException(404, "Recommendation workflow not found.");
        if (workflow.Status != "AWAITING_APPROVAL")
            throw new ApiException(409, "This workflow is not awaiting approval.");
        var recommendations = JsonSerializer.Deserialize<List<Recommendation>>(workflow.RecommendationsJson, JsonOptions) ?? [];
        if (!recommendations.Any(r => r.LawyerId == request.LawyerId))
            throw new ApiException(400, "The selected lawyer was not recommended by this workflow.");
        await availability.LockLawyerAsync(request.LawyerId, ct);
        var lawyerIsEligible = await db.Lawyers.AsNoTracking().AnyAsync(l => l.LawyerId == request.LawyerId && l.Status == "Active" &&
            l.LawyerSpecializations.Count == 1 && l.LawyerSpecializations.Any(s => s.SpecializationId == workflow.CategoryId), ct);
        if (!lawyerIsEligible)
            throw new ApiException(409, "The selected lawyer is no longer eligible.");
        const string customerPrefix = "00000000-0000-0000-0000-";
        var customerText = request.CustomerId.ToString();
        if (!customerText.StartsWith(customerPrefix, StringComparison.Ordinal) ||
            !long.TryParse(customerText[customerPrefix.Length..], System.Globalization.NumberStyles.HexNumber,
                System.Globalization.CultureInfo.InvariantCulture, out var customerNumber) ||
            customerNumber is <= 0 or > int.MaxValue ||
            !await db.Users.AsNoTracking().AnyAsync(u => u.UserId == (int)customerNumber && u.Role == "Customer", ct))
            throw new ApiException(400, "Select an existing customer account.");
        if (workflow.ClientId == null || workflow.ClientId != (int)customerNumber)
            throw new ApiException(409, "The client changed. Select the client and review the appointment again.");
        if (workflow.ReviewStage != "APPOINTMENT" || workflow.SelectedLawyerId != request.LawyerId || workflow.SelectedSlotId != request.SlotId)
            throw new ApiException(409, "Review the selected lawyer and appointment slot before approving.");
        var interval = await availability.ResolveSlotAsync(request.LawyerId, request.SlotId, ct);
        var day = await availability.GetAsync(request.LawyerId, interval.Date, ct);
        if ((workflow.RequestedDate is not null && interval.Date != workflow.RequestedDate) ||
            !day.AvailableSlots.Any(s => s.Start == interval.Start && s.End == interval.End))
            throw new ApiException(409, "Selected slot is no longer available.");

        // Human selection is explicit. The existing appointment service owns conflict checks and booking.
        AppointmentDetailsResponse booking;
        try
        {
            booking = await appointments.BookAppointmentAsync(new BookAppointmentRequest
            {
                LawyerId = request.LawyerId, CustomerId = request.CustomerId, SlotId = request.SlotId,
                AppointmentSource = "AI_FRONT_DESK", ConsultationType = "InPerson",
                Description = workflow.UserRequirement,
                LegalServiceCategory = JsonSerializer.Deserialize<ParsedLegalRequirement>(workflow.ParsedRequirementJson, JsonOptions)?.CategoryName
            });
        }
        catch (KeyNotFoundException) { throw new ApiException(409, "The appointment slot no longer exists."); }
        catch (InvalidOperationException) { throw new ApiException(409, "The appointment slot is no longer available."); }
        workflow.SelectedLawyerId = request.LawyerId; workflow.SelectedSlotId = request.SlotId; workflow.BookingDate = interval.Date;
        workflow.ApprovedLawyerId = request.LawyerId;
        workflow.AppointmentId = booking.AppointmentId;
        workflow.Status = "ACTION_COMPLETED";
        AddEvent(workflow, "human_approval", "APPROVED", "Admin approved a recommended lawyer",
            input: $"Admin {userId}; lawyer {request.LawyerId}; slot {request.SlotId}", output: "Saved selection validated");
        AddEvent(workflow, "create_booking", "ACTION_COMPLETED", "Existing appointment service created booking",
            input: $"Lawyer {request.LawyerId}; slot {request.SlotId}", output: $"Appointment {booking.AppointmentId}");
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return ToResponse(workflow);
    }

    private static RecommendationResponse ToResponse(LawyerRecommendationWorkflow w) => new(
        JsonSerializer.Deserialize<List<Recommendation>>(w.RecommendationsJson, JsonOptions) ?? [],
        JsonSerializer.Deserialize<List<string>>(w.WarningsJson, JsonOptions) ?? [],
        (JsonSerializer.Deserialize<List<WorkflowEvent>>(w.AuditJson, JsonOptions) ?? [])
            .Select(e => JsonSerializer.SerializeToElement(e, JsonOptions)).ToList(),
        JsonSerializer.Deserialize<ParsedLegalRequirement>(w.ParsedRequirementJson, JsonOptions),
        w.RequestedDate, w.WorkflowId, w.Status, w.AppointmentId, w.ApprovedLawyerId, w.UserRequirement, w.ClientId, w.SelectedLawyerId, w.SelectedSlotId, w.BookingDate, w.ReviewStage);

    private static void AddEvent(LawyerRecommendationWorkflow workflow, string step, string status, string summary,
        string? input = null, string? output = null, string? error = null)
    {
        var events = JsonSerializer.Deserialize<List<WorkflowEvent>>(workflow.AuditJson, JsonOptions) ?? [];
        events.Add(new WorkflowEvent(DateTime.UtcNow, step, status, summary, input, output, error));
        workflow.AuditJson = JsonSerializer.Serialize(events, JsonOptions);
        workflow.UpdatedAt = DateTime.UtcNow;
    }
}
