namespace LegalService.API.DTOs.Agent;

public class CoordinatorPlanDto
{
    public Guid ServiceRequestId { get; set; }

    public string Objective { get; set; } = string.Empty;

    public string LegalCategory { get; set; } = "Other";

    public bool RequiresLawyerRecommendation { get; set; }

    public bool RequiresScheduling { get; set; }

    public bool RequiresDocumentation { get; set; }

    public bool RequiresApproval { get; set; } = true;

    public List<CoordinatorPlanStepDto> Steps { get; set; } = new();
}

public class CoordinatorPlanStepDto
{
    public int Order { get; set; }

    public string AgentName { get; set; } = string.Empty;

    public string StepName { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;
}