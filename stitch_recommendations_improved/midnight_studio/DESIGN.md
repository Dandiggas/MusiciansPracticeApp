# Design System Document: The Studio Session

## 1. Overview & Creative North Star

### Creative North Star: "The Master Engineer"
This design system is built to transform a standard practice app into a high-performance professional studio environment. We are moving away from the "consumer-grade" look of bright blues and oranges toward a focused, immersive "dark mode" aesthetic. The goal is to provide a UI that recedes into the background, allowing the musician's performance to take center stage.

To move beyond the "template" look, this system utilizes **Intentional Asymmetry** and **Tonal Depth**. We reject rigid, boxed-in grids in favor of overlapping editorial layouts and dramatic typographic scales. Elements should feel like high-end rack-mounted gear: precision-engineered, layered, and premium.

---

## 2. Colors

The palette is anchored in deep charcoals and slates (`#060e20`), providing a "bottomless" depth that mimics a darkened recording booth. The "Performance" accent—Electric Violet (`#ba9eff`)—is used sparingly but vibrantly to highlight active states and primary actions.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be created through:
- **Tonal Shifts:** Placing a `surface-container-low` section against a `surface` background.
- **Negative Space:** Utilizing the spacing scale to create implicit grouping.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. Use the `surface-container` tiers to define depth:
- **Base Layer:** `surface` (`#060e20`) for the main app background.
- **Secondary Areas:** `surface-container-low` (`#091328`) for sidebars or secondary navigation.
- **Elevated Components:** `surface-container-high` (`#141f38`) for cards and active widgets.
- **Interaction Layers:** `surface-bright` (`#1f2b49`) for hovered states or focused input areas.

### The "Glass & Gradient" Rule
Floating elements (modals, tooltips, playback controls) should use **Glassmorphism**. Apply a semi-transparent `surface-container` color with a `backdrop-blur` of 12px–20px. For primary CTAs, use a subtle linear gradient from `primary` (`#ba9eff`) to `primary-dim` (`#8455ef`) at a 135-degree angle to add "soul" and dimension.

---

## 3. Typography

We use **Plus Jakarta Sans** for its crisp, geometric modernism. It balances technical precision with high readability.

*   **Display (lg/md/sm):** Used for session timers or high-impact practice stats. These should be tight-kerned (-2%) to feel authoritative.
*   **Headline (lg/md/sm):** Editorial in nature. Use these to introduce new sections or "Workspaces" within the app.
*   **Title (lg/md/sm):** Used for component headers (e.g., "Metronome" or "Tuner").
*   **Body (lg/md/sm):** Optimized for legibility. Always use `on-surface-variant` (`#a3aac4`) for secondary body text to maintain the dark-mode hierarchy.
*   **Label (md/sm):** All-caps, tracked out (+5%) for technical metadata like "BPM," "TIME SIG," or "KEY."

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. Instead of a shadow, place a `surface-container-lowest` (`#000000`) element inside a `surface-container-high` (`#141f38`) block to create a "recessed" effect—perfect for input fields or inset sliders.

### Ambient Shadows
When a component must float (e.g., a "Start Recording" button), use an extra-diffused shadow:
- **Blur:** 24px–40px
- **Opacity:** 6%–10%
- **Color:** Use a tinted version of the primary color (`#6e3bd7`) rather than pure black to simulate a light-emitting interface.

### The "Ghost Border" Fallback
If accessibility requires a border, use the `outline-variant` (`#40485d`) at **15% opacity**. This creates a "hint" of a boundary without breaking the immersive dark-mode flow. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary-dim`) with `on-primary` text. `rounded-md` (0.375rem).
- **Secondary:** Surface-bright background with `on-surface` text. No border.
- **Tertiary:** Transparent background, `primary` text, with a 20% opacity `primary` underline on hover.

### Cards & Lists
**Card Rule:** Never use divider lines. Separate content using `spacing-4` (1rem) of vertical white space or by nesting a `surface-container-highest` block within a `surface-container` parent. 

### Performance Widgets (Metronome/Tuner)
Use `surface-container-lowest` for the "well" of the widget. The "needle" or active indicator must use the `tertiary` Emerald Green (`#9bffce`) to provide a high-contrast visual cue that sits apart from the Violet brand accents.

### Input Fields
Inputs should feel "carved" into the interface. Use `surface-container-lowest` for the background, with a `ghost-border` that glows `primary` only when focused.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. A sidebar that is slightly "offset" from the main content creates a sophisticated, custom-built feel.
*   **Do** use the `primary` accent for data-rich moments (e.g., a waveform or a progress bar).
*   **Do** embrace negative space. If a screen feels "empty," increase the typography scale rather than adding more boxes.

### Don't
*   **Don't** use pure white (#FFFFFF) for text. Always use `on-surface` (`#dee5ff`) to prevent eye strain in studio environments.
*   **Don't** use standard 1px dividers between list items. Use tonal shifts or 8px gaps.
*   **Don't** use sharp corners. Use the `lg` (0.5rem) or `xl` (0.75rem) roundedness tokens to keep the interface feeling "molded" and tactile.
*   **Don't** mix the Electric Violet and Emerald Green accents in the same visual group. Violet is for **Action**; Emerald is for **Status/Precision**.