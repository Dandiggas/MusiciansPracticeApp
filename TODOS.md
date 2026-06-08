# TODOS

Current production-readiness and product follow-ups as of 2026-06-09.

## Before broad production launch

1. **Production environment variables**
   - Set a real `SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `ALLOWED_HOSTS`,
     `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` in the production host.
   - Keep `DEBUG=False`, `SECURE_SSL_REDIRECT=True`, and
     `AUTH_TOKEN_COOKIE_SECURE=True`.

2. **Durable media storage**
   - Move uploaded tracks, PDFs/images, and takes to durable storage before a
     wider launch.
   - A persistent Railway volume is acceptable for a small beta. Object storage
     plus CDN is the better long-term path.

3. **Live smoke test**
   - On the deployed domain, manually verify register, email verification,
     login, password reset, session creation, track upload, take recording,
     account deletion, and admin deletion.

4. **Observability**
   - Add error tracking such as Sentry.
   - Add basic product analytics such as PostHog or Plausible once user testing
     starts.

## Product and UX follow-ups

1. **First-run onboarding**
   - Create a more guided empty session path so a new musician immediately knows
     to add a song, chart, or audio file.

2. **PWA / mobile install**
   - Make the app installable from mobile home screens.
   - Test tuner, recorder, and YouTube playback on iPhone Safari before relying
     on PWA mode.

3. **Marketing surface**
   - Add a simple public landing page, custom domain, social preview metadata,
     and screenshots before broader outreach.

4. **Expanded e2e coverage**
   - Current Playwright coverage verifies the session workbench happy path.
   - Add live-backed or richer mocked flows for account settings, admin, upload,
     recording, email verification, and password reset.

5. **API lifecycle**
   - Keep `/api/v1/`, but document an API versioning/deprecation policy before
     external integrations exist.

## Recently completed

- Auth rate limiting on login, register, password reset, email resend, and
  verify-and-login.
- Email verification and password reset flows.
- Mandatory frontend lint during production builds.
- Current-session Playwright coverage replacing stale practice timer tests.
- Upload size limits for tracks and takes.
- Production deploy diagnostics via `manage.py check --deploy`.
