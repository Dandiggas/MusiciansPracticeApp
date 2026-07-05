# MusiciansPracticeApp ("The Shed") — Agent Context

Django backend + Next.js frontend, deployed on Railway (prod). Real testers are active — prod breakage is user-visible. See CLAUDE.md for codebase detail; this file is the standing state all agents (Codex/Claude/Copilot) read first.

## The rules that matter most here
1. Dan finds bugs by *being a customer* (practising, then dictating the bug). Your job is that he never finds the SAME bug twice: every fix gets a regression test + sibling-path check (JSON vs multipart, every button on the touched screen).
2. **"Deployed" ≠ "done".** After any deploy, run the smoke flow and report its output: register → verify email → login → create session → add track → record → replay → delete. (This was specced in GitHub issue #34 and never built — building it is the standing top priority.)
3. Never remove or redirect an existing page/feature without listing it and asking. History: recommendations page, profile, and recording were silently deleted May 2026 and had to be rebuilt.
4. Branch/worktree hygiene: no direct merges of big unrelated diffs to main; say which branch you're on when work "disappears".

## Dev quickstart
- Test user: `demo` / `Practice123!` (verify still valid; if changed, update HERE).
- Backend: venv + `python manage.py runserver`; Frontend: `npm run dev`.
- Prod: Railway; admin access via Railway SSH (no admin page yet — building one beats deleting users over SSH).

## State
- `STATE.md` in this repo is the session handoff: update it at the end of every working session (shipped / open / issue refs). Read it before any "where are we at" repo pass.

## Prod smoke (issue #34 — BUILT 2026-07-04)
`cd frontend/next-app && npm run smoke` — real-stack flow: login → create session → add track → recorder mounts → delete session. Local default (demo/Practice123! on :3000/:8001).
Prod: `BASE_URL=https://<railway-app> SMOKE_USER=<smoke user> SMOKE_PASS=<pass> npm run smoke` (needs a pre-verified smoke account on prod — create once, keep creds in env, never in chat).
Rule 2 of this file: run this after EVERY deploy and report its output before saying "done".
