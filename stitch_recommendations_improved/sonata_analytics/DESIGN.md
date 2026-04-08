# Design System Document

## 1. Overview & Creative North Star: "The Virtuoso’s Study"

This design system is engineered to transform music practice from a chore into a high-performance ritual. Moving beyond the "utility app" aesthetic, we adopt a **Creative North Star of "The Virtuoso’s Study."** This vision combines the deep, focused atmosphere of a midnight recording studio with the crisp, clean precision of a modern conservatory's sheet music.

The experience is defined by a high-contrast editorial layout. We reject the "flat grid" in favor of intentional depth, using sophisticated tonal layering and asymmetrical compositions. We treat data not as static numbers, but as rhythmic elements that guide a musician’s progress. The result is a system that feels authoritative, encouraging, and premium.

---

## 2. Colors

Our color theory focuses on high-contrast focus zones and breathable data environments.

### The Palette
*   **Primary (`#000000`):** Used for high-impact focus areas (Hero Cards) to create a "deep stage" effect.
*   **Secondary (`#9d4300` / `#fd761a`):** The "Heat" of the practice. Used for active progress and time-based data.
*   **Surface (`#f7f9fb`):** The "Clean Slate." Provides a gallery-like backdrop for dashboards.

### Editorial Color Rules
*   **The "No-Line" Rule:** 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined through background color shifts. For example, a `surface-container-low` section should sit on a `surface` background to define its edge.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers of fine paper. 
    *   **Level 0:** `surface` (The canvas).
    *   **Level 1:** `surface-container-low` (Secondary content blocks).
    *   **Level 2:** `surface-container-lowest` (Interactive cards/white components).
*   **The "Glass & Gradient" Rule:** Floating elements or primary CTAs should utilize subtle gradients (Primary to `primary-container`) to avoid "dead" flat black. Apply `backdrop-blur` to floating navigation or overlays to maintain a sense of environmental continuity.

---

## 3. Typography

The typography is a dialogue between the expressive **Plus Jakarta Sans** and the functional **Manrope**.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Tempo Markers." Use high-scale weights for display titles to create an editorial, magazine-like feel. They should feel bold, intentional, and slightly condensed to command attention.
*   **Body & Labels (Manrope):** The "Sheet Music." Manrope provides exceptional legibility at small sizes for data points and instrument details.

**Hierarchy Strategy:**
*   **Display-LG (3.5rem):** Reserved for motivational hero text and major milestones.
*   **Title-LG (1.375rem):** Used for card titles. Set these in a heavier weight than the body to maintain a strong vertical rhythm.
*   **Label-SM (0.6875rem):** All-caps with increased letter-spacing (0.05rem) for metadata like "SESSION ARCHIVE" or "INSTRUMENT MIX."

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering**, creating a tactile experience that feels integrated rather than floating.

*   **The Layering Principle:** Depth is achieved by stacking surface tokens. A `surface-container-lowest` card placed on a `surface-container-high` background creates a natural lift.
*   **Ambient Shadows:** If a card requires a floating effect (e.g., a "Start Session" button), use a diffused shadow: `box-shadow: 0 12px 32px rgba(25, 28, 30, 0.06)`. The shadow must be tinted with the `on-surface` color, never pure grey.
*   **The "Ghost Border" Fallback:** For input fields or interactive zones where accessibility is paramount, use a "Ghost Border": the `outline-variant` token at **15% opacity**.
*   **Glassmorphism:** For the "Session Planning" overlays, use a semi-transparent `primary_container` with a 12px blur. This creates a focused "dark room" effect that draws the user’s eye away from the white dashboard background.

---

## 5. Components

### Buttons
*   **Primary:** High-contrast `primary` background. In Hero areas, use a subtle gradient. Corner radius: `full` for a modern, tactile feel.
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.

### Cards & Lists
*   **Rule:** Forbid the use of divider lines. 
*   **Implementation:** Separate list items (like the "Recorded Sessions") using `margin-bottom: 1rem` and a background shift to `surface-container-low`. The gap between items reveals the background color, creating a "cleaner" visual separation than a grey line.
*   **Padding:** Standardize on Spacing `6` (1.5rem) for internal card padding to ensure "breathing room" for data.

### Input Fields
*   **Style:** Minimalist. Use `surface_container_lowest` for the field background with a `sm` (0.25rem) corner radius.
*   **States:** On focus, transition the background to `surface_container_high` rather than adding a thick border.

### Music-Specific Components
*   **Progress Visualization:** Use the `secondary_container` (vibrant orange) for "Practice Time" bars. These should have `full` rounded corners to mimic the smooth flow of music.
*   **Session Hero Card:** Use the `primary_container` (Deep Navy) to house the "Current Session" or "Plan Session" UI. This creates a high-focus "dark mode" zone within a light-mode dashboard.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use white space as a structural element. If an element feels cramped, move up the Spacing Scale (e.g., from `10` to `12`).
*   **DO** use `secondary` (orange) sparingly. It is a "Success" and "Energy" color; overusing it dilutes its impact.
*   **DO** overlap elements slightly (e.g., a hero card overhanging a background section) to create architectural depth.

### Don't
*   **DON'T** use 100% opaque black for borders or lines. It creates "visual noise" that distracts from the music data.
*   **DON'T** use standard system fonts. Stick strictly to the Manrope/Plus Jakarta Sans pairing to maintain the premium editorial feel.
*   **DON'T** use harsh shadows. If you can see where the shadow starts, it’s too dark. Aim for "Ambient Glow" rather than "Drop Shadow."

---