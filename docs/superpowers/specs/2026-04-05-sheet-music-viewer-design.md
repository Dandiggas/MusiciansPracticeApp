# Sheet Music PDF Viewer — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Author:** Daniel + Claude

## Problem

The Shed covers musicians who learn by ear (YouTube, MP3) but not musicians who read sheet music. A guitarist following a lead sheet or a pianist working through a method book has no way to load their PDF into the practice session. They have to alt-tab to a separate PDF reader, losing the integrated workspace experience.

## Solution

Add PDF sheet music as a first-class media type in The Shed — uploadable, persistable per instrument project, viewable in-session alongside audio/video, and browsable in a standalone library page.

## Design Principles

- **Zero friction on return.** Upload once during project setup. Every subsequent session auto-loads the PDF on the bookmarked page. No re-uploading, no re-finding files.
- **Non-clunky.** The viewer is a natural part of the workspace, not a bolted-on panel. Collapsed when not needed, expanded when it is.
- **Launch Pad is for launching.** The card shows what's loaded (read-only summary). All editing happens in the session setup form.

## Data Model

### SheetMusic

New model in the `session` app.

| Field | Type | Notes |
|-------|------|-------|
| `id` | AutoField | PK |
| `user` | FK → CustomUser | Owner |
| `title` | CharField(200) | User-provided, e.g. "All of Me - Lead Sheet" |
| `file` | FileField | PDF stored in `media/sheet_music/{user_id}/` |
| `file_size` | PositiveIntegerField | Bytes, enforced ≤ 20MB on upload |
| `page_count` | PositiveSmallIntegerField | Extracted from PDF on upload |
| `file_hash` | CharField(64) | SHA256 of file content, for dedup |
| `last_page_viewed` | PositiveSmallIntegerField | Bookmark, default=1 |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

**Constraints:**
- `unique_together: (user, title)` — no duplicate titles per user
- `unique_together: (user, file_hash)` — no duplicate file content per user

### Launch Pad Project Reference

The existing Launch Pad project data (currently localStorage, future backend model) gains a `sheet_music_id` field that references a `SheetMusic` record. Multiple projects can reference the same sheet music (many-to-one).

## API

All endpoints under `/api/v1/sheet-music/`. All require authentication. All scoped to the requesting user.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List user's sheet music (id, title, page_count, file_size, last_page_viewed, created_at) |
| `POST` | `/` | Upload new PDF (multipart form: title + file). Returns created record. |
| `GET` | `/<id>/` | Get metadata + file URL |
| `PATCH` | `/<id>/` | Update title or last_page_viewed (bookmark) |
| `DELETE` | `/<id>/` | Delete file from storage + record from DB |

### Upload Validation

On `POST /`:
1. **File type:** Must be `application/pdf`. Reject anything else.
2. **File size:** Must be ≤ 20MB (20,971,520 bytes).
3. **Page count:** Extract via `PyPDF2` or `pikepdf`. Must be ≤ 50 pages.
4. **Content hash:** Compute SHA256. Reject if `(user, file_hash)` already exists — return the existing record's ID so the frontend can link to it instead.
5. **Storage quota:** Sum the user's existing `file_size` values. Reject if adding this file exceeds 200MB total.

### Rate Limiting

Apply a throttle of 10 uploads per hour per user on the `POST` endpoint. Reuse the existing DRF throttling pattern from the recommendations endpoint.

## File Storage

- **Development:** Django's default `FileSystemStorage`, files at `MEDIA_ROOT/sheet_music/{user_id}/`
- **Production:** Same `FileSystemStorage`, backed by a Railway persistent volume mounted at `MEDIA_ROOT`. Survives redeploys, no external services needed.
- **File naming:** `{user_id}/{uuid4}.pdf` to avoid collisions and hide original filenames in storage.
- **Serving:** Django serves files directly in development. In production, WhiteNoise handles static files but not media — add a simple view that checks auth and streams the file, or configure nginx. For MVP, Django can serve media directly behind auth since traffic is low.

## UI: In-Session Widget

### Component: `SheetMusicWidget`

New component at `frontend/next-app/src/components/studio/SheetMusicWidget.tsx`.

### Placement

Full-width collapsible row in the active session workspace, positioned between the media+metronome row and the tools row (recorder, tuner, performance).

```
┌─────────────────────────────────────────────┐
│ STATUS BAR · Timer · Pause / Stop           │
├──────────────────────────┬──────────────────┤
│ PRACTICE MEDIA           │ METRONOME        │
│ (YouTube / MP3)          │                  │
├──────────────────────────┴──────────────────┤
│ ♩ SHEET MUSIC VIEWER (collapsible)          │  ← NEW
├──────────────┬───────────────┬──────────────┤
│ RECORDER     │ TUNER         │ PERFORMANCE  │
├──────────────┴───────────────┴──────────────┤
│ FOCUS POINTS                                │
└─────────────────────────────────────────────┘
```

### States

**No sheet music attached to this project:**
- Widget does not render. No empty state, no upload prompts. The workspace stays clean.

**Collapsed (default on session start):**
- Slim card bar showing: music note icon, title, bookmarked page ("Page 3 of 8"), expand chevron.
- Single click or keyboard shortcut to expand.

**Expanded:**
- Header bar: title, zoom controls (−/+, percentage), page nav (◀ 3/8 ▶), bookmark star, collapse chevron.
- Content area: PDF page rendered on a white surface against the dark workspace background.
- PDF rendered via `react-pdf` (uses PDF.js under the hood). One page at a time, fit-to-width by default.
- Keyboard: left/right arrows for page nav when the widget is focused.
- Bookmark: auto-saves `last_page_viewed` via `PATCH` on every page turn (debounced 1s).

## UI: Standalone Page

### Route: `/sheet-music`

New page at `frontend/next-app/src/app/sheet-music/page.tsx`.

### Library View

- **Header:** "Your Library" title, search input (filters by title client-side), "Upload PDF" button.
- **Storage bar:** Shows usage vs 200MB quota with a progress bar.
- **Card grid:** 3 columns on desktop, 2 on tablet, 1 on mobile. Each card shows:
  - Mini preview: render the first page of the PDF via `react-pdf` as a thumbnail. If rendering fails or is too slow, fall back to a generic music note icon on a white card.
  - Title, page count, file size, bookmark status
  - Instrument tags showing which Launch Pad projects reference this sheet

### Viewer View

Clicking a card navigates to `/sheet-music/[id]` — the full PDF viewer using the same `SheetMusicWidget` component, rendered standalone with additional controls:
- Edit title (inline rename)
- Delete (with confirmation)
- Back to library button

## UI: Launch Pad Integration

### Card Display (Read-Only)

The Launch Pad instrument project card shows a summary of the current project state:
- **Song title** (always, if set)
- **Media reference:** YouTube URL if using YouTube, MP3 filename if using audio
- **Sheet music:** Title + bookmarked page (e.g. "All of Me - Lead Sheet · p.3"), if attached
- **BPM** if set

No action buttons on the card. No upload prompts. Just information and "Start Practicing."

### Session Setup Form

The `SessionSetupForm` component gains a "Sheet Music" field:
- If a sheet is attached to this project: shows the title with an option to detach (X) or swap.
- If none attached: shows "Upload New" and "From Library" buttons.
  - "Upload New" opens a file picker, uploads via the API, and links the returned ID to the project.
  - "From Library" opens a modal showing the user's sheet music library as a selectable grid. Pick one, it links to the project.

### Auto-Load on Session Start

When a practice session starts from a Launch Pad project that has a `sheet_music_id`:
1. Fetch the sheet music metadata (including `last_page_viewed`).
2. Pass it to the `SheetMusicWidget` in the active session workspace.
3. Widget starts collapsed, showing title and bookmark. User expands when ready.

## Out of Scope (v1)

- **Annotations/markup** on the PDF (highlights, fingerings, notes)
- **Multi-PDF per project** (one sheet per project for now)
- **Image file support** (PNG/JPG sheet music scans — PDF only)
- **OCR or music recognition** (OMR)
- **Sharing** sheet music between users
- **iPad/tablet optimized** layout
- **Offline/PWA** caching of PDFs

## Dependencies

### Backend
- `pikepdf` or `PyPDF2` — PDF page count extraction + validation
- `hashlib` (stdlib) — SHA256 content hashing

### Frontend
- `react-pdf` — PDF rendering via PDF.js
- `lucide-react` — icons (FileText, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Star, etc.)

## Testing Strategy

### Backend
- Model tests: creation, constraints (duplicate title, duplicate hash, storage quota)
- API tests: upload (valid PDF, oversized, wrong type, quota exceeded, rate limit), list, get, patch bookmark, delete
- File cleanup: verify S3/storage deletion on record delete

### Frontend
- `SheetMusicWidget`: collapsed/expanded toggle, page navigation, bookmark save
- `/sheet-music` page: library grid rendering, search filter, upload flow
- Session setup form: attach from library, upload new, detach
- Launch Pad card: displays sheet music info when attached, omits when not
- E2E (Playwright): upload a PDF, attach to project, start session, verify viewer loads on bookmarked page
