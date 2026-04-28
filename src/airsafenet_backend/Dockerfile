# ══════════════════════════════════════════════════════════════
# Stage 1 — Restore (cache NuGet packages)
# ══════════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore

WORKDIR /src

# Copy solution + csproj for layer caching
COPY *.sln ./
COPY airsafenet_backend/*.csproj ./airsafenet_backend/
RUN dotnet restore

# ══════════════════════════════════════════════════════════════
# Stage 2 — Build & Publish
# ══════════════════════════════════════════════════════════════
FROM restore AS builder

COPY . .

RUN dotnet publish airsafenet_backend/airsafenet_backend.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ══════════════════════════════════════════════════════════════
# Stage 3 — Runtime (minimal ASP.NET image)
# ══════════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser \
    && mkdir -p /app/data && chown -R appuser:appgroup /app

COPY --from=builder --chown=appuser:appgroup /app/publish .

USER appuser

EXPOSE 7276

ENV ASPNETCORE_URLS=http://+:7276
ENV ASPNETCORE_ENVIRONMENT=Production

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:7276/health || exit 1

ENTRYPOINT ["dotnet", "airsafenet_backend.dll"]
