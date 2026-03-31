# TODOS

Deferred items from Launch Pad implementation (2026-03-30).

## Backend sync for per-instrument projects

**What:** Sync `practice:projects` localStorage data to the Django backend so project state persists across devices and browser clears.

**Why:** Currently all per-instrument project data (song title, YouTube URL, BPM, notes) lives only in localStorage. If the user clears browser data, switches devices, or uses a different browser, all Launch Pad state vanishes.

**Context:** Design doc says "start local, sync later." The `InstrumentProject` shape doesn't match the backend session model, so a new API endpoint or model extension is needed. Consider whether to sync the whole project object or just the fields that matter for continuity (songTitle, youtubeUrl, bpm, notes).

## User-configurable instrument list

**What:** Allow users to add/remove instruments beyond the hardcoded Guitar, Bass, Drums, Keys.

**Why:** Multi-instrumentalists may play instruments not in the default list (violin, saxophone, voice, etc.). The current dropdown limits them to 4 options.

**Context:** The `INSTRUMENTS` constant and `InstrumentName` type in `practice-session-store.ts` would need to become dynamic. The Launch Pad grid layout (4-col) would need to adapt to variable counts. Start simple: let users add instruments, cap at 8 to keep the grid clean.

## Dashboard (Launch Pad) test suite

**What:** Add tests for `frontend/next-app/src/app/dashboard/page.tsx`.

**Why:** The Launch Pad screen has no test coverage. It renders instrument cards, fetches stats, shows active session banners, and handles navigation, all untested.

**Context:** Would need mocks for axios (stats + active session endpoints), localStorage (projects), and next/navigation (router). Follow the pattern in `practice-timer/__tests__/page.test.tsx`.

## PWA / mobile optimization

**What:** Make the app installable as a Progressive Web App with home screen shortcut.

**Why:** The target user (busy parent musician) would benefit from tapping a home screen icon instead of opening a browser and navigating to the URL. This is Approach C from the design doc.

**Context:** PWA audio APIs are flaky on iOS (particularly getUserMedia for the tuner). Test thoroughly on iPhone Safari before shipping. The YouTube embed may also behave differently in a PWA context.

## Migration edge case: non-matching instruments

**What:** `migrateFromLegacySetup()` silently deletes legacy data when the stored instrument doesn't match one of the 4 hardcoded names.

**Why:** If a user had "Piano" or "Violin" as their instrument before the Launch Pad update, the migration function can't map it to a Launch Pad card and deletes the legacy setup data without preserving it.

**Context:** This is a one-time migration that runs on first dashboard load. The damage (if any) is already done for existing users. Fix this if/when adding user-configurable instruments, by preserving unmatched legacy data and mapping it to the new instrument once it's added.
