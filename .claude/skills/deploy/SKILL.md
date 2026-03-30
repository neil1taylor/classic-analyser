---
name: deploy
description: Build, push, and deploy Infrastructure Explorer to IBM Code Engine. Use when the user says "deploy", "ship it", "push to production", or wants to deploy the app.
---

<objective>
Deploy the Classic Infrastructure Explorer app to IBM Code Engine via the CI/CD pipeline (push to main triggers `deploy.yml`) or manually via `deploy/code-engine.sh`.
</objective>

<quick_start>
The standard deploy path is: commit -> push to main -> GitHub Actions builds, tests, containerizes, and deploys automatically.

For manual/local deploys, use `deploy/code-engine.sh` (requires `IC_API_KEY` in `.env` or environment).
</quick_start>

<essential_context>
**Two deploy mechanisms exist — know which to use:**

| | CI/CD (`deploy.yml`) | Manual (`deploy/code-engine.sh`) |
|---|---|---|
| **Trigger** | `git push origin main` | `bash deploy/code-engine.sh` |
| **Runs tests** | Yes (lint, typecheck, test, build) | No |
| **Auth** | GitHub Secrets (synced from `.env`) | `.env` / `IC_API_KEY` env var |
| **Image tag** | Git SHA | `latest` (or `IMAGE_TAG`) |
| **App name** | `infrastructure-explorer` | `infra-explorer` |
| **Registry** | `icr.io` | `us.icr.io` (configurable) |

**App names differ** between CI and manual — they target different Code Engine apps.

**GitHub Secrets ↔ `.env` mapping:** The CI/CD workflow expects GitHub secrets that correspond to values in the project root `.env` file:

| GitHub Secret | `.env` variable |
|---|---|
| `IBM_CLOUD_API_KEY` | `IC_API_KEY` |
| `ICR_NAMESPACE` | `ICR_NAMESPACE` |
| `CE_PROJECT` | `CE_PROJECT` |
</essential_context>

<process>
**Step 1: Pre-flight checks**

Run these in parallel:
- `git status` — confirm working tree is clean (no uncommitted changes)
- `npm run build` — verify production build succeeds
- `npm test` — verify tests pass

If working tree is dirty, ask if the user wants to commit first.
If build or tests fail, stop and fix before deploying.

**Step 2: Update CHANGELOG.md**

Before deploying, update `CHANGELOG.md` in the project root with what's being shipped:

1. Run `git log --oneline` to see commits since the last changelog update
2. Add entries to the `## [Unreleased]` section, categorized by commit prefix:
   - `feat:` → **Added**
   - `fix:` → **Fixed**
   - `docs:`, `chore:`, `refactor:` → **Changed**
3. Deduplicate — don't re-add entries already in the changelog
4. Commit the changelog update: `git add CHANGELOG.md && git commit -m "docs: update CHANGELOG for deploy"`

If the changelog is already up to date (no new commits since last entry), skip this step.

**Step 3: Sync GitHub Secrets from `.env` (CI/CD only)**

Before pushing, ensure GitHub secrets are in sync with the project root `.env` file. Read `.env` values and set them as GitHub secrets using the mapping above. **Never log or echo API key values.**

```bash
# Read values from .env (source it in a subshell to avoid polluting the session)
IC_API_KEY=$(grep '^IC_API_KEY=' .env | cut -d= -f2-)
ICR_NAMESPACE=$(grep '^ICR_NAMESPACE=' .env | cut -d= -f2-)
CE_PROJECT=$(grep '^CE_PROJECT=' .env | cut -d= -f2-)

# Set GitHub secrets (use -b for non-sensitive values, pipe for the API key)
echo "$IC_API_KEY" | gh secret set IBM_CLOUD_API_KEY
gh secret set ICR_NAMESPACE -b "$ICR_NAMESPACE"
gh secret set CE_PROJECT -b "$CE_PROJECT"
```

Verify secrets are set:
```bash
gh secret list
```

If secrets are already set and `.env` hasn't changed, this step can be skipped.

**Step 4: Determine deploy method**

Ask only if unclear. Default to CI/CD (push to main).

- **CI/CD (recommended):** Push to main. GitHub Actions handles everything.
- **Manual:** Run `deploy/code-engine.sh`. Requires IBM Cloud CLI + Docker/Podman + `IC_API_KEY`.

**Step 5a: CI/CD Deploy**

```bash
git push origin main
```

Then monitor the workflow:
```bash
gh run list --branch main --limit 1
gh run watch
```

**Step 5b: Manual Deploy**

```bash
bash deploy/code-engine.sh
```

Requires:
- `IC_API_KEY` set in project root `.env` file or as an environment variable. The script auto-loads `./deploy/../.env` (i.e. the project root `.env`).
- `ibmcloud` CLI with `code-engine` and `container-registry` plugins
- Docker or Podman

Optional env vars (with defaults): `CE_PROJECT` (infra-explorer), `CE_RESOURCE_GROUP` (infra-explorer-rg), `CE_REGION` (us-south), `CE_REGISTRY` (us.icr.io), `CE_NAMESPACE` (infra-explorer), `IMAGE_TAG` (latest).

**Step 6: Verify deployment**

For CI/CD, check the GitHub Actions run completed successfully:
```bash
gh run list --branch main --limit 1 --json status,conclusion,name
```

For manual, the script prints the app URL. Verify with:
```bash
curl -sf "<app-url>/health"
```
</process>

<failure_handling>
- **Build fails in CI:** Check `gh run view --log-failed` for errors
- **Test fails in CI:** Same — fix test, commit, push again
- **Manual deploy auth fails:** Verify `IC_API_KEY` is valid, check `ibmcloud login` works
- **Container push fails:** Check ICR namespace exists, credentials are current
- **Code Engine update fails:** Check project name, resource group, app exists
</failure_handling>

<success_criteria>
Deploy is complete when:
- GitHub Actions workflow shows green (CI/CD), or `code-engine.sh` exits 0 (manual)
- App URL returns healthy response
- No uncommitted changes left behind
</success_criteria>
