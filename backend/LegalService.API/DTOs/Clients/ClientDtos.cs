using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace LegalService.API.DTOs.Clients;
public sealed record ClientSummary(int UserId, string Name, string Email);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class RegisterClientRequest
{
    [StringLength(200)] public string FullName { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string Email { get; set; } = "";
    [Required, StringLength(200)] public string Password { get; set; } = "";
}
public sealed class DuplicateClientException(ClientSummary? existing) : Exception("An account with this email already exists.")
{ public ClientSummary? ExistingClient { get; } = existing; }
