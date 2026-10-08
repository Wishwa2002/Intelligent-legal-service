using System;
using System.Threading.Tasks;

namespace LegalService.API.Interfaces;

public interface IEmailNotificationService
{
    /// <summary>
    /// Sends a formatted HTML email notification to the client regarding a status update.
    /// Safely handles errors without throwing exceptions to calling services.
    /// </summary>
    Task SendRequestStatusUpdateEmailAsync(
        string? recipientEmail,
        string? recipientName,
        int requestId,
        string serviceName,
        string newStatus,
        string? clerkName = null,
        string? note = null,
        DateTime? updatedAt = null
    );

    /// <summary>
    /// Sends a formatted HTML welcome email with login credentials to a newly created clerk.
    /// Safely handles errors without throwing exceptions to calling services.
    /// </summary>
    Task SendClerkWelcomeEmailAsync(
        string? recipientEmail,
        string clerkName,
        string username,
        string password,
        string department,
        string contact,
        DateTime? createdAt = null
    );
}
