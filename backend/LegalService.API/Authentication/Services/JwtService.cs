using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace LegalService.API.Authentication.Services;

public class JwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(int userId, string email, string role)
    {
        var claims = new[]
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                userId.ToString()
            ),

            new Claim(
                ClaimTypes.Email,
                email
            ),

            new Claim(
                ClaimTypes.Role,
                role
            )
        };


        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(
                _configuration["Jwt:Key"]!
            )
        );


        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );


        var expiryMinutes = Convert.ToDouble(
            _configuration["Jwt:ExpiryMinutes"]
        );


        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );


        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}