using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using airsafenet_backend.Models;
using Microsoft.IdentityModel.Tokens;

namespace airsafenet_backend.Services
{
    public class JwtService
    {
        private readonly IConfiguration _configuration;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"]
                         ?? throw new InvalidOperationException("Missing Jwt:Key");
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "AirSafeNet";
            var jwtAudience = _configuration["Jwt:Audience"] ?? "AirSafeNetUsers";

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
