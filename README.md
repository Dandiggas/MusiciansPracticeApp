# The Shed

The Shed is a browser-based practice workbench for musicians.

It is not just a generic practice timer anymore. The current product is built around sessions: each session holds the songs, charts, reference audio, licks, takes, notes, BPM, metronome/tuner context, and practice material for a piece of work you want to come back to.

Status: active beta / tester-ready work in progress. The app is usable, but broader production launch still needs durable media storage, a live smoke test, onboarding polish, and observability.

## What it does now

### Set list import — paste your week, get your bench back

The weekly front door for set-list musicians (worship teams, session players):

- Paste the raw set list exactly as it arrives — WhatsApp, email, or a Planning Center export. Numbered lines, bullets, `Song – Bb`, `Song (Bb)`, `Song in G`, and `C#m`-style minor keys all parse; header lines are skipped. Parsing is deterministic (no AI, no network call).
- Every song is fuzzy-matched against your own track history. Repeats carry last time's work forward automatically: YouTube source, BPM, notes, last-used speed, and named loop points.
- An editable preview shows each song with its key and a carry-over badge (toggle it off to start a song fresh), then one click creates the week's session in set order.
- Each track stores its **called key** — the key the song is called in this week, separate from whatever key the reference recording is in.
- New songs arrive as tracks without a source, holding their name, key, and position. Open one and paste a YouTube link straight into the track pane to unlock the player, loops, and takes in place.

Find it on `/sessions` — "Paste this week's set list".

### Session workbench

- Create named practice sessions.
- Add ordered tracks to a session.
- Supported track sources:
  - YouTube links
  - MP3/audio uploads
  - PDF charts/sheet music
  - Image charts/screenshots
- Reorder tracks inside a session.
- Edit track name, BPM, and notes.
- Keep each session's practice material together instead of scattering links and files.

### Practice tools

- Built-in metronome with BPM, tap tempo, time signature, volume, and beat display.
- Built-in tuner using the browser microphone and Web Audio pitch detection.
- Standalone metronome and tuner pages are also available.
- Session tools read the selected track BPM so the workbench stays contextual.

### YouTube and audio practice

- Normalizes common YouTube URLs before saving.
- Embedded YouTube practice player for YouTube tracks.
- MP3/audio player for uploaded audio tracks.
- Lick/loop support for audio-style practice sections.

### Charts, sheets, and media

- PDF/image tracks render in the workbench.
- Uploaded media is attached to the track it belongs to.
- Upload validation is enforced on the backend by source type and file extension.

### Takes

- Record and save takes against a track.
- Supports audio, video, and video+audio capture modes where the browser supports them.
- Takes can be renamed; recorded files stay attached to the track.

### Accounts and admin

- Django/allauth-backed registration and login.
- Email verification flow.
- Password reset flow.
- Account settings and self-delete support.
- Staff/admin user management page for removing test users.
- Auth routes are proxied through Next.js so the frontend can work with the Django API cleanly.

### Production hardening already in place

- Environment-driven Django settings.
- `DEBUG=False` by default outside development.
- Configurable `ALLOWED_HOSTS`, CORS, and CSRF trusted origins.
- Secure cookie settings for production.
- Login/register/password-reset/email-verification rate limiting.
- Upload size/type validation for tracks and takes.
- Django deployment checks.
- CI workflows for backend and frontend tests.

## Current navigation

The main app surfaces are:

- `/sessions` — The Shed practice workbench and session list
- `/sessions/[id]` — session detail with tracks, players, sheets, takes, metronome, and tuner
- `/metronome` — standalone metronome
- `/tuner` — standalone tuner
- `/account` — account settings
- `/admin` — staff-only test user/admin management
- `/login`, `/register`, `/password-reset`, `/auth/verify/...` — auth flows

Older routes such as `/dashboard`, `/practice-timer`, `/profilepage`, `/recommendations`, and `/youtube-practice` now redirect back to `/sessions`. Some legacy components still exist in the repo, but the current product loop is the session workbench.

## Tech stack

### Backend

- Python 3.10+
- Django 5.1
- Django REST Framework
- dj-rest-auth + django-allauth
- PostgreSQL in production / configurable local database
- Gunicorn + WhiteNoise for production serving
- drf-spectacular for OpenAPI/Swagger docs

### Frontend

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Radix/shadcn-style UI primitives
- Phosphor icons
- Web Audio API for metronome and tuner
- Jest + React Testing Library
- Playwright for e2e coverage

### Deployment/devops

- Docker / Docker Compose support
- Railway-oriented deployment files
- GitHub Actions workflows
- Next.js standalone build output

## Repository structure

```text
MusiciansPracticeApp/
├── accounts/                  # users, auth, email verification, rate limiting, self-delete
├── django_project/            # Django settings, URLs, startup/deploy checks
├── session/                   # sessions, tracks, licks, takes API and tests
├── frontend/next-app/         # Next.js app
│   ├── src/app/               # app routes
│   ├── src/components/        # session workbench, auth, admin, tools, UI
│   ├── src/hooks/             # transport/loop hooks
│   ├── src/lib/               # API clients, audio engines, utilities
│   └── e2e/                   # Playwright tests
├── docs/                      # older plans, visual direction, implementation notes
├── TODOS.md                   # current launch/product follow-ups
├── PRODUCTION_SECURITY_SUMMARY.md
├── RAILWAY_DEPLOYMENT.md
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## API shape

All app API routes sit under `/api/v1/`.

Current core endpoints:

- `GET/POST /api/v1/sessions/`
- `GET/PATCH/DELETE /api/v1/sessions/<id>/`
- `POST /api/v1/sessions/import-set/preview/` — parse pasted set-list text and match against your history
- `POST /api/v1/sessions/import-set/` — create the week's session with carry-over
- `POST /api/v1/sessions/<id>/reorder-tracks/`
- `GET/POST /api/v1/tracks/`
- `GET/PATCH/DELETE /api/v1/tracks/<id>/`
- `POST /api/v1/tracks/<id>/reorder-licks/`
- `GET/POST /api/v1/licks/`
- `GET/PATCH/DELETE /api/v1/licks/<id>/`
- `GET/POST /api/v1/takes/`
- `GET/PATCH/DELETE /api/v1/takes/<id>/`
- `GET /api/v1/takes/<id>/file/`
- `GET /api/v1/current-user/`
- `DELETE /api/v1/account/`
- `GET /api/schema/swagger-ui/`

Auth is provided through dj-rest-auth/allauth routes under `/api/v1/dj-rest-auth/`, with custom throttled wrappers for login, registration, email verification resend, and password reset.

## Local development

### Prerequisites

- Python 3.10+
- Node.js 20+ recommended
- PostgreSQL if you are not using SQLite/local defaults
- Docker optional

### Backend

```bash
cd MusiciansPracticeApp
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend defaults to `http://localhost:8000`.

### Frontend

```bash
cd frontend/next-app
npm install
npm run dev
```

Frontend defaults to `http://localhost:3000`.

For local frontend-to-backend calls, set the frontend environment to point at Django if needed:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use `.env.example` as the backend environment template.

## Tests and verification

Backend:

```bash
python manage.py test
python manage.py check --deploy
```

Frontend:

```bash
cd frontend/next-app
npm test
npm run build
npm run test:e2e
```

The current test suite covers backend session/track/lick/take/auth behavior plus frontend auth, session workbench, account, admin, API proxy, and selected e2e flows.

## Current launch blockers

Before a broader public launch:

- Move uploaded tracks/takes/charts to durable storage or confirm a persistent Railway volume is enough for the beta.
- Run a live smoke test on the deployed domain: register, verify email, login, reset password, create session, upload media, record take, delete account, admin delete.
- Add basic observability/error tracking.
- Improve first-run onboarding so a new musician knows what to add first.
- Add a proper public landing page, screenshots, domain, and social preview metadata.
- Expand e2e coverage around uploads, recording, account settings, admin, email verification, and password reset.

See `TODOS.md` for the current follow-up list.

## What this repo is not anymore

Older docs and component names still reference a broad analytics dashboard, standalone practice timer, AI recommendations page, and profile page. Those are not the current product centre. The current direction is The Shed: a musician's session workbench for saving practice material, drilling sections, using built-in tools, and reviewing takes.

## License

No license file is currently committed. Add one before treating this as reusable open-source software.

## Author

Built by [Dandiggas](https://github.com/Dandiggas).
