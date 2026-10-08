using System.Text.Json;
using LegalService.API.AgentIntegration;
using LegalService.API.Data;
using LegalService.API.DTOs.Agent;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services.Lawyers;
using LegalService.API.Services.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Services.AgentWorkflows;

/// <summary>
/// Member 4 – Planning / Coordinator Agent.
///
/// Orchestrates the workflow lifecycle:
///   StartWorkflow → ExecuteLawyerRecommendation → ExecuteScheduling
///   → ExecuteDocumentation → ValidateAndTransition → ApproveLawyer
///
/// Design rules enforced here:
///   • Each specialist step is idempotent (only Pending / Failed → Running).
///   • Workflow status never jumps to AwaitingApproval until all required
///     specialist steps are Completed AND coordinator validation passes.
///   • High-impact actions (booking an appointment) only run after admin
///     approval.
///   • Every agent call is wrapped in a try/catch; failures set status to
///     Failed and NeedsHumanReview without losing previous work.
///   • Full audit trail: ToolExecution, ApprovalDecision, AuditLog,
///     ExecutionSummary.
///   • Idempotent everywhere: duplicate records are checked before insert.
/// </summary>
public class PlanningCoordinatorService : IPlanningCoordinatorService
{
    private readonly ApplicationDbContext _context;
    private readonly ILawyerRecommendationService _lawyerRecommendationService;
    private readonly AvailabilityService _availabilityService;
    private readonly IAgentIntegrationService _agentIntegrationService;

    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public PlanningCoordinatorService(
        ApplicationDbContext context,
        ILawyerRecommendationService lawyerRecommendationService,
        AvailabilityService availabilityService,
        IAgentIntegrationService agentIntegrationService)
    {
        _context = context;
        _lawyerRecommendationService = lawyerRecommendationService;
        _availabilityService = availabilityService;
        _agentIntegrationService = agentIntegrationService;
    }

    // =================================================================
    // 1. CREATE / PLAN WORKFLOW
    // =================================================================

public async Task<AgentWorkflow> StartWorkflowAsync(
    Guid serviceRequestId,
    CancellationToken cancellationToken = default)
{
    var request = await _context.ServiceRequests
        .AsNoTracking()
        .FirstOrDefaultAsync(
            x => x.ServiceRequestId == serviceRequestId,
            cancellationToken);

    if (request == null)
    {
        throw new KeyNotFoundException(
            "Service request was not found.");
    }

    // Idempotent: return existing workflow.
    var existingWorkflow = await _context.AgentWorkflows
        .Include(x => x.AgentSteps)
        .FirstOrDefaultAsync(
            x => x.ServiceRequestId == serviceRequestId,
            cancellationToken);

    if (existingWorkflow != null)
    {
        return existingWorkflow;
    }

    var plan = BuildPlan(request);

    var workflow = new AgentWorkflow
    {
        WorkflowId = Guid.NewGuid(),
        ServiceRequestId = request.ServiceRequestId,
        Status = "Planning",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    _context.AgentWorkflows.Add(workflow);

    foreach (var planStep in plan.Steps)
    {
        var inputPayload = JsonSerializer.Serialize(new
        {
            order = planStep.Order,
            action = planStep.Action,
            serviceRequestId = request.ServiceRequestId,
            title = request.Title,
            description = request.Description,
            requestType = request.RequestType,
            priority = request.Priority,
            legalCategory = plan.LegalCategory
        });

        workflow.AgentSteps.Add(new AgentStep
        {
            StepId = Guid.NewGuid(),
            WorkflowId = workflow.WorkflowId,
            AgentName = planStep.AgentName,
            StepName = planStep.StepName,
            Status = "Pending",
            InputPayload = inputPayload,
            OutputPayload = "{}",
            CreatedAt = DateTime.UtcNow
        });
    }

    workflow.Status = "Planned";
    workflow.UpdatedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync(cancellationToken);

    return workflow;
}

public async Task<AgentWorkflow> StartAndExecuteAsync(
    Guid serviceRequestId,
    CancellationToken cancellationToken = default)
{
    // 1. Create or retrieve the workflow plan.
    var workflow = await StartWorkflowAsync(
        serviceRequestId,
        cancellationToken);

    // 2. Reload the workflow with ServiceRequest + steps.
    workflow = await LoadWorkflowForExecutionAsync(
        workflow.WorkflowId,
        cancellationToken);

    if (workflow.ServiceRequest == null)
    {
        throw new InvalidOperationException(
            "Service request is missing from the workflow.");
    }

    // 3. Mark the customer request as being processed.
    workflow.ServiceRequest.Status =
        ServiceRequestStatus.InProgress;
    workflow.ServiceRequest.UpdatedAt = DateTime.UtcNow;

    await _context.SaveChangesAsync(cancellationToken);

    // 4. Use the real customer as the initiating user.
    var initiatedByUserId =
        workflow.ServiceRequest.CustomerId;

    // 5. Execute only specialist agents that exist in the plan.
    workflow = await ExecuteAllAsync(
        workflow.WorkflowId,
        initiatedByUserId,
        cancellationToken);

    return workflow;
}





    // =================================================================
    // 1b. EXECUTE ALL — CONVENIENCE ORCHESTRATOR
    // =================================================================

    /// <inheritdoc/>
    public async Task<AgentWorkflow> ExecuteAllAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        // -----------------------------------------------------------------
        // Load workflow once to discover which specialist steps are planned.
        // Each Execute* method reloads the workflow internally, so we just
        // need to know what agents exist in the plan.
        // -----------------------------------------------------------------

        var initial = await LoadWorkflowForExecutionAsync(
            workflowId, cancellationToken);

        var hasLawyer        = initial.AgentSteps.Any(x => x.AgentName == "LawyerRecommendationAgent");
        var hasScheduling    = initial.AgentSteps.Any(x => x.AgentName == "SchedulingAgent");
        var hasDocumentation = initial.AgentSteps.Any(x => x.AgentName == "DocumentationClerkAgent");

        AgentWorkflow workflow = initial;

        try
        {
            // Step 1 — Lawyer Recommendation Agent (Member 1)
            if (hasLawyer)
            {
                workflow = await ExecuteLawyerRecommendationAsync(
                    workflowId, userId, cancellationToken);

                // Stop early on failure to preserve work completed so far.
                if (workflow.Status == "NeedsHumanReview")
                {
                    return workflow;
                }

                // Reload for a clean EF context before the next step.
                workflow = await LoadWorkflowForExecutionAsync(
                    workflowId, cancellationToken);
            }

            // Step 2 — Scheduling Agent (Member 2)
            if (hasScheduling)
            {
                workflow = await ExecuteSchedulingAsync(
                    workflowId, userId, cancellationToken);

                if (workflow.Status == "NeedsHumanReview")
                {
                    return workflow;
                }

                // Reload for a clean EF context before the next step.
                workflow = await LoadWorkflowForExecutionAsync(
                    workflowId, cancellationToken);
            }

            // Step 3 — Documentation Clerk Agent (Member 3)
            if (hasDocumentation)
            {
                workflow = await ExecuteDocumentationAsync(
                    workflowId, userId, cancellationToken);

                if (workflow.Status == "NeedsHumanReview")
                {
                    return workflow;
                }

                // Reload for a clean EF context before validation.
                workflow = await LoadWorkflowForExecutionAsync(
                    workflowId, cancellationToken);
            }

            // Step 4 — Coordinator validation + transition to AwaitingApproval.
            // This is the terminal step for ExecuteAll — it never books an
            // appointment or bypasses the admin approval gate.
            workflow = await ValidateAndTransitionAsync(
                workflowId, userId, cancellationToken);
        }
        catch (Exception)
        {
            // On unexpected failure, reload the latest persisted state and
            // return it so the caller has a meaningful response.
            try
            {
                workflow = await LoadWorkflowForExecutionAsync(
                    workflowId, cancellationToken);
            }
            catch
            {
                // If even the reload fails, re-throw the original exception.
                throw;
            }
        }

        return workflow;
    }

    // =================================================================
    // 2. MEMBER 1 — LAWYER RECOMMENDATION AGENT
    // =================================================================

    public async Task<AgentWorkflow> ExecuteLawyerRecommendationAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var workflow = await LoadWorkflowForExecutionAsync(
            workflowId, cancellationToken);

        var lawyerStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "LawyerRecommendationAgent")
            ?? throw new InvalidOperationException(
                "This workflow does not require lawyer recommendation.");

        // Idempotent guard.
        if (lawyerStep.Status != "Pending" && lawyerStep.Status != "Failed")
        {
            return workflow;
        }

        lawyerStep.Status = "Running";
        workflow.Status = "Running";
        workflow.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            var result = await RunLawyerRecommendationAsync(
                workflow.ServiceRequest, userId, cancellationToken);

            lawyerStep.OutputPayload = JsonSerializer.Serialize(result);

            lawyerStep.Status = result.Status switch
            {
                "AWAITING_APPROVAL" => "Completed",
                "NO_MATCH"          => "Completed",
                "UNSUPPORTED"       => "Completed",
                "ACTION_COMPLETED"  => "Completed",
                "FAILED"            => "Failed",
                null                => "Completed",
                _                   => result.Status
            };

            // Record a ToolExecution for this step.
            await RecordToolExecutionAsync(
                lawyerStep.StepId,
                toolName: "lawyer_recommendation.recommend",
                inputData: JsonSerializer.Serialize(new
                {
                    workflowId,
                    serviceRequestId = workflow.ServiceRequestId,
                    userId
                }),
                outputData: lawyerStep.OutputPayload,
                success: lawyerStep.Status == "Completed",
                cancellationToken);

            // DO NOT jump to AwaitingApproval here; validation gate controls that.
            workflow.Status = UpdateWorkflowStatusAfterStep(workflow);
            workflow.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return workflow;
        }
        catch (Exception ex)
        {
            await HandleStepFailureAsync(
                workflow, lawyerStep,
                toolName: "lawyer_recommendation.recommend",
                error: ex.Message,
                cancellationToken);
            throw;
        }
    }

    // =================================================================
    // 3. MEMBER 2 — SCHEDULING AGENT
    // =================================================================

    public async Task<AgentWorkflow> ExecuteSchedulingAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var workflow = await LoadWorkflowForExecutionAsync(
            workflowId, cancellationToken);

        var schedulingStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "SchedulingAgent")
            ?? throw new InvalidOperationException(
                "This workflow does not require scheduling.");

        // Idempotent guard.
        if (schedulingStep.Status != "Pending" &&
            schedulingStep.Status != "Failed")
        {
            return workflow;
        }

        schedulingStep.Status = "Running";
        workflow.Status = "Running";
        workflow.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            // -------------------------------------------------------
            // Delegate to Member 2's AvailabilityService.
            //
            // Strategy: read the LawyerRecommendationAgent step output
            // to extract recommended lawyer IDs, then call LoadAsync
            // with only those IDs so the result reflects actual available
            // slots for the specific lawyers that were recommended.
            //
            // If no lawyer recommendation step is present (scheduling-only
            // workflow), LoadAsync returns data for all active lawyers.
            // Slots are never invented — they come from the real DB.
            // -------------------------------------------------------

            var today = _availabilityService.Today;
            var until = today.AddDays(6); // 7-day window (today inclusive)

            // Attempt to read recommended lawyer IDs from Member 1 output.
            List<Guid>? recommendedLawyerIds = null;

            var lawyerStep = workflow.AgentSteps
                .FirstOrDefault(x => x.AgentName == "LawyerRecommendationAgent");

            if (lawyerStep?.Status == "Completed" &&
                !string.IsNullOrWhiteSpace(lawyerStep.OutputPayload))
            {
                try
                {
                    var recommendation =
                        JsonSerializer.Deserialize<RecommendationResponse>(
                            lawyerStep.OutputPayload, _jsonOpts);

                    if (recommendation?.Recommendations is { Count: > 0 })
                    {
                        recommendedLawyerIds = recommendation.Recommendations
                            .Select(r => r.LawyerId)
                            .Where(id => id != Guid.Empty)
                            .Distinct()
                            .ToList();
                    }
                }
                catch (JsonException)
                {
                    // If deserialization fails, proceed without filtering.
                }
            }

            // Load availability snapshot scoped to recommended lawyers
            // (or all lawyers when no recommendation step is present).
            var snapshot = await _availabilityService.LoadAsync(
                today, until,
                lawyerIds: recommendedLawyerIds,
                ct: cancellationToken);

            // Build per-lawyer, per-day slot output using the real
            // AvailableSlotsResponse / DerivedSlot structures from Member 2.
            var lawyersToReport = recommendedLawyerIds
                ?? snapshot.Lawyers.Select(l => l.Id).ToList();

            var recommendedLawyerSlots = lawyersToReport.Select(lawyerId =>
            {
                var days = Enumerable.Range(0, 7).Select(offset =>
                {
                    var date = today.AddDays(offset);

                    // Materialize slots as a list of uniform anonymous objects.
                    // Day() throws ApiException(404) when the lawyer is not in
                    // the snapshot (e.g. recommended but since deactivated).
                    var slots = Array.Empty<object>();
                    try
                    {
                        var dayResult = snapshot.Day(lawyerId, date);
                        slots = dayResult.AvailableSlots
                            .Select(s => (object)new
                            {
                                slotId = s.SlotId,
                                start  = s.Start.ToString("HH:mm"),
                                end    = s.End.ToString("HH:mm")
                            })
                            .ToArray();
                    }
                    catch
                    {
                        // Return empty slots for this day — do not fail the
                        // whole scheduling step over one absent lawyer.
                    }

                    return new
                    {
                        date           = date.ToString("yyyy-MM-dd"),
                        availableSlots = slots
                    };
                }).ToList();

                return new
                {
                    lawyerId = lawyerId.ToString(),
                    days
                };
            }).ToList();

            var schedulingResult = new
            {
                agent  = "SchedulingAgent",
                status = "AVAILABILITY_FETCHED",
                recommendedLawyers = recommendedLawyerSlots,
                windowStart = today.ToString("yyyy-MM-dd"),
                windowEnd   = until.ToString("yyyy-MM-dd"),
                fetchedAt   = DateTime.UtcNow
            };

            schedulingStep.OutputPayload =
                JsonSerializer.Serialize(schedulingResult);

            schedulingStep.Status = "Completed";

            await RecordToolExecutionAsync(
                schedulingStep.StepId,
                toolName: "scheduling.fetch_availability",
                inputData: JsonSerializer.Serialize(new
                {
                    workflowId,
                    windowDays     = 7,
                    lawyerIds      = recommendedLawyerIds,
                    userId
                }),
                outputData: schedulingStep.OutputPayload,
                success: true,
                cancellationToken);

            workflow.Status = UpdateWorkflowStatusAfterStep(workflow);
            workflow.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return workflow;
        }
        catch (Exception ex)
        {
            await HandleStepFailureAsync(
                workflow, schedulingStep,
                toolName: "scheduling.fetch_availability",
                error: ex.Message,
                cancellationToken);
            throw;
        }
    }

    // =================================================================
    // 4. MEMBER 3 — DOCUMENTATION / CLERK AGENT
    // =================================================================

    public async Task<AgentWorkflow> ExecuteDocumentationAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var workflow = await LoadWorkflowForExecutionAsync(
            workflowId, cancellationToken);

        var documentationStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "DocumentationClerkAgent")
            ?? throw new InvalidOperationException(
                "This workflow does not require documentation analysis.");

        // Idempotent guard.
        if (documentationStep.Status != "Pending" &&
            documentationStep.Status != "Failed")
        {
            return workflow;
        }

        documentationStep.Status = "Running";
        workflow.Status = "Running";
        workflow.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            // -------------------------------------------------------
            // Delegate to Member 3's IAgentIntegrationService
            // (POST /api/agent/documentation/analyze).
            //
            // The service request title + description are used as the
            // objective.  requestId 0 signals no persisted
            // DocumentationRequest exists yet; the AI service handles
            // that gracefully.
            //
            // The raw AI result is stored as-is inside an outer
            // metadata envelope so callers can distinguish the source
            // and know whether a real DocumentationRequest was involved.
            // -------------------------------------------------------

            var objective =
                $"{workflow.ServiceRequest.Title}. " +
                $"{workflow.ServiceRequest.Description}";

            var customerId =
                workflow.ServiceRequest.CustomerId.ToString();

            // Real call to Member 3's AI endpoint — do not replace.
            var analysisResult =
                await _agentIntegrationService
                    .AnalyzeDocumentationRequestAsync(
                        requestId: 0,       // no persisted DocumentationRequest
                        customerId: customerId,
                        objective: objective);

            // Wrap the returned AgentAnalysisResponse with metadata.
            // source = "ServiceRequestObjective" because we derived the
            //   objective from the service request description, not from a
            //   real DocumentationRequest record.
            // documentationRequestId = null because no DocumentationRequest
            //   was created or persisted.
            // analysis = the actual returned AgentAnalysisResponse object.
            var outputEnvelope = new
            {
                source                = "ServiceRequestObjective",
                documentationRequestId = (int?)null,
                objective,
                customerId,
                analysis              = analysisResult
            };

            documentationStep.OutputPayload =
                JsonSerializer.Serialize(outputEnvelope);

            // Treat any non-error status from the AI agent as success.
            var isFailed =
                analysisResult.Status is
                    "AI_SERVICE_ERROR" or
                    "AI_SERVICE_UNAVAILABLE";

            documentationStep.Status = isFailed ? "Failed" : "Completed";

            await RecordToolExecutionAsync(
                documentationStep.StepId,
                toolName: "documentation.analyze",
                inputData: JsonSerializer.Serialize(new
                {
                    workflowId,
                    customerId,
                    objective,
                    userId
                }),
                outputData: documentationStep.OutputPayload,
                success: !isFailed,
                cancellationToken);

            workflow.Status = UpdateWorkflowStatusAfterStep(workflow);
            workflow.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return workflow;
        }
        catch (Exception ex)
        {
            await HandleStepFailureAsync(
                workflow, documentationStep,
                toolName: "documentation.analyze",
                error: ex.Message,
                cancellationToken);
            throw;
        }
    }

    // =================================================================
    // 5. COORDINATOR VALIDATION
    // =================================================================

    public async Task<AgentWorkflow> ValidateAndTransitionAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var workflow = await LoadWorkflowForExecutionAsync(
            workflowId, cancellationToken);

        var errors     = new List<string>();
        var rulesChecked = new List<string>();

        // ------------------------------------------------------------------
        // Collect step references once for rule evaluation.
        // ------------------------------------------------------------------
        var lawyerStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "LawyerRecommendationAgent");
        var schedulingStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "SchedulingAgent");
        var documentationStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "DocumentationClerkAgent");

        // ------------------------------------------------------------------
        // Helper: validate a single step (present, status=Completed, valid JSON).
        // Returns the parsed JsonDocument when output is valid, else null.
        // ------------------------------------------------------------------
        JsonDocument? ValidateStep(
            AgentStep? step,
            string agentName,
            out bool stepOk)
        {
            stepOk = true;

            if (step == null)
            {
                // Step absent ⇒ not required by the plan — skip.
                return null;
            }

            rulesChecked.Add($"step_exists:{agentName}");
            rulesChecked.Add($"step_status_ok:{agentName}");

            if (step.Status != "Completed")
{
                errors.Add(
                    $"{agentName} step is in status '{step.Status}'. " +
                    "It must be Completed before validation.");

                stepOk = false;
            }

            rulesChecked.Add($"step_output_valid_json:{agentName}");

            if (!IsValidJson(step.OutputPayload))
            {
                errors.Add($"{agentName} output payload is not valid JSON.");
                stepOk = false;
                return null;
            }

            try
            {
                return JsonDocument.Parse(step.OutputPayload);
            }
            catch
            {
                return null;
            }
        }

        // ------------------------------------------------------------------
        // Rule set for LawyerRecommendationAgent
        // ------------------------------------------------------------------
        using var lawyerDoc = ValidateStep(lawyerStep, "LawyerRecommendationAgent", out var lawyerOk);

        List<Guid> recommendedLawyerIds = new();

        if (lawyerOk && lawyerStep != null && lawyerDoc != null)
        {
            rulesChecked.Add("lawyer_recommendations_present");

            // When the plan requires a lawyer, the recommendation must
            // contain at least one entry with a valid LawyerId.
            RecommendationResponse? reco = null;
            try
            {
                reco = JsonSerializer.Deserialize<RecommendationResponse>(
                    lawyerStep.OutputPayload, _jsonOpts);
            }
            catch (JsonException) { /* handled below */ }

            if (reco?.Recommendations == null || reco.Recommendations.Count == 0)
            {
                errors.Add(
                    "LawyerRecommendationAgent returned no recommendations. " +
                    "At least one recommended lawyer is required.");
            }
            else
            {
                recommendedLawyerIds = reco.Recommendations
                    .Select(r => r.LawyerId)
                    .Where(id => id != Guid.Empty)
                    .Distinct()
                    .ToList();
            }
        }

        // ------------------------------------------------------------------
        // Rule set for SchedulingAgent
        // ------------------------------------------------------------------
        using var schedulingDoc = ValidateStep(schedulingStep, "SchedulingAgent", out var schedulingOk);

        if (schedulingOk && schedulingStep != null && schedulingDoc != null &&
            recommendedLawyerIds.Count > 0)
        {
            // Scheduling output must reference only recommended lawyers.
            rulesChecked.Add("scheduling_lawyer_ids_match_recommendations");

            var schedulingLawyerIds = new List<Guid>();

            try
            {
                if (schedulingDoc.RootElement.TryGetProperty(
                        "recommendedLawyers", out var lawyerArr) &&
                    lawyerArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in lawyerArr.EnumerateArray())
                    {
                        if (item.TryGetProperty("lawyerId", out var idProp) &&
                            Guid.TryParse(idProp.GetString(), out var gid))
                        {
                            schedulingLawyerIds.Add(gid);
                        }
                    }
                }
            }
            catch { /* tolerate malformed payloads */ }

            var rogue = schedulingLawyerIds
                .Where(id => !recommendedLawyerIds.Contains(id))
                .ToList();

            if (rogue.Count > 0)
            {
                errors.Add(
                    "SchedulingAgent output contains lawyer IDs that do not " +
                    "belong to the recommended lawyers: " +
                    string.Join(", ", rogue));
            }
        }

        // ------------------------------------------------------------------
        // Rule set for DocumentationClerkAgent
        // ------------------------------------------------------------------
        using var docDoc = ValidateStep(documentationStep, "DocumentationClerkAgent", out var docOk);

        if (docOk && documentationStep != null && docDoc != null)
        {
            rulesChecked.Add("documentation_ai_status_ok");

            // Reject AI error statuses propagated by the real AI service.
            string? aiStatus = null;

            try
            {
                // The output is wrapped in the metadata envelope:
                // { source, documentationRequestId, analysis: { status, ... } }
                if (docDoc.RootElement.TryGetProperty("analysis", out var analysisEl) &&
                    analysisEl.TryGetProperty("status", out var statusEl))
                {
                    aiStatus = statusEl.GetString();
                }
                else if (docDoc.RootElement.TryGetProperty("status", out var directStatus))
                {
                    // Legacy format: status at root level.
                    aiStatus = directStatus.GetString();
                }
            }
            catch { /* tolerate */ }

            if (aiStatus is "AI_SERVICE_ERROR" or "AI_SERVICE_UNAVAILABLE")
            {
                errors.Add(
                    $"DocumentationClerkAgent AI returned '{aiStatus}'. " +
                    "The documentation analysis must succeed before approval.");
            }
        }

        // ------------------------------------------------------------------
        // Determine outcome and persist ValidationResult.
        // ------------------------------------------------------------------
        var passed = errors.Count == 0;

        // Persist the ValidationResult.
        _context.ValidationResults.Add(new ValidationResult
        {
            ValidationId = Guid.NewGuid(),
            WorkflowId   = workflow.WorkflowId,
            RulesChecked = JsonSerializer.Serialize(rulesChecked),
            Passed       = passed,
            Errors       = JsonSerializer.Serialize(errors),
            CheckedAt    = DateTime.UtcNow
        });


/////





        // Find / update the coordinator validation step.
        var validationStep = workflow.AgentSteps
            .FirstOrDefault(x =>
                x.AgentName == "PlanningCoordinatorAgent" &&
                x.StepName  == "Validate delegated results");

        if (validationStep != null)
        {
            validationStep.Status = passed ? "Completed" : "Failed";

            validationStep.OutputPayload = JsonSerializer.Serialize(new
            {
                passed,
                rulesChecked,
                errors,
                checkedAt = DateTime.UtcNow
            });
        }

        // Record a ToolExecution for auditability.
        if (validationStep != null)
        {
            await RecordToolExecutionAsync(
                validationStep.StepId,
                toolName: "coordinator.validate_outputs",
                inputData: JsonSerializer.Serialize(new
                {
                    workflowId,
                    userId
                }),
                outputData: validationStep.OutputPayload ?? "{}",
                success: passed,
                cancellationToken);
        }

        // Transition workflow status.
        workflow.Status     = passed ? "AwaitingApproval" : "NeedsHumanReview";
        workflow.UpdatedAt  = DateTime.UtcNow;


        if (workflow.ServiceRequest != null)
        {
            workflow.ServiceRequest.Status =ServiceRequestStatus.AwaitingReview;
            workflow.ServiceRequest.UpdatedAt = DateTime.UtcNow;
        }
        // Write an audit log entry.
        _context.AuditLogs.Add(new AuditLog
        {
            AuditLogId = Guid.NewGuid(),
            UserId     = userId,
            Action     = "AgentWorkflow.CoordinatorValidation",
            Details    = JsonSerializer.Serialize(new
            {
                workflowId       = workflow.WorkflowId,
                serviceRequestId = workflow.ServiceRequestId,
                passed,
                newStatus        = workflow.Status,
                errorCount       = errors.Count
            }),
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);






        
        return workflow;
    }

    // =================================================================
    // 6. GET WORKFLOW
    // =================================================================

    public async Task<AgentWorkflow?> GetWorkflowAsync(
        Guid workflowId,
        CancellationToken cancellationToken = default)
    {
        return await _context.AgentWorkflows
            .AsNoTracking()
            .Include(x => x.ServiceRequest)
            .Include(x => x.AgentSteps)
                .ThenInclude(x => x.ToolExecutions)
            .Include(x => x.ValidationResults)
            .Include(x => x.ApprovalDecisions)
            .Include(x => x.ExecutionSummary)
            .FirstOrDefaultAsync(
                x => x.WorkflowId == workflowId,
                cancellationToken);
    }

    // =================================================================
    // 7. APPROVE LAWYER / HUMAN APPROVAL GATE
    //
    // Unchanged from the original implementation — delegating fully to
    // Member 1's service.  Only called after AwaitingApproval status.
    // =================================================================

    public async Task<AgentWorkflow> ApproveLawyerAsync(
        Guid workflowId,
        Guid lawyerId,
        Guid slotId,
        DateOnly bookingDate,
        int approverUserId,
        string? comments = null,
        CancellationToken cancellationToken = default)
    {
        // -----------------------------------------------------------------
        // 7-1. Load workflow.
        // -----------------------------------------------------------------

        var workflow = await _context.AgentWorkflows
            .Include(x => x.ServiceRequest)
            .Include(x => x.AgentSteps)
            .SingleOrDefaultAsync(
                x => x.WorkflowId == workflowId,
                cancellationToken)
            ?? throw new KeyNotFoundException(
                "Agent workflow not found.");

        // -----------------------------------------------------------------
        // 7-2. Guard: must be AwaitingApproval.
        // -----------------------------------------------------------------

        if (workflow.Status != "AwaitingApproval")
        {
            throw new InvalidOperationException(
                $"Workflow must be AwaitingApproval before approval. " +
                $"Current status: {workflow.Status}.");
        }

        if (workflow.ServiceRequest == null)
        {
            throw new InvalidOperationException(
                "Service request is missing from the workflow.");
        }

        var lawyerStep = workflow.AgentSteps
            .FirstOrDefault(x => x.AgentName == "LawyerRecommendationAgent")
            ?? throw new InvalidOperationException(
                "Lawyer recommendation step was not found.");

        if (lawyerStep.Status != "Completed")
        {
            throw new InvalidOperationException(
                "Lawyer recommendation must be completed before approval.");
        }

        // -----------------------------------------------------------------
        // 7-3. Read Member 1 recommendation result.
        // -----------------------------------------------------------------

        RecommendationResponse recommendation;
        try
        {
            recommendation =
                JsonSerializer.Deserialize<RecommendationResponse>(
                    lawyerStep.OutputPayload, _jsonOpts)
                ?? throw new InvalidOperationException(
                    "Lawyer recommendation output is invalid.");
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException(
                "Could not read the lawyer recommendation result.", ex);
        }

        if (!recommendation.WorkflowId.HasValue)
        {
            throw new InvalidOperationException(
                "Member 1 recommendation workflow ID is missing.");
        }

        if (recommendation.Recommendations == null ||
            !recommendation.Recommendations.Any(x => x.LawyerId == lawyerId))
        {
            throw new InvalidOperationException(
                "The selected lawyer was not recommended by this workflow.");
        }

        var member1WorkflowId = recommendation.WorkflowId.Value;

        // -----------------------------------------------------------------
        // 7-4. Check if Member 1 already completed the booking (idempotent).
        // -----------------------------------------------------------------




RecommendationResponse member1Result;

// Member 1 recommendation workflow belongs to the customer,
// while approverUserId represents the admin performing approval.
var member1OwnerUserId = workflow.ServiceRequest.CustomerId;

var currentMember1State =
    await _lawyerRecommendationService.GetAsync(
        member1WorkflowId,
        member1OwnerUserId,
        cancellationToken);

if (currentMember1State.Status == "ACTION_COMPLETED")
{
    // Already booked — do not create a second appointment.
    member1Result = currentMember1State;
}
else
{
    // Submit selected lawyer/slot to Member 1 using the
    // original recommendation workflow owner.
    await _lawyerRecommendationService.SaveReviewAsync(
        member1WorkflowId,
        new SaveRecommendationReviewRequest
        {
            ClientId = workflow.ServiceRequest.CustomerId,
            LawyerId = lawyerId,
            SlotId = slotId,
            BookingDate = bookingDate,
            Stage = "APPOINTMENT",
            ConfirmClientChange = false
        },
        member1OwnerUserId,
        cancellationToken);

    // Execute the booking through Member 1.
    member1Result =
        await _lawyerRecommendationService.ApproveAsync(
            member1WorkflowId,
            new ApproveRecommendationRequest
            {
                LawyerId = lawyerId,
                CustomerId = EncodeUserIdAsGuid(
                    workflow.ServiceRequest.CustomerId),
                SlotId = slotId
            },
            member1OwnerUserId,
            cancellationToken);
}







        // -----------------------------------------------------------------
        // 7-5. Verify Member 1 completed the booking.
        // -----------------------------------------------------------------

        if (member1Result.Status != "ACTION_COMPLETED")
        {
            throw new InvalidOperationException(
                $"Member 1 action was not completed. " +
                $"Current status: {member1Result.Status ?? "unknown"}.");
        }

        if (!member1Result.AppointmentId.HasValue)
        {
            throw new InvalidOperationException(
                "Member 1 completed the action but no appointment ID was returned.");
        }

        // -----------------------------------------------------------------
        // 7-6. Update the lawyer step.
        // -----------------------------------------------------------------

        lawyerStep.OutputPayload = JsonSerializer.Serialize(member1Result);
        lawyerStep.Status = "Completed";

        // -----------------------------------------------------------------
        // 7-7. Insert ApprovalDecision (idempotent).
        // -----------------------------------------------------------------

        var approvalExists = await _context.ApprovalDecisions
            .AsNoTracking()
            .AnyAsync(
                x => x.WorkflowId == workflow.WorkflowId &&
                     x.Decision == "Approved",
                cancellationToken);

        if (!approvalExists)
        {
            _context.ApprovalDecisions.Add(new ApprovalDecision
            {
                DecisionId = Guid.NewGuid(),
                WorkflowId = workflow.WorkflowId,
                ApproverId = EncodeUserIdAsGuid(approverUserId),
                Decision = "Approved",
                Comments = comments?.Trim() ?? string.Empty,
                DecidedAt = DateTime.UtcNow
            });
        }

        // -----------------------------------------------------------------
        // 7-8. Insert ToolExecution (idempotent).
        // -----------------------------------------------------------------

        var toolExecutionExists = await _context.ToolExecutions
            .AsNoTracking()
            .AnyAsync(
                x => x.StepId == lawyerStep.StepId &&
                     x.ToolName == "lawyer_recommendation.approve" &&
                     x.Success,
                cancellationToken);

        if (!toolExecutionExists)
        {
            _context.ToolExecutions.Add(new ToolExecution
            {
                ToolId = Guid.NewGuid(),
                StepId = lawyerStep.StepId,
                ToolName = "lawyer_recommendation.approve",
                InputData = JsonSerializer.Serialize(new
                {
                    member1WorkflowId,
                    lawyerId,
                    slotId,
                    bookingDate,
                    customerId = workflow.ServiceRequest.CustomerId,
                    approverUserId
                }),
                OutputData = JsonSerializer.Serialize(new
                {
                    member1Result.Status,
                    member1Result.AppointmentId,
                    member1Result.ApprovedLawyerId,
                    member1Result.SelectedLawyerId,
                    member1Result.SelectedSlotId,
                    member1Result.BookingDate
                }),
                Success = true,
                ExecutedAt = DateTime.UtcNow
            });
        }

        // -----------------------------------------------------------------
        // 7-9. Create / update ExecutionSummary.
        // -----------------------------------------------------------------

        var outcome = JsonSerializer.Serialize(new
        {
            action = "Lawyer appointment approved",
            member1WorkflowId,
            appointmentId = member1Result.AppointmentId,
            lawyerId = member1Result.ApprovedLawyerId,
            customerId = workflow.ServiceRequest.CustomerId,
            bookingDate = member1Result.BookingDate,
            slotId = member1Result.SelectedSlotId,
            status = member1Result.Status
        });

        var existingSummary = await _context.ExecutionSummaries
            .FirstOrDefaultAsync(
                x => x.WorkflowId == workflow.WorkflowId,
                cancellationToken);

        if (existingSummary == null)
        {
            _context.ExecutionSummaries.Add(new ExecutionSummary
            {
                SummaryId = Guid.NewGuid(),
                WorkflowId = workflow.WorkflowId,
                FinalOutcome = outcome,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existingSummary.FinalOutcome = outcome;
        }

        // -----------------------------------------------------------------
        // 7-10. Write AuditLog.
        // -----------------------------------------------------------------

        _context.AuditLogs.Add(new AuditLog
        {
            AuditLogId = Guid.NewGuid(),
            UserId = approverUserId,
            Action = "AgentWorkflow.LawyerApproval",
            Details = JsonSerializer.Serialize(new
            {
                workflowId = workflow.WorkflowId,
                serviceRequestId = workflow.ServiceRequestId,
                member1WorkflowId,
                decision = "Approved",
                lawyerId = member1Result.ApprovedLawyerId,
                slotId = member1Result.SelectedSlotId,
                bookingDate = member1Result.BookingDate,
                appointmentId = member1Result.AppointmentId,
                member1Status = member1Result.Status
            }),
            Timestamp = DateTime.UtcNow
        });





        // -----------------------------------------------------------------
        // 7-11. Mark workflow Completed.
        // -----------------------------------------------------------------

       // -----------------------------------------------------------------
// 7-11. Complete Coordinator approval step.
// -----------------------------------------------------------------

var approvalStep = workflow.AgentSteps
    .FirstOrDefault(x =>
        x.AgentName == "PlanningCoordinatorAgent" &&
        x.StepName == "Request human approval");

if (approvalStep != null)
{
    approvalStep.Status = "Completed";

    approvalStep.OutputPayload =
        JsonSerializer.Serialize(new
        {
            decision = "Approved",
            approverUserId,
            lawyerId,
            slotId,
            bookingDate,
            appointmentId = member1Result.AppointmentId,
            decidedAt = DateTime.UtcNow
        });
}


// -----------------------------------------------------------------
// 7-12. Complete parent ServiceRequest.
// -----------------------------------------------------------------

workflow.ServiceRequest.Status =
    ServiceRequestStatus.Completed;

workflow.ServiceRequest.UpdatedAt =
    DateTime.UtcNow;


// -----------------------------------------------------------------
// 7-13. Mark workflow Completed.
// -----------------------------------------------------------------

workflow.Status = "Completed";
workflow.UpdatedAt = DateTime.UtcNow;

await _context.SaveChangesAsync(cancellationToken);


// -----------------------------------------------------------------
// 7-14. Return fully hydrated final workflow.
// -----------------------------------------------------------------

_context.ChangeTracker.Clear();

return await _context.AgentWorkflows
    .AsNoTracking()
    .AsSplitQuery()
    .Include(x => x.ServiceRequest)
    .Include(x => x.AgentSteps)
        .ThenInclude(x => x.ToolExecutions)
    .Include(x => x.ValidationResults)
    .Include(x => x.ApprovalDecisions)
    .Include(x => x.ExecutionSummary)
    .SingleAsync(
        x => x.WorkflowId == workflowId,
        cancellationToken);
}
    

    // =================================================================
    // PRIVATE HELPERS
    // =================================================================

    // -----------------------------------------------------------------
    // Load a workflow with all child collections required for execution.
    // -----------------------------------------------------------------

    private async Task<AgentWorkflow> LoadWorkflowForExecutionAsync(
        Guid workflowId,
        CancellationToken cancellationToken)
    {
        return await _context.AgentWorkflows
            .Include(x => x.ServiceRequest)
            .Include(x => x.AgentSteps)
                .ThenInclude(x => x.ToolExecutions)
            .SingleOrDefaultAsync(
                x => x.WorkflowId == workflowId,
                cancellationToken)
            ?? throw new KeyNotFoundException(
                "Agent workflow was not found.");
    }

    // -----------------------------------------------------------------
    // Derives the correct workflow status by inspecting all step states.
    //
    // Rules:
    //   - If any specialist step is Failed → NeedsHumanReview
    //   - If any specialist step is Running → Running
    //   - If any required specialist step is still Pending → Running
    //     (coordinator should not auto-advance; caller controls sequencing)
    //   - Otherwise → Running (neutral; ValidateAndTransition sets
    //     AwaitingApproval or NeedsHumanReview)
    // -----------------------------------------------------------------

    private static string UpdateWorkflowStatusAfterStep(AgentWorkflow workflow)
    {
        var specialistSteps = workflow.AgentSteps
            .Where(x => x.AgentName is
                "LawyerRecommendationAgent" or
                "SchedulingAgent" or
                "DocumentationClerkAgent")
            .ToList();

        if (specialistSteps.Any(x => x.Status == "Failed"))
        {
            return "NeedsHumanReview";
        }

        if (specialistSteps.Any(x =>
            x.Status == "Running" || x.Status == "Pending"))
        {
            return "Running";
        }

        // All present specialist steps are Completed.
        // Stay at Running — coordinator validate step will set AwaitingApproval.
        return "Running";
    }

    // -----------------------------------------------------------------
    // Member 1 delegation helper.
    // -----------------------------------------------------------------

    private async Task<RecommendationResponse> RunLawyerRecommendationAsync(
        ServiceRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        var recommendationRequest = new RecommendationRequest
        {
            Requirement = $"{request.Title}. {request.Description}",
            ClientId = request.CustomerId,
            Limit = 5
        };

        return await _lawyerRecommendationService.RecommendAsync(
            recommendationRequest, userId, cancellationToken);
    }

    // -----------------------------------------------------------------
    // Record a ToolExecution (idempotent by toolName + stepId + success).
    // -----------------------------------------------------------------

    private async Task RecordToolExecutionAsync(
        Guid stepId,
        string toolName,
        string inputData,
        string outputData,
        bool success,
        CancellationToken cancellationToken)
    {
        var exists = await _context.ToolExecutions
            .AsNoTracking()
            .AnyAsync(
                x => x.StepId == stepId &&
                     x.ToolName == toolName &&
                     x.Success == success,
                cancellationToken);

        if (!exists)
        {
            _context.ToolExecutions.Add(new ToolExecution
            {
                ToolId = Guid.NewGuid(),
                StepId = stepId,
                ToolName = toolName,
                InputData = inputData,
                OutputData = outputData,
                Success = success,
                ExecutedAt = DateTime.UtcNow
            });
        }
    }

    // -----------------------------------------------------------------
    // Shared step-failure handler: sets step + workflow status,
    // records a failed ToolExecution, and persists.
    // -----------------------------------------------------------------

    private async Task HandleStepFailureAsync(
        AgentWorkflow workflow,
        AgentStep step,
        string toolName,
        string error,
        CancellationToken cancellationToken)
    {
        step.Status = "Failed";
        step.OutputPayload = JsonSerializer.Serialize(new
        {
            status = "Failed",
            error
        });

        workflow.Status = "NeedsHumanReview";
        workflow.UpdatedAt = DateTime.UtcNow;

        _context.ToolExecutions.Add(new ToolExecution
        {
            ToolId = Guid.NewGuid(),
            StepId = step.StepId,
            ToolName = toolName,
            InputData = "{}",
            OutputData = JsonSerializer.Serialize(new { error }),
            Success = false,
            ExecutedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
    }

    // -----------------------------------------------------------------
    // JSON validity check for ValidationResult rule 3.
    // -----------------------------------------------------------------

    private static bool IsValidJson(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return false;
        try
        {
            using var doc = JsonDocument.Parse(payload);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    // -----------------------------------------------------------------
    // Encode an integer user ID as a 128-bit Guid for legacy Guid DTOs.
    // -----------------------------------------------------------------

    private static Guid EncodeUserIdAsGuid(int userId)
    {
        if (userId <= 0)
        {
            throw new ArgumentOutOfRangeException(
                nameof(userId),
                "User ID must be greater than zero.");
        }

        var hex = userId.ToString("x12");
        return Guid.Parse($"00000000-0000-0000-0000-{hex}");
    }

    // =================================================================
    // BUILD COORDINATOR PLAN
    // =================================================================

    private static CoordinatorPlanDto BuildPlan(ServiceRequest request)
    {
        var text =
            $"{request.Title} {request.Description} {request.RequestType}"
                .ToLowerInvariant();

        var category = DetectLegalCategory(text);

        var needsLawyer = ContainsAny(
            text,
            "lawyer", "attorney", "legal advice",
            "legal help", "consultation");

        var needsScheduling = ContainsAny(
            text,
            "appointment", "meeting", "meet",
            "schedule", "consultation");

        var needsDocumentation = ContainsAny(
            text,
            "document", "agreement", "affidavit",
            "deed", "certificate", "contract",
            "power of attorney", "notary");

        var plan = new CoordinatorPlanDto
        {
            ServiceRequestId = request.ServiceRequestId,
            Objective = request.Description,
            LegalCategory = category,
            RequiresLawyerRecommendation = needsLawyer,
            RequiresScheduling = needsScheduling,
            RequiresDocumentation = needsDocumentation,
            RequiresApproval = true
        };

        var order = 1;

        // Member 1
        if (needsLawyer)
        {
            plan.Steps.Add(new CoordinatorPlanStepDto
            {
                Order = order++,
                AgentName = "LawyerRecommendationAgent",
                StepName = "Recommend suitable lawyers",
                Action = "recommend_lawyers"
            });
        }

        // Member 2
        if (needsScheduling)
        {
            plan.Steps.Add(new CoordinatorPlanStepDto
            {
                Order = order++,
                AgentName = "SchedulingAgent",
                StepName = "Find available appointment slots",
                Action = "find_available_slots"
            });
        }

        // Member 3
        if (needsDocumentation)
        {
            plan.Steps.Add(new CoordinatorPlanStepDto
            {
                Order = order++,
                AgentName = "DocumentationClerkAgent",
                StepName = "Analyze required documentation",
                Action = "analyze_document_requirements"
            });
        }

        // Member 4 — validation
        plan.Steps.Add(new CoordinatorPlanStepDto
        {
            Order = order++,
            AgentName = "PlanningCoordinatorAgent",
            StepName = "Validate delegated results",
            Action = "validate_results"
        });

        // Member 4 — human-approval gate
        plan.Steps.Add(new CoordinatorPlanStepDto
        {
            Order = order,
            AgentName = "PlanningCoordinatorAgent",
            StepName = "Request human approval",
            Action = "request_human_approval"
        });

        return plan;
    }

    // =================================================================
    // KEYWORD HELPERS
    // =================================================================

    private static bool ContainsAny(string text, params string[] terms)
        => terms.Any(t => text.Contains(t, StringComparison.OrdinalIgnoreCase));

    private static string DetectLegalCategory(string text)
    {
        if (ContainsAny(text, "property", "land", "lease", "deed", "ownership"))
            return "Property";

        if (ContainsAny(text, "criminal", "police", "bail", "arrest"))
            return "Criminal";

        if (ContainsAny(text, "employment", "employee", "labour", "salary"))
            return "Employment";

        if (ContainsAny(text, "company", "business", "commercial", "corporate"))
            return "Commercial";

        if (ContainsAny(text, "tax"))
            return "Tax";

        if (ContainsAny(text, "family", "divorce", "custody", "marriage"))
            return "Family";

        return "Other";
    }
}