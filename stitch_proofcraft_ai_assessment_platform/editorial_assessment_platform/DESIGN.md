---
name: Editorial Assessment Platform
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#45474c'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#051426'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b293b'
  on-tertiary-container: '#8290a6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#d5e3fc'
  tertiary-fixed-dim: '#b9c7df'
  on-tertiary-fixed: '#0d1c2e'
  on-tertiary-fixed-variant: '#3a485b'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  mono-cite:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-timestamp:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authoritative, publication-grade environment for high-stakes talent and leadership evaluations. The emotional baseline is measured, deliberate, and impartial—evoking the weight of an executive dossier or an institutional research report rather than modern consumer software.

The aesthetic fuses **Editorial Minimalism** with **Technical Rigor**:
- **Zero Gamification:** Eliminate progress fireworks, arbitrary metric badges, motivational streaks, or emotional iconography. Information is rendered without patronizing decorative layers.
- **Academic Restraint:** Visual weight is driven entirely by precise spatial composition, disciplined typographic scale, and structural rules rather than heavy cards, drop shadows, or high-saturation fills.
- **Institutional Trust:** High data density balanced with intentional white margins creates immediate psychological legibility. Citations, audit trails, and interview evidence read with the credibility of an archival document.

## Colors

The palette operates under absolute restraint. The product is exclusively light mode, relying on warm-gray paper tones and deep slate ink tones to reflect archival permanence.

- **Base Ground (`#F8F8F6` to `#FFFFFF`):** Background surfaces mimic unbleached archival stock. Crisp `#FFFFFF` is reserved strictly for evaluation sheets, comparison matrices, and modal viewports.
- **Primary Ink (`#1E293B`):** Deep charcoal slate serves as the primary text, structural border, and active state anchor. It avoids the harshness of pure `#000000` while maintaining WCAG AAA contrast.
- **Muted Slate Tiers (`#334155`, `#475569`):** Secondary and tertiary slates structure supporting prose, section subtitles, and structural metadata.
- **Neutral Boundary Grays (`#E2E2DF`, `#CBD5E1`):** Precise hairline dividers and inactive component boundaries.
- **Evidence & Verification Accents:** For validation states, use desaturated documentary tones—never bright signal colors. An austere oxblood/crimson (`#881337`) for risk, an understated olive/sage (`#14532D`) for verified benchmarks, and muted amber (`#78350F`) for flagged review.

## Typography

Typography establishes an uninterrupted line between editorial journalism and evidentiary data science.

- **Primary Typeface (`Hanken Grotesk`):** Delivers clean horizontal metrics and neutral geometry. Used for executive summaries, narrative appraisals, and categorical headings. Renders long-form candidate analysis without visual fatigue.
- **Evidence Monospace (`JetBrains Mono`):** Applied systematically to non-narrative data: timestamps, assessment hash IDs, behavioral quotes, quantitative percentile scores, rubric criteria IDs, and versioning records.
- **Typographic Hierarchy & Case:** Section super-titles utilize `label-sm` rendered in uppercase with wide letter spacing. Running evaluation body text favors open line-heights (`26px` on `16px` font) to guarantee seamless scanning by C-level reviewers.

## Layout & Spacing

The layout is built upon an asymmetrical editorial grid engineered to support both wide tabular benchmarking and single-column narrative dossiers.

- **Grid Architecture:** 12-column desktop grid with a rigid 1200px report max-width container to preserve optimal line lengths (60–75 characters) for narrative blocks.
- **Dual-Pane Balance:** Split-screen assessment views allocate 7 columns to synthesis and findings, and 5 columns to real-time verification sources, raw transcripts, and rubric scoring sheets.
- **Rhythm & Whitespace:** Generous margins frame the page like formal stationery. Dense data clusters (such as scoring rubrics and competency matrices) are bounded by expansive exterior padding (`space-xl`), preventing visual overwhelm without compromising informational rigor.
- **Breakpoints:**
  - **Desktop (1024px+):** Full multi-pane reporting layouts with static sidebars and parallel evidence inspection.
  - **Tablet (768px - 1023px):** Sidebars collapse to top navigation; evidence streams collapse into inline expanders beneath respective criteria.
  - **Mobile (<768px):** Single-column stacked reading flow, with data tables converting to ordered definition lists.

## Elevation & Depth

Visual hierarchy is communicated through structural planes and linear delineation, deliberately avoiding decorative drop shadows or blurred glassmorphism.

- **Zero-Shadow Rule:** No standard drop shadows (`box-shadow: none`). The platform rejects floating, weightless surfaces in favor of anchored, tactile clarity.
- **Low-Contrast Hairlines:** Elevation boundaries and component enclosures use continuous 1px borders in neutral slate (`#E2E2DF`). Layering is defined by crisp, interlocking rectangular regions.
- **Surface Tiering:**
  - **Base Document Canvas:** Warm Gray `#F8F8F6`.
  - **Report Sheets & Panels:** Crisp Paper White `#FFFFFF`.
  - **Data Tables & Inset Code/Evidence Blocks:** Archival Tint `#F1F1EE` with `#E2E2DF` bounding strokes.
- **Modal & Focused Overlays:** Modals do not float over a blurred background. They sit against an opaque, low-luminance backdrop overlay (`rgba(30, 41, 59, 0.45)`) bounded by a distinct 1px `#1E293B` stroke.

## Shapes

The geometric architecture relies on disciplined, structural angles.

- **Restrained Corner Radius:** Standard interactive controls, summary cards, and data matrices are capped at `0.25rem` (4px). This soft corner softens harsh corners while maintaining an authoritative, architectural profile.
- **Pills Prohibited:** Pill-shaped buttons (`border-radius: 9999px`) are strictly forbidden; they convey playful, casual software archetypes incompatible with formal evaluation.
- **Dividers & Structural Rules:** Dividers are single-pixel, non-breaking lines. Inner tables use collapsed borders (`border-collapse: collapse`) with squared inner corners.

## Components

### Buttons & Actions
- **Primary:** Solid `#1E293B` background, white text, 4px border radius, 0px 8px padding (`label-md`). Hover transitions subtly to `#334155`. Never uses gradients or glow states.
- **Secondary / Outline:** White background with a 1px border in `#CBD5E1`, `#1E293B` text. Active states introduce a 1px solid `#1E293B` outline.
- **Document Action:** Minimal text link with an inline JetBrains Mono glyph (e.g., `[Export PDF]`, `[View Transcript]`), underlined on hover with a 1px border offset.

### Inputs & Assessment Form Controls
- **Fields:** Single-line text and memo inputs feature an archival ground (`#FFFFFF`), a hairline `#CBD5E1` border, and sharp interior padding. On focus, the field does not display a diffuse glow; it shifts crisply to a 1px `#1E293B` outline.
- **Checkboxes & Radios:** Sharp, precise 14px boxes. Checked state is indicated by an uncompromising solid `#1E293B` fill featuring a simple, centered white square or tick. No animations or bounce effects.

### Evidence Tags & Metadata Badges
- Replaces standard colorful SaaS status chips.
- Composed of a 1px bordered rectangle with a `#F1F1EE` fill, utilizing `JetBrains Mono` at `11px`.
- Status indicators rely on textual precision (e.g., `STATUS: VERIFIED`, `SCORE: 88/100`, `N=14 EVALUATORS`) instead of ambiguous color dots.

### Tables & Matrices
- Table headers are uppercase (`label-sm`), styled with a `#F8F8F6` background and a solid 1px bottom border in `#1E293B`.
- Row cells use fixed heights, strict vertical alignment, and subtle hover highlights (`#F8F8F6`). Numeric data aligns right and is rendered in `JetBrains Mono`.

### Evidence Annotation Block
- A specialized component designed to present interview excerpts, recorded responses, or external citations.
- Features a thick 2px left border in `#475569`, an inset `#F8F8F6` background, body text in `Hanken Grotesk`, and an evidentiary metadata footer in `JetBrains Mono` displaying timestamp, source ID, and integrity hashes.