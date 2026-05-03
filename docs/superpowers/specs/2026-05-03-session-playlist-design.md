# Session as a Multi-Track Playlist — Design

**Date:** 2026-05-03
**Status:** design approved, awaiting implementation plan
**Related prior art:** existing `/practice-timer` page (1040-line god-component to be replaced) and `/youtube-practice` page (slow/loop logic to be salvaged).

## Problem

Today's `Session` is a single-song timer log: one row per practice run, one optional `youtube_url`, one duration. That doesn't match how a musician actually practises. In reality you're working on four or five things at once — songs from one player, licks pulled from different tunes, sheet music for one piece, an MP3 you bought of another. The current shape forces you to either start a new "session" for each song you switch to, or shove it all under a single misleading row.

The dashboard built on top of that model (total hours, weekly practice, current streak, calendar heatmap, instrument pie chart) is also not what the user is currently optimising for. They want a workbench, not a tracker.

## Goal

A session is a long-lived, named, themed container of tracks ("Kevin Bond", "Jazz Guys licks"). The user opens a session, sees the tracks they're working on, clicks one, and it reopens *exactly how they left it* — same source, same BPM, same playback speed, same saved licks. They can switch between tracks freely inside the session.

Time tracking and dashboard stats are explicitly parked for now. The user is optimising the practising experience for themselves first; aggregate metrics can come back later.

## User stories

**Primary — opening and using a session**
> As a musician, I open the app and see my list of sessions ("Kevin Bond", "Jazz Guys licks", etc.). I click into "Kevin Bond" and see the seven tracks I'm working on. I click "Praise on Demand" and the player loads with the source, BPM, last playback speed, and saved licks already applied. I practise. I click another track and it does the same.

**Building a session**
> As a musician starting a new session, I name it ("Kevin Bond"), then add tracks to it one at a time — picking a source type per track (YouTube link, MP3 upload, PDF, or image), giving it a name, optionally a BPM. I can drag tracks into the order I want to run through them.

**Capturing licks**
> As a musician working on a song, I scrub to a passage I want to isolate, click "Set In", scrub to the end, click "Set Out", click "Save Lick", give it a name ("intro run"). The lick joins the saved list for this track. Clicking it later jumps to the start, applies the speed I last left it at, and loops.

**Same song, different sessions**
> As a musician with one song that fits in two contexts, I add "Spain" to my Kevin Bond session at 90 BPM with one set of licks, and "Spain" to my Jazz Guys session at 70 BPM with different licks. Edits in one don't affect the other.

**Resuming**
> As a musician returning to the app the next day, I open the same session, click the same lick, and it's already at the speed I left it at. No re-configuration.

## Acceptance criteria

1. The home page (`/`) is the session list. It shows all the user's sessions with name and last-updated timestamp, sorted by `updated_at` descending. There's a "New Session" affordance.
2. Creating a session takes only a name. The new session opens immediately to its (empty) detail view.
3. The session detail page shows the session name (rename + delete in header) and a list of tracks. Adding a track requires: name, source type (`youtube` / `mp3` / `pdf` / `image`), and a source value (URL or file). BPM is optional at creation; editable any time.
4. Tracks within a session can be reordered by drag.
5. Clicking a track loads the appropriate player:
   - **YouTube**: embedded player with play/pause/seek/speed (snapped to YT-allowed values 0.25/0.5/0.75/1).
   - **MP3**: HTML5 `<audio>`-backed player with play/pause/seek/speed (continuous 0.25–1.25, pitch preserved by the browser).
   - **PDF**: rendered in-app via `react-pdf`, with page navigation.
   - **Image**: rendered as `<img>`.
6. Audio tracks (YouTube + MP3) display a Lick panel:
   - "Set In" / "Set Out" buttons capture `currentTime` into a draft region.
   - "Save Lick" persists the region with a name.
   - Saved licks list below; clicking a lick activates it (seeks to start, applies its `last_speed`, loops between in/out until deactivated or another lick is selected).
   - Edit (rename, retime via "Set In/Out at current") and delete supported.
   - Licks within a track can be reordered by drag.
7. Speed changes are debounced 500 ms, then PATCHed to `last_speed` on the active entity (lick if one is selected; otherwise the track).
8. Sheet-music tracks (PDF + image) display a `bpm` value if set, but no transport, no licks, no metronome auto-coupling.
9. Same song-as-track in two different sessions has fully independent BPM, speed, and licks. Mutations to one don't propagate.
10. Source on a track is fixed at creation. The UI does not offer a "swap source" action.
11. Deletes cascade: deleting a session removes its tracks and their licks; deleting a track removes its licks.
12. All resources are scoped per-user via `Session.user`. A user cannot read or mutate another user's data; cross-user access returns 404.
13. Auth tokens are stored in an `httpOnly` cookie set at login (replacing the current `localStorage` storage) so Next.js server components can authenticate their fetches.
14. The legacy `/practice-timer` page, `/youtube-practice` page, dashboard stats endpoints (`/stats/`, `/calendar/`, `/by-instrument/`), and the old `Session`/`Tag` models are removed from the active app. The intent of the parked features is captured in `docs/future/parked-features.md` for possible later reintegration. Existing user accounts are preserved; old practice data is dropped.

## Scope & non-goals

**In scope**
- Django: new `Session`, `Track`, `Lick` models; DRF `ModelViewSet` for each; reorder endpoints; per-user `get_queryset`; serializer-level cross-field validation; one-off migration that removes old models and data.
- File upload: MP3, PDF, image to Django's `media/` directory via standard `FileField` + multipart endpoints. Extension validation per `source_type` in the serializer.
- Frontend: new `/sessions` (list) and `/sessions/[id]` (detail) pages as **server components**; client `<SessionWorkbench>` orchestrator; one player component per source type sharing a `useTransport` interface; shared `useLickEngine` for loop logic; `<LickPanel>` UI; drag-to-reorder for tracks and licks.
- Auth: shift DRF token from `localStorage` to `httpOnly` cookie at login; small server-side helper to forward it on `fetch`.
- Removal of `/practice-timer`, `/youtube-practice`, `/dashboard` (becomes a redirect to `/sessions`), and the corresponding stats endpoints. Old `Session`/`Tag` models dropped via migration. Parked-features doc.
- Tests: pytest-django coverage for ViewSets (CRUD, user-scoping, validation, reorder); one `useLickEngine` hook test in vitest as a pattern seed.

**Out of scope (parked, not lost)**
- Time tracking / duration / streaks / heatmap / instrument breakdown / favourite-instrument stats — captured in `docs/future/parked-features.md` for future reintroduction.
- Tags, search, filtering, pagination.
- Sharing sessions / collaborative playlists.
- Soft-delete / undo.
- Source-swap on a track (e.g. YouTube → MP3 with licks preserved).
- Tap-tempo BPM detection. BPM is user-entered.
- Auto-coupling of sheet-music view to the existing metronome page.
- Drag handles on a scrub bar for lick boundaries (day-1 uses "Set In / Set Out" buttons).
- Server Actions for write paths. All writes go through a single client `lib/api.ts` wrapper for v1.
- Component-level frontend tests beyond the one `useLickEngine` seed test. No Playwright / E2E.
- Mobile-specific UI work beyond Tailwind defaults.
- File size limits / quota enforcement (acceptable for a personal-utility app; revisit if multi-user).

## Architecture

### Data model

```
Session
  id              PK
  user            FK -> auth user, on_delete=CASCADE
  name            CharField
  created_at, updated_at

Track   (belongs to one Session)
  id              PK
  session         FK -> Session, on_delete=CASCADE
  name            CharField
  source_type     CharField, choices = ('youtube', 'mp3', 'pdf', 'image')
  youtube_url     URLField, nullable+blank
  file            FileField, nullable+blank, upload_to='tracks/'
  bpm             PositiveSmallIntegerField, nullable, validator(30..300)
  last_speed      FloatField, nullable, validator(0.25..1.5)
  position        PositiveIntegerField, default=0
  created_at, updated_at

Lick    (belongs to one Track; serializer rejects on non-audio tracks)
  id              PK
  track           FK -> Track, on_delete=CASCADE
  name            CharField
  start_seconds   FloatField, validator(>= 0)
  end_seconds     FloatField, validator(> start_seconds)
  last_speed      FloatField, nullable, validator(0.25..1.5)
  position        PositiveIntegerField, default=0
  created_at, updated_at
```

Cross-field validation lives in serializer `validate()`:
- `source_type='youtube'` requires `youtube_url`, `file` must be empty.
- `source_type='mp3'` requires `file` with audio extension, `youtube_url` must be empty.
- `source_type='pdf'` requires `file` with `.pdf`, `youtube_url` must be empty.
- `source_type='image'` requires `file` with `.png`/`.jpg`/`.jpeg`/`.webp`, `youtube_url` must be empty.
- A `Lick` is rejected if its parent `Track.source_type` is `pdf` or `image`.
- `Lick.end_seconds > Lick.start_seconds`.

### API surface

```
GET    /api/v1/sessions/                       list { id, name, updated_at }[]
POST   /api/v1/sessions/                       create
GET    /api/v1/sessions/<id>/                  detail with tracks (each with licks) nested
PATCH  /api/v1/sessions/<id>/                  rename
DELETE /api/v1/sessions/<id>/                  cascades

POST   /api/v1/sessions/<id>/reorder-tracks/   { track_ids: [int] }
POST   /api/v1/tracks/                         create (multipart for file types)
PATCH  /api/v1/tracks/<id>/                    update name / bpm / last_speed
DELETE /api/v1/tracks/<id>/                    cascades

POST   /api/v1/tracks/<id>/reorder-licks/      { lick_ids: [int] }
POST   /api/v1/licks/                          create
PATCH  /api/v1/licks/<id>/                     update name / start / end / last_speed
DELETE /api/v1/licks/<id>/
```

Each ViewSet uses `permission_classes = [IsAuthenticated]` and a `get_queryset` that filters via the chain to `request.user`. Cross-user access returns 404.

The session detail endpoint deliberately denormalises (nested tracks → nested licks) so the workbench page is one round-trip. The list endpoint stays light.

Reorder endpoints accept the full ordered list of IDs and update `position` atomically.

### Frontend structure

```
app/
  layout.tsx                       (existing — auth gate; reads httpOnly cookie)
  page.tsx                         (redirects to /sessions if logged in)
  sessions/
    page.tsx                       SERVER — fetch sessions, render list
    [id]/page.tsx                  SERVER — fetch session+tracks+licks, render workbench
components/
  sessions/
    SessionList.tsx                (server)
    NewSessionButton.tsx           (client)
    SessionWorkbench.tsx           (client; only "selected track id" state)
    SessionHeader.tsx              (client; rename + delete)
    TrackList.tsx                  (client; drag-to-reorder, select)
    AddTrackForm.tsx               (client)
    TrackPane.tsx                  (client; switches on source_type)
    Mp3Player.tsx                  (client)
    YoutubePlayer.tsx              (client)
    SheetView.tsx                  (client)
    LickPanel.tsx                  (client; consumed by audio players)
hooks/
  useHtmlAudioTransport.ts         transport interface for MP3
  useYoutubeTransport.ts           transport interface for YouTube IFrame
  useLickEngine.ts                 transport-agnostic loop + active-lick logic
lib/
  api.ts                           client write helpers (createTrack, updateLick, ...)
  serverFetch.ts                   server-side fetch with auth-cookie forwarding
```

The `useTransport` shape:

```ts
interface Transport {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setSpeed(rate: number): void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}
```

Both `useHtmlAudioTransport` and `useYoutubeTransport` return this shape. `useLickEngine(transport, activeLick)` consumes it without caring which backend is in use. This is the composition pattern the design hangs on.

Reads run in server components; writes run client-side via `lib/api.ts`, then `router.refresh()` re-runs the server fetch. No global state library.

### Auth migration

DRF `Token` is currently kept in `localStorage`, which server components can't read on the first request. At login, the backend sets the token in an `httpOnly` cookie (`Secure`, `SameSite=Lax`). `lib/serverFetch.ts` reads the cookie via `next/headers` and adds `Authorization: Token <…>`. Client mutations read it via `document.cookie` is *not* available for `httpOnly` — so client writes also call a small `/api/auth/me` round-trip pattern, OR (simpler) the frontend sends writes through a thin Next.js Route Handler that forwards to Django with the cookie attached server-side. Implementation plan will pick the exact shape; the architectural commitment here is "server can authenticate, client doesn't hold the token in JS".

### Migration of legacy code

- Delete `app/practice-timer/page.tsx` and any helpers exclusive to it.
- Delete `app/youtube-practice/page.tsx`. Salvage its YT IFrame slow/loop logic into `useYoutubeTransport`.
- Delete `app/dashboard/page.tsx` (replaced by session list at `/sessions`); add a redirect from `/` and `/dashboard` to `/sessions`.
- Drop `Session` and `Tag` Django models, their views, urls, serializers, admin entries, throttles. Stats endpoints (`/stats/`, `/calendar/`, `/by-instrument/`, `/recommendations/`) removed.
- One Django migration: drop old tables; create new `session_v2_session`, `session_v2_track`, `session_v2_lick` (or replace within the existing `session` app — name decision in the plan). No data preserved from the old `Session` table.
- New file `docs/future/parked-features.md` records: the timer feature, the duration/streak/heatmap/instrument-breakdown stats, and the AI recommendations endpoint, with a one-paragraph note on each so the intent isn't lost.

## Error handling

- DRF serializer `validate()` raises field-keyed `ValidationError` for cross-field rules; the frontend renders these inline.
- `get_queryset` filters by user; cross-user access returns 404 (not 403, to avoid existence leakage).
- `lib/api.ts` catches 401 globally and redirects to `/login`.
- `<YoutubePlayer>` listens for IFrame error events (region block, removed video) and shows "this video can't be played" with disabled controls.
- `<Mp3Player>` listens for `<audio>`'s `onError` and shows "couldn't play this file".
- Network failure on a write surfaces as a toast; UI state rolls back to last-known-good (server-source).
- Optimistic updates for renames, reorders, and toggles. Creates wait for the server response (need the `id`).
- Empty states everywhere instead of spinners ("No sessions yet — create one"; "No tracks in this session — add one"; "No licks saved").

## Testing

- **Django (`pytest-django`)** — one test file per ViewSet:
  - `test_sessions.py`: create, list scoped to user, retrieve nested includes tracks+licks, rename, delete cascades, cross-user access returns 404.
  - `test_tracks.py`: create per source_type with valid/invalid combinations, file extension validation, BPM range validation, reorder, cascade-deletes-licks.
  - `test_licks.py`: create rejected on sheet tracks, end-after-start validation, speed range validation, reorder, cross-user access returns 404.
- **Frontend (`vitest`)** — one seed test for `useLickEngine` using a fake transport: starting a lick triggers `seek(start)` and applies `setSpeed(lick.last_speed)`; advancing `currentTime` past `end` triggers `seek(start)` again. Pattern only; not aiming for component coverage.
- No Playwright / E2E for v1.

## Open questions

None at design time. Implementation-plan-time decisions deferred:

- Exact shape of the auth-cookie + write-path bridge (Next Route Handler vs `/api/auth/me` round-trip).
- Whether to extend the existing `session` Django app in place or create a new `practice` app and retire the old one. (Affects table names + import paths but not the model shape.)
- Drag library choice (`@dnd-kit` vs `react-aria` vs simple HTML5 drag). Plan picks one.
