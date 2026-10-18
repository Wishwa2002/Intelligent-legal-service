namespace LegalService.API.Services.Scheduling;

/// <summary>PROPOSED — pending group approval. Disabled by default.</summary>
public sealed class ProposedCancellationOptions
{
    public bool Enabled { get; set; }
    public int MinimumNoticeHours { get; set; } = 24;
}
public static class ProposedCancellationPolicy
{
    // Exact cutoff allowed; appointments made inside the window have no automatic exemption.
    // No fees or privileged overrides are introduced by this proposal.
    public static bool Allows(DateTime officeStart, DateTime officeNow, ProposedCancellationOptions options)
        => !options.Enabled || officeStart - officeNow >= TimeSpan.FromHours(options.MinimumNoticeHours);
}
