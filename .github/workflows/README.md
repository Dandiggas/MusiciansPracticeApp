# GitHub Actions CI/CD Setup

This repository uses GitHub Actions to automatically test and deploy to Railway.

## Workflow Overview

The `test-and-deploy.yml` workflow runs on:
- **Push to main branch**: Runs all tests, then deploys if tests pass
- **Pull requests to main**: Runs all tests (no deployment)

## Jobs

### 1. Backend Tests
- Sets up Python 3.10
- Runs PostgreSQL 13 service
- Installs dependencies from `requirements.txt`
- Runs Django test suite (28 tests)

### 2. Frontend Tests
- Sets up Node.js 24
- Installs npm dependencies
- Runs Jest unit tests (16 tests)
- Generates coverage report (96.31% coverage)

### 3. Deploy Backend (main branch only)
- Only runs if both test jobs pass
- Deploys Django backend to Railway
- Requires `RAILWAY_TOKEN` secret

### 4. Deploy Frontend (main branch only)
- Only runs if both test jobs pass
- Deploys Next.js frontend to Railway
- Requires `RAILWAY_TOKEN` secret

## Setup Instructions

### 1. Get Your Railway Token

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Get your token (this will open Railway dashboard)
railway whoami
```

Then go to Railway Dashboard → Account Settings → Tokens → Create New Token

### 2. Add Railway Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `RAILWAY_TOKEN`
5. Value: (paste your Railway token)
6. Click "Add secret"

### 3. Configure Railway Services

Make sure you have two services set up in Railway:
- **backend**: Your Django application
- **frontend**: Your Next.js application

The service names in the workflow must match your Railway service names. If your services have different names, update the workflow file:

```yaml
# Update these lines with your actual service names
run: railway up --service YOUR_BACKEND_SERVICE_NAME
run: railway up --service YOUR_FRONTEND_SERVICE_NAME --directory frontend/next-app
```

## Testing the Workflow

### Test on Pull Request (Safe)
```bash
git checkout -b test-workflow
git add .
git commit -m "Test GitHub Actions workflow"
git push origin test-workflow
# Create PR on GitHub - tests will run but won't deploy
```

### Deploy to Production
```bash
git checkout main
git add .
git commit -m "Add CI/CD workflow"
git push origin main
# Tests will run, then deploy to Railway if tests pass
```

## Monitoring

- View workflow runs: GitHub repository → Actions tab
- Each job shows real-time logs
- Failed tests will block deployment
- You'll get email notifications for failed workflows

## Local Testing

Before pushing, you can run the same tests locally:

```bash
# Run all tests
make test

# Or individually
make test-backend
make test-frontend
```

## Troubleshooting

**Tests pass locally but fail in CI:**
- Check Python/Node versions match
- Verify all dependencies are in requirements.txt/package.json
- Check for environment-specific code

**Deployment fails:**
- Verify RAILWAY_TOKEN is correctly set in GitHub secrets
- Verify Railway service names match the workflow
- Check Railway dashboard for service status

**Token expired:**
- Generate a new Railway token
- Update the RAILWAY_TOKEN secret in GitHub
