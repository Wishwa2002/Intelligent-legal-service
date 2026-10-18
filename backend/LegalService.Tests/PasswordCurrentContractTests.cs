using LegalService.API.Authentication.Services;
using Xunit.Abstractions;

namespace LegalService.Tests;

// AI-assisted regression for the explicit cost-12 policy and existing cost-11 accounts.
public sealed class PasswordCurrentContractTests(ITestOutputHelper output)
{
    [Fact]
    public void CurrentHashUsesCost12AndVerifiesCorrectPasswordOnly()
    {
        var service = new PasswordService();
        const string password = "Synthetic-Current-Contract-42!";
        var hash = service.HashPassword(password);
        Assert.Equal(60, hash.Length);
        Assert.Equal("12", hash.Substring(4, 2));
        Assert.DoesNotContain(password, hash);
        Assert.True(service.VerifyPassword(password, hash));
        Assert.False(service.VerifyPassword("Synthetic-Wrong-Password!", hash));
        output.WriteLine("Current contract: cost 12; 60-character hash; correct password accepted; incorrect password rejected. No password or hash logged.");
    }

    [Fact]
    public void IndependentHashesHaveDistinctSaltsAndBothVerify()
    {
        var service = new PasswordService();
        const string password = "Synthetic-Salt-Regression-42!";
        var first = service.HashPassword(password);
        var second = service.HashPassword(password);
        Assert.NotEqual(first, second);
        Assert.True(service.VerifyPassword(password, first));
        Assert.True(service.VerifyPassword(password, second));
        output.WriteLine("Independent hashes differ and both verify; hash values omitted.");
    }

    [Fact]
    public void VerificationAcceptsAnExistingCost11Hash()
    {
        var service = new PasswordService();
        const string password = "Synthetic-Compatibility-42!";
        var existingHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);
        Assert.True(service.VerifyPassword(password, existingHash));
        Assert.False(service.VerifyPassword("Synthetic-Wrong-Password!", existingHash));
        output.WriteLine("Existing cost-11 hash verification succeeds; users can still log in after the policy change.");
    }
}
