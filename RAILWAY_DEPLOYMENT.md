# Railway Deployment Guide

This guide covers how to deploy your Musicians Practice App to Railway with proper security and production settings.

## 🔐 Security Features Implemented

Your Django settings now include:

- ✅ **DEBUG mode disabled in production** (via environment variable)
- ✅ **ALLOWED_HOSTS restricted** to specific domains
- ✅ **CORS configured** to only accept requests from your frontend
- ✅ **CSRF protection** with trusted origins
- ✅ **HTTPS enforcement** in production
- ✅ **Secure cookies** for sessions and CSRF
- ✅ **Database connection** via Railway's DATABASE_URL
- ✅ **Static files** served via WhiteNoise

## 📋 Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected to Railway
3. Railway CLI installed: `npm install -g @railway/cli`

## 🚀 Step 1: Create Railway Project

```bash
# Login to Railway
railway login

# Create new project (or use Railway dashboard)
railway init
```

## 🗄️ Step 2: Add PostgreSQL Database

In Railway dashboard:
1. Click "New" → "Database" → "PostgreSQL"
2. Railway automatically provisions a database
3. Railway automatically sets `DATABASE_URL` environment variable
4. Your Django app will automatically use this database

## 🔧 Step 3: Configure Backend Environment Variables

In Railway dashboard, go to your **backend service** and add these variables:

### Required Variables

```bash
# Django Secret Key (generate a new one!)
SECRET_KEY=your-super-secret-key-here-generate-a-new-one

# Debug Mode (MUST be False in production)
DEBUG=False

# Allowed Hosts (your Railway backend domain)
ALLOWED_HOSTS=your-backend.railway.app,localhost,127.0.0.1

# CORS - Allow your frontend to make requests
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app,http://localhost:3000

# CSRF - Trust your frontend for CSRF tokens
CSRF_TRUSTED_ORIGINS=https://your-frontend.railway.app,http://localhost:3000

# OpenAI API Key (if you're using OpenAI features)
OPENAI_API_KEY=your-openai-api-key
```

### How to Generate a SECRET_KEY

```python
# Run this in Python to generate a secure secret key
import secrets
print(secrets.token_urlsafe(50))
```

Or use this Django command:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Important Notes

- **DATABASE_URL** is automatically set by Railway when you add PostgreSQL - don't set it manually
- Replace `your-backend.railway.app` with your actual Railway backend domain
- Replace `your-frontend.railway.app` with your actual Railway frontend domain
- You'll get these domains after deploying (see Step 5)

## 🎨 Step 4: Configure Frontend Environment Variables

In Railway dashboard, go to your **frontend service** and add:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## 🔄 Step 5: Deploy Services

### Option A: Via GitHub Actions (Recommended)

1. Add `RAILWAY_TOKEN` to GitHub secrets (see [.github/workflows/README.md](.github/workflows/README.md))
2. Push to main branch
3. Tests run automatically
4. If tests pass, deploys to Railway

### Option B: Via Railway CLI

```bash
# Deploy backend
railway up --service backend

# Deploy frontend
railway up --service frontend --directory frontend/next-app
```

### Option C: Via Railway Dashboard

1. Connect your GitHub repository
2. Railway auto-detects Dockerfile
3. Click "Deploy"

## 📝 Step 6: Run Database Migrations

After first deployment, run migrations:

```bash
# Using Railway CLI
railway run python manage.py migrate

# Or in Railway dashboard, go to your backend service and run:
# Settings → Deploy → Command Override → Add: python manage.py migrate && gunicorn django_project.wsgi
```

## 👤 Step 7: Create Superuser

```bash
# Using Railway CLI
railway run python manage.py createsuperuser
```

## 🔍 Step 8: Get Your Deployment URLs

After deployment, Railway provides URLs for your services:

```
Backend:  https://your-project-name-backend.railway.app
Frontend: https://your-project-name-frontend.railway.app
```

**IMPORTANT:** Go back to Step 3 and update the environment variables with these actual URLs!

## 🎯 Step 9: Update Environment Variables with Real URLs

Now that you have your Railway URLs, update these variables:

### Backend Service
```bash
ALLOWED_HOSTS=your-actual-backend.railway.app,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-actual-frontend.railway.app
CSRF_TRUSTED_ORIGINS=https://your-actual-frontend.railway.app
```

### Frontend Service
```bash
NEXT_PUBLIC_API_URL=https://your-actual-backend.railway.app
```

After updating, Railway will automatically redeploy your services.

## ✅ Step 10: Verify Deployment

### Test Backend
```bash
# Health check
curl https://your-backend.railway.app/api/schema/

# Should return OpenAPI schema
```

### Test Frontend
Visit `https://your-frontend.railway.app` in your browser

### Check CORS is Working
1. Open your frontend in browser
2. Open DevTools Console
3. Try logging in or making API requests
4. Should work without CORS errors

## 🔒 Security Checklist

Before going live, verify:

- [ ] `DEBUG=False` in production
- [ ] `SECRET_KEY` is a strong, unique value (not the fallback)
- [ ] `ALLOWED_HOSTS` only includes your Railway domain
- [ ] `CORS_ALLOWED_ORIGINS` only includes your frontend domain
- [ ] `CSRF_TRUSTED_ORIGINS` only includes your frontend domain
- [ ] Database is Railway's PostgreSQL (not local Docker)
- [ ] HTTPS is enforced (Railway handles this automatically)
- [ ] All environment variables are set correctly
- [ ] No hardcoded secrets in code

## 🐛 Troubleshooting

### "DisallowedHost" Error
- Check `ALLOWED_HOSTS` includes your Railway domain
- Restart the backend service after updating

### CORS Errors
- Check `CORS_ALLOWED_ORIGINS` includes your frontend URL with `https://`
- Make sure there are no trailing slashes
- Restart backend service after updating

### Database Connection Error
- Verify PostgreSQL database is running in Railway
- Check `DATABASE_URL` is set automatically (don't override it)
- Run migrations: `railway run python manage.py migrate`

### Static Files Not Loading
- Verify WhiteNoise is in MIDDLEWARE (already configured)
- Run: `railway run python manage.py collectstatic --noinput`

### 502 Bad Gateway
- Check Railway logs for errors
- Verify Dockerfile builds successfully
- Make sure gunicorn is running (not Django dev server)

## 📊 Monitoring

View logs in Railway dashboard:
- Backend service → Deployments → View Logs
- Frontend service → Deployments → View Logs

## 🔄 CI/CD Workflow

Your GitHub Actions workflow ([.github/workflows/test-and-deploy.yml](.github/workflows/test-and-deploy.yml)) automatically:

1. ✅ Runs 28 backend tests
2. ✅ Runs 16 frontend tests
3. ✅ Checks code coverage
4. ✅ Deploys to Railway (only if all tests pass)

This ensures no broken code reaches production!

## 📦 Database Backup

Railway automatically backs up your PostgreSQL database. To manually export:

```bash
# Export database
railway run pg_dump > backup.sql

# Import database
railway run psql < backup.sql
```

## 🎓 Local Development

Your settings.py is configured to work seamlessly in both environments:

**Development (Docker):**
- Uses local PostgreSQL container
- `DEBUG=True` (default)
- Accepts `localhost` origins

**Production (Railway):**
- Uses Railway PostgreSQL (`DATABASE_URL`)
- `DEBUG=False` (via env var)
- Only accepts configured domains

No code changes needed - just environment variables!

## 📞 Support

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- GitHub Issues: Report bugs in your repository
