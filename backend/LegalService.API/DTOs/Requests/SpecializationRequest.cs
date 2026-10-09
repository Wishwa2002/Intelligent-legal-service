using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public sealed class SpecializationRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [MaxLength(2000)] public string Description { get; set; } = "";
}

