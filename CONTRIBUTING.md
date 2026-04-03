# Contributing

Thanks for your interest in contributing to AirSafeNet.

This project is currently developed as an AI-powered clean-air innovation prototype. Contributions that improve code quality, documentation, usability, and demo reliability are welcome.

---

## 1. Ways to Contribute

You can contribute by helping with:

- AI model improvement
- backend APIs
- frontend dashboard
- documentation
- bug fixes
- testing and demo preparation
- deployment setup

---

## 2. Getting Started

### 2.1 Fork or clone the repository

```bash
git clone <repo-url>
cd AirSafeNet
```

### 2.2 Create a branch

```bash
git checkout -b feature/your-feature-name
```

### 2.3 Make changes

Keep changes focused and easy to review.

### 2.4 Commit clearly

Example:

```bash
git commit -m "feat(api): add health endpoint"
```

### 2.5 Open a pull request

Describe:

- what changed
- why it changed
- how it was tested

---

## 3. Coding Expectations

### General
- prefer readable code over clever code
- use clear variable and function names
- keep files modular
- update related documentation when behavior changes

### Python
- keep imports organized
- avoid unnecessary global state
- handle missing files and API failures clearly

### C# / ASP.NET Core
- keep endpoints explicit
- return predictable JSON contracts
- separate controller and service logic where reasonable

### Frontend
- prioritize clarity and demo-readiness
- avoid unnecessary complexity in early prototype stages

---

## 4. Documentation Expectations

If your change affects setup, architecture, API behavior, or demo flow, update one or more of:

- README.md
- ARCHITECTURE.md
- DEMO_SCRIPT.md
- COMPETITION_SUBMISSION.md
- MODEL_VERSIONING.md

---

## 5. Pull Request Checklist

Before opening a PR, confirm:

- [ ] code builds successfully
- [ ] no secrets or private keys were added
- [ ] docs updated if needed
- [ ] changes tested locally
- [ ] branch name is clear
- [ ] commit messages are understandable

---

## 6. What to Avoid

Please avoid:

- large unrelated refactors in a small PR
- committing sensitive files
- committing unnecessary generated files
- changing API contracts without documenting it

---

## 7. Communication

If you want to work on a bigger change, open an issue or discuss it first so the direction stays aligned with the project roadmap and competition goals.

---

## 8. Contribution Style

This project values:

- practicality
- clarity
- maintainability
- competition-readiness
- social impact alignment

Thank you for helping improve AirSafeNet.
