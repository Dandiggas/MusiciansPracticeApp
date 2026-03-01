# YouTube Practice Player — Design

## Overview

A video library + player page at `/youtube-practice` that lets users browse past practice sessions with YouTube URLs, load videos into an embedded player with speed/loop controls, and save new sessions.

## Layout

Single-page scroll layout (Approach A):

1. **Header**: Title + subtitle
2. **URL Input**: Paste YouTube URL field
3. **Player Section**: Embedded YouTube player (16:9), current timestamp display, playback speed buttons (0.5x, 0.75x, 1x, 1.25x), A-B loop controls
4. **Save Form**: Instrument, description, duration (HH:MM:SS), session_date — POST to `/api/v1/sessions/` with Token auth
5. **Video Library**: Grid of past sessions with YouTube URLs, showing thumbnails + instrument + date. Clicking loads into player.

## Data Flow

- **GET** `/api/v1/sessions/` → filter client-side for non-empty `youtube_url` → display as library cards
- **POST** `/api/v1/sessions/` → `{instrument, duration, description, session_date, youtube_url}` with `Authorization: Token <token>`
- Library thumbnails: `https://img.youtube.com/vi/{videoId}/mqdefault.jpg`

## Components Reused

- `YouTubePlayer` (existing) — embedded player with iframe API
- `PlaybackSpeedControl` (existing) — will use custom 4-speed subset inline instead
- `ABLoopControl` (existing) — A/B loop with polling

## Files

| Action | File |
|--------|------|
| Create | `frontend/next-app/src/app/youtube-practice/page.tsx` |
| Edit   | `frontend/next-app/src/components/navigation/Header.tsx` |
| Edit   | `frontend/next-app/src/components/navigation/MobileNav.tsx` |

## Styling

Match practice-timer page: Card components, same spacing, muted-foreground text, lucide icons.
