# The Shed Phase 1: Design System + Home Hub + Practice Studio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply The Shed dark-theme design system to the Home Hub and Practice Studio, keeping all existing functionality working while extracting the monolithic practice-timer page into focused components.

**Architecture:** Replace CSS custom properties in globals.css with The Shed color tokens (dark default, light variant). Swap Geist font for Plus Jakarta Sans. Rewrite dashboard/page.tsx as the Shed Home Hub. Extract practice-timer/page.tsx (~1700 lines) into 6 focused studio components, then compose them into the Shed Practice Studio layout. Navigation renamed from "Practice Tracker" to "The Shed".

**Tech Stack:** Next.js 15, Tailwind CSS v4 (CSS custom properties), next-themes, Plus Jakarta Sans (Google Fonts), existing Web Audio APIs, existing YouTube/audio player components, existing Django REST API.

**Spec:** `docs/superpowers/specs/2026-03-30-the-shed-redesign-phase1-design.md`

**Reference mockups:**
- `stitch_recommendations_improved/the_shed_home_hub/screen.png`
- `stitch_recommendations_improved/the_shed_practice_studio/screen.png`
- `stitch_recommendations_improved/midnight_studio/DESIGN.md` (color system, component rules)

---

## File Structure

```
frontend/next-app/src/
  app/
    globals.css                          MODIFY — Shed color tokens (light + dark)
    layout.tsx                           MODIFY — Plus Jakarta Sans font, metadata
    dashboard/page.tsx                   REWRITE — Home Hub in Shed design
    practice-timer/page.tsx              REWRITE — Compose studio components
    practice-timer/__tests__/page.test.tsx  REWRITE — Tests for new layout
  components/
    navigation/
      Header.tsx                         REWRITE — The Shed nav
      MobileNav.tsx                      REWRITE — The Shed mobile nav
    studio/
      SessionSetupForm.tsx               NEW — instrument, song title, description, notes, media
      PracticeMedia.tsx                  NEW — YouTube/audio player + speed + A-B loop
      MetronomeWidget.tsx                NEW — BPM, beat dots, time sig, start/stop
      TunerWidget.tsx                    NEW — note display, cents gauge, mic
      SessionPerformance.tsx             NEW — accuracy, time, reps (stubbed)
      FocusPoints.tsx                    NEW — notes textarea
```

---

### Task 1: Shed design tokens in globals.css

**Files:**
- Modify: `frontend/next-app/src/app/globals.css`

- [ ] **Step 1: Replace the `:root` (light mode) CSS custom properties**

Replace the entire `:root` block with The Shed light-mode tokens:

```css
:root {
  --radius: 0.75rem;
  --background: #f7f9fb;
  --foreground: #1a1d23;
  --card: #ffffff;
  --card-foreground: #1a1d23;
  --popover: #ffffff;
  --popover-foreground: #1a1d23;
  --primary: #8455ef;
  --primary-foreground: #ffffff;
  --secondary: #eef1f5;
  --secondary-foreground: #1a1d23;
  --muted: #eef1f5;
  --muted-foreground: #5a6072;
  --accent: #9bffce;
  --accent-foreground: #006544;
  --destructive: #ff6e84;
  --border: #dfe3ea;
  --input: #dfe3ea;
  --ring: #ba9eff;
  --chart-1: #8455ef;
  --chart-2: #9bffce;
  --chart-3: #ba9eff;
  --chart-4: #58e7ab;
  --chart-5: #ff6e84;
  --sidebar: #f7f9fb;
  --sidebar-foreground: #1a1d23;
  --sidebar-primary: #8455ef;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eef1f5;
  --sidebar-accent-foreground: #1a1d23;
  --sidebar-border: #dfe3ea;
  --sidebar-ring: #ba9eff;
}
```

- [ ] **Step 2: Replace the `.dark` block with Shed dark-mode tokens**

```css
.dark {
  --background: #060e20;
  --foreground: #dee5ff;
  --card: #141f38;
  --card-foreground: #dee5ff;
  --popover: #141f38;
  --popover-foreground: #dee5ff;
  --primary: #ba9eff;
  --primary-foreground: #060e20;
  --secondary: #1f2b49;
  --secondary-foreground: #dee5ff;
  --muted: #091328;
  --muted-foreground: #a3aac4;
  --accent: #9bffce;
  --accent-foreground: #006544;
  --destructive: #ff6e84;
  --border: rgba(109, 117, 140, 0.15);
  --input: rgba(109, 117, 140, 0.15);
  --ring: #ba9eff;
  --chart-1: #ba9eff;
  --chart-2: #9bffce;
  --chart-3: #8455ef;
  --chart-4: #58e7ab;
  --chart-5: #ff6e84;
  --sidebar: #091328;
  --sidebar-foreground: #dee5ff;
  --sidebar-primary: #ba9eff;
  --sidebar-primary-foreground: #060e20;
  --sidebar-accent: #1f2b49;
  --sidebar-accent-foreground: #dee5ff;
  --sidebar-border: rgba(109, 117, 140, 0.15);
  --sidebar-ring: #ba9eff;
}
```

- [ ] **Step 3: Verify the app still renders**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: 200

- [ ] **Step 4: Commit**

```bash
git add frontend/next-app/src/app/globals.css
git commit -m "feat: replace color tokens with The Shed design system"
```

---

### Task 2: Plus Jakarta Sans font + metadata

**Files:**
- Modify: `frontend/next-app/src/app/layout.tsx`

- [ ] **Step 1: Replace Geist font with Plus Jakarta Sans**

Replace the full file:

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Header } from "@/components/navigation/Header";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "The Shed",
  description: "Your practice studio. Pick up where you left off.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update the font-sans CSS variable in globals.css**

In the `@theme inline` block of `globals.css`, change:
```css
  --font-sans: var(--font-geist-sans);
```
to:
```css
  --font-sans: var(--font-sans);
```

Remove the `--font-mono` line if not used elsewhere. If it is used, keep it.

- [ ] **Step 3: Verify font loads**

Run: `curl -s http://localhost:3000 | grep "Jakarta"`
Expected: font reference in HTML

- [ ] **Step 4: Commit**

```bash
git add frontend/next-app/src/app/layout.tsx frontend/next-app/src/app/globals.css
git commit -m "feat: switch to Plus Jakarta Sans and rename to The Shed"
```

---

### Task 3: Navigation redesign — Header.tsx

**Files:**
- Modify: `frontend/next-app/src/components/navigation/Header.tsx`

- [ ] **Step 1: Rewrite Header with Shed nav**

```tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/practice/LogoutButton";

export function Header() {
  const pathname = usePathname();

  const navigation = [
    { name: "The Shed", href: "/dashboard" },
    { name: "Studio", href: "/practice-timer" },
    { name: "AI Tutor", href: "/recommendations" },
    { name: "Analytics", href: "/profilepage" },
  ];

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-8 flex items-center space-x-2">
            <span className="text-lg font-extrabold tracking-tight">
              The Shed
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex md:hidden flex-1">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-lg font-extrabold tracking-tight">
              The Shed
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <LogoutButton
              label="Log Out"
              className="hidden h-9 rounded-lg border-border bg-secondary px-4 text-sm text-secondary-foreground hover:bg-secondary/80 md:inline-flex"
            />
            <ThemeToggle />
            <MobileNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update MobileNav.tsx with same nav items**

In `MobileNav.tsx`, replace the `navigation` array with:

```tsx
const navigation = [
  { name: "The Shed", href: "/dashboard" },
  { name: "Studio", href: "/practice-timer" },
  { name: "AI Tutor", href: "/recommendations" },
  { name: "Analytics", href: "/profilepage" },
];
```

And replace "Practice Tracker" text with "The Shed".

- [ ] **Step 3: Verify nav renders**

Start dev server, check that "The Shed" branding and new nav links show.

- [ ] **Step 4: Commit**

```bash
git add frontend/next-app/src/components/navigation/Header.tsx frontend/next-app/src/components/navigation/MobileNav.tsx
git commit -m "feat: redesign navigation for The Shed"
```

---

### Task 4: Extract SessionSetupForm component

**Files:**
- Create: `frontend/next-app/src/components/studio/SessionSetupForm.tsx`

- [ ] **Step 1: Create the SessionSetupForm component**

This extracts the instrument dropdown, song title, description, notes, and media source inputs from the practice-timer page into a self-contained component.

```tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Youtube, Upload } from "lucide-react";
import { INSTRUMENTS, type InstrumentName } from "@/lib/practice-session-store";

type MediaSource = "youtube" | "audio";

interface SessionSetupFormProps {
  instrument: string;
  songTitle: string;
  description: string;
  notes: string;
  youtubeUrl: string;
  mediaSource: MediaSource;
  audioFileName: string | null;
  isLoading: boolean;
  error: string;
  onInstrumentChange: (value: string) => void;
  onSongTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onYoutubeUrlChange: (value: string) => void;
  onMediaSourceChange: (value: MediaSource) => void;
  onAudioFileSelect: (file: File) => void;
  onStart: () => void;
}

export default function SessionSetupForm({
  instrument,
  songTitle,
  description,
  notes,
  youtubeUrl,
  mediaSource,
  audioFileName,
  isLoading,
  error,
  onInstrumentChange,
  onSongTitleChange,
  onDescriptionChange,
  onNotesChange,
  onYoutubeUrlChange,
  onMediaSourceChange,
  onAudioFileSelect,
  onStart,
}: SessionSetupFormProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAudioFileSelect(file);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="instrument" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Instrument
          </Label>
          <select
            id="instrument"
            value={instrument}
            onChange={(e) => onInstrumentChange(e.target.value)}
            required
            className="flex h-11 w-full rounded-lg bg-muted px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select an instrument</option>
            {INSTRUMENTS.map((inst) => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="song-title" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Song Title
          </Label>
          <Input
            id="song-title"
            value={songTitle}
            onChange={(e) => onSongTitleChange(e.target.value)}
            placeholder="e.g., All The Things You Are"
            className="h-11 rounded-lg bg-muted border-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Description
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g., Chord melody arrangement"
          className="h-11 rounded-lg bg-muted border-0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Focus Points
        </Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="What are you focusing on this session?"
          rows={2}
          className="flex w-full rounded-lg bg-muted px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Practice Source
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mediaSource === "youtube" ? "default" : "secondary"}
            size="sm"
            onClick={() => onMediaSourceChange("youtube")}
            className="rounded-lg"
          >
            <Youtube className="mr-1.5 h-4 w-4" />
            YouTube
          </Button>
          <Button
            type="button"
            variant={mediaSource === "audio" ? "default" : "secondary"}
            size="sm"
            onClick={() => onMediaSourceChange("audio")}
            className="rounded-lg"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            MP3 Upload
          </Button>
        </div>

        {mediaSource === "youtube" ? (
          <Input
            id="youtube-url"
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 rounded-lg bg-muted border-0"
          />
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
            {audioFileName && (
              <p className="text-sm text-muted-foreground">{audioFileName}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <Button
        onClick={onStart}
        disabled={isLoading}
        className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground font-semibold text-base"
      >
        {isLoading ? "Starting..." : "Start Session"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify file created**

Run: `ls frontend/next-app/src/components/studio/SessionSetupForm.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/components/studio/SessionSetupForm.tsx
git commit -m "feat: extract SessionSetupForm component for The Shed Studio"
```

---

### Task 5: Extract MetronomeWidget component

**Files:**
- Create: `frontend/next-app/src/components/studio/MetronomeWidget.tsx`

- [ ] **Step 1: Create the MetronomeWidget component**

Extract metronome UI from practice-timer page. This component receives BPM state and metronome engine control as props.

```tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
];

interface MetronomeWidgetProps {
  bpm: number;
  isActive: boolean;
  currentBeat: number;
  beatsPerMeasure: number;
  onBpmChange: (bpm: number) => void;
  onBeatsPerMeasureChange: (beats: number) => void;
  onToggle: () => void;
  onTapTempo: () => void;
}

export default function MetronomeWidget({
  bpm,
  isActive,
  currentBeat,
  beatsPerMeasure,
  onBpmChange,
  onBeatsPerMeasureChange,
  onToggle,
  onTapTempo,
}: MetronomeWidgetProps) {
  const handleBpmChange = (value: number) => {
    onBpmChange(Math.max(20, Math.min(300, value)));
  };

  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Metronome
      </p>

      <div className="text-center">
        <div className="text-6xl font-extrabold tracking-tight text-foreground">
          {bpm}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mt-1">
          BPM
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleBpmChange(bpm - 1)}>
          <Minus className="h-4 w-4" />
        </Button>
        <input
          type="range"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
        />
        <Button variant="secondary" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleBpmChange(bpm + 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center gap-2 py-2">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-colors duration-75 ${
              currentBeat === i
                ? i === 0
                  ? "bg-accent scale-125"
                  : "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIME_SIGNATURES.map((ts) => (
          <Button
            key={ts.label}
            variant={beatsPerMeasure === ts.beats ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-8"
            onClick={() => onBeatsPerMeasureChange(ts.beats)}
          >
            {ts.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onToggle}
          className={`flex-1 h-10 rounded-lg font-semibold ${
            isActive
              ? "bg-destructive text-white hover:bg-destructive/90"
              : "bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground"
          }`}
        >
          {isActive ? "Stop" : "Start Click"}
        </Button>
        <Button variant="secondary" className="rounded-lg h-10" onClick={onTapTempo}>
          Tap
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/next-app/src/components/studio/MetronomeWidget.tsx
git commit -m "feat: extract MetronomeWidget component for The Shed Studio"
```

---

### Task 6: Extract TunerWidget component

**Files:**
- Create: `frontend/next-app/src/components/studio/TunerWidget.tsx`

- [ ] **Step 1: Create the TunerWidget component**

```tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import type { NoteInfo } from "@/lib/audio/note-utils";

interface TunerWidgetProps {
  isActive: boolean;
  note: NoteInfo | null;
  error: string;
  onToggle: () => void;
}

export default function TunerWidget({
  isActive,
  note,
  error,
  onToggle,
}: TunerWidgetProps) {
  const gaugePercent = note
    ? Math.max(0, Math.min(100, ((note.cents + 50) / 100) * 100))
    : 50;
  const isInTune = note !== null && Math.abs(note.cents) <= 5;
  const isClose = note !== null && Math.abs(note.cents) <= 15;

  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Precision Tuner
      </p>

      <div className="text-center py-2">
        <div
          className={`text-5xl font-extrabold tracking-tight transition-colors ${
            !note
              ? "text-muted-foreground/30"
              : isInTune
                ? "text-accent"
                : isClose
                  ? "text-yellow-400"
                  : "text-destructive"
          }`}
        >
          {note ? `${note.name}${note.octave}` : "--"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {note
            ? `${note.frequency.toFixed(1)} Hz`
            : isActive
              ? "Play a note..."
              : "Start to tune"}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
          <span>Flat</span>
          <span>In Tune</span>
          <span>Sharp</span>
        </div>
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-accent z-10" />
          <div
            className={`absolute top-0 bottom-0 w-2 rounded-full transition-all duration-100 -translate-x-1/2 ${
              isInTune ? "bg-accent" : isClose ? "bg-yellow-400" : "bg-destructive"
            }`}
            style={{ left: `${gaugePercent}%` }}
          />
        </div>
        <div className="text-center text-sm font-mono text-foreground">
          {note ? `${note.cents > 0 ? "+" : ""}${note.cents} cents` : "-- cents"}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        onClick={onToggle}
        className={`w-full h-10 rounded-lg font-semibold ${
          isActive
            ? "bg-destructive text-white hover:bg-destructive/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        {isActive ? (
          <><MicOff className="mr-1.5 h-4 w-4" /> Stop</>
        ) : (
          <><Mic className="mr-1.5 h-4 w-4" /> Start Tuner</>
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/next-app/src/components/studio/TunerWidget.tsx
git commit -m "feat: extract TunerWidget component for The Shed Studio"
```

---

### Task 7: Extract SessionPerformance + FocusPoints + PracticeMedia

**Files:**
- Create: `frontend/next-app/src/components/studio/SessionPerformance.tsx`
- Create: `frontend/next-app/src/components/studio/FocusPoints.tsx`
- Create: `frontend/next-app/src/components/studio/PracticeMedia.tsx`

- [ ] **Step 1: Create SessionPerformance (stubbed)**

```tsx
"use client";

import React from "react";

interface SessionPerformanceProps {
  elapsedSeconds: number;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function SessionPerformance({ elapsedSeconds }: SessionPerformanceProps) {
  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Session Performance
      </p>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Accuracy</span>
          <span className="text-sm font-semibold text-foreground">--</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Active Time</span>
          <span className="text-sm font-mono font-semibold text-foreground">{formatTime(elapsedSeconds)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Repetitions</span>
          <span className="text-sm font-semibold text-foreground">--</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FocusPoints**

```tsx
"use client";

import React from "react";

interface FocusPointsProps {
  notes: string;
  onNotesChange: (value: string) => void;
}

export default function FocusPoints({ notes, onNotesChange }: FocusPointsProps) {
  return (
    <div className="rounded-xl bg-card p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Focus Points
      </p>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="What are you focusing on this session?"
        rows={3}
        className="w-full rounded-lg bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create PracticeMedia wrapper**

This is a layout wrapper that holds the YouTube player or audio player with controls. It imports the existing `YouTubePlayer`, `PlaybackSpeedControl`, `ABLoopControl`, and `LocalAudioPlayer` components.

```tsx
"use client";

import React, { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Youtube, Upload } from "lucide-react";
import YouTubePlayer, { extractVideoId, type YouTubePlayerHandle } from "@/components/youtube/YouTubePlayer";
import PlaybackSpeedControl from "@/components/youtube/PlaybackSpeedControl";
import ABLoopControl from "@/components/youtube/ABLoopControl";
import LocalAudioPlayer, { type LocalAudioPlayerHandle } from "@/components/media/LocalAudioPlayer";

type MediaSource = "youtube" | "audio";

interface PracticeMediaProps {
  instrument: string;
  songTitle: string;
  mediaSource: MediaSource;
  youtubeUrl: string;
  audioObjectUrl: string | null;
  audioFileName: string | null;
  playbackSpeed: number;
  youtubePlayerRef: RefObject<YouTubePlayerHandle | null>;
  audioPlayerRef: RefObject<LocalAudioPlayerHandle | null>;
  onMediaSourceChange: (source: MediaSource) => void;
  onPlaybackSpeedChange: (speed: number) => void;
}

export default function PracticeMedia({
  instrument,
  songTitle,
  mediaSource,
  youtubeUrl,
  audioObjectUrl,
  audioFileName,
  playbackSpeed,
  youtubePlayerRef,
  audioPlayerRef,
  onMediaSourceChange,
  onPlaybackSpeedChange,
}: PracticeMediaProps) {
  const videoId = extractVideoId(youtubeUrl);

  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Practice Media
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {instrument}{songTitle ? ` \u00B7 ${songTitle}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={mediaSource === "youtube" ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-7"
            onClick={() => onMediaSourceChange("youtube")}
          >
            <Youtube className="mr-1 h-3 w-3" /> YouTube
          </Button>
          <Button
            variant={mediaSource === "audio" ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-7"
            onClick={() => onMediaSourceChange("audio")}
          >
            <Upload className="mr-1 h-3 w-3" /> MP3
          </Button>
        </div>
      </div>

      {mediaSource === "youtube" && videoId ? (
        <div className="space-y-3">
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <YouTubePlayer ref={youtubePlayerRef} videoId={videoId} />
          </div>
          <div className="flex flex-wrap gap-3">
            <PlaybackSpeedControl speed={playbackSpeed} onSpeedChange={onPlaybackSpeedChange} />
            <ABLoopControl playerRef={youtubePlayerRef} />
          </div>
        </div>
      ) : mediaSource === "audio" && audioObjectUrl ? (
        <div className="space-y-3">
          {audioFileName && (
            <p className="text-sm text-muted-foreground">{audioFileName}</p>
          )}
          <LocalAudioPlayer
            ref={audioPlayerRef}
            src={audioObjectUrl}
            playbackSpeed={playbackSpeed}
            onSpeedChange={onPlaybackSpeedChange}
          />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {mediaSource === "youtube" ? "Enter a YouTube URL to load" : "Upload an MP3 file"}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/next-app/src/components/studio/SessionPerformance.tsx frontend/next-app/src/components/studio/FocusPoints.tsx frontend/next-app/src/components/studio/PracticeMedia.tsx
git commit -m "feat: extract SessionPerformance, FocusPoints, PracticeMedia components"
```

---

### Task 8: Rewrite Home Hub (dashboard/page.tsx)

**Files:**
- Modify: `frontend/next-app/src/app/dashboard/page.tsx`

- [ ] **Step 1: Rewrite dashboard/page.tsx with The Shed Home Hub design**

Full rewrite. Keep the same data fetching logic (stats API, active session API, localStorage projects) but apply The Shed visual design: dark surface background, editorial headline, per-instrument cards in card surface, streak widget, AI insight card.

This is a large file. The implementer should reference:
- The current `dashboard/page.tsx` for data fetching patterns
- `stitch_recommendations_improved/the_shed_home_hub/screen.png` for visual reference
- The spec section "2. Home Hub" for layout diagram

Key changes from current:
- Background: `bg-background` (uses CSS variable, dark by default)
- Remove the radial gradient blobs (replace with clean dark surface)
- Headline: "Practice makes permanent, but *perfect* practice makes perfect." with "perfect" in `text-primary italic`
- Instrument cards: `bg-card` with `text-card-foreground`, no colored accents per instrument (all use the same dark card style)
- Streak widget: top-right card with days count and progress bar using `bg-accent`
- "Resume Previous Session" button: gradient from primary to #8455ef
- Stats row: `text-muted-foreground` labels
- Remove Music/Guitar/Piano/Drum icon imports (use text-only labels or simple CSS circles)

- [ ] **Step 2: Verify Home Hub renders**

Navigate to `/dashboard` after login. Should show dark theme with instrument cards.

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/app/dashboard/page.tsx
git commit -m "feat: rewrite Home Hub with The Shed design"
```

---

### Task 9: Rewrite Practice Studio (practice-timer/page.tsx)

**Files:**
- Modify: `frontend/next-app/src/app/practice-timer/page.tsx`

- [ ] **Step 1: Rewrite practice-timer/page.tsx composing extracted components**

This is the biggest task. The current file is ~1700 lines. The rewrite:
- Keeps all state management and API calls (handleStart, handleStop, handlePause, handleResume, metronome engine, tuner audio context)
- Removes all inline JSX for the setup form, metronome, tuner, etc.
- Imports and composes: `SessionSetupForm`, `PracticeMedia`, `MetronomeWidget`, `TunerWidget`, `SessionPerformance`, `FocusPoints`, `TakeRecorder`
- Two layouts: setup mode (before session) and active mode (during session)
- Applies The Shed dark styling throughout

The implementer should reference:
- `stitch_recommendations_improved/the_shed_practice_studio/screen.png` for active session layout
- The spec section "3. Practice Studio" for layout diagrams
- The current page.tsx for all state management, API calls, and audio logic to preserve

**Setup mode layout:**
```
[SessionSetupForm]  |  [Session Clock card]
```

**Active session layout:**
```
[PracticeMedia]         | [MetronomeWidget]
[TakeRecorder] [TunerWidget] | [SessionPerformance]
[FocusPoints - full width]
```

All session control buttons (Pause, Resume, Stop & Save) stay in a top status bar showing elapsed time.

- [ ] **Step 2: Verify all tools work**

Start a session. Check: YouTube loads, metronome clicks, tuner detects pitch, recorder works, timer counts, pause/resume/stop all function.

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/app/practice-timer/page.tsx
git commit -m "feat: rewrite Practice Studio with The Shed design and extracted components"
```

---

### Task 10: Update tests

**Files:**
- Modify: `frontend/next-app/src/app/practice-timer/__tests__/page.test.tsx`

- [ ] **Step 1: Update test mocks and assertions**

The tests need to account for the new component structure. Key changes:
- Mock the extracted components (`SessionSetupForm`, `MetronomeWidget`, etc.) since we're testing the page composition, not the individual widgets
- Update text assertions to match new UI strings ("Start Session" vs "Start Practice", "The Shed" vs "Practice Tracker")
- Keep all existing behavioral tests (start, pause, resume, stop, saveProject, instrument param)
- Update redirect assertion: stop should go to `/dashboard`
- Add mock for recommendations API if AI Insight is rendered on Home Hub

The implementer should run the existing tests first to see what breaks, then fix each failure.

- [ ] **Step 2: Run tests**

Run: `cd frontend/next-app && npx jest`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/app/practice-timer/__tests__/page.test.tsx
git commit -m "test: update tests for The Shed Practice Studio"
```

---

### Task 11: Update home page redirect

**Files:**
- Modify: `frontend/next-app/src/app/page.tsx`

- [ ] **Step 1: Check current home page behavior**

Read `frontend/next-app/src/app/page.tsx`. If it redirects to `/login` or shows a landing page, update to redirect to `/dashboard` (The Shed Home Hub) for logged-in users.

- [ ] **Step 2: Commit if changed**

```bash
git add frontend/next-app/src/app/page.tsx
git commit -m "feat: redirect home to The Shed Home Hub"
```

---

### Task 12: Visual QA and polish

- [ ] **Step 1: Browse all screens in dark mode**

Use `$B goto` to navigate: `/dashboard`, `/practice-timer`, `/practice-timer?instrument=Guitar`. Screenshot each. Check: colors match Shed tokens, no stale light-theme elements, typography is Plus Jakarta Sans, cards use tonal layering not borders.

- [ ] **Step 2: Toggle to light mode and verify**

Toggle theme. All screens should be readable with the light Shed palette. No white-on-white or dark-on-dark issues.

- [ ] **Step 3: Test responsive layout**

Use `$B responsive /tmp/shed` to get mobile/tablet/desktop screenshots. Check that the Practice Studio grid collapses sensibly on mobile.

- [ ] **Step 4: Fix any visual issues found**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: visual polish for The Shed Phase 1"
```
