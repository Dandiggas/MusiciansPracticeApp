# STATE — MusiciansPracticeApp (The Shed)

Session handoff file (per AGENTS.md). Newest entry first.

## 2026-07-09 — Cinematic film language across auth + sessions (branch `login-session-video`, NOT pushed)

**Shipped (local commits):**
- `8a1494e` — Login split-screen: left 42vw is a looping live-session clip (Higgsfield Seedance Mini from Dan's reference stills; 431KB, muted, faststart) with amber "● Live from the shed" caption + headline on the film. Form keeps its solid card. Mobile unchanged (form first, no video). Reduced-motion → poster.
- `aa37791` — Register split-screen with the brighter overhead-jam clip (803KB): badge/headline/copy on the film, all three feature cards preserved beside the form. Sessions header wrapped in new `SessionsHero` client component — login film reused (browser-cached) under 75% scrim so the working surface stays quiet.

**Evidence:** 69/69 jest both commits; tsc errors are pre-existing test-file issues only (route.test NODE_ENV, useYoutubeTransport.test); verified live — Django on :8001 + Next on :3117, demo login through the UI, all three videos confirmed playing (paused:false, currentTime advancing), screenshots at 1440/390.

**Quality pass (c54e2be, e4bfb2e):** login = original wide Mini motion Bytedance-upscaled to 2K (Kling regens made people look uncanny — lesson: upscale approved motion instead of regenerating people); register = Kling 3.0 Turbo 1080p portrait (fine from overhead); sessions empty state ("The bench is clear") = generated empty-room still behind a scrim, verified with a sessionless user against the Docker backend. Higgsfield verdict: NO plan upgrade needed — Kling 1080p ≈16-20cr and Bytedance 2K upscale ≈0.2cr on starter. ~132 credits remain.

**Local dev notes:**
- THE REAL DEV BACKEND IS DOCKER: `musicianspracticeapp-web-1` publishes *:8001→8000 + postgres:13 — demo user and real dev sessions live in the container db, NOT db.sqlite3. A bare `runserver 8001` binds IPv4 while Docker holds IPv6; localhost silently routes to the container. Port 8000 is the Music-library-indexer.
- Frontend dev against it: `DJANGO_API_URL=http://localhost:8001/api/v1 npm run dev`.
- Film assets in `frontend/next-app/public/landing/`: login-room.mp4 (1920×1080, 2.5MB), register-room.mp4 (1080×1920), empty-room.jpg, + posters. Raw masters + all candidates in Higgsfield account (danieladekugbe@gmail.com).

**DEPLOYED 2026-07-09 evening:** branch pushed, merged to main (5857667), CI green, Railway build live. Verified on prod (frontend-production-65a2.up.railway.app): /login and /register 200, all three film assets byte-exact, both videos confirmed PLAYING in a real browser session. Prod smoke could NOT run: no smoke account exists on prod (demo/Practice123! rejected) — the known "Railway smoke user" blocker. Provision it, then `BASE_URL=<prod> SMOKE_USER=... SMOKE_PASS=... npm run smoke`.

**Open / next:**
- Pre-existing launch blockers unchanged (Resend key rotation, password reset verify, Railway smoke user, auth rate limiting #45, R2 migration).
- Idea held in reserve: same film band on session detail / empty state.
