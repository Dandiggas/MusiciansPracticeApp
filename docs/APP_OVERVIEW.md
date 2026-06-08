# The Shed — Musicians Practice App: Comprehensive Overview

**Generated:** 2026-04-05
**Purpose:** Full codebase audit for marketing planning, agent orchestration, and product strategy.

---

## 1. What The App Does

"The Shed" is a full-stack web application for musicians to track, plan, and improve their practice sessions. It's designed for the busy musician who wants structured practice with integrated tools — not just a timer, but a complete practice studio in the browser.

### Core Features (Built & Live)

- **Practice Timer** — Real-time start/stop/pause/resume timer with server-side duration tracking. Timer state persists across page refreshes and browser sessions.
- **Session Management** — Full CRUD for practice sessions with instrument, description, duration, date, YouTube URL, and tags.
- **Launch Pad Dashboard ("The Shed")** — Per-instrument project cards (Guitar, Bass, Drums, Keys) that remember your last song, YouTube URL, BPM, notes, and sheet music. One tap to resume where you left off.
- **Embedded YouTube Player** — Paste a YouTube URL and practice along with playback speed control (0.5x–1.25x) and A-B loop functionality for drilling sections.
- **Local Audio Player** — Upload MP3/WAV files to practice along with local audio.
- **Metronome** — Built-in metronome with BPM control, tap tempo, time signature selection (2/4 through 7/8), and visual beat indicator. Uses Web Audio API for sample-accurate timing.
- **Chromatic Tuner** — Real-time pitch detection via microphone with note name, cents offset, and flat/sharp indicator. Uses autocorrelation algorithm via Web Audio API.
- **Take Recorder** — Record audio takes during practice for self-review.
- **Sheet Music PDF Viewer** — Upload PDFs (up to 20MB, 50 pages), view with zoom/navigation, bookmark last page viewed. Integrated into practice sessions and available as standalone library. Deduplication via SHA256 hash.
- **AI Practice Recommendations** — OpenAI GPT-4o-mini powered practice suggestions based on instrument, skill level, and goals. Response caching (1hr TTL) and rate limiting (5/hour).
- **Analytics Dashboard** — Total practice hours, weekly practice, current streak, favorite instrument, calendar heatmap (365 days), instrument breakdown pie chart, practice trend line chart.
- **Tag System** — Custom colored tags for organizing sessions.
- **Focus Points** — Editable notes/goals that persist per instrument project.
- **User Authentication** — Registration, login, logout with token-based auth.
- **Dark/Light Mode** — Theme toggle with system preference detection.
- **Responsive Design** — Mobile-friendly with dedicated mobile navigation.

### User Flow

1. User logs in → lands on Launch Pad dashboard
2. Picks an instrument card (pre-filled with last session's song, URL, BPM, notes, sheet music)
3. Enters Practice Studio: timer, YouTube/audio player, metronome, tuner, recorder, sheet music viewer, focus points
4. Starts timer → practices → pauses/resumes as needed → stops timer
5. Session saved with duration automatically calculated (minus paused time)
6. Can view analytics, session history, get AI recommendations

---

## 2. Tech Stack

### Backend
- **Framework:** Django 5.1.4 + Django REST Framework 3.15.2
- **Language:** Python 3.10
- **Database:** PostgreSQL 13 (production via Railway, local via Docker)
- **Auth:** dj-rest-auth 7.2.0 + django-allauth 65.4.1 (token-based)
- **AI:** OpenAI API (GPT-4o-mini) for practice recommendations
- **API Docs:** drf-spectacular (OpenAPI/Swagger)
- **File handling:** pikepdf for PDF validation, SHA256 for dedup
- **WSGI Server:** Gunicorn 23.0.0
- **Static files:** WhiteNoise 6.8.2
- **DB URL parsing:** dj-database-url 2.3.0

### Frontend
- **Framework:** Next.js 15 (App Router) with Turbopack
- **Language:** TypeScript
- **UI:** Tailwind CSS 4 + shadcn/ui components (Radix UI primitives)
- **Charts:** Chart.js + react-chartjs-2
- **PDF Viewer:** react-pdf 10.4.1
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **State:** React useState/useEffect + localStorage persistence
- **Themes:** next-themes
- **Date utilities:** date-fns
- **Calendar:** react-calendar-heatmap

### DevOps
- **Hosting:** Railway (backend + frontend as separate services + PostgreSQL)
- **CI/CD:** GitHub Actions (test-and-deploy.yml)
- **Containerization:** Docker + Docker Compose (local dev)
- **Build:** Dockerfile for backend, Next.js standalone output for frontend

---

## 3. Architecture

### Project Structure

```
MusiciansPracticeApp/
├── django_project/          # Django settings, URLs, WSGI/ASGI
├── accounts/                # CustomUser, auth views, throttles, serializers
├── session/                 # Session workbench API: sessions, tracks, licks, takes
│   ├── models.py           # Session, Track, Lick, Take
│   ├── views.py            # Owner-scoped DRF viewsets
│   ├── serializers.py      # Media validation and nested session data
│   ├── urls.py             # Session workbench API router
│   └── tests/              # API/model/serializer tests
├── frontend/next-app/
│   ├── src/app/            # Next.js App Router pages
│   │   ├── dashboard/      # Launch Pad
│   │   ├── practice-timer/ # Main studio (1044 lines)
│   │   ├── sheet-music/    # Library + [id] viewer
│   │   ├── recommendations/# AI tutor
│   │   ├── profilepage/    # Analytics
│   │   ├── tuner/          # Standalone tuner
│   │   ├── metronome/      # Standalone metronome
│   │   ├── youtube-practice/ # YouTube practice page
│   │   ├── login/ + register/
│   │   └── layout.tsx      # Root layout with Header
│   ├── src/components/
│   │   ├── studio/         # SessionSetupForm, PracticeMedia, MetronomeWidget, TunerWidget, SheetMusicWidget, FocusPoints, etc.
│   │   ├── youtube/        # YouTubePlayer, PlaybackSpeedControl, ABLoopControl
│   │   ├── media/          # TakeRecorder, LocalAudioPlayer
│   │   ├── charts/         # CalendarHeatmap, InstrumentBreakdown
│   │   ├── navigation/     # Header, MobileNav
│   │   ├── auth/           # LoginPage, RegisterPage
│   │   ├── practice/       # TagSelector, PracticeSessionForm, PracticeChart, LogoutButton
│   │   ├── profile/        # ProfilePage
│   │   ├── dashboard/      # StatsCard
│   │   └── ui/             # shadcn components (button, card, input, label, badge, theme-toggle)
│   ├── src/lib/
│   │   ├── practice-session-store.ts  # localStorage persistence layer
│   │   ├── sheet-music-api.ts         # Sheet music API client
│   │   ├── audio/
│   │   │   ├── metronome-engine.ts    # Web Audio metronome
│   │   │   ├── pitch-detector.ts      # Autocorrelation pitch detection
│   │   │   └── note-utils.ts          # Frequency-to-note conversion
│   │   └── utils.ts
│   └── src/types/youtube.d.ts
├── docs/
│   ├── plans/              # Design docs
│   └── superpowers/specs/  # iOS app spec, sheet music viewer spec
├── stitch_recommendations_improved/  # UI design mockups (HTML + screenshots)
├── .github/workflows/test-and-deploy.yml
├── Dockerfile, docker-compose.yml, Procfile, nixpacks.toml
└── Various docs (README, CLAUDE.md, TODOS.md, etc.)
```

### Data Models

**CustomUser** (extends AbstractUser)
- `name` — display name

**Session** (core model)
- `session_id` (PK), `user` (FK), `display_id` (per-user auto-increment)
- `instrument`, `duration` (DurationField), `description`, `session_date`
- `skill_level` (beginner/intermediate/advanced), `instrument_preference`
- `goals`, `youtube_url`
- `tags` (M2M → Tag)
- Timer fields: `in_progress`, `started_at`, `paused_duration`, `paused_at`, `is_paused`
- `created_at`, `updated_at`

**Tag**
- `name` (unique per user), `color` (hex), `user` (FK)

**SheetMusic**
- `user` (FK), `title`, `file` (FileField → media/sheet_music/{user_id}/{uuid}.pdf)
- `file_size`, `page_count`, `file_hash` (SHA256)
- `last_page_viewed` (bookmark), `created_at`, `updated_at`
- Constraints: unique (user, title), unique (user, file_hash)

### API Endpoints (all under /api/v1/)

**Sessions:**
- `GET/POST /` — List/create sessions
- `GET/PUT/PATCH/DELETE /<id>/` — Session detail

**Timer:**
- `POST /timer/start/` — Start new timer (instrument required)
- `POST /timer/<id>/stop/` — Stop timer, calculate duration
- `POST /timer/<id>/pause/` — Pause timer
- `POST /timer/<id>/resume/` — Resume timer
- `GET /timer/active/` — Get active timer

**Analytics:**
- `GET /stats/` — Total hours, weekly hours, streak, favorite instrument
- `GET /calendar/?days=365` — Calendar heatmap data
- `GET /by-instrument/?days=30` — Instrument breakdown

**Tags:**
- `GET/POST /tags/` — List/create tags
- `GET/PUT/DELETE /tags/<id>/` — Tag detail

**Sheet Music:**
- `GET/POST /sheet-music/` — List/upload
- `GET/PATCH/DELETE /sheet-music/<id>/` — Detail/update bookmark/delete
- `GET /sheet-music/<id>/file/` — Serve PDF (auth-protected)

**AI:**
- `POST /recommendations/` — Generate practice recommendation (rate limited: 5/hour)

**Auth (via dj-rest-auth):**
- `POST /dj-rest-auth/login/` — Returns token
- `POST /dj-rest-auth/registration/`
- `POST /dj-rest-auth/logout/`
- `GET /current-user/` — Current user info

**Docs:**
- `GET /api/schema/` — OpenAPI schema
- `GET /api/schema/swagger-ui/` — Swagger UI

### Auth Flow
- Token-based auth via dj-rest-auth
- Frontend stores token in localStorage
- All API calls include `Authorization: Token <token>` header
- IsAdminOrOwner permission class for data isolation

---

## 4. Deployment & CI/CD

### Hosting
- **Platform:** Railway
- **Services:** 3 separate Railway services:
  1. Backend (Django/Gunicorn)
  2. Frontend (Next.js standalone)
  3. PostgreSQL database (Railway managed)

### CI/CD Pipeline (GitHub Actions)
- **Trigger:** Push to main (deploy) or PR to main (test only)
- **Jobs:**
  1. `test-backend` — Python 3.10, PostgreSQL 13 service, runs Django tests
  2. `test-frontend` — Node.js 24, runs Jest tests + coverage
  3. `deploy-backend` — Railway CLI deploy (only on main push, only if tests pass)
  4. `deploy-frontend` — Railway CLI deploy (only on main push, only if tests pass)
- **Secret:** `RAILWAY_TOKEN` in GitHub secrets

### Deployment Config
- **Dockerfile** — Python 3.10 slim, collects static files, runs Gunicorn
- **nixpacks.toml** — Runs migrations before Gunicorn start
- **Procfile** — `bash railway_start.sh` (migrations + Gunicorn)
- **railway_start.sh** — `migrate --noinput && gunicorn`
- **docker-compose.yml** — Local dev: Django + PostgreSQL 13

### Security (Production)
- DEBUG=False by default
- ALLOWED_HOSTS from env var
- CORS_ALLOWED_ORIGINS from env var
- CSRF_TRUSTED_ORIGINS from env var
- HTTPS enforcement (HSTS, secure cookies, SSL redirect via proxy header)
- WhiteNoise for static files
- No hardcoded secrets in code
- Rate limiting on AI recommendations (5/hour) and sheet music uploads (10/hour)
- File validation: PDF only, ≤20MB, ≤50 pages, SHA256 dedup, 200MB user storage quota

---

## 5. Frontend Features & Navigation

### Navigation (Header)
- **The Shed** — Dashboard/Launch Pad
- **Studio** — Practice timer + all tools
- **Sheet Music** — PDF library
- **AI Tutor** — Practice recommendations
- **Analytics** — Stats, history, charts
- Mobile: hamburger menu with same navigation

### Branding
- App is called **"The Shed"**
- Dark navy aesthetic with purple accent gradient (#7c3aed → #8455ef)
- Professional studio feel

### Key Frontend Patterns
- localStorage persistence for practice setup, session state, and per-instrument projects
- Legacy migration from single-instrument setup to multi-instrument Launch Pad
- Auto-resume from URL params (?instrument=Guitar or ?resume=1)
- Instrument project data stored locally (not yet synced to backend)
- Web Audio API for metronome and tuner (AudioContext, AnalyserNode)

---

## 6. Test Coverage

### Backend: ~46 tests
- **Session model:** 6 tests (creation, display_id, string repr, YouTube URL, tags)
- **Tag model:** 3 tests (creation, default color, unique constraint)
- **Session API:** 6 tests (CRUD, YouTube URL update, unauth access)
- **Timer API:** 8 tests (start, start with/without YouTube, validation, stop, active timer)
- **Pause/Resume:** 5 tests (pause, double-pause, resume, unpaused-resume, duration tracking)
- **Stats/Analytics:** 3 tests (stats, calendar, by-instrument)
- **Tags API:** 3 tests (create, list, delete)
- **Recommendations:** 9 tests (validation, success, caching, unauth, OpenAI errors, rate limiting)
- **Sheet Music model:** 3 tests (creation, duplicate title, duplicate hash)
- **Sheet Music API:** 8 tests (upload, non-PDF rejection, page limit, dedup, list, bookmark, delete, file serving, user isolation, unauth)

### Frontend: 16 unit tests + 6 E2E
- **Practice Timer (Jest):** 16 tests — render, active timer, start/pause/resume/stop, time formatting, error handling, loading states
- **E2E (Playwright):** 6 tests — page display, validation, complete session flow, pause/resume, redirect, timer formatting
- **Coverage:** 96.31% statement coverage on practice timer component

### Test Framework Versions
- Backend: Django TestCase + DRF APITestCase
- Frontend: Jest 30.2.0, React Testing Library 16.3.1, Playwright 1.57.0

---

## 7. Current State & Maturity

### What's Built & Working
- Full practice session lifecycle (create/start/pause/resume/stop)
- Multi-instrument Launch Pad with per-instrument project memory
- Embedded YouTube player with speed/loop controls
- Local audio file playback
- Metronome + Tuner (Web Audio API)
- Take recorder
- Sheet music PDF viewer with upload, zoom, page nav, bookmarking
- AI practice recommendations with caching and rate limiting
- Analytics dashboard with charts
- Token-based auth with registration/login
- CI/CD pipeline deploying to Railway
- Production security hardened (HTTPS, CORS, CSRF, etc.)
- 46+ backend tests, 16 frontend unit tests, 6 E2E tests

### What's In Progress / Planned
From TODOS.md and roadmap:
- **Backend sync for instrument projects** — Currently localStorage only, no cross-device persistence
- **User-configurable instrument list** — Hardcoded to Guitar, Bass, Drums, Keys (cap at 8)
- **Dashboard test coverage** — Launch Pad has no tests
- **PWA / mobile optimization** — Home screen installable app (iOS audio APIs are flaky)
- **Migration edge case** — Legacy instrument names not matching hardcoded list get silently deleted
- **iOS native app** — Full design spec exists (SwiftUI, zero dependencies, feature parity)

### Planned Features (from README roadmap)
- Session filtering and search
- User profile editing
- Email verification
- Password reset
- Social authentication
- Practice goal tracking
- Achievement system
- Export practice data (CSV/PDF)
- Error tracking (Sentry)
- Analytics integration

---

## 8. Design & UI Direction

### Design System
Two professional design systems have been explored (in stitch_recommendations_improved/):
1. **"Sonata Analytics"** — Light mode, editorial "Virtuoso's Study" aesthetic
2. **"Midnight Studio"** — Dark mode, "Master Engineer" aesthetic with Electric Violet accent

The current app uses a dark theme that aligns with the "Midnight Studio" direction — deep navy backgrounds, purple accent gradient, card-based layouts.

### UI Mockups Available
- The Shed Home Hub (dashboard)
- Practice Studio
- AI Tutor
- Analytics Dashboard
- Settings

---

## 9. What's Missing / Could Be Improved

### Critical for Marketing Launch
1. **Custom domain** — Currently on Railway-generated URLs. Need branded domain (e.g., theshed.app or theshedmusic.app).
2. **Landing page** — No public-facing marketing page. The app goes straight to login. Need a landing page with value proposition, screenshots, CTA.
3. **SEO / Meta tags** — No evidence of meta descriptions, OG tags, or structured data for social sharing.
4. **Live deployment smoke test** — Verify register, email verification, login, password reset, session creation, track upload, take recording, account deletion, and admin deletion on the deployed domain.
5. **User onboarding** — First-time experience could be smoother. Empty sessions should guide users toward adding a song, chart, or recording.

### Product Improvements
6. **User-configurable instruments** — The old Launch Pad assumptions are deprecated, but user-level instrument preferences still need a settled model if analytics/history returns.
7. **Session history search/filter** — No dedicated search or archive filtering on the current sessions list.
8. **Social features** — No sharing, no community, no social proof.
9. **Offline support / PWA** — No service worker, no offline capability.

### Technical Improvements
10. **Production env/storage** — Production must set `SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`, host/CORS/CSRF values, and a durable `MEDIA_ROOT` or object-storage replacement.
11. **Test coverage gaps** — Current Playwright coverage verifies the sessions workbench, but account settings, admin, upload, recording, email verification, and password reset need broader e2e coverage.
12. **Error tracking** — No Sentry or equivalent.
13. **Analytics/telemetry** — No usage analytics (PostHog, Mixpanel, Plausible, etc.).
14. **Media file storage** — Local or Railway-volume uploads may be acceptable for small beta testing, but object storage/CDN is the long-term production path.
15. **API versioning** — Only v1, which is fine, but no deprecation strategy.

### Recently Completed
16. **Auth rate limiting** — Login, register, password reset, email resend, and verify-and-login are now protected by scoped DRF throttles.
17. **Email verification** — Mandatory allauth verification flow is implemented.
18. **Password reset** — Frontend password reset flow is implemented.
19. **Production checks** — `manage.py check --deploy` now reports missing production env/storage setup and passes with production-like env vars.

### Marketing & Growth
19. **No blog / content** — No content marketing infrastructure.
20. **No referral / invite system** — No growth loops.
21. **No pricing / plans** — Currently free, no monetization path visible.
22. **No app store presence** — iOS app is specced but not built.

---

## 10. Key URLs & References

- **GitHub:** https://github.com/Dandiggas/MusiciansPracticeApp
- **Backend API:** Railway-hosted (URL in env vars)
- **Frontend:** Railway-hosted (URL in env vars)
- **API Docs:** /api/schema/swagger-ui/
- **Admin Panel:** /admin/

---

## 11. Summary for Agent Planning

**The Shed is a feature-rich, production-deployed musicians practice app.** It has a solid Django REST API backend, a modern Next.js frontend with integrated practice tools (timer, YouTube player, metronome, tuner, recorder, sheet music viewer, AI recommendations), CI/CD with testing gates, and production security. It's built by a musician-turned-engineer who understands the target user deeply.

**For marketing launch, the highest priorities are:**
1. Custom domain setup
2. Landing page with compelling copy and screenshots
3. Social media presence (leveraging Dan's music industry credibility)
4. Content marketing (practice tips, musician productivity)
5. App Store listing preparation (iOS app spec is ready)

**The app's unique selling points for marketing:**
- Built BY a professional musician (15 years, credits with Central Cee, Mahalia)
- All-in-one practice studio (not just a timer)
- YouTube integration for learning by ear
- Sheet music PDF viewer for classical/reading musicians
- AI-powered practice recommendations
- Practice analytics and streak tracking
- Free to use (currently)
