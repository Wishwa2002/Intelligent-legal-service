namespace LegalService.API.DTOs.Requests;

public class CreateLawyerRequest : UpdateLawyerRequest
{
    public string? Password { get; set; }
}
