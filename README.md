# The Shed — Musicians Practice App

A practice companion for musicians who play. Track sessions, follow sheet music, slow down YouTube videos, use a metronome and tuner — all in one workspace. Built with Django and Next.js.

## What It Does

- **Launch Pad** — per-instrument project cards that remember your setup (song, media, sheet music, BPM). Click Resume to jump straight into a session with everything loaded.
- **Practice Timer** — start/pause/stop with real-time tracking. Sessions are saved with instrument, description, and duration.
- **Sheet Music Viewer** — upload PDFs, browse a personal library, view in-session alongside your media. Bookmarks your page automatically.
- **YouTube Player** — paste a link, slow it down, loop sections with A/B markers.
- **MP3 Player** — upload audio files with the same speed and loop controls.
- **Metronome** — tap tempo, adjustable BPM, visual beat indicator.
- **Tuner** — real-time pitch detection via microphone.
- **Take Recorder** — record yourself during a session.
- **AI Recommendations** — practice suggestions powered by OpenAI based on your instrument, level, and goals.
- **Analytics** — total hours, streaks, calendar heatmap, instrument breakdown charts.
- **Tags** — colour-coded labels for organising sessions.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Django 5.1, Django REST Framework, PostgreSQL |
| Frontend | Next.js 15, TypeScript, React 19, Tailwind CSS, shadcn/ui |
| Auth | dj-rest-auth + django-allauth, token-based |
| PDF Viewer | react-pdf (PDF.js) |
| Charts | Chart.js + react-chartjs-2 |
| AI | OpenAI API (gpt-4o-mini) |
| Deployment | Railway (backend + frontend + PostgreSQL) |
| CI | GitHub Actions (backend tests + frontend tests) |
| E2E Tests | Playwright |

## Quick Start

```bash
git clone https://github.com/Dandiggas/MusiciansPracticeApp
cd MusiciansPracticeApp

# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py runserver

# Frontend (separate terminal)
cd frontend/next-app
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create a `.env` in the project root:

```
SECRET_KEY=your-django-secret-key
OPENAI_API_KEY=your-openai-key        # optional, for AI recommendations
SENDGRID_API_KEY=your-sendgrid-key    # optional, for email verification
FRONTEND_URL=http://localhost:3000
```

## API

All endpoints under `/api/v1/`. Auth via `Authorization: Token <key>` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dj-rest-auth/login/` | POST | Login |
| `/dj-rest-auth/registration/` | POST | Register |
| `/` | GET/POST | List/create sessions |
| `/<id>/` | GET/PUT/DELETE | Session detail |
| `/timer/start/` | POST | Start practice timer |
| `/timer/<id>/stop/` | POST | Stop and save |
| `/timer/<id>/pause/` | POST | Pause |
| `/timer/<id>/resume/` | POST | Resume |
| `/timer/active/` | GET | Check active session |
| `/tags/` | GET/POST | Tags |
| `/sheet-music/` | GET/POST | Sheet music library |
| `/sheet-music/<id>/` | GET/PATCH/DELETE | Sheet music detail |
| `/sheet-music/<id>/file/` | GET | Serve PDF (auth-protected) |
| `/stats/` | GET | Practice statistics |
| `/calendar/` | GET | Heatmap data |
| `/by-instrument/` | GET | Time by instrument |
| `/recommendations/` | POST | AI practice suggestions |

Full docs at http://localhost:8000/api/schema/swagger-ui/

## Tests

```bash
# Backend
python3 manage.py test

# Frontend unit tests
cd frontend/next-app && npm test

# E2E tests
cd frontend/next-app && npm run test:e2e
```

## License

MIT
