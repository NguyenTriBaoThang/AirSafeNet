# ══════════════════════════════════════════════════════════════
# Stage 1 — Dependencies (cache layer)
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --frozen-lockfile

# ══════════════════════════════════════════════════════════════
# Stage 2 — Build
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars
ARG VITE_API_BASE_URL=http://localhost:7276
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ══════════════════════════════════════════════════════════════
# Stage 3 — Production (Nginx)
# ══════════════════════════════════════════════════════════════
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Nginx config for React SPA (handle client-side routing)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    \n\
    gzip on;\n\
    gzip_types text/css application/javascript application/json image/svg+xml;\n\
    \n\
    # React SPA — all routes → index.html\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    # Cache static assets aggressively\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    \n\
    # Health check endpoint\n\
    location /ping {\n\
        access_log off;\n\
        return 200 "pong";\n\
        add_header Content-Type text/plain;\n\
    }\n\
}\n' > /etc/nginx/conf.d/app.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ping || exit 1
