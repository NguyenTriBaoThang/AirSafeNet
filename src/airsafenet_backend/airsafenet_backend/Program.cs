using System.Text;
using System.Threading.RateLimiting;
using airsafenet_backend.Data;
using airsafenet_backend.Models;
using airsafenet_backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<AssistantDomainService>();
builder.Services.AddScoped<AssistantTimeResolverService>();

builder.Services.AddHttpClient<AiService>();
builder.Services.AddHttpClient<AiCachedService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

// AirExplainService — real-time Open-Meteo
builder.Services.AddHttpClient<AirExplainService>();

builder.Services.AddHttpClient<OpenAiChatService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddHttpClient<GeminiChatService>();
builder.Services.AddHttpClient<WeatherService>();

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Thiếu Jwt:Key");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "AirSafeNet";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "AirSafeNet";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

var rlWindow = int.Parse(builder.Configuration["RateLimiting:AdminComputeWindowSeconds"] ?? "300");
var rlMaxReqs = int.Parse(builder.Configuration["RateLimiting:AdminComputeMaxRequests"] ?? "3");

builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("admin-compute", limiter =>
    {
        limiter.PermitLimit = rlMaxReqs;
        limiter.Window = TimeSpan.FromSeconds(rlWindow);
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.QueueLimit = 0;
    });

    opt.RejectionStatusCode = 429;
    opt.OnRejected = async (ctx, _) =>
    {
        ctx.HttpContext.Response.ContentType = "application/json";
        await ctx.HttpContext.Response.WriteAsync(
            "{\"message\":\"Quá nhiều yêu cầu. Vui lòng chờ trước khi tính toán lại.\"}");
    };
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    var adminEmail = "admin@airsafenet.local";
    var hasAdmin = db.Users.Any(u => u.Email.ToLower() == adminEmail.ToLower());

    if (!hasAdmin)
    {
        var admin = new User
        {
            Email = adminEmail,
            FullName = "System Admin",
            Role = "Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345")
        };
        db.Users.Add(admin);

        db.SaveChanges();
    }
}

app.Run();
