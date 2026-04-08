# UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Musicians Practice App UI from generic AI-purple aesthetic to a premium, warm rose/stone design with spring-physics motion, Geist typography, and asymmetric layouts — driven by the `/design-taste-frontend` skill rules.

**Architecture:** Foundation swap approach. Update design tokens (colors, fonts, shadows) in globals.css first so every Shadcn component inherits the new look. Then sweep each page for layout restructuring, motion additions, and icon migration. All existing functionality preserved.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, Framer Motion (new), Geist font (new), Phosphor Icons (new), Shadcn UI (re-themed)

**Spec:** `docs/superpowers/specs/2026-04-08-ui-overhaul-design.md`

---

## File Map

### New Files
- `frontend/next-app/src/lib/motion.ts` — Spring configs, reusable animation variants
- `frontend/next-app/src/components/ui/motion-wrapper.tsx` — Reusable stagger-reveal client component

### Modified Files (Foundation)
- `frontend/next-app/package.json` — Add/remove dependencies
- `frontend/next-app/src/app/layout.tsx` — Swap font to Geist
- `frontend/next-app/src/app/globals.css` — Full palette + shadow + radius token swap

### Modified Files (Icons — 14 files)
- `frontend/next-app/src/components/navigation/MobileNav.tsx`
- `frontend/next-app/src/components/ui/theme-toggle.tsx`
- `frontend/next-app/src/components/auth/LoginPage.tsx`
- `frontend/next-app/src/components/dashboard/StatsCard.tsx`
- `frontend/next-app/src/components/profile/ProfilePage.tsx`
- `frontend/next-app/src/components/studio/MetronomeWidget.tsx`
- `frontend/next-app/src/components/studio/TunerWidget.tsx`
- `frontend/next-app/src/components/studio/SessionSetupForm.tsx`
- `frontend/next-app/src/components/studio/PracticeMedia.tsx`
- `frontend/next-app/src/components/media/LocalAudioPlayer.tsx`
- `frontend/next-app/src/components/practice/TagSelector.tsx`
- `frontend/next-app/src/components/navigation/LogoutButton.tsx`
- `frontend/next-app/src/app/practice-timer/page.tsx`
- `frontend/next-app/src/app/recommendations/page.tsx`

### Modified Files (Layout + Motion)
- `frontend/next-app/src/app/dashboard/page.tsx`
- `frontend/next-app/src/app/practice-timer/page.tsx`
- `frontend/next-app/src/app/recommendations/page.tsx`
- `frontend/next-app/src/components/profile/ProfilePage.tsx`
- `frontend/next-app/src/components/auth/LoginPage.tsx`
- `frontend/next-app/src/components/auth/RegisterPage.tsx`
- `frontend/next-app/src/components/navigation/Header.tsx`
- `frontend/next-app/src/components/studio/MetronomeWidget.tsx`
- `frontend/next-app/src/components/studio/TunerWidget.tsx`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `frontend/next-app/package.json`

- [ ] **Step 1: Install new dependencies**

```bash
cd frontend/next-app && npm install framer-motion @phosphor-icons/react geist
```

- [ ] **Step 2: Uninstall lucide-react**

```bash
cd frontend/next-app && npm uninstall lucide-react
```

Note: This will cause build errors in 14 files. That is expected — Task 4 (icon migration) will fix them all.

- [ ] **Step 3: Commit**

```bash
cd frontend/next-app && git add package.json package-lock.json && git commit -m "deps: add framer-motion, phosphor-icons, geist; remove lucide-react"
```

---

## Task 2: Swap Font to Geist

**Files:**
- Modify: `frontend/next-app/src/app/layout.tsx`

- [ ] **Step 1: Replace font import and config**

In `layout.tsx`, replace the Plus Jakarta Sans import and configuration with Geist.

Replace:
```tsx
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});
```

With:
```tsx
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
```

- [ ] **Step 2: Update the body className**

Replace the body tag's className that references `plusJakarta.variable` with:

```tsx
<body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
```

The `GeistSans.variable` creates `--font-geist-sans` and `GeistMono.variable` creates `--font-geist-mono` CSS variables.

- [ ] **Step 3: Update globals.css font-family reference**

In `globals.css`, find the `--font-sans` variable reference in the theme config. Update the Tailwind font-family to use the Geist CSS variables. If using Tailwind v4 `@theme`, add:

```css
@theme {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd frontend/next-app && npx next build 2>&1 | head -30
```

Note: Build will have errors from lucide-react removal — that's expected. Font changes should not add new errors. Check that the font-related code compiles by looking for font-specific errors only.

- [ ] **Step 5: Commit**

```bash
cd frontend/next-app && git add src/app/layout.tsx src/app/globals.css && git commit -m "style: swap Plus Jakarta Sans for Geist Sans + Geist Mono"
```

---

## Task 3: Update Color Tokens & Design Tokens

**Files:**
- Modify: `frontend/next-app/src/app/globals.css`

- [ ] **Step 1: Replace the full light mode color tokens**

In `globals.css`, find the `:root` or `@theme` block with the light mode color variables. Replace ALL color tokens with:

```css
--background: #f8f8f6;
--foreground: #1c1917;
--card: #ffffff;
--card-foreground: #1c1917;
--popover: #ffffff;
--popover-foreground: #1c1917;
--primary: #e11d48;
--primary-foreground: #fff1f2;
--secondary: #e7e5e4;
--secondary-foreground: #1c1917;
--muted: #f0eeeb;
--muted-foreground: #78716c;
--accent: #f0eeeb;
--accent-foreground: #1c1917;
--destructive: #dc2626;
--destructive-foreground: #fef2f2;
--border: #e7e5e4;
--input: #e7e5e4;
--ring: #e11d48;
--chart-1: #e11d48;
--chart-2: #78716c;
--chart-3: #fda4af;
--chart-4: #57534e;
--chart-5: #9f1239;
```

- [ ] **Step 2: Replace the full dark mode color tokens**

Find the `.dark` or `@dark` block. Replace ALL dark mode color tokens with:

```css
--background: #0c0a09;
--foreground: #f5f5f4;
--card: #1c1917;
--card-foreground: #f5f5f4;
--popover: #1c1917;
--popover-foreground: #f5f5f4;
--primary: #fb7185;
--primary-foreground: #1c1917;
--secondary: #292524;
--secondary-foreground: #f5f5f4;
--muted: #292524;
--muted-foreground: #a8a29e;
--accent: #292524;
--accent-foreground: #f5f5f4;
--destructive: #ef4444;
--destructive-foreground: #fef2f2;
--border: rgba(168, 162, 158, 0.15);
--input: rgba(168, 162, 158, 0.15);
--ring: #fb7185;
--chart-1: #fb7185;
--chart-2: #a8a29e;
--chart-3: #fecdd3;
--chart-4: #d6d3d1;
--chart-5: #fda4af;
```

- [ ] **Step 3: Update radius token**

Replace the `--radius` variable:

```css
--radius: 0.75rem;
```

Keep this the same — the card radius override (`rounded-[1.25rem]`) will be applied per-component, not globally.

- [ ] **Step 4: Remove any hardcoded purple/gradient references in globals.css**

Search for any `#8455ef`, `#ba9eff`, `#9bffce`, or purple-related values in globals.css and remove them. The only accent color should now flow through `--primary`.

- [ ] **Step 5: Commit**

```bash
cd frontend/next-app && git add src/app/globals.css && git commit -m "style: swap color palette from purple to warm rose/stone"
```

---

## Task 4: Icon Migration (All 14 Files)

**Files:**
- Modify: All 14 files listed in the File Map under "Icons"

This task replaces every `lucide-react` import with `@phosphor-icons/react`. Each file is a sub-step.

- [ ] **Step 1: MobileNav.tsx**

Replace:
```tsx
import { Menu, X } from "lucide-react";
```
With:
```tsx
import { List, X } from "@phosphor-icons/react";
```

Then replace all `<Menu` JSX with `<List`. Add `size={20} weight="regular"` to both `<List` and `<X` if not already sized.

- [ ] **Step 2: theme-toggle.tsx**

Replace:
```tsx
import { Moon, Sun } from "lucide-react";
```
With:
```tsx
import { Moon, Sun } from "@phosphor-icons/react";
```

Add `size={20} weight="regular"` props to both icons. Remove any `className="h-[1.2rem] w-[1.2rem]"` sizing (Phosphor uses the `size` prop instead).

- [ ] **Step 3: LoginPage.tsx**

Replace:
```tsx
import { ArrowRight, Clock3, Music2, Sparkles } from "lucide-react";
```
With:
```tsx
import { ArrowRight, Clock, MusicNote, Sparkle } from "@phosphor-icons/react";
```

Then in JSX: `<Clock3` -> `<Clock`, `<Music2` -> `<MusicNote`, `<Sparkles` -> `<Sparkle`. Add `size={20} weight="regular"` to each.

- [ ] **Step 4: StatsCard.tsx**

Replace:
```tsx
import { LucideIcon } from "lucide-react";
```
With:
```tsx
import { IconProps } from "@phosphor-icons/react";
```

Update the `icon` prop type from `LucideIcon` to `React.ComponentType<IconProps>`. Update any JSX rendering of the icon to pass `size={20} weight="regular"`.

- [ ] **Step 5: ProfilePage.tsx**

Replace:
```tsx
import { ArrowRight, History, PlayCircle, Youtube } from "lucide-react";
```
With:
```tsx
import { ArrowRight, ClockCounterClockwise, PlayCircle, YoutubeLogo } from "@phosphor-icons/react";
```

Then in JSX: `<History` -> `<ClockCounterClockwise`, `<Youtube` -> `<YoutubeLogo`. Add `size={20} weight="regular"` to each.

- [ ] **Step 6: MetronomeWidget.tsx**

Replace:
```tsx
import { Minus, Plus } from "lucide-react";
```
With:
```tsx
import { Minus, Plus } from "@phosphor-icons/react";
```

Add `size={16} weight="regular"` to both (these are small inline controls).

- [ ] **Step 7: TunerWidget.tsx**

Replace:
```tsx
import { Mic, MicOff } from "lucide-react";
```
With:
```tsx
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
```

Then in JSX: `<Mic` -> `<Microphone`, `<MicOff` -> `<MicrophoneSlash`. Add `size={20} weight="regular"`.

- [ ] **Step 8: SessionSetupForm.tsx**

Replace:
```tsx
import { Youtube, Upload } from "lucide-react";
```
With:
```tsx
import { YoutubeLogo, UploadSimple } from "@phosphor-icons/react";
```

Then in JSX: `<Youtube` -> `<YoutubeLogo`, `<Upload` -> `<UploadSimple`. Add `size={20} weight="regular"`.

- [ ] **Step 9: PracticeMedia.tsx**

Replace:
```tsx
import { Youtube, Upload } from "lucide-react";
```
With:
```tsx
import { YoutubeLogo, UploadSimple } from "@phosphor-icons/react";
```

Same replacements as SessionSetupForm.

- [ ] **Step 10: LocalAudioPlayer.tsx**

Replace:
```tsx
import { Music, Pause, Play, Upload } from "lucide-react";
```
With:
```tsx
import { MusicNote, Pause, Play, UploadSimple } from "@phosphor-icons/react";
```

Then in JSX: `<Music` -> `<MusicNote`, `<Upload` -> `<UploadSimple`. Add `size={20} weight="regular"` to each.

- [ ] **Step 11: TagSelector.tsx**

Replace:
```tsx
import { X, Plus, Tag as TagIcon } from 'lucide-react';
```
With:
```tsx
import { X, Plus, Tag } from "@phosphor-icons/react";
```

Then in JSX: `<TagIcon` -> `<Tag`. Add `size={16} weight="regular"` (these are small inline icons).

- [ ] **Step 12: LogoutButton.tsx**

Replace:
```tsx
import { LogOut } from "lucide-react";
```
With:
```tsx
import { SignOut } from "@phosphor-icons/react";
```

Then in JSX: `<LogOut` -> `<SignOut`. Add `size={20} weight="regular"`.

- [ ] **Step 13: practice-timer/page.tsx**

Replace:
```tsx
import { Play, Square, Pause } from "lucide-react";
```
With:
```tsx
import { Play, Square, Pause } from "@phosphor-icons/react";
```

Add `size={20} weight="fill"` to these (playback controls look better filled).

- [ ] **Step 14: recommendations/page.tsx**

Replace:
```tsx
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
```
With:
```tsx
import { SpinnerGap, Sparkle, ArrowRight } from "@phosphor-icons/react";
```

Then in JSX: `<Loader2` -> `<SpinnerGap`, `<Sparkles` -> `<Sparkle`. The `SpinnerGap` icon needs `className="animate-spin"` to replicate the Loader2 spinner behavior. Add `size={20} weight="regular"`.

- [ ] **Step 15: Verify build compiles with no lucide-react errors**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

Expected: No `lucide-react` import errors. There may be other warnings — that's fine.

- [ ] **Step 16: Commit**

```bash
cd frontend/next-app && git add -A && git commit -m "style: migrate all icons from Lucide to Phosphor Icons"
```

---

## Task 5: Create Motion Utilities

**Files:**
- Create: `frontend/next-app/src/lib/motion.ts`
- Create: `frontend/next-app/src/components/ui/motion-wrapper.tsx`

- [ ] **Step 1: Create spring configs and animation variants**

Create `frontend/next-app/src/lib/motion.ts`:

```typescript
export const springs = {
  default: { type: "spring" as const, stiffness: 100, damping: 20 },
  snappy: { type: "spring" as const, stiffness: 300, damping: 30 },
  gentle: { type: "spring" as const, stiffness: 50, damping: 15 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.default,
  },
};

export const scaleOnTap = {
  whileTap: { scale: 0.98, y: 1 },
  transition: springs.snappy,
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: springs.default,
};
```

- [ ] **Step 2: Create the stagger-reveal wrapper component**

Create `frontend/next-app/src/components/ui/motion-wrapper.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import React from "react";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerReveal({ children, className }: StaggerRevealProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

export const MotionDiv = motion.div;
```

- [ ] **Step 3: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd frontend/next-app && git add src/lib/motion.ts src/components/ui/motion-wrapper.tsx && git commit -m "feat: add motion utilities and stagger-reveal wrapper"
```

---

## Task 6: Update Shadcn Card Component

**Files:**
- Modify: `frontend/next-app/src/components/ui/card.tsx`

- [ ] **Step 1: Update card default styles**

In `card.tsx`, find the `Card` component's base className. Update it to use the new shadow and radius:

Replace the card's default class that contains `rounded-xl border` with:

```tsx
"rounded-[1.25rem] border border-border/50 bg-card text-card-foreground shadow-[0_20px_40px_-15px_rgba(28,25,23,0.05)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]"
```

This applies the warm tinted diffusion shadow and the slightly larger 20px radius.

- [ ] **Step 2: Commit**

```bash
cd frontend/next-app && git add src/components/ui/card.tsx && git commit -m "style: update card component with warm shadows and larger radius"
```

---

## Task 7: Update Shadcn Button Component

**Files:**
- Modify: `frontend/next-app/src/components/ui/button.tsx`

- [ ] **Step 1: Remove any gradient button styles**

Search for any `from-primary to-[#8455ef]` or similar gradient references across the codebase. These hardcoded purple gradients need to be replaced with solid `bg-primary` usage.

In `button.tsx`, verify the default variant uses `bg-primary text-primary-foreground` (it should already via Shadcn). No gradient needed — the rose-600 primary is strong enough on its own.

- [ ] **Step 2: Commit if changes were made**

```bash
cd frontend/next-app && git add src/components/ui/button.tsx && git commit -m "style: clean up button component, remove gradient references"
```

---

## Task 8: Dashboard Page Overhaul

**Files:**
- Modify: `frontend/next-app/src/app/dashboard/page.tsx`

This is the biggest layout change. The dashboard currently has a centered hero and a 4-equal instrument card grid. Both are banned by the taste skill.

- [ ] **Step 1: Add motion imports at top of file**

Add these imports to the top of `dashboard/page.tsx`:

```tsx
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";
import { springs } from "@/lib/motion";
```

- [ ] **Step 2: Restructure hero section — left-aligned**

Find the hero/welcome section (around lines 191-265). Replace centered text alignment with left-aligned:

- Remove any `text-center` or `items-center` on the hero container
- Use `text-left` alignment
- Keep the streak widget but move it to a secondary position (right side or below)
- Add asymmetric whitespace: the hero text should only occupy ~60% width on desktop

Example structure:
```tsx
<StaggerReveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
  <StaggerItem className="md:max-w-[60%]">
    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none text-foreground">
      {/* welcome text */}
    </h1>
    <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-[65ch]">
      {/* subtitle */}
    </p>
  </StaggerItem>
  <StaggerItem>
    {/* streak widget */}
  </StaggerItem>
</StaggerReveal>
```

- [ ] **Step 3: Restructure instrument cards — asymmetric bento grid**

Find the instrument cards grid (around lines 269-340). Replace the equal `grid-cols-2 lg:grid-cols-4` with an asymmetric bento layout:

```tsx
<StaggerReveal className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">
  {/* First instrument (primary) gets the large 2fr cell */}
  <StaggerItem className="md:row-span-2">
    {/* Large card for primary instrument */}
  </StaggerItem>
  {/* Remaining instruments in the 1fr cells */}
  <StaggerItem>{/* Card 2 */}</StaggerItem>
  <StaggerItem>{/* Card 3 */}</StaggerItem>
  <StaggerItem className="md:col-span-2">
    {/* Card 4 spans bottom two cells */}
  </StaggerItem>
</StaggerReveal>
```

On mobile (`grid-cols-1`), all cards stack vertically in a single column.

- [ ] **Step 4: Update stats footer — asymmetric sizing**

Find the stats row (around lines 343-370). Make the primary stat (total hours) wider:

```tsx
<StaggerReveal className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mt-8">
  <StaggerItem>{/* Total hours — large card */}</StaggerItem>
  <StaggerItem>{/* Streak */}</StaggerItem>
  <StaggerItem>{/* Favorite instrument */}</StaggerItem>
</StaggerReveal>
```

- [ ] **Step 5: Add font-mono to all numerical displays**

Find all numerical values in the dashboard (hours, streak count, session counts) and add `font-mono` class to their containers. For example:

```tsx
<span className="text-3xl font-bold font-mono tracking-tight">{stats.total_hours}</span>
```

- [ ] **Step 6: Remove any hardcoded purple colors**

Search the file for `#8455ef`, `#ba9eff`, `#9bffce`, `from-primary to-[`, or similar hardcoded purple gradients. Replace gradient buttons with solid `bg-primary`:

```tsx
// Before
className="bg-gradient-to-r from-primary to-[#8455ef]"
// After
className="bg-primary"
```

- [ ] **Step 7: Add active session banner slide-in animation**

Find the active session banner (around lines 164-188). Wrap it with a motion animation:

```tsx
<MotionDiv
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={springs.default}
>
  {/* existing banner content */}
</MotionDiv>
```

- [ ] **Step 8: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

- [ ] **Step 9: Commit**

```bash
cd frontend/next-app && git add src/app/dashboard/page.tsx && git commit -m "style: overhaul dashboard with bento layout, left-aligned hero, stagger reveals"
```

---

## Task 9: Practice Studio Overhaul

**Files:**
- Modify: `frontend/next-app/src/app/practice-timer/page.tsx`
- Modify: `frontend/next-app/src/components/studio/MetronomeWidget.tsx`
- Modify: `frontend/next-app/src/components/studio/TunerWidget.tsx`
- Modify: `frontend/next-app/src/components/studio/SessionSetupForm.tsx`

- [ ] **Step 1: Add motion imports to practice-timer/page.tsx**

```tsx
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";
import { springs } from "@/lib/motion";
```

- [ ] **Step 2: Update timer display typography**

Find the elapsed time display in the active session view. Update to use Geist Mono:

```tsx
<span className="text-5xl md:text-7xl font-mono font-bold tracking-tighter tabular-nums">
  {formatTime(elapsedSeconds)}
</span>
```

- [ ] **Step 3: Wrap setup form in stagger reveal**

Wrap the `SessionSetupForm` rendering section with a stagger reveal:

```tsx
<StaggerReveal className="space-y-6">
  <StaggerItem>
    <SessionSetupForm {...props} />
  </StaggerItem>
</StaggerReveal>
```

- [ ] **Step 4: Update active session layout to bento grid**

Find the active session widgets layout (metronome, tuner, media player section). Replace equal columns with asymmetric bento:

```tsx
<div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4">
  <div className="space-y-4">
    {/* Media player (larger) */}
    {/* Metronome widget */}
  </div>
  <div className="space-y-4">
    {/* Tuner widget */}
    {/* Take recorder */}
  </div>
</div>
```

- [ ] **Step 5: Update MetronomeWidget — font-mono BPM + spring beats**

In `MetronomeWidget.tsx`:

Update the BPM display to use `font-mono`:
```tsx
<span className="text-6xl font-mono font-bold tracking-tighter tabular-nums">{bpm}</span>
```

Update beat dots to use scale animation. Replace the static beat indicator styling with a dynamic class that scales the active beat:

```tsx
<div
  key={i}
  className={`w-3.5 h-3.5 rounded-full transition-all duration-100 ${
    isActive
      ? i === 0
        ? "bg-primary scale-125"
        : "bg-foreground scale-125"
      : "bg-muted-foreground/30"
  }`}
  style={{
    transform: isActive ? "scale(1.25)" : "scale(1)",
    transition: "transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)",
  }}
/>
```

- [ ] **Step 6: Update TunerWidget — font-mono frequency + smooth gauge**

In `TunerWidget.tsx`:

Update note display to use `font-mono`:
```tsx
<span className="text-5xl font-mono font-bold tracking-tighter">{note.note}{note.octave}</span>
```

Update frequency display:
```tsx
<span className="text-sm font-mono text-muted-foreground tabular-nums">{note.frequency.toFixed(1)} Hz</span>
```

Update the gauge indicator to use CSS transitions for smoother movement:
```tsx
style={{
  left: `${gaugePercent}%`,
  transition: "left 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
}}
```

- [ ] **Step 7: Remove hardcoded purple colors from all studio components**

Search all modified files for `#8455ef`, `#ba9eff`, `#9bffce`, gradient references. Replace with `bg-primary` or CSS variable equivalents.

- [ ] **Step 8: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

- [ ] **Step 9: Commit**

```bash
cd frontend/next-app && git add src/app/practice-timer/page.tsx src/components/studio/ && git commit -m "style: overhaul practice studio with bento layout, mono typography, spring beats"
```

---

## Task 10: Profile/Analytics Page Overhaul

**Files:**
- Modify: `frontend/next-app/src/components/profile/ProfilePage.tsx`

- [ ] **Step 1: Add motion imports**

```tsx
import { StaggerReveal, StaggerItem } from "@/components/ui/motion-wrapper";
```

- [ ] **Step 2: Wrap main sections in stagger reveal**

Wrap the top-level container sections (stats, charts, archive) in `StaggerReveal` with each major section as a `StaggerItem`.

- [ ] **Step 3: Update numerical displays to font-mono**

Find all session counts, hours, durations in the profile page. Add `font-mono tabular-nums` class:

```tsx
<span className="text-3xl font-bold font-mono tabular-nums">{totalSessions}</span>
```

Apply this to: total sessions count, session duration displays, any numerical stats.

- [ ] **Step 4: Update stats cards to asymmetric grid**

Replace any equal grid for stats with:

```tsx
<div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4">
```

- [ ] **Step 5: Add stagger reveal to session archive list**

Wrap the session list items in a stagger container so they reveal sequentially on load:

```tsx
<StaggerReveal className="space-y-3">
  {filteredSessions.map((session) => (
    <StaggerItem key={session.id}>
      {/* existing session card */}
    </StaggerItem>
  ))}
</StaggerReveal>
```

- [ ] **Step 6: Remove hardcoded purple colors**

Search for `#8455ef`, `#ba9eff`, gradient references. Replace with token-based colors.

- [ ] **Step 7: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

- [ ] **Step 8: Commit**

```bash
cd frontend/next-app && git add src/components/profile/ProfilePage.tsx && git commit -m "style: overhaul profile page with stagger reveals, mono numbers, asymmetric grid"
```

---

## Task 11: Auth Pages Overhaul

**Files:**
- Modify: `frontend/next-app/src/components/auth/LoginPage.tsx`
- Modify: `frontend/next-app/src/components/auth/RegisterPage.tsx`

- [ ] **Step 1: Add motion imports to LoginPage.tsx**

```tsx
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";
import { springs } from "@/lib/motion";
```

- [ ] **Step 2: Left-align LoginPage hero text**

Find the left-side marketing content (around lines 78-119). Remove any `text-center` or `items-center`. Make it left-aligned with asymmetric whitespace.

- [ ] **Step 3: Remove gradient blobs from LoginPage**

Find any decorative gradient blob elements (absolute positioned gradient circles/ellipses used as background decoration). Remove them entirely. Replace with clean negative space.

- [ ] **Step 4: Wrap LoginPage feature cards in stagger reveal**

```tsx
<StaggerReveal className="mt-8 space-y-4">
  <StaggerItem>{/* Feature card 1 */}</StaggerItem>
  <StaggerItem>{/* Feature card 2 */}</StaggerItem>
  <StaggerItem>{/* Feature card 3 */}</StaggerItem>
</StaggerReveal>
```

- [ ] **Step 5: Add liquid glass effect to login form card in dark mode**

Update the form card wrapper to include:

```tsx
className="rounded-[1.25rem] border border-border/50 bg-card p-8 shadow-[0_20px_40px_-15px_rgba(28,25,23,0.05)] dark:bg-card/70 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
```

- [ ] **Step 6: Update RegisterPage similarly**

Apply the same changes to RegisterPage.tsx:
- Add motion imports
- Wrap content in stagger reveal
- Remove any gradient blobs
- Clean typography
- Liquid glass form card in dark mode

- [ ] **Step 7: Remove hardcoded purple colors from both files**

Replace all `#8455ef`, gradient references, purple-tinted classes.

- [ ] **Step 8: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

- [ ] **Step 9: Commit**

```bash
cd frontend/next-app && git add src/components/auth/ && git commit -m "style: overhaul auth pages with left-aligned layout, stagger reveals, liquid glass"
```

---

## Task 12: Recommendations Page Overhaul

**Files:**
- Modify: `frontend/next-app/src/app/recommendations/page.tsx`

- [ ] **Step 1: Add motion imports**

```tsx
import { StaggerReveal, StaggerItem } from "@/components/ui/motion-wrapper";
```

- [ ] **Step 2: Wrap page content in stagger reveal**

Wrap the main layout grid with `StaggerReveal`, with each major section as a `StaggerItem`.

- [ ] **Step 3: Update layout to asymmetric split**

Find the two-column grid layout. Update from equal columns to asymmetric:

```tsx
<div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6">
```

Form on left (larger), output on right.

- [ ] **Step 4: Remove hardcoded purple colors**

Replace all `#8455ef`, gradient references with token-based colors.

- [ ] **Step 5: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
cd frontend/next-app && git add src/app/recommendations/page.tsx && git commit -m "style: overhaul recommendations page with asymmetric layout and stagger reveals"
```

---

## Task 13: Header/Navigation Overhaul

**Files:**
- Modify: `frontend/next-app/src/components/navigation/Header.tsx`
- Modify: `frontend/next-app/src/components/navigation/MobileNav.tsx`

- [ ] **Step 1: Update Header backdrop**

In `Header.tsx`, find the header element's className. Update the backdrop styling:

```tsx
className="sticky top-0 z-40 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl"
```

The key change: `bg-background/80 backdrop-blur-xl` (stronger blur, slightly more transparent).

- [ ] **Step 2: Update MobileNav overlay**

In `MobileNav.tsx`, update the mobile overlay to use the liquid glass effect:

```tsx
className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl dark:bg-background/70"
```

- [ ] **Step 3: Remove any hardcoded purple colors in navigation**

Check both files for purple references.

- [ ] **Step 4: Verify build**

```bash
cd frontend/next-app && npx next build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
cd frontend/next-app && git add src/components/navigation/ && git commit -m "style: update header and mobile nav with stronger backdrop blur"
```

---

## Task 14: Final Sweep — h-screen Audit + Cleanup

**Files:**
- Any file using `h-screen`

- [ ] **Step 1: Search for h-screen usage**

```bash
cd frontend/next-app && grep -r "h-screen" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Replace all h-screen with min-h-[100dvh]**

For every match found, replace `h-screen` with `min-h-[100dvh]` to prevent layout jumping on mobile browsers (iOS Safari address bar).

- [ ] **Step 3: Search for any remaining lucide-react references**

```bash
cd frontend/next-app && grep -r "lucide-react" src/ --include="*.tsx" --include="*.ts"
```

Fix any remaining imports.

- [ ] **Step 4: Search for any remaining hardcoded purple**

```bash
cd frontend/next-app && grep -rn "#8455ef\|#ba9eff\|#9bffce\|#58e7ab" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Fix any remaining hardcoded colors.

- [ ] **Step 5: Full build verification**

```bash
cd frontend/next-app && npx next build
```

Expected: Clean build with no errors.

- [ ] **Step 6: Commit**

```bash
cd frontend/next-app && git add -A && git commit -m "style: final sweep — fix h-screen, remove remaining hardcoded colors"
```

---

## Execution Summary

| Task | Description | Est. Files |
|------|-------------|-----------|
| 1 | Install deps | 1 |
| 2 | Swap font | 2 |
| 3 | Color tokens | 1 |
| 4 | Icon migration | 14 |
| 5 | Motion utilities | 2 (new) |
| 6 | Card component | 1 |
| 7 | Button component | 1 |
| 8 | Dashboard | 1 |
| 9 | Practice Studio | 4 |
| 10 | Profile | 1 |
| 11 | Auth pages | 2 |
| 12 | Recommendations | 1 |
| 13 | Header/Nav | 2 |
| 14 | Final sweep | varies |
