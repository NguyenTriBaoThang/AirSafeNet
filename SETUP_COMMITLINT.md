# Setting Up Commit Lint

AirSafeNet uses [commitlint](https://commitlint.js.org/) + [Husky](https://typicode.github.io/husky/) to enforce conventional commit messages.

## Setup

```bash
# From root of repository
npm install

# Husky hooks are auto-installed via prepare script
```

## Commit Format

```
<type>(scope): short description
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | CSS / formatting |
| `refactor` | Code refactor (no feature/fix) |
| `test` | Adding / fixing tests |
| `chore` | Build, config, CI changes |
| `ai` | AI model / ML changes |
| `perf` | Performance improvement |

### Examples

```bash
git commit -m "feat(frontend): add compound risk panel"
git commit -m "fix(backend): null reference in activity controller"
git commit -m "docs(readme): update architecture diagram"
git commit -m "ai(model): upgrade ensemble weights calculation"
git commit -m "chore(docker): add healthcheck to AI service"
```

## Bypass (emergency only)

```bash
git commit -m "fix: urgent hotfix" --no-verify
```
