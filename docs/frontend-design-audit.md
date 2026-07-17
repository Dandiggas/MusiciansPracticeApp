# The Shed — Design Audit (2026-07-04, branch design/taste-pass)

Baseline vs .impeccable.md ("warm-dark studio, bold editorial headings, restrained teal accents, workbench not dashboard") + design-taste-frontend (variance 8, motion 6, density 4).

**First impression (session detail):** communicates "capable but shouting". Eye goes to: 9 bright-teal filled buttons competing, then the red Delete pair, then the black void of the player. One word: **noisy**. The bones (layout zones, editorial headline on /sessions) are right; the surface is fighting itself.

**Design score baseline: C+ / AI-slop score: B-** (no purple gradients, real typeface (Geist), but: icon-in-colored-circle bullets on login, uniform card stacks, uniform radius, badge pills, zero motion).

## Findings (impact order)

- **F1 (high, color):** Accent anarchy — ~9 saturated-teal filled controls visible at once on session detail (Save, Save Track, Metronome, Start Click, Save Lick, Record, Video+audio, 4/4, speed dots). Brief demands ONE restrained accent. Fix: one filled primary per zone; everything else ghost/outline/text; desaturate primary.
- **F2 (high, color):** Destructive controls loud — filled/red Delete, Delete Session, Stop visible in resting state. Fix: text/ghost destructive until hover/confirm.
- **F3 (high, typography):** All-caps letterspaced micro-labels on EVERY zone AND field (SESSION, TRACK NAME, BPM, IN POINT…) — hierarchy flattened, everything shouts the same. Fix: eyebrows for top-level zones only; field labels sentence case.
- **F4 (med, layout):** Box-in-box-in-box nesting (track editor > source box > inputs; licks > point boxes). Fix: inner boxes → borderless groups with dividers/spacing.
- **F5 (med, layout):** /sessions is a stack of 3 identical near-empty cards (name + "Updated 4 Jul 2026" + OPEN pill ×3). Brief anti-pattern ("App UI made of stacked cards"). Fix: divided list rows with real metadata (track count, songs preview, relative time), no OPEN pill.
- **F6 (med, nav):** Brand "The Shed" AND nav item "The Shed" duplicate; no clear active state. Fix: nav item → "Sessions", visible active indicator.
- **F7 (polish, content):** Zero-count noise ("0 LICKS" on every track), absolute dates ("Updated 4 Jul 2026") — relative time, hide zero counts.
- **F8 (med, states):** Sessions empty state is a cold dashed box with no action inside; the create control lives elsewhere. Fix: CTA inside empty state.
- **F9 (polish, login):** Icon-in-colored-circle feature bullets (AI-slop #3) in two hues; nested card-in-card "New here?". Fix: strip circles, single hue, flatten.
- **F10 (med, motion):** Zero micro-motion anywhere (framer-motion installed, unused on these screens). Fix: press states (scale .98), hover transitions, staggered list entry, metronome pulse. Respect prefers-reduced-motion (already global).
- **ENV (not design):** YouTube embed shows raw red "could not be played" in headless; error styling bare. Backend: local dev needed migrations + port fix (indexer owns :8000 → Django on :8001 override).

## Fix order
F1 → F2 → F3 → F6 → F5 → F7 → F8 → F9 → F10 → F4 (only if low-risk)
One commit per fix: `style(design): FINDING — description`. CSS/class-level first, no feature changes, no test edits.

## Results (same day)
- SHIPPED: F1a (711d2bf warm-dark tokens), F1b+F2 (6f27b12 variant discipline), F5+F6+F8 (cd40365 list/nav/empty), F9 (ab83c0c login hues). All 36 component tests pass; tsc clean for touched files (pre-existing test-file errors unrelated).
- Score movement (self-assessed): C+ → B+. AI-slop: B- → A- (uniform card stack gone, single accent, real active states).
- DEFERRED: F3 (all-caps label hierarchy, ~32 sites), F4 (box-in-box de-nesting), F7 (zero-count noise, "0 LICKS"), F10 (motion pass: metronome pulse, list stagger on workbench), TakeRecorder.tsx has hardcoded light-theme slate styling (used outside session workbench — separate fix), YouTube embed error styling.

## Round 2 (2026-07-05, taste-skill install)
- SHIPPED: F3 (c7dcbcd — sentence-case field labels across sessions/studio/auth, eyebrows kept for zone titles only, admin/chart data-labels left as convention), F7 (same commit — zero licks/takes hidden, relative session dates, mono time/speed readouts), F4 partial (lick in/out boxes de-nested), F10 (8eec6c5 — rise-in stagger on sessions list behind prefers-reduced-motion; skipped on dnd-kit sortable rows to avoid transform conflicts; contained transport error), theme fix (ee9e087 — TakeRecorder + StatsCard hardcoded light slate → semantic tokens). Em-dash removed from empty-state copy.
- VERIFIED: 68/68 jest, smoke green (2.9s), dark + light screenshots in round2/.
- SCORE (self-assessed): B+ → A-. Remaining polish candidates: metronome start pulse-on-beat for the widget body, MP3/YouTube player hero art, landing page (does not exist yet — separate piece of work).
- ENV notes for next run: indexer owns :8000 → Django via `docker compose -f docker-compose.yml -f <override> up -d` on 8001; frontend needs NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1; demo/Practice123! user exists with verified email; local DB migrated (dedup fix applied to dandiggasmusic email).
