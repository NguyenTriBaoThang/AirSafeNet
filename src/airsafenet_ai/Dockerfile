# ══════════════════════════════════════════════════════════════
# Stage 1 — Build Python dependencies
# ══════════════════════════════════════════════════════════════
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ══════════════════════════════════════════════════════════════
# Stage 2 — Runtime
# ══════════════════════════════════════════════════════════════
FROM python:3.11-slim AS runner

WORKDIR /app

# Runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy venv
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create user + folders
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/src/airsafenet_ai/models && \
    chown -R appuser:appuser /app

USER appuser

# Copy source code
COPY --chown=appuser:appuser . .

# Copy entrypoint
COPY --chown=appuser:appuser entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["/app/entrypoint.sh"]