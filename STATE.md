# STATE — MusiciansPracticeApp (The Shed)

Session handoff file (per AGENTS.md). Newest entry first.

## 2026-07-09 — Cinematic film language across auth + sessions (branch `login-session-video`, NOT pushed)

**Shipped (local commits):**
- `8a1494e` — Login split-screen: left 42vw is a looping live-session clip (Higgsfield Seedance Mini from Dan's reference stills; 431KB, muted, faststart) with amber "● Live from the shed" caption + headline on the film. Form keeps its solid card. Mobile unchanged (form first, no video). Reduced-motion → poster.
- `aa37791` — Register split-screen with the brighter overhead-jam clip (803KB): badge/headline/copy on the film, all three feature cards preserved beside the form. Sessions header wrapped in new `SessionsHero` client component — login film reused (browser-cached) under 75% scrim so the working surface stays quiet.

**Evidence:** 69/69 jest both commits; tsc errors are pre-existing test-file issues only (route.test NODE_ENV, useYoutubeTransport.test); verified live — Django on :8001 + Next on :3117, demo login through the UI, all three videos confirmed playing (paused:false, currentTime advancing), screenshots at 1440/390.

**Local dev notes:**
- Port 8000 is occupied by Music-library-indexer → run this backend on `:8001` and start frontend with `DJANGO_API_URL=http://localhost:8001/api/v1`.
- Local db.sqlite3 demo user recreated (demo / Practice123! per AGENTS.md), verified email, 2 seed sessions.
- New assets in `frontend/next-app/public/landing/`: login-room.mp4/-poster.jpg (clip A, dark live-set), register-room.mp4/-poster.jpg (clip B, overhead jam). Raw 720p candidates in Higgsfield account (danieladekugbe@gmail.com, 186 credits left).

**Open / next:**
- Push + deploy is Dan's call (branch not pushed). After deploy: run `npm run smoke` per AGENTS.md rule 2.
- Pre-existing launch blockers unchanged (Resend key rotation, password reset verify, Railway smoke user, auth rate limiting #45, R2 migration).
- Idea held in reserve: same film band on session detail / empty state.
