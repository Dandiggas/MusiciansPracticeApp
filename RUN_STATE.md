# RUN_STATE — prod smoke script (issue #34)

GOAL: Playwright smoke exercising the deployed app end-to-end so Dan stops being the regression suite.

DONE:
- Cron pack installed in Hermes (morning brief 08:15, dojo auto-review 13:00 conditional, weekly gig invoices Mon 09:00, hermes self-update Sun 20:00 no-agent; ALR + Market Intel delivery fixed origin→telegram; 09:00 dojo job slimmed to nudge-only, no skill load).
- Design taste pass committed on design/taste-pass (4 commits, tests green, NOT pushed).
- Local env: Django via docker compose on :8001 (indexer owns :8000; override file in session scratchpad), frontend :3000 with NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1, user demo/Practice123! verified.

DONE: smoke.spec.ts + playwright.smoke.config.ts + npm run smoke — PASSING locally (3.3s). NEXT: create pre-verified smoke user on Railway prod, then wire BASE_URL prod run into deploy flow.
DESIGN:
- BASE_URL env (default http://localhost:3000). SMOKE_USER/SMOKE_PASS env (default demo/Practice123!).
- Flow: login → create session (timestamped name) → open it → add YouTube track w/ BPM → verify track renders → save track → delete session (cleanup) → assert gone.
- Skip register/email-verify in the spec (needs backend hooks); prod runs use the pre-verified smoke user. Recording/replay skipped headless (no devices) — assert the recorder UI mounts instead.
- Add npm script "smoke": "playwright test e2e/smoke.spec.ts". Playwright + @playwright/test already in devDeps; check for existing playwright.config.
- After green locally: document prod invocation BASE_URL=https://<railway-url> SMOKE_USER=... in AGENTS.md; wire into deploy flow later (issue #34).

FINDINGS: playwright.config existence unchecked; YouTube embed doesn't play headless (don't assert playback, assert player container).
