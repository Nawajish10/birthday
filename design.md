# Birthday Design System — `design.md`

> **Purpose:** The canonical visual and interaction contract for AI agents working in the Birthday website repository. This file describes the shared design system and the `Love Theme` as one selectable theme. It must not force every page to use the Love Theme or remove other themes.

## 1. Non-negotiable principles

1. **Themes are interchangeable skins.** Theme choice changes tokens such as colors, surfaces, typography, shadows and decorative treatment. It must not change product behavior, routes, permissions, data contracts or component semantics.
2. **Preserve the existing app.** Inspect the repository before editing. Reuse existing layouts, routing, state, components and backend integrations. Make focused changes; do not replace large files wholesale without a clear need.
3. **Consistency beats invention.** Reuse shared tokens and components. Do not introduce one-off colors, random radii, inconsistent typography or a new design system for a single panel.
4. **Reference-led implementation.** When a reference image is supplied, match its hierarchy, proportions, spacing, color balance and component treatment. Do not copy text artifacts or inaccurate labels from generated images.
5. **Real states, honest UI.** Do not show successful uploads, messages, playback, encryption, presence or payments unless the underlying behavior is actually connected. Use explicit loading, empty, disabled, error and success states.
6. **Responsive and accessible by default.** Support keyboard focus, semantic controls, readable contrast, reduced motion, mobile layouts and sensible touch targets.
7. **No unrelated regressions.** Keep changes scoped to the requested feature and verify the surrounding experience.

## 2. Brand identity

**Product:** Birthday  
**Theme name:** Love Theme  
**Brand feeling:** intimate, cinematic, romantic, editorial, warm, premium, personal  
**Visual keywords:** deep plum, soft rose, blush, ivory, warm gold, lavender, soft ambient glow, rounded surfaces, fine borders, elegant serif display type and restrained sans-serif UI type.

The Love Theme is a design skin, not a mandate that every future theme use these colors. Other themes should implement the same token interface with their own values.

## 3. Love Theme tokens

Use CSS custom properties (or the repository's existing token system). These values are the approved baseline and may be tuned only to improve contrast or match the reference more closely.

```css
[data-theme="love"] {
  color-scheme: dark;
  --color-bg: #1A0F1F;
  --color-surface: #26132B;
  --color-surface-alt: #3A1F3B;
  --color-surface-raised: #2A1A32;
  --color-border: rgba(255, 214, 230, 0.16);

  --color-primary: #F7A8B8;
  --color-primary-strong: #F27A98;
  --color-secondary: #FFC6D4;
  --color-accent: #D4A47C;
  --color-text: #F8F1E9;
  --color-text-muted: #C5B3C9;
  --color-text-subtle: #A994B0;
  --color-lavender: #B894BC;
  --color-success: #9DC6AD;
  --color-warning: #E6C38A;
  --color-danger: #F28A9A;

  --gradient-background:
    linear-gradient(135deg, #1A0F1F 0%, #26132B 55%, #3A1F3B 100%);
  --gradient-card:
    linear-gradient(135deg, rgba(74, 43, 73, .92), rgba(38, 19, 43, .96));
  --gradient-accent:
    linear-gradient(110deg, #F7A8B8 0%, #FFB7C8 55%, #F8D0C4 100%);
  --gradient-gold:
    linear-gradient(110deg, #D4A47C 0%, #F2D8A9 100%);

  --font-display: "Playfair Display", Georgia, serif;
  --font-body: "Inter", "DM Sans", system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  --text-display: clamp(2rem, 4vw, 3.25rem);
  --text-h1: clamp(1.75rem, 3vw, 2.5rem);
  --text-h2: clamp(1.25rem, 2vw, 1.75rem);
  --text-h3: 1.125rem;
  --text-body: 0.9375rem;
  --text-caption: 0.75rem;
  --line-body: 1.65;

  --radius-sm: 0.625rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.25rem;
  --radius-xl: 1.75rem;
  --radius-pill: 999px;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  --shadow-card: 0 18px 50px rgba(0, 0, 0, .24);
  --shadow-glow: 0 0 28px rgba(247, 168, 184, .12);
  --focus-ring: 0 0 0 3px rgba(247, 168, 184, .38);
}
```

### Palette reference

| Token | Value | Use |
|---|---|---|
| Deep Plum | `#1A0F1F` | Primary page background |
| Dark Purple | `#26132B` | Main surfaces |
| Muted Rose | `#3A1F3B` | Elevated surfaces / subtle gradient |
| Blush Pink | `#F7A8B8` | Primary actions, active states |
| Soft Pink | `#FFC6D4` | Secondary highlights |
| Warm Gold | `#D4A47C` | Small premium accents, eyebrow labels |
| Ivory | `#F8F1E9` | Primary text |
| Lavender | `#B894BC` | Secondary text and decorative accents |

