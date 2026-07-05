# RUN_STATE — design overhaul rounds 2+3 COMPLETE (taste-skill, branch design/taste-pass)

GOAL: Finish the deferred design-audit findings with the newly installed design-taste-frontend skill. DONE 2026-07-05.

SHIPPED (3 commits on design/taste-pass, NOT pushed — total now 7 style commits + smoke):
- c7dcbcd F3+F7: sentence-case field labels across 12 files, eyebrows only on zone titles, zero-count noise hidden, relative dates, mono readouts, lick in/out de-nested (F4 subset)
- 8eec6c5 F10: rise-in stagger on sessions list (prefers-reduced-motion gated), contained transport/YouTube error, em-dash out of UI copy
- ee9e087 theme: TakeRecorder + StatsCard hardcoded light slate → semantic tokens (dark-mode bug)

ROUND 3 (same day, Dan picked all three showcase targets):
- 1f212c4 feat(landing): logged-out landing at / — record-sleeve dark page, asymmetric hero with layered real app screenshots (public/landing/), licks band, continuity split, divided tools rows, manifesto close; framer-motion + useReducedMotion; logged-in still redirects /sessions; Header hides on /
- 6fa14bf display moments: metronome BPM pulse-on-beat (reduced-motion gated), editorial page h1s (sessions/account/standalone/empty state); .impeccable.md amendment recorded (display moments may push past calm)
- a62c51e auth glow-up: login 'Pick up where you left off.' + product-shot collage (icon bullets gone), register font-black + single accent hue
- Screenshots: .design-audit/round2/landing-*.png, login-glowup.png, register-glowup.png (desktop + mobile verified)

VERIFIED: tsc clean for touched files (7 pre-existing test-file errors remain), 68/68 jest, npm run smoke green 2.9s, dark + light screenshots at frontend/next-app/.design-audit/round2/.

VAULT: The Shed Wiki + TODOs + LLM Wiki Log updated 2026-07-05.

NEXT (Dan's queue):
1. Review design/taste-pass and push (7 style commits ready)
2. Railway pre-verified smoke user (issue #34) → wire smoke into deploy flow
3. Auth rate limiting #45 stays top security risk
4. Polish candidates: metronome pulse-on-beat, player hero art, landing page (doesn't exist)

ENV: Django on :8001 via compose override (indexer owns :8000), frontend :3000 with NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1, demo/Practice123!.
