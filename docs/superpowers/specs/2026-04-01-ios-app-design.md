# The Shed — iOS App Design Spec

## Overview

Native iOS app for "The Shed" musicians practice app. Full feature parity with the web app, plus PDF sheet music viewer. Built in SwiftUI with zero external dependencies. Connects to the existing Django REST backend.

## Target

- **Platform:** iOS 17.0+
- **Devices:** iPhone (iPad layout not in scope for v1)
- **Repository:** Separate repo `TheShed-iOS` (not in the web app monorepo)
- **Apple Developer Account:** Not required for development. Free Apple ID for simulator + personal device testing.

## Visual Design

Match the web app's dark aesthetic:
- Dark navy background (`#0f1729`)
- Purple accent gradient (`#7c3aed` → `#8455ef`)
- Card surfaces (`#1a1d27`) with subtle borders (`#2d3748`)
- Light text on dark (`#f8fafc` primary, `#94a3b8` secondary, `#64748b` muted)
- Uppercase tracking labels for section headers
- No light mode in v1 — dark only, matching the web app

## Navigation

Four-tab structure with a bottom tab bar:

| Tab | Name | Icon | Purpose |
|-----|------|------|---------|
| 1 | Studio | Music note (SF Symbol) | Practice session setup, timer, and active session workspace |
| 2 | Tools | Wrench (SF Symbol) | Standalone metronome, tuner, recorder, PDF sheet music |
| 3 | AI Tutor | Sparkles (SF Symbol) | Practice recommendations |
| 4 | Analytics | Chart bar (SF Symbol) | Stats, streak, session history, instrument breakdown |

Tab bar styling: dark background (`#111827`), top border (`#1e293b`), purple for active tab, muted gray for inactive.

## Launch Behavior

App opens to Studio tab. If the user has a previous session setup stored:
- Pre-fill instrument, song title, description, and focus points from last session
- Show "Pick up where you left off" header with instrument name and song
- One tap on "Start Session" to begin

If no history, show a clean instrument picker with the four instruments (Guitar, Bass, Drums, Keys).

If a session is actively in progress (checked via `GET /api/v1/timer/active/`), resume directly into the active session workspace.

## Screens

### Auth — Login

- Fields: username, password
- "Open The Shed" button with purple gradient
- "Create Account" link to register screen
- On success: store token in Keychain, navigate to Studio tab
- On error: show inline error message

### Auth — Register

- Fields: username, email, password, confirm password
- Client-side validation: email format, password length (6+), password match
- On success: redirect to login screen
- "Sign in" link back to login

### Studio — Session Setup (not running)

- Timer display showing `00:00:00` with "Ready to start" state
- Editable fields (pre-filled from last session):
  - Instrument (picker: Guitar, Bass, Drums, Keys)
  - Song Title (text input)
  - Description (text input)
  - Focus Points (multiline text)
  - Sheet Music (PDF file picker)
- "Start Session" button (purple gradient, full width)
- Tapping Start calls `POST /api/v1/timer/start/` and transitions to active workspace

### Studio — Active Session Workspace

- Timer display with elapsed time, "Session Active" state (green indicator)
- Pause and Stop & Save buttons
- Collapsible workspace sections:
  - **Metronome** — BPM display, tap tempo, time signature selector, start/stop
  - **Tuner** — note display, cents offset, flat/sharp indicator, start/stop
  - **Recorder** — record button, playback of takes, audio-only mode
  - **YouTube** — URL input, embedded video playback via WKWebView
  - **MP3** — file picker for local audio, playback controls
  - **Sheet Music** — PDF viewer if a PDF was attached
  - **Focus Points** — editable text area, persists across pauses

Pause calls `POST /api/v1/timer/{id}/pause/`. Resume calls `POST /api/v1/timer/{id}/resume/`. Stop calls `POST /api/v1/timer/{id}/stop/`, saves the session setup to UserDefaults for next launch, and navigates to Analytics tab.

### Tools — Standalone

Grid of tool cards, each navigating to a full-screen tool view:

- **Metronome** — same component as in-session, but standalone. BPM slider, tap tempo, time signature, start/stop. Uses AVAudioEngine.
- **Tuner** — same component as in-session. Real-time pitch detection via microphone. Shows note name, octave, cents offset, and flat/in-tune/sharp indicator.
- **Recorder** — record audio takes, play them back, delete. List of saved recordings.
- **Sheet Music** — import PDFs from Files app, list of imported scores, tap to view full-screen with zoom/scroll via PDFKit.

All tools use the same underlying engine classes whether accessed standalone or in-session.

### AI Tutor — Recommendations

- Form with:
  - Instrument dropdown (guitar, piano, drums, bass)
  - Skill level dropdown (beginner, intermediate, advanced)
  - Goals text input (max 240 characters, with counter)
- Goal presets as tappable chips:
  - "Tighten rhythm and timing"
  - "Memorize a song section"
  - "Clean up chord changes"
  - "Improve improvisation ideas"
- "Get Recommendation" button (purple gradient)
- Loading state with spinner during generation
- Result card with recommendation text and "Take This Into Practice Session" button (navigates to Studio with recommendation context)
- Calls `POST /api/v1/recommendations/`

### Analytics

- **Stats row:** streak (days), this week (hours), total (hours) — three cards
- **Weekly goal:** progress bar with 7h default goal
- **Recent sessions:** scrollable list showing instrument, description, date, duration
- **Instrument breakdown:** visual breakdown of practice time by instrument
- Tapping a session shows detail view
- Calls `GET /api/v1/stats/`, `GET /api/v1/calendar/`, `GET /api/v1/by-instrument/`, `GET /api/v1/` (sessions list)

## Project Structure

```
TheShed-iOS/
├── TheShed.xcodeproj
├── TheShed/
│   ├── TheShedApp.swift              # @main entry, tab bar
│   ├── Models/
│   │   ├── Session.swift             # Codable: session_id, instrument, duration, etc.
│   │   ├── User.swift                # Codable: id, username, email
│   │   ├── Stats.swift               # Codable: total_hours, streak, etc.
│   │   ├── Recommendation.swift      # Codable: recommendation text, cached flag
│   │   └── Tag.swift                 # Codable: id, name, color
│   ├── Services/
│   │   ├── APIClient.swift           # URLSession wrapper, token injection, error handling
│   │   ├── AuthService.swift         # Login/register, Keychain token storage
│   │   └── SessionStore.swift        # UserDefaults: last setup, preferences
│   ├── Audio/
│   │   ├── MetronomeEngine.swift     # AVAudioEngine oscillator, beat scheduling
│   │   ├── PitchDetector.swift       # AVAudioEngine mic tap + Accelerate FFT
│   │   └── AudioRecorder.swift       # AVAudioRecorder for take recording
│   ├── Views/
│   │   ├── Studio/
│   │   │   ├── StudioView.swift      # Main studio tab, setup or active workspace
│   │   │   ├── SessionSetupView.swift    # Instrument picker, form fields, start button
│   │   │   ├── ActiveSessionView.swift   # Timer, controls, workspace sections
│   │   │   └── WorkspaceSection.swift    # Collapsible section container
│   │   ├── Tools/
│   │   │   ├── ToolsView.swift       # Tool grid/list
│   │   │   ├── MetronomeView.swift   # Full metronome UI
│   │   │   ├── TunerView.swift       # Full tuner UI
│   │   │   ├── RecorderView.swift    # Recording + playback UI
│   │   │   └── SheetMusicView.swift  # PDF list + viewer
│   │   ├── AITutor/
│   │   │   └── AITutorView.swift     # Recommendation form + result
│   │   ├── Analytics/
│   │   │   ├── AnalyticsView.swift   # Stats, goal, history
│   │   │   └── SessionDetailView.swift   # Single session detail
│   │   └── Auth/
│   │       ├── LoginView.swift
│   │       └── RegisterView.swift
│   └── Components/
│       ├── TimerDisplay.swift        # Reusable HH:MM:SS display
│       ├── InstrumentPicker.swift    # Instrument selection UI
│       ├── GradientButton.swift      # Purple gradient button style
│       └── SectionCard.swift         # Dark card container
└── TheShedTests/
    ├── APIClientTests.swift
    ├── MetronomeEngineTests.swift
    ├── PitchDetectorTests.swift
    └── SessionStoreTests.swift
```

## Technical Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| UI framework | SwiftUI | Declarative, modern, less boilerplate |
| Min iOS | 17.0 | @Observable macro, modern SwiftUI APIs |
| Audio | AVAudioEngine | Low-latency, sample-accurate for metronome/tuner |
| Pitch detection | Accelerate (vDSP) | Apple's DSP framework, FFT + autocorrelation |
| Recording | AVAudioRecorder | Simple API for audio capture |
| PDF viewing | PDFKit (PDFView) | Built-in, supports zoom/scroll/search |
| YouTube | WKWebView + iframe API | Only viable option on iOS |
| Networking | URLSession + async/await | Built-in, no dependencies |
| Auth storage | Keychain (via Security framework) | Secure token persistence |
| Local storage | UserDefaults | Last session setup, preferences |
| State management | @Observable classes | Native Swift observation, no third-party |
| Dependencies | None | All Apple frameworks |

## API Integration

All endpoints hit the existing Django backend at a configurable base URL. Token auth via `Authorization: Token {token}` header.

### Endpoints used:

**Auth:**
- `POST /api/v1/dj-rest-auth/login/` — returns `{key: token}`
- `POST /api/v1/dj-rest-auth/registration/` — returns `{key: token}`
- `POST /api/v1/dj-rest-auth/logout/`

**Session timer:**
- `GET /api/v1/timer/active/` — check for in-progress session
- `POST /api/v1/timer/start/` — start new session
- `POST /api/v1/timer/{id}/pause/` — pause
- `POST /api/v1/timer/{id}/resume/` — resume
- `POST /api/v1/timer/{id}/stop/` — stop and save

**Data:**
- `GET /api/v1/` — session list
- `GET /api/v1/stats/` — practice stats
- `GET /api/v1/calendar/` — calendar heatmap data
- `GET /api/v1/by-instrument/` — instrument breakdown
- `GET /api/v1/current-user/` — user info

**AI:**
- `POST /api/v1/recommendations/` — generate practice recommendation

### Error handling:
- 401 responses clear the Keychain token and redirect to login
- Network errors show inline alerts, don't crash
- Timer runs locally even if API calls fail; sync on reconnect

## Audio Architecture

### Metronome
- `AVAudioEngine` with `AVAudioPlayerNode`
- Pre-render click samples (high/low for downbeat/upbeat)
- Schedule beats using `AVAudioTime` for sample-accurate timing
- Support time signatures: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8
- Tap tempo: average last 4 taps
- BPM range: 30–300

### Tuner
- `AVAudioEngine` with input tap on mic
- Capture audio buffer, run autocorrelation via `vDSP` (Accelerate framework)
- Same algorithm as web app's `pitch-detector.ts`, ported to Swift
- Display: note name, octave, cents offset (-50 to +50), visual indicator
- Reference frequency: A4 = 440 Hz (configurable later)

### Recorder
- `AVAudioRecorder` for capture
- `AVAudioPlayer` for playback
- Save recordings to app's Documents directory
- List recordings with timestamp, duration, delete capability

## Testing Strategy

- **Unit tests:** APIClient (mock URLSession), MetronomeEngine (beat scheduling logic), PitchDetector (frequency-to-note math), SessionStore (UserDefaults read/write)
- **UI tests:** Login flow, session start/pause/stop flow, tab navigation
- **Manual testing:** Audio features (metronome accuracy, tuner responsiveness) on physical device

## Out of Scope for v1

- iPad-specific layouts
- Apple Watch companion
- Widgets
- Offline session sync queue (timer works offline, but history requires connectivity)
- Push notifications
- App Store submission (no paid developer account)
- Light mode
