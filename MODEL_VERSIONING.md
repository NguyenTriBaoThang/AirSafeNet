# Model Versioning

## 1. Purpose

This document defines how AirSafeNet versions and manages trained AI models.

Goals:

- track which model is deployed
- make rollback easier
- keep experiments reproducible
- separate notebook experimentation from production serving

---

## 2. Principles

- training and serving are separate
- each deployed model must have a version identifier
- each deployed model should include minimal metadata
- the AI server should load one explicit model file at a time

---

## 3. Recommended Model Package

Each model package should include:

- trained artifact (`model.pkl`)
- metadata (`metadata.json`)
- feature list (`feature_columns.json`) if applicable
- optional evaluation file (`metrics.json`)

Example structure:

```text
ai/models/
├─ v1/
│  ├─ model.pkl
│  ├─ metadata.json
│  └─ feature_columns.json
├─ v2/
│  ├─ model.pkl
│  ├─ metadata.json
│  └─ feature_columns.json
└─ current -> v2
```

---

## 4. Version Naming Convention

Recommended format:

```text
airsafenet-pm25-<modeltype>-v<major>.<minor>
```

Examples:

- `airsafenet-pm25-rf-v1.0`
- `airsafenet-pm25-xgb-v1.1`
- `airsafenet-pm25-et-v2.0`

If you want a simpler format:

- `v1`
- `v2`
- `v3`

---

## 5. Required Metadata Fields

Each model version should record:

- model version
- model type
- training date
- training dataset period
- target variable
- feature columns
- evaluation metrics
- notes / experiment summary

Example `metadata.json`:

```json
{
  "model_version": "airsafenet-pm25-rf-v1.0",
  "model_type": "RandomForestRegressor",
  "trained_at": "2026-04-04T10:00:00",
  "train_start": "2025-01-01",
  "train_end": "2025-12-31",
  "target": "pm2_5_next_1h",
  "metrics": {
    "mae": 4.2,
    "rmse": 6.1,
    "r2": 0.81
  },
  "notes": "Initial competition-ready model"
}
```

---

## 6. Promotion Workflow

### Stage 1: Experiment
- model is trained in notebook
- results are compared
- candidate artifact is exported

### Stage 2: Validation
- metrics checked
- feature compatibility checked
- sample inference tested locally

### Stage 3: Packaging
- save model artifact and metadata
- assign version name

### Stage 4: Deployment
- copy chosen model into serving path
- update active model reference
- test `/health` and `/predict`

### Stage 5: Rollback if needed
- switch serving path to previous stable version
- update metadata record

---

## 7. Active Model Strategy

Simplest approach:

- the AI server reads from `ai/models/model.pkl`
- when a new model is accepted, replace this file deliberately

Better approach:

- store versioned directories
- maintain a `current` pointer or config variable

Example:

```python
ACTIVE_MODEL_DIR = "ai/models/v2"
```

---

## 8. Compatibility Rules

Before replacing a model, verify:

- input feature order matches server expectations
- preprocessing assumptions have not changed unexpectedly
- API response contract remains stable
- metrics are at least acceptable for demo use

---

## 9. What Should Be Committed to Git

Recommended:

- metadata files
- feature list files
- small demo models only if repository policy allows it

Usually avoid committing:

- large training artifacts
- temporary experiment files
- many redundant model binaries

If model files are large, use:

- release assets
- external storage
- Git LFS if needed

---

## 10. Suggested Release Notes Template

For each promoted model, record:

- version name
- why it was chosen
- key metric changes
- known limitations
- compatibility notes

Example:

```text
Model: airsafenet-pm25-rf-v1.0
Reason: stable baseline for competition demo
Improvement: better RMSE than previous linear model
Known issue: no district-level spatial forecasting yet
```

---

## 11. Summary

Model versioning is important even for a student prototype. It makes the system easier to explain, easier to maintain, and much safer to demo under competition pressure.
