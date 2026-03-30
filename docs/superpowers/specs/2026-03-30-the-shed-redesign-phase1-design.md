# The Shed Redesign -- Phase 1: Design System + Core Loop

**Date:** 2026-03-30
**Branch:** practice-session-grid
**Status:** APPROVED
**Scope:** Design system foundation + Home Hub + Practice Studio

## Problem

The app has working Launch Pad functionality (per-instrument project persistence, session continuity) but uses a generic light-theme design. The user has a complete dark-theme design system ("The Shed") with mockups for 5 screens. Phase 1 applies The Shed design to the two core screens (Home Hub and Practice Studio) that make up the daily practice loop.

## Approach

Incremental: build the design system as a Tailwind theme, reskin the Home Hub and Practice Studio with The Shed design language, keep all existing functionality working. Analytics, AI Tutor, and Settings screens come in later phases.

---

## 1. Design System (Tailwind Theme)

### Color Tokens

Added to `tailwind.config.ts` as custom colors. Both dark and light mode variants.

**Dark mode (default):**

| Token | Hex | Use |
|-------|-----|-----|
| surface | #060e20 | App background |
| surface-container-low | #091328 | Sidebar, secondary areas |
| surface-container-high | #141f38 | Cards, elevated components |
| surface-bright | #1f2b49 | Hover states, focused inputs |
| surface-container-highest | #192540 | Nested elevated elements |
| surface-container-lowest | #000000 | Recessed wells (input backgrounds) |
| primary | #ba9eff | Primary accent (Electric Violet) |
| primary-dim | #8455ef | Gradient end, secondary violet |
| primary-inverse | #6e3bd7 | Tinted shadows |
| tertiary | #9bffce | Status/precision (Emerald Green) |
| tertiary-dim | #58e7ab | Secondary green |
| on-surface | #dee5ff | Primary text (never pure white) |
| on-surface-variant | #a3aac4 | Secondary text |
| outline | #6d758c | Ghost borders at 15% opacity |
| error | #ff6e84 | Error states |

**Light mode:**

| Token | Hex | Use |
|-------|-----|-----|
| surface | #f7f9fb | App background |
| surface-container-low | #eef1f5 | Secondary areas |
| surface-container-high | #ffffff | Cards |
| surface-bright | #e8ecf2 | Hover states |
| on-surface | #1a1d23 | Primary text |
| on-surface-variant | #5a6072 | Secondary text |
| Same violet/green accents | Same | Accents stay consistent |

### Typography

- **Font:** Plus Jakarta Sans (Google Fonts, all weights 300-800)
- **Display:** text-5xl to text-7xl, font-black, tracking-tight, -2% kerning for timers
- **Headline:** text-3xl to text-4xl, font-extrabold, editorial section headers
- **Title:** text-lg to text-xl, font-bold, component headers ("Metronome", "Tuner")
- **Body:** text-sm to text-base, font-normal, on-surface-variant for secondary
- **Label:** text-xs, uppercase, tracking-[0.05em], font-semibold for metadata (BPM, TIME SIG)

### Component Rules

- **No 1px borders.** Depth via tonal surface layering only.
- **Ghost borders** only when accessibility requires: outline token at 15% opacity.
- **Cards:** surface-container-high background on surface. rounded-xl (0.75rem). No divider lines between items.
- **Inputs:** surface-container-lowest background, ghost border, primary glow on focus.
- **Primary buttons:** gradient from primary to primary-dim at 135deg. rounded-lg. on-primary text.
- **Secondary buttons:** surface-bright background. on-surface text. No border.
- **Glassmorphism:** for floating elements. Semi-transparent surface-container + backdrop-blur-xl.

### Dark/Light Toggle

- Uses Tailwind `darkMode: "class"` (already in mockup HTML configs).
- Dark is the default. Toggle via existing theme button in nav.
- All color tokens defined as CSS custom properties, swapped on `html.dark`.

### Global Layout

- App name: **The Shed** (replaces "Practice Tracker")
- Nav: "The Shed" logo | The Shed | Studio | AI Tutor | Analytics | (theme toggle) | (user avatar)
- Background: surface token, full bleed

---

## 2. Home Hub (Launch Pad Redesign)

Replaces `frontend/next-app/src/app/dashboard/page.tsx`.

### Layout

```
+---------------------------------------------------------------+
| The Shed  | The Shed  Studio  AI Tutor  Analytics    (O) (@)  |
+---------------------------------------------------------------+
|                                                               |
|  WELCOME BACK, MAESTRO            +-------------------------+ |
|                                   | CURRENT STREAK          | |
|  Practice makes                   |   12 Days               | |
|  permanent, but                   | Weekly Goal   ====85%   | |
|  *perfect* practice               +-------------------------+ |
|  makes perfect.                                               |
|                                                               |
|  [> Resume Previous Session]  [+ New Session]                 |
|                                                               |
+---------------------------------------------------------------+
|                                                               |
|  YOUR INSTRUMENTS                                             |
|                                                               |
|  +----------+ +----------+ +----------+ +----------+         |
|  | Guitar   | | Bass     | | Drums    | | Keys     |         |
|  | All The  | | Tap to   | | Tap to   | | Tap to   |         |
|  | Things.. | | start    | | start    | | start    |         |
|  | TODAY    | |          | |          | |          |         |
|  | Resume > | | Start >  | | Start >  | | Start >  |         |
|  +----------+ +----------+ +----------+ +----------+         |
|                                                               |
+---------------------------------------------------------------+
|                                      +----------------------+ |
|  0.5h total | 3 day streak |         | AI INSIGHT           | |
|  Favorite: Guitar                    | "Focus on bridge..." | |
|                                      +----------------------+ |
+---------------------------------------------------------------+
```

### Behavior

- Greeting: "WELCOME BACK, MAESTRO" (label style, uppercase, tracked)
- Editorial headline with "perfect" in italic + primary color
- "Resume Previous Session" (primary gradient button) loads most recent instrument's project
- "New Session" (secondary button) goes to `/practice-timer` with no instrument param
- **4 instrument cards** styled as surface-container-high on surface. Each shows:
  - Instrument name (title weight)
  - Song title (if set)
  - Description (secondary text, line-clamp-1)
  - Last practiced relative date (label style)
  - "Resume" or "Start" link in primary color
  - Most recent card gets a subtle primary ring
- Streak widget: surface-container-high card, top-right. Days count in display type. Weekly goal as emerald green progress bar.
- AI Insight card: pulls from existing recommendations API. Shows one coaching tip.
- Stats row: total hours, streak, favorite instrument (label style)
- Loading state: 4 skeleton cards with surface-container-high pulse animation
- First-time: "Your Practice Room" headline, "Pick an instrument to get started"

### Data sources

- Instrument cards: `getAllProjects()` from localStorage (existing)
- Stats: `/api/v1/stats/` (existing)
- Active session: `/api/v1/timer/active/` (existing)
- AI Insight: `/api/v1/recommendations/` (existing, but optional, graceful fallback if empty)
- Streak widget: from stats API (current_streak, week_hours)

---

## 3. Practice Studio (Practice Timer Redesign)

Replaces `frontend/next-app/src/app/practice-timer/page.tsx`.

### Layout -- Setup Mode (before session starts)

Compact setup form in The Shed style. Dark surface background.

```
+---------------------------------------------------------------+
| The Shed  | ... nav ...                    SESSION: READY      |
+---------------------------------------------------------------+
|                                                               |
|  +---------------------------+  +---------------------------+ |
|  | SESSION SETUP             |  | SESSION CLOCK             | |
|  |                           |  |                           | |
|  | Instrument: [Guitar    v] |  |    00:00:00               | |
|  | Song Title: [___________] |  |                           | |
|  | Description: [__________] |  | State: Ready to start     | |
|  | Notes: [________________] |  |                           | |
|  |                           |  +---------------------------+ |
|  | PRACTICE SOURCE           |                                |
|  | [YouTube URL: _________]  |                                |
|  | [MP3 Upload]              |                                |
|  |                           |                                |
|  | [>>> Start Session]       |                                |
|  +---------------------------+                                |
+---------------------------------------------------------------+
```

### Layout -- Active Session (workspace)

Matches `the_shed_practice_studio` mockup closely.

```
+---------------------------------------------------------------+
| The Shed  | ... nav ...               SESSION ACTIVE  09:42:15|
+---------------------------------------------------------------+
|                                                               |
|  +----------------------------------+  +--------------------+ |
|  | PRACTICE MEDIA                   |  | METRONOME          | |
|  |  [YouTube Player / Audio Player] |  |       120          | |
|  |  Guitar | All The Things You Are |  |    BPM             | |
|  |  [Use YouTube] [Use MP3]        |  |  o o O o           | |
|  |                                  |  |  4/4    DOWNBEATS  | |
|  |  Playback Speed: 0.85x          |  |  [START CLICK]     | |
|  |  [A-B Loop: Set A | Set B]      |  +--------------------+ |
|  +----------------------------------+                         |
|                                                               |
|  +------------------+ +------------------+ +-----------------+|
|  | RECORDING CENTER | | PRECISION TUNER  | | SESSION         ||
|  |   00:00:00       | |       E          | | PERFORMANCE     ||
|  |   Ready to       | |    +3 CENTS      | | Accuracy  --    ||
|  |   capture        | |   [===|====]     | | Active   09:42  ||
|  | [Start Capture]  | |                  | | Reps      --    ||
|  +------------------+ +------------------+ +-----------------+|
|                                                               |
|  +-----------------------------------------------------------+|
|  | FOCUS POINTS                                               ||
|  | What are you focusing on this session?                     ||
|  | [Focus on bridge bars 17-24, work on voice leading...]     ||
|  +-----------------------------------------------------------+|
+---------------------------------------------------------------+
```

### Behavior

- **Top bar:** session status indicator. When active, shows elapsed time in primary color top-right.
- **Practice Media:** YouTube player OR audio player based on media source. Song title and instrument shown as labels above player. Playback speed control. A-B loop controls. All existing functionality preserved.
- **Metronome:** Large BPM display (display type). Beat indicator dots. Time signature buttons. Start/Stop button. Emerald green accent for active beat. All existing functionality.
- **Recording Center:** Maps to existing TakeRecorder component. Timer display. Start/Stop capture button.
- **Precision Tuner:** Maps to existing tuner. Large note display. Cents gauge. Emerald green when in tune, primary when out. Collapsible.
- **Session Performance:** STUBBED. Shows Accuracy (--), Active Time (from timer), Repetitions (--). UI present, data placeholder. Will be wired to backend in later phase.
- **Focus Points:** Maps to existing `notes` textarea. Persists to project store via saveProject().

### Existing components reused

- `YouTubePlayer` + `PlaybackSpeedControl` + `ABLoopControl`
- `LocalAudioPlayer`
- `TakeRecorder`
- `MetronomeEngine` (Web Audio)
- `detectPitch` + `frequencyToNote` (tuner)
- `saveProject()` / `getProject()` from practice-session-store

### New component extraction

The current `practice-timer/page.tsx` is ~1700 lines. As part of the redesign, extract into focused components:
- `SessionSetupForm.tsx` -- instrument dropdown, song title, description, notes, media source
- `PracticeMedia.tsx` -- YouTube/audio player + speed + A-B loop
- `MetronomeWidget.tsx` -- BPM display, beat dots, time sig, start/stop
- `TunerWidget.tsx` -- note display, cents gauge, mic controls
- `SessionPerformance.tsx` -- accuracy, time, reps (stubbed)
- `FocusPoints.tsx` -- notes textarea

This breaks the monolith into testable, understandable units.

---

## 4. Navigation Redesign

Current nav: Practice Tracker | Home | Dashboard | Profile | Practice Session | Recommendations | Log Out | Theme

New nav: The Shed | The Shed | Studio | AI Tutor | Analytics | (theme toggle) | (avatar/logout)

**Mapping:**
- "The Shed" (home) = `/dashboard` (Home Hub)
- "Studio" = `/practice-timer` (Practice Studio)
- "AI Tutor" = `/recommendations` (existing, later redesigned)
- "Analytics" = `/profilepage` (existing, later redesigned)
- Profile/Settings: behind avatar dropdown (later phase)

Phase 1 renames the nav links and routes. The actual AI Tutor and Analytics page redesigns come in Phase 2+.

---

## 5. NOT in Phase 1

- Analytics Dashboard redesign (Phase 2)
- AI Tutor page + LLM integration (Phase 2)
- Settings page (Phase 3)
- Session Performance real data (needs backend: accuracy tracking, repetition counting)
- Recording History with accuracy % (Phase 2)
- Weekly Goal setting UI (stub with stats API data for now)

---

## 6. File Impact

| File | Action |
|------|--------|
| `tailwind.config.ts` | Add Shed color tokens, Plus Jakarta Sans font |
| `globals.css` | CSS custom properties for light/dark tokens, font import |
| `layout.tsx` | Dark mode default class, font family |
| `dashboard/page.tsx` | Full rewrite: Home Hub in Shed design |
| `practice-timer/page.tsx` | Full rewrite: Practice Studio, extract components |
| `components/navigation/Header.tsx` | Redesign: The Shed nav |
| `components/navigation/MobileNav.tsx` | Redesign: The Shed mobile nav |
| `components/studio/SessionSetupForm.tsx` | NEW: extracted setup form |
| `components/studio/PracticeMedia.tsx` | NEW: media player wrapper |
| `components/studio/MetronomeWidget.tsx` | NEW: metronome component |
| `components/studio/TunerWidget.tsx` | NEW: tuner component |
| `components/studio/SessionPerformance.tsx` | NEW: performance sidebar (stubbed) |
| `components/studio/FocusPoints.tsx` | NEW: notes textarea |
| `page.test.tsx` | Update: mocks and assertions for new UI |

---

## 7. Verification

1. `npx jest` -- all tests pass
2. Home Hub: dark theme renders, 4 instrument cards show, streak widget shows, theme toggle works
3. Practice Studio: setup form works, start session loads workspace with all tools, metronome/tuner/recorder functional
4. Stop session: saves project, redirects to Home Hub with updated card
5. Light mode: toggle works, all screens readable, accents consistent
6. Responsive: mobile layout works for both screens
