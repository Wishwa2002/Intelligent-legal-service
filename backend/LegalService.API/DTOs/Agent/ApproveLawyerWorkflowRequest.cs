using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Agent;

public sealed class ApproveLawyerWorkflowRequest
{
    [Required]
    public Guid LawyerId { get; set; }

    [Required]
    public Guid SlotId { get; set; }

    [Required]
    public DateOnly BookingDate { get; set; }

    public string? Comments { get; set; }
}