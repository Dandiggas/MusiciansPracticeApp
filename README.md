# The Shed

A browser-based practice workbench for musicians.

Everything for one piece of work lives in a **session**: songs, charts, reference audio, licks, takes, notes, BPM, metronome and tuner.

Status: active beta. Usable, but a public launch still needs durable media storage, a live smoke test, onboarding polish, and observability.

## Features

**Set list import** (`/sessions` → "Paste this week's set list")
Paste the raw set list as it arrives (WhatsApp, email, Planning Center). Parsing is deterministic, no AI or network call, and handles numbered lines, bullets, `Song – Bb`, `Song (Bb)`, `Song in G`, and minor keys. Songs are fuzzy-matched against your track history, so repeats carry forward their YouTube source, BPM, notes, speed, and loop points. An editable preview lets you drop the carry-over per song, then one click builds the week's session in set order. Each track stores its **called key** separately from the reference recording's key. New songs arrive sourceless; paste a YouTube link into the track pane to unlock the player, loops, and takes.

**Session workbench**
Named sessions with ordered, reorderable tracks. Track sources: YouTube links, MP3/audio uploads, PDF charts, image charts. Edit name, BPM, and notes per track.

**Practice tools**
Metronome (BPM, tap tempo, time signature, volume, beat display) and Web Audio tuner, both in the workbench and as standalone pages. Session tools read the selected track's BPM.

**Playback and media**
YouTube URLs are normalised on save and play in an embedded player. Uploaded audio gets its own player with lick/loop support. PDFs and images render inline. Uploads are validated backend-side by source type and extension.

**Takes**
Record and save takes against a track (audio, video, or video+audio where the browser supports it). Renameable, kept attached to the track.

**Accounts**
Django/allauth registration, login, email verification, password reset, account settings, self-delete, and a staff-only user management page. Auth routes proxy through Next.js.

**Hardening in place**
Environment-driven settings, `DEBUG=False` outside dev, configurable `ALLOWED_HOSTS`/CORS/CSRF, secure production cookies, rate limiting on auth endpoints, upload size/type validation, deployment checks, and CI for backend and frontend.

## Routes

| Route | Purpose |
|---|---|
| `/sessions` | Workbench and session list |
| `/sessions/[id]` | Tracks, players, sheets, takes, metronome, tuner |
| `/metronome`, `/tuner` | Standalone tools |
| `/account` | Account settings |
| `/admin` | Staff-only user management |
| `/login`, `/register`, `/password-reset`, `/auth/verify/...` | Auth |

Legacy routes (`/dashboard`, `/practice-timer`, `/profilepage`, `/recommendations`, `/youtube-practice`) redirect to `/sessions`. Some old components remain in the repo; the session workbench is the current product loop.

## Stack

**Backend:** Python 3.10+, Django 5.1, DRF, dj-rest-auth + allauth, PostgreSQL in production, Gunicorn + WhiteNoise, drf-spectacular.

**Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Radix/shadcn primitives, Phosphor icons, Web Audio API, Jest + RTL, Playwright.

**Deploy:** Docker / Compose, Railway config, GitHub Actions, Next standalone build.

## Layout

```text
accounts/            users, auth, verification, rate limiting
django_project/      settings, URLs, deploy checks
session/             sessions, tracks, licks, takes API
frontend/next-app/   Next.js app (src/app, src/components, src/hooks, src/lib, e2e)
docs/                plans, TODOs, deployment + security notes, API schema
```

## API

App routes sit under `/api/v1/`: `sessions/`, `sessions/<id>/`, `sessions/import-set/preview/`, `sessions/import-set/`, `sessions/<id>/reorder-tracks/`, `tracks/`, `tracks/<id>/`, `tracks/<id>/reorder-licks/`, `licks/`, `licks/<id>/`, `takes/`, `takes/<id>/`, `takes/<id>/file/`, `current-user/`, `account/`.

Schema at `/api/schema/swagger-ui/`. Auth lives under `/api/v1/dj-rest-auth/` with throttled wrappers for login, registration, verification resend, and password reset.

## Local development

Needs Python 3.10+, Node 20+, and PostgreSQL if you are not on local SQLite defaults. Use `.env.example` as the backend env template.

```bash
# backend -> http://localhost:8000
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

# frontend -> http://localhost:3000
cd frontend/next-app && npm install && npm run dev
```

Point the frontend at Django with `NEXT_PUBLIC_API_URL=http://localhost:8000` if needed.

## Tests

```bash
python manage.py test && python manage.py check --deploy
cd frontend/next-app && npm test && npm run build && npm run test:e2e
```

Covers backend session/track/lick/take/auth behaviour plus frontend auth, workbench, account, admin, API proxy, and selected e2e flows.

## Launch blockers

- Durable storage for uploaded tracks/takes/charts, or confirmation that a persistent Railway volume covers the beta.
- Live smoke test on the deployed domain, end to end: register, verify, login, reset, create session, upload, record take, delete account, admin delete.
- Observability and error tracking.
- First-run onboarding.
- Public landing page, screenshots, domain, social preview metadata.
- Wider e2e coverage on uploads, recording, account settings, admin, and email flows.

See `docs/TODOS.md`.

## License

None committed yet. Add one before treating this as reusable open-source software.

Built by [Dandiggas](https://github.com/Dandiggas).
