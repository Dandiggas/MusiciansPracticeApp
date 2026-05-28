# Parked Features

Features intentionally removed from active code as of 2026-05-03 in the
session-playlist redesign. Captured here so the intent is not lost and can be
revisited later.

## Time tracking / practice timer

The previous `Session` model carried `duration`, `started_at`,
`paused_duration`, `is_paused`, and `in_progress`. The practice-timer page
started, paused, and stopped a session while accumulating time.

Why parked: the current priority is the act of practising through a reusable
multi-track session, not measuring minutes.

To reintroduce: add a `PracticeRun` model linked to `Session` with
`started_at`, `ended_at`, and `paused_seconds`. Do not put timing fields back
on `Session`.

## Aggregate stats

Removed endpoints: `/api/v1/stats/`, `/api/v1/calendar/`,
`/api/v1/by-instrument/`.

Removed frontend surfaces: the dashboard heatmap, weekly hours, current streak,
instrument breakdown, and favourite-instrument summary.

Why parked: those all depended on the old timer-driven session shape. If timing
returns later, rebuild them on top of `PracticeRun`.

## AI practice recommendations

Removed endpoint: `/api/v1/recommendations/`.

Why parked: it queried the old `Session` shape and assumed timer/history data.
It needs to be redesigned against the new session/track/lick model before it
comes back.

## Tags

The `Tag` model and its endpoints are removed from active use.

Why parked: for a single-user practice tool, named sessions such as "Kevin
Bond" or "Jazz Guys licks" are enough categorisation for now. Revisit only if
the app grows beyond personal use.
