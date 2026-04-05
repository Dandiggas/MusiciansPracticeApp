# One-Click Resume — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Author:** Daniel + Claude

## Problem

Clicking "Resume" on a Launch Pad card takes the user to the session setup form with fields pre-filled. They still have to scroll through the form, review everything, and click "Start Session." This is friction that contradicts the zero-setup principle — if you're resuming the same project, you shouldn't have to look at a form at all.

## Solution

Resume starts a new session immediately and drops the user straight into the active workspace with their project loaded. One click, timer running, everything ready.

## Behaviour

1. User clicks **Resume** on a Launch Pad instrument card.
2. Dashboard calls `POST /api/v1/timer/start/` with the project's saved instrument, description, and YouTube URL.
3. On success, dashboard navigates to `/practice-timer?resume=1&instrument={instrument}`.
4. Practice timer page detects `resume=1`, sees the active session, and renders the **active session workspace** directly (skips setup form).
5. Project data loads from localStorage: song title, BPM, notes, media source, sheet music.
6. Workspace state on entry:
   - Timer running from 00:00:00
   - Sheet music viewer **auto-expanded** on the bookmarked page (if attached)
   - Metronome loaded at saved BPM, **not playing**
   - YouTube player / MP3 player loaded (if URL/file set)
   - Focus points area empty (fresh session)

## Edge Cases

- **Active session already exists:** If the user already has a session in progress (e.g. from a different instrument), the API returns 400. Dashboard should show an error: "A session is already in progress." The existing active session banner already links to the practice timer.
- **No saved project:** Resume button only appears on cards with a saved project. Cards without a project only show "New Session."
- **API failure (network, server down):** Show error on the dashboard, don't navigate. User can retry.
- **Sheet music was deleted since last session:** `getSheetMusic()` call fails, widget doesn't render. No error shown — just absent.

## Changes Required

### Dashboard (`dashboard/page.tsx`)

The Resume button currently does:
```
router.push(`/practice-timer?instrument=${instrument}`)
```

Change to:
1. Call `POST /api/v1/timer/start/` with `{ instrument, description, youtube_url }` from the saved project.
2. On 201 success, save a session snapshot to localStorage (matching existing `saveStoredSessionSnapshot` pattern), then navigate to `/practice-timer?resume=1&instrument={instrument}`.
3. On error, show the error message on the dashboard (don't navigate).

### Practice Timer (`practice-timer/page.tsx`)

When `resume=1` query param is present:
1. Skip the setup form rendering.
2. Detect the active session via `GET /api/v1/timer/active/` (existing flow already does this).
3. Load project data from localStorage (instrument, song title, BPM, media, sheet music).
4. Render the active session workspace immediately.
5. Sheet music widget starts **expanded** instead of collapsed (controlled by a prop or initial state based on the `resume` param).

### SheetMusicWidget

Add an `initialExpanded` prop (default `false`). When `true`, the widget starts expanded instead of collapsed. The practice timer passes `initialExpanded={isResumeSession}` when rendering the widget.

## Out of Scope

- Auto-starting the metronome
- Resuming a *paused* session from a previous day (resume always creates a new session)
- Changing the backend API (the existing `POST /timer/start/` endpoint already does everything we need)

## Testing

- **E2E:** Click Resume on a card with a saved project → verify timer is running, workspace is visible, setup form is not visible, sheet music is expanded
- **E2E:** Click Resume when a session is already active → verify error message appears on dashboard
- **Unit (backend):** Already covered by existing timer start tests
