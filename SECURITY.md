# Security Policy

## 1. Supported Scope

AirSafeNet is currently an academic and competition-oriented prototype. Security is still important, especially because the project may expose APIs and configuration files during demos and development.

This document describes basic security expectations and reporting guidance.

---

## 2. Reporting a Vulnerability

If you discover a security issue, please do not open a public issue with sensitive details immediately.

Instead:

- contact the maintainer privately if possible
- provide a clear description of the issue
- include reproduction steps when safe to do so
- allow time for review and remediation before public disclosure

---

## 3. Main Security Risks in This Project

Potential risk areas include:

- exposed API endpoints
- leaked environment variables or secrets
- hardcoded tokens or credentials
- unsafe model-loading or file-path assumptions
- insecure deployment configuration
- permissive CORS in public environments

---

## 4. Repository Security Rules

Do not commit:

- API keys
- database passwords
- cloud credentials
- private tokens
- personal secrets in `.env`
- internal-only deployment files

Always keep:

- `.env` ignored
- `.env.example` committed
- secrets stored outside the repository

---

## 5. API Security Notes

For local demo environments, open CORS and simple configuration may be acceptable.
For broader deployment, review and tighten:

- allowed origins
- authentication and authorization
- rate limiting
- logging and error messages
- input validation

---

## 6. Model Security Notes

Because AirSafeNet loads serialized model artifacts:

- only load trusted model files
- do not accept arbitrary uploaded model binaries in the server
- keep model path controlled by configuration
- document active model version

---

## 7. Dependency Management

Keep dependencies reasonably up to date.

Recommended practices:

- review dependency versions before releases
- run GitHub Dependabot or similar tooling if enabled
- avoid adding unnecessary packages

---

## 8. Local Development Recommendations

- use separate demo/test configs
- avoid exposing development server publicly without review
- do not publish machine-specific secrets
- test endpoints using sample data only

---

## 9. Disclosure Philosophy

This project values responsible disclosure and practical remediation. Even though the repository is student-led and prototype-oriented, security hygiene is part of professional software practice.
