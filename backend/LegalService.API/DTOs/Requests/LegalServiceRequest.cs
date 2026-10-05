using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public sealed class LegalServiceRequest
{
    [Required, MaxLength(200)] public string ServiceName { get; set; } = "";
    [MaxLength(2000)] public string Description { get; set; } = "";
    [Required, MaxLength(200)] public string Category { get; set; } = "";
}
