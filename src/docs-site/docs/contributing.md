---
id: contributing
title: Contributing
sidebar_label: Contributing
---

# Contributing

Contributions are welcome! Please read this guide before submitting a PR.

## Setup

```bash
git clone https://github.com/NguyenTriBaoThang/AirSafeNet.git
cd AirSafeNet
cp .env.example .env
docker compose up -d
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, demo-ready |
| `develop` | Active integration |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation |

## Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    CSS / formatting
refactor: Code refactor
test:     Tests
chore:    Build / config
ai:       AI model changes
```

## Pull Request Checklist

- [ ] Code builds successfully
- [ ] No secrets committed
- [ ] TypeScript / lint passes
- [ ] Documentation updated if needed

## Reporting Issues

Use [GitHub Issues](https://github.com/NguyenTriBaoThang/AirSafeNet/issues) with the bug or feature template.
