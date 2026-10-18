namespace LegalService.API.Authentication.Services;

public class PasswordService : IPasswordService
{

    public string HashPassword(string password)
    {
        // Keep the report's cost-12 policy explicit; library defaults can change.
        return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
    }


    public bool VerifyPassword(
        string password,
        string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(
            password,
            passwordHash
        );
    }

}
