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

## Design review follow-ups (deferred from /design-review, 2026-06-10)

1. **Spacing tokens** (medium) — layouts use repeated Tailwind magic values
   (`px-4 py-10 md:px-8`, `gap-6`); define a small spacing scale if drift
   continues. Flagged by Codex as P1.
2. **Card overuse in the workbench** (medium) — most regions are wrapped in
   rounded bordered panels; some are decorative framing rather than the
   interaction itself. A calmer surface hierarchy would read more premium.
3. **Legacy components bypass the theme** (medium) — `TakeRecorder`,
   `StatsCard`, `TagSelector`, `PracticeChart`, `LocalAudioPlayer` hardcode
   slate/hex colors and break dark mode. They are unreachable from the current
   nav — consider deleting them and the legacy routes (`/dashboard`,
   `/profilepage`, `/practice-timer`, `/recommendations`, `/youtube-practice`).
4. **"Kevin Bond" placeholder** (polish) — the new-session input placeholder
   reads like a person's name, not a session name. Confirm it's intentional.
5. **Time-signature button size** (polish) — 32px tall, under the 44px touch
   minimum. Density tradeoff; revisit if mis-taps happen on mobile.
6. **Mobile Playwright project** (polish) — Playwright only configures Desktop
   Chrome; add an iPhone viewport project to guard the responsive layout.

Fixed by /design-review on main, 2026-06-10: light/dark contrast tokens
(muted-foreground, primary, destructive), destructive buttons now use
`text-destructive-foreground`, Delete Session demoted to outline, nav link hit
areas stretched to header height, `transition-all` removed from metronome.

## Recently completed

- Auth rate limiting on login, register, password reset, email resend, and
  verify-and-login.
- Email verification and password reset flows.
- Mandatory frontend lint during production builds.
- Current-session Playwright coverage replacing stale practice timer tests.
- Upload size limits for tracks and takes.
- Production deploy diagnostics via `manage.py check --deploy`.
