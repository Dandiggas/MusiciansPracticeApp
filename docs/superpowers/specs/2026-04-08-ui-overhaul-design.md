# UI Overhaul — Foundation Swap + Full Sweep

**Date:** 2026-04-08
**Skill driver:** `/design-taste-frontend` (DESIGN_VARIANCE: 8, MOTION_INTENSITY: 6, VISUAL_DENSITY: 4)
**Accent direction:** Deep Rose/Coral

## Current State (Violations)

| Rule | Current | Required |
|------|---------|----------|
| THE LILA BAN | Purple primary `#8455ef` | Zinc/Slate neutrals + single accent |
| Font | Plus Jakarta Sans | Geist + Geist Mono |
| Icons | Lucide React | Phosphor or Radix icons |
| Motion | CSS hover transitions only | Framer Motion spring physics, stagger reveals |
| Shadcn | Stock defaults | Customized radii, shadows, colors |
| Layout | 4-equal instrument card grid | Asymmetric bento grids |
| Centered heroes | Dashboard hero centered | Left-aligned or split-screen |

## Approach

**Foundation Swap** — Change design tokens (palette, font, shadows) in `globals.css` so every Shadcn component inherits the new look automatically. Then sweep each page for layout restructuring and motion.

## 1. Color Palette

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#f8f8f6` | Warm off-white |
| `--card` | `#ffffff` | Clean white surfaces |
| `--foreground` | `#1c1917` | Stone-950, warm near-black |
| `--muted` | `#f0eeeb` | Secondary surfaces |
| `--muted-foreground` | `#78716c` | Stone-500, secondary text |
| `--border` | `#e7e5e4` | Stone-200 |
| `--primary` | `#e11d48` | Rose-600 — the accent |
| `--primary-foreground` | `#fff1f2` | Rose-50 |
| `--accent` | `#f0eeeb` | Hover backgrounds |
| `--accent-foreground` | `#1c1917` | Text on accent |
| `--destructive` | `#dc2626` | Red-600, destructive actions only |
| `--destructive-foreground` | `#fef2f2` | Light on destructive |
| `--ring` | `#e11d48` | Rose-600 focus rings |
| `--secondary` | `#e7e5e4` | Stone-200 |
| `--secondary-foreground` | `#1c1917` | Stone-950 |

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0c0a09` | Stone-950 |
| `--card` | `#1c1917` | Stone-900 |
| `--foreground` | `#f5f5f4` | Stone-100 |
| `--muted` | `#292524` | Stone-800 |
| `--muted-foreground` | `#a8a29e` | Stone-400 |
| `--border` | `rgba(168, 162, 158, 0.15)` | Transparent warm gray |
| `--primary` | `#fb7185` | Rose-400 |
| `--primary-foreground` | `#1c1917` | Dark on light rose |
| `--accent` | `#292524` | Stone-800 |
| `--accent-foreground` | `#f5f5f4` | Stone-100 |
| `--destructive` | `#ef4444` | Red-500 |
| `--destructive-foreground` | `#fef2f2` | Light on destructive |
| `--ring` | `#fb7185` | Rose-400 |
| `--secondary` | `#292524` | Stone-800 |
| `--secondary-foreground` | `#f5f5f4` | Stone-100 |

### Chart Colors

| Token | Light | Dark |
|-------|-------|------|
| `--chart-1` | `#e11d48` | `#fb7185` |
| `--chart-2` | `#78716c` | `#a8a29e` |
| `--chart-3` | `#fda4af` | `#fecdd3` |
| `--chart-4` | `#57534e` | `#d6d3d1` |
| `--chart-5` | `#9f1239` | `#fda4af` |

## 2. Typography

- **Font family:** `Geist` (variable, via `next/font/google` or `geist` npm package)
- **Mono:** `Geist Mono` (for BPM, timers, numerical displays)
- **Display/Headlines:** `text-4xl md:text-6xl tracking-tighter leading-none font-bold`
- **Section headings:** `text-2xl md:text-3xl tracking-tight font-semibold`
- **Body:** `text-base text-muted-foreground leading-relaxed max-w-[65ch]`
- **Labels:** `text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground`
- **Numbers/Data:** `font-mono` class (Geist Mono)

## 3. Shadows & Surfaces

- **Card shadow (light):** `shadow-[0_20px_40px_-15px_rgba(28,25,23,0.05)]`
- **Card shadow (dark):** `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]`
- **Card border:** `border border-stone-200/50` (light) / `border-stone-800/50` (dark)
- **Card radius:** `rounded-[1.25rem]` (20px)
- **Button radius:** `rounded-lg` (unchanged)
- **Liquid glass (select panels):** `backdrop-blur-xl bg-white/70 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`

## 4. Motion System

### Dependencies

- `framer-motion` (install required)

### Spring Configs

```typescript
export const springs = {
  default: { type: "spring", stiffness: 100, damping: 20 },
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { type: "spring", stiffness: 50, damping: 15 },
} as const;
```

### Patterns

- **Page mount:** Staggered fade-up (`staggerChildren: 0.08`, children: `y: 20 -> 0, opacity: 0 -> 1`)
- **Button press:** `whileTap={{ scale: 0.98, y: 1 }}` with snappy spring
- **Card hover:** `whileHover={{ y: -2 }}` with default spring
- **List reorder:** `layout` + `layoutId` props with `AnimatePresence`
- **Perpetual:** Breathing pulse on status indicators, floating micro-animation on dashboard hero elements
- **All interactive motion components** must be isolated `'use client'` leaf components

### Performance Rules

- Perpetual/infinite animations: memoized (`React.memo`) in isolated client components
- Only animate `transform` and `opacity` — never `top`, `left`, `width`, `height`
- `useMotionValue` + `useTransform` for continuous hover tracking (never `useState`)
- `will-change: transform` used sparingly
- `AnimatePresence` wrapping dynamic lists

## 5. Icon Migration

- **Remove:** `lucide-react`
- **Install:** `@phosphor-icons/react`
- **Standard weight:** `weight="regular"` for navigation, `weight="light"` for decorative
- **Standard size:** `size={20}` (navigation), `size={24}` (feature icons), `size={16}` (inline)
- **Stroke consistency:** All icons use the same weight within a context

### Icon Mapping

| Usage | Lucide | Phosphor |
|-------|--------|----------|
| Guitar | `Guitar` | `GuitarIcon` or custom SVG |
| Music | `Music` | `MusicNote` |
| Play | `Play` | `Play` |
| Pause | `Pause` | `Pause` |
| Timer | `Timer` | `Timer` |
| Settings | `Settings` | `Gear` |
| User | `User` | `User` |
| Search | `Search` | `MagnifyingGlass` |
| Calendar | `Calendar` | `Calendar` |
| Chart | `BarChart` | `ChartBar` |
| Mic | `Mic` | `Microphone` |
| Volume | `Volume2` | `SpeakerHigh` |
| Sun/Moon | `Sun`/`Moon` | `Sun`/`Moon` |
| Menu | `Menu` | `List` |
| X (close) | `X` | `X` |
| ChevronDown | `ChevronDown` | `CaretDown` |
| Plus | `Plus` | `Plus` |
| Trash | `Trash2` | `Trash` |
| LogOut | `LogOut` | `SignOut` |
| Clock | `Clock` | `Clock` |
| Target | `Target` | `Target` |
| Flame | `Flame` | `Fire` |
| Award | `Award` | `Trophy` |
| TrendingUp | `TrendingUp` | `TrendUp` |
| Youtube | `Youtube` | `YoutubeLogo` |
| Upload | `Upload` | `UploadSimple` |
| Download | `Download` | `DownloadSimple` |

Full mapping will be verified against actual imports during implementation.

## 6. Per-Page Changes

### Dashboard

- **Hero:** Left-aligned welcome text. No centering. Asymmetric whitespace right side.
- **Instrument cards:** Bento grid — `grid-template-columns: 2fr 1fr 1fr` (row 1), `1fr 2fr` (row 2). Each card different size. Primary instrument card is the large 2fr cell.
- **Streak widget:** Breathing pulse animation on the flame/streak icon. Progress bar with spring-animated fill.
- **Stats row:** Asymmetric sizing — primary stat (total hours) gets 2x width.
- **Mount animation:** All sections stagger-reveal on load (fade-up, 80ms delay between).
- **Recent session banner:** Slide-in from top with spring physics.

### Practice Studio

- **Setup form:** Split layout — form controls left (60%), contextual info/preview right (40%).
- **Active session:** Bento grid for widgets (metronome, tuner, media player). Not equal columns.
- **Timer display:** Geist Mono, `text-5xl md:text-7xl tracking-tighter`. Subtle pulse animation while running.
- **Beat visualizer:** Spring-animated scale on active beat (not just color swap).
- **Metronome BPM:** Geist Mono display. Slider with spring-physics thumb.
- **Tuner gauge:** Smooth spring transition for needle movement.
- **Take recorder:** Waveform visualization stays. Stagger-reveal for take list.

### Profile/Analytics

- **Calendar heatmap:** Rose-tinted heat scale (stone-100 -> rose-200 -> rose-400 -> rose-600).
- **Charts:** Warm stone/rose palette. Bar chart with stagger-reveal animation.
- **Session archive:** List items stagger-reveal. Cards hover-lift on interaction.
- **Stats cards:** Asymmetric grid — not all equal size. Primary stat larger.
- **Numbers:** All numerical values in Geist Mono.

### Auth (Login/Register)

- **Layout:** Left-aligned hero text. Clean negative space. No gradient blobs.
- **Form card:** Subtle warm shadow. Liquid glass effect in dark mode.
- **Feature cards (left side):** Stagger-reveal on mount. Asymmetric sizing.
- **Inputs:** Warm stone borders, rose focus ring.

### Metronome Page

- **BPM display:** Geist Mono, large. Spring-animated on change.
- **Beat dots:** Spring-animated scale pulse on active beat.
- **Controls:** Tactile press feedback on tap tempo button.

### Tuner Page

- **Note display:** Geist Mono, centered large text.
- **Gauge:** Spring-animated needle. Color transitions (flat/sharp/in-tune) with smooth interpolation.
- **Status indicator:** Breathing pulse when actively detecting.

### YouTube Practice Page

- **Video player:** Maintained as-is (YouTube embed constraints).
- **Controls (A/B loop, speed):** Spring-animated toggles. Geist Mono for timestamps.
- **Layout:** Asymmetric — video takes 60%, controls take 40%.

### Recommendations Page

- **Layout:** Asymmetric split. Form on left (larger), output on right.
- **Goal presets:** Spring-animated selection. Active state with rose accent.
- **Output card:** Stagger-reveal for recommendation text lines.

## 7. Preserved (No Changes)

- All existing functionality and business logic
- API integration and auth flow
- LocalStorage persistence layer
- Next.js App Router structure
- Responsive breakpoint strategy (sm, md, lg, xl)
- Dark mode toggle via next-themes
- Shadcn component API (just re-themed via CSS variables)
- Chart.js for data visualization (just re-colored)
- Audio engine (metronome, tuner, pitch detection)

## 8. New Dependencies

| Package | Purpose |
|---------|---------|
| `framer-motion` | Spring physics, layout animations, stagger reveals |
| `@phosphor-icons/react` | Icon system replacement |
| `geist` | Font package (Geist Sans + Geist Mono) |

## 9. Removed Dependencies

| Package | Reason |
|---------|--------|
| `lucide-react` | Replaced by Phosphor icons |

## 10. Implementation Order

1. Install new deps, remove old deps
2. Swap font in `layout.tsx` (Geist + Geist Mono)
3. Update `globals.css` color tokens (full palette swap)
4. Update shadow/radius tokens
5. Create motion utility file (`lib/motion.ts`) with spring configs and reusable variants
6. Sweep Shadcn components for any hardcoded colors or shadows
7. Dashboard page — bento layout + motion
8. Practice Studio — bento layout + motion + mono typography
9. Profile/Analytics — chart colors + motion + mono numbers
10. Auth pages — layout + motion + liquid glass
11. Metronome/Tuner/YouTube pages — motion + mono typography
12. Recommendations page — layout + motion
13. Icon migration (all files) — Lucide to Phosphor
14. Final pass — verify dark mode, responsive, no regressions
