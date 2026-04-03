# Branching Strategy

## 1. Purpose

This document defines the Git branching strategy for AirSafeNet.

The goals are:

- keep the main branch stable
- separate experimental work from demo-ready code
- support teamwork during competition development
- make review and rollback easier

---

## 2. Main Branches

### `main`

Purpose:

- production-ready or demo-ready code
- always stable
- used for competition submission milestones

Rules:

- do not commit directly unless it is a very small urgent fix
- merge only reviewed branches
- tag releases from this branch

### `develop`

Purpose:

- active integration branch
- latest combined work before going into `main`

Rules:

- feature branches are merged here first
- this branch may be more active than `main`
- use this branch for internal demo builds

---

## 3. Supporting Branch Types

### `feature/*`
Use for new features.

Examples:

- `feature/ai-server`
- `feature/react-dashboard`
- `feature/aqi-chart`
- `feature/model-info-endpoint`

### `fix/*`
Use for bug fixes.

Examples:

- `fix/predict-endpoint-null-response`
- `fix/readme-links`
- `fix/chart-timezone`

### `docs/*`
Use for documentation work.

Examples:

- `docs/competition-submission`
- `docs/architecture-update`
- `docs/demo-script`

### `release/*`
Use to prepare an official milestone.

Examples:

- `release/v0.1-demo`
- `release/v0.2-competition`

### `hotfix/*`
Use for urgent fixes on top of `main`.

Examples:

- `hotfix/fix-demo-crash`
- `hotfix/update-env-example`

---

## 4. Recommended Workflow

### Step 1: Create a feature branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/ai-server
```

### Step 2: Commit changes with clear messages

Example:

```bash
git commit -m "feat(ai): add FastAPI predict endpoint"
```

### Step 3: Push branch

```bash
git push origin feature/ai-server
```

### Step 4: Open Pull Request into `develop`

Checklist:

- code builds successfully
- docs updated if needed
- no secrets included
- tested locally

### Step 5: Merge `develop` into `main` for milestone releases

Do this only when:

- demo is stable
- key documentation is updated
- important bugs are fixed

---

## 5. Commit Message Convention

Recommended format:

```text
<type>(scope): short description
```

Examples:

- `feat(ai): add predict endpoint`
- `feat(web): add AQI summary cards`
- `fix(api): handle missing model file`
- `docs(readme): update quick start`
- `refactor(ai): simplify feature loading`

Suggested types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

---

## 6. Release Tags

Use Git tags for important milestones.

Examples:

- `v0.1-demo`
- `v0.2-ai-server`
- `v1.0-competition-submission`

Suggested release points:

- first working AI server
- first integrated backend + frontend demo
- final competition submission build

---

## 7. Branch Protection Recommendations

For GitHub settings, if available:

- protect `main`
- require pull request before merge
- require status checks if CI is configured
- restrict force pushes

---

## 8. Practical Team Rules

- keep branches focused on one topic
- avoid mixing docs, UI, and AI in one large branch unless necessary
- update README or docs when architecture changes
- rebase or merge from `develop` frequently to avoid conflicts
- do not commit trained model artifacts unless intentionally versioned

---

## 9. Minimal Strategy for Solo Development

If the project is developed mainly by one person, the simplest safe strategy is:

- `main` for stable demo code
- `develop` for daily work
- `feature/*` for bigger tasks

This is enough to keep the repository clean and professional.
