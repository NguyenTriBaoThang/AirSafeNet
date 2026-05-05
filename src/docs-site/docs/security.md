---
id: security
title: Security Policy
sidebar_label: Security
---

# Security Policy

## Reporting

Please **do not** open public issues for security vulnerabilities. Contact the maintainer privately.

## Important Rules

- Never commit `.env` files or API keys
- Use `.env.example` for templates
- JWT secrets must be at least 32 characters
- Admin endpoints are rate-limited (3 req/5 min)
- PostgreSQL is not exposed outside Docker network in production

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest main | ✅ |
| Older branches | Best effort |
