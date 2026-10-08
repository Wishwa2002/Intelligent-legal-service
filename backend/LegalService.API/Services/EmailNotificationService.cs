using System;
using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LegalService.API.Interfaces;

namespace LegalService.API.Services;

public class EmailNotificationService : IEmailNotificationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailNotificationService> _logger;

    public EmailNotificationService(IConfiguration configuration, ILogger<EmailNotificationService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendRequestStatusUpdateEmailAsync(
        string? recipientEmail,
        string? recipientName,
        int requestId,
        string serviceName,
        string newStatus,
        string? clerkName = null,
        string? note = null,
        DateTime? updatedAt = null)
    {
        try
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            var smtpHost = emailSettings["SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.TryParse(emailSettings["SmtpPort"], out var port) ? port : 587;
            var enableSsl = bool.TryParse(emailSettings["EnableSsl"], out var ssl) ? ssl : true;
            var senderEmail = emailSettings["SenderEmail"] ?? "vijayakumarvithusan2912@gmail.com";
            var senderName = emailSettings["SenderName"] ?? "VShop Legal Services";
            var appPassword = emailSettings["AppPassword"] ?? "wdrhwjnqmwqdgygy";
            var fallbackRecipient = emailSettings["FallbackRecipientEmail"] ?? "vijayakumarvithusan2912@gmail.com";

            // Determine effective recipient
            var targetEmail = recipientEmail?.Trim();
            if (string.IsNullOrWhiteSpace(targetEmail) || targetEmail.EndsWith("@example.com", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Recipient email is '{RecipientEmail}'. Routing to configured fallback email '{Fallback}'.", targetEmail, fallbackRecipient);
                targetEmail = fallbackRecipient;
            }

            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                _logger.LogWarning("No valid email recipient available for Request #{RequestId}. Skipping email.", requestId);
                return;
            }

            var displayName = string.IsNullOrWhiteSpace(recipientName) ? "Valued Client" : recipientName.Trim();
            var statusNorm = (newStatus ?? "UPDATED").Trim().ToUpperInvariant();
            var updateTime = (updatedAt ?? DateTime.UtcNow).ToLocalTime().ToString("MMMM dd, yyyy 'at' hh:mm tt");

            // Format status label and color styling
            var (statusLabel, badgeBg, badgeText, badgeBorder, statusSummary) = GetStatusVisuals(statusNorm);

            var subject = $"Update on Your Legal Request #{requestId} - {statusLabel} | VShop";

            var htmlBody = GenerateHtmlEmail(
                clientName: displayName,
                requestId: requestId,
                serviceName: serviceName,
                statusLabel: statusLabel,
                badgeBg: badgeBg,
                badgeText: badgeText,
                badgeBorder: badgeBorder,
                statusSummary: statusSummary,
                clerkName: clerkName,
                note: note,
                updateTime: updateTime
            );

            using var message = new MailMessage();
            message.From = new MailAddress(senderEmail, senderName);
            message.To.Add(new MailAddress(targetEmail, displayName));
            message.Subject = subject;
            message.Body = htmlBody;
            message.IsBodyHtml = true;

            using var smtp = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(senderEmail, appPassword),
                Timeout = 15000 // 15 seconds max
            };

            await smtp.SendMailAsync(message);
            _logger.LogInformation("Successfully sent status update email for Request #{RequestId} ({Status}) to {Recipient}",
                requestId, statusNorm, targetEmail);
        }
        catch (Exception ex)
        {
            // Log but never interrupt the primary application flow
            _logger.LogError(ex, "Failed to send status update email for Request #{RequestId} to {Recipient}", requestId, recipientEmail);
        }
    }

    public async Task SendClerkWelcomeEmailAsync(
        string? recipientEmail,
        string clerkName,
        string username,
        string password,
        string department,
        string contact,
        DateTime? createdAt = null)
    {
        try
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            var smtpHost = emailSettings["SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.TryParse(emailSettings["SmtpPort"], out var port) ? port : 587;
            var enableSsl = bool.TryParse(emailSettings["EnableSsl"], out var ssl) ? ssl : true;
            var senderEmail = emailSettings["SenderEmail"] ?? "vijayakumarvithusan2912@gmail.com";
            var senderName = emailSettings["SenderName"] ?? "VShop Legal Services";
            var appPassword = emailSettings["AppPassword"] ?? "wdrhwjnqmwqdgygy";
            var fallbackRecipient = emailSettings["FallbackRecipientEmail"] ?? "vijayakumarvithusan2912@gmail.com";

            // Determine effective recipient
            var targetEmail = recipientEmail?.Trim();
            if (string.IsNullOrWhiteSpace(targetEmail) || targetEmail.EndsWith("@example.com", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Clerk email is '{RecipientEmail}'. Routing to fallback email '{Fallback}'.", targetEmail, fallbackRecipient);
                targetEmail = fallbackRecipient;
            }

            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                _logger.LogWarning("No valid email recipient available for new clerk '{ClerkName}'. Skipping email.", clerkName);
                return;
            }

            var displayName = string.IsNullOrWhiteSpace(clerkName) ? "Legal Clerk" : clerkName.Trim();
            var creationTime = (createdAt ?? DateTime.UtcNow).ToLocalTime().ToString("MMMM dd, yyyy 'at' hh:mm tt");
            var subject = $"Welcome to VShop Legal Services - Your Clerk Account Credentials";

            var htmlBody = GenerateClerkWelcomeHtmlEmail(
                clerkName: displayName,
                username: username,
                password: password,
                department: department,
                contact: contact,
                creationTime: creationTime
            );

            using var message = new MailMessage();
            message.From = new MailAddress(senderEmail, senderName);
            message.To.Add(new MailAddress(targetEmail, displayName));
            message.Subject = subject;
            message.Body = htmlBody;
            message.IsBodyHtml = true;

            using var smtp = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(senderEmail, appPassword),
                Timeout = 15000 // 15 seconds max
            };

            await smtp.SendMailAsync(message);
            _logger.LogInformation("Successfully sent welcome & credentials email for new clerk '{ClerkName}' to {Recipient}",
                displayName, targetEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome credentials email to clerk '{ClerkName}' at {Recipient}", clerkName, recipientEmail);
        }
    }

    private static string GenerateClerkWelcomeHtmlEmail(
        string clerkName,
        string username,
        string password,
        string department,
        string contact,
        string creationTime)
    {
        var safeClerkName = HtmlEncoder.Default.Encode(clerkName);
        var safeUsername = HtmlEncoder.Default.Encode(username);
        var safePassword = HtmlEncoder.Default.Encode(password);
        var safeDepartment = HtmlEncoder.Default.Encode(department);
        var safeContact = HtmlEncoder.Default.Encode(contact);

        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Welcome to VShop Legal Platform</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #F8FAFC; padding: 30px 15px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" style=""max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;"">
          
          <!-- Header -->
          <tr>
            <td style=""background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 32px; text-align: left;"">
              <div style=""display: inline-block; padding: 4px 10px; background-color: rgba(217, 119, 6, 0.2); border-radius: 6px; font-size: 12px; font-weight: 700; color: #FBBF24; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;"">
                Staff Onboarding
              </div>
              <h1 style=""margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 700;"">Welcome to VShop Legal Services</h1>
              <p style=""margin: 4px 0 0; color: #94A3B8; font-size: 13px;"">Clerk Account Setup & Login Credentials</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style=""padding: 32px;"">
              <p style=""margin: 0 0 16px; font-size: 16px; color: #0F172A; font-weight: 600;"">
                Hello {safeClerkName},
              </p>
              <p style=""margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;"">
                An administrator has created your staff account for the <strong>VShop Intelligent Legal Services Platform</strong>. You now have access to manage client documentation requests, verify legal submissions, and collaborate on cases.
              </p>

              <!-- Credentials Box -->
              <div style=""margin-bottom: 24px; padding: 22px 24px; background-color: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;"">
                <div style=""font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; color: #0F172A; margin-bottom: 14px;"">
                  Your Account Credentials
                </div>

                <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""font-size: 13px; border-collapse: collapse;"">
                  <tr>
                    <td style=""padding: 8px 0; font-weight: 600; color: #64748B; width: 35%;"">Role:</td>
                    <td style=""padding: 8px 0; color: #0F172A; font-weight: 700;"">Legal Clerk</td>
                  </tr>
                  <tr>
                    <td style=""padding: 8px 0; font-weight: 600; color: #64748B;"">Department:</td>
                    <td style=""padding: 8px 0; color: #0F172A; font-weight: 600;"">{safeDepartment}</td>
                  </tr>
                  <tr>
                    <td style=""padding: 8px 0; font-weight: 600; color: #64748B;"">Contact:</td>
                    <td style=""padding: 8px 0; color: #0F172A;"">{safeContact}</td>
                  </tr>
                  <tr>
                    <td style=""padding: 10px 0 8px; font-weight: 600; color: #64748B; border-top: 1px solid #E2E8F0;"">Username / Email:</td>
                    <td style=""padding: 10px 0 8px; color: #1E40AF; font-weight: 700; border-top: 1px solid #E2E8F0;"">{safeUsername}</td>
                  </tr>
                  <tr>
                    <td style=""padding: 8px 0; font-weight: 600; color: #64748B;"">Temporary Password:</td>
                    <td style=""padding: 8px 0;"">
                      <span style=""display: inline-block; padding: 5px 12px; background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 800; color: #92400E; letter-spacing: 0.5px;"">
                        {safePassword}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style=""padding: 8px 0; font-weight: 600; color: #64748B;"">Account Created:</td>
                    <td style=""padding: 8px 0; color: #64748B;"">{creationTime}</td>
                  </tr>
                </table>
              </div>

              <!-- Security Notice -->
              <div style=""padding: 14px 18px; background-color: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 6px; margin-bottom: 24px;"">
                <div style=""font-weight: 700; color: #1D4ED8; font-size: 13px; margin-bottom: 2px;"">&#x1F512; Security Notice:</div>
                <div style=""color: #1E40AF; font-size: 12px; line-height: 1.5;"">
                  Please log in to the clerk portal as soon as possible and update your temporary password to maintain confidentiality.
                </div>
              </div>

              <!-- Next Steps -->
              <h4 style=""margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #0F172A;"">How to Get Started:</h4>
              <ul style=""margin: 0 0 20px; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.7;"">
                <li>Access the web clerk portal at <strong>http://localhost:5173</strong> or open the mobile application.</li>
                <li>Enter your registered email (<code>{safeUsername}</code>) and temporary password.</li>
                <li>Review all incoming client cases under your assigned department.</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style=""background-color: #F1F5F9; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0;"">
              <p style=""margin: 0 0 6px; font-size: 12px; color: #64748B; font-weight: 500;"">
                VShop &bull; Intelligent Legal Services Platform
              </p>
              <p style=""margin: 0; font-size: 11px; color: #94A3B8;"">
                This account was generated by an authorized system administrator. If you believe you received this in error, please notify administration.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private static (string label, string bg, string text, string border, string summary) GetStatusVisuals(string status)
    {
        return status switch
        {
            "COMPLETED" => (
                "Completed & Verified",
                "#DCFCE7",
                "#15803D",
                "#86EFAC",
                "Your documentation has been fully reviewed, approved, and completed by our legal team."
            ),
            "REQUIRES_DOCUMENTS" => (
                "Action Required: Documents Needed",
                "#FEF2F2",
                "#B91C1C",
                "#FCA5A5",
                "Your request requires additional or re-uploaded documents before it can proceed."
            ),
            "IN_PROGRESS" => (
                "In Progress",
                "#EFF6FF",
                "#1D4ED8",
                "#93C5FD",
                "Our legal clerk is actively processing and preparing your documentation."
            ),
            "ASSIGNED" => (
                "Assigned to Legal Clerk",
                "#F5F3FF",
                "#6D28D9",
                "#C4B5FD",
                "A dedicated legal clerk has been assigned to handle your case."
            ),
            "UNDER_REVIEW" => (
                "Under Legal Review",
                "#FFFBEB",
                "#B45309",
                "#FDE68A",
                "Your submitted details and documents are currently under preliminary review."
            ),
            "REJECTED" => (
                "Request Rejected",
                "#FEF2F2",
                "#991B1B",
                "#F87171",
                "Your request could not be processed as submitted."
            ),
            "CANCELLED" => (
                "Request Cancelled",
                "#F3F4F6",
                "#374151",
                "#D1D5DB",
                "This request has been cancelled."
            ),
            _ => (
                status,
                "#F3F4F6",
                "#1F2937",
                "#E5E7EB",
                "The status of your legal request has been updated."
            )
        };
    }

    private static string GenerateHtmlEmail(
        string clientName,
        int requestId,
        string serviceName,
        string statusLabel,
        string badgeBg,
        string badgeText,
        string badgeBorder,
        string statusSummary,
        string? clerkName,
        string? note,
        string updateTime)
    {
        var safeClientName = HtmlEncoder.Default.Encode(clientName);
        var safeServiceName = HtmlEncoder.Default.Encode(serviceName ?? "Legal Documentation");
        var safeStatusLabel = HtmlEncoder.Default.Encode(statusLabel);
        var safeStatusSummary = HtmlEncoder.Default.Encode(statusSummary);
        var safeClerkName = !string.IsNullOrWhiteSpace(clerkName) ? HtmlEncoder.Default.Encode(clerkName) : null;
        var safeNote = !string.IsNullOrWhiteSpace(note) ? HtmlEncoder.Default.Encode(note) : null;

        var clerkRow = safeClerkName != null
            ? $@"<tr>
                  <td style=""padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #F1F5F9;"">Assigned Clerk:</td>
                  <td style=""padding: 10px 14px; color: #0F172A; font-weight: 600; border-bottom: 1px solid #F1F5F9;"">{safeClerkName}</td>
               </tr>"
            : "";

        var noteBlock = safeNote != null
            ? $@"<div style=""margin-top: 20px; padding: 14px 18px; background-color: #FFFBEB; border-left: 4px solid #D97706; border-radius: 6px;"">
                  <div style=""font-weight: 700; color: #92400E; font-size: 14px; margin-bottom: 4px;"">&#x26A0; Note from Clerk / Reviewer:</div>
                  <div style=""color: #78350F; font-size: 13px; line-height: 1.5;"">{safeNote}</div>
               </div>"
            : "";

        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Request Status Update</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #F8FAFC; padding: 30px 15px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" style=""max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;"">
          
          <!-- Header -->
          <tr>
            <td style=""background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 32px; text-align: left;"">
              <div style=""display: inline-block; padding: 4px 10px; background-color: rgba(217, 119, 6, 0.2); border-radius: 6px; font-size: 12px; font-weight: 700; color: #FBBF24; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;"">
                VShop Platform
              </div>
              <h1 style=""margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 700;"">Intelligent Legal Services</h1>
              <p style=""margin: 4px 0 0; color: #94A3B8; font-size: 13px;"">Official Status Notification</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style=""padding: 32px;"">
              <p style=""margin: 0 0 16px; font-size: 16px; color: #0F172A; font-weight: 600;"">
                Hello {safeClientName},
              </p>
              <p style=""margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;"">
                The status of your legal documentation request has been officially updated by our legal administration team. Here are the latest details:
              </p>

              <!-- Status Banner -->
              <div style=""margin-bottom: 24px; padding: 18px 20px; background-color: {badgeBg}; border: 1px solid {badgeBorder}; border-radius: 10px;"">
                <div style=""font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; color: {badgeText}; margin-bottom: 4px;"">
                  Current Status
                </div>
                <div style=""font-size: 18px; font-weight: 800; color: {badgeText}; margin-bottom: 6px;"">
                  {safeStatusLabel}
                </div>
                <div style=""font-size: 13px; color: #334155; line-height: 1.5;"">
                  {safeStatusSummary}
                </div>
              </div>

              <!-- Request Details Table -->
              <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""font-size: 13px; border-collapse: collapse; background-color: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0;"">
                <tr>
                  <td style=""padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #E2E8F0; width: 35%;"">Request Reference:</td>
                  <td style=""padding: 10px 14px; color: #0F172A; font-weight: 700; border-bottom: 1px solid #E2E8F0;"">#{requestId}</td>
                </tr>
                <tr>
                  <td style=""padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #E2E8F0;"">Service / Document:</td>
                  <td style=""padding: 10px 14px; color: #0F172A; font-weight: 600; border-bottom: 1px solid #E2E8F0;"">{safeServiceName}</td>
                </tr>
                {clerkRow}
                <tr>
                  <td style=""padding: 10px 14px; font-weight: 600; color: #475569;"">Updated At:</td>
                  <td style=""padding: 10px 14px; color: #0F172A;"">{updateTime}</td>
                </tr>
              </table>

              {noteBlock}

              <!-- Next Steps -->
              <div style=""margin-top: 28px; padding-top: 20px; border-top: 1px solid #E2E8F0;"">
                <h4 style=""margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #0F172A;"">What happens next?</h4>
                <p style=""margin: 0; font-size: 13px; color: #64748B; line-height: 1.6;"">
                  You can track your request live, view comments, and upload requested documents directly on the <strong>Request Details</strong> page in your mobile app.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style=""background-color: #F1F5F9; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0;"">
              <p style=""margin: 0 0 6px; font-size: 12px; color: #64748B; font-weight: 500;"">
                VShop &bull; Intelligent Legal Services Platform
              </p>
              <p style=""margin: 0; font-size: 11px; color: #94A3B8;"">
                This is an automated notification. For questions or assistance, please reach out via the in-app support chat.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
