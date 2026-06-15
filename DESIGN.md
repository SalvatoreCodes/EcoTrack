# Design

> EcoTrack visual system. Derived from the open-design `clean` design-system token contract, re-themed earthy-green for a map-first mobile navigation app. Tokens live in `design/tokens.css`.

## 1. Visual Theme & Atmosphere

Map-first, calm, and credible. The map is the canvas; UI floats over it in light, lightly-tinted surfaces with soft elevation. Green is reserved for meaning — brand identity and the emission/air-quality heat ramp — never sprinkled as decoration. The mood: a trustworthy local guide in daylight, not a dashboard and not an eco-poster.

- **Style:** clean, minimal, high-contrast for outdoor use.
- **Color stance:** restrained neutrals + one forest-green brand accent + a semantic emission heat ramp.
- **Theme:** light default (commuters use it outdoors in daylight); dark mode is a later structural variant, not a default.

## 2. Color

Tokens: `design/tokens.css`.

- **Primary / accent:** `#1B7F4B` forest green — primary CTAs, current selection, brand.
- **Eco bright:** `#2ECC71` — positive emission states, success emphasis.
- **Surfaces:** bg `#FFFFFF`, surface `#F4F7F5`, surface-warm `#E8F0EA`, map canvas `#E9EEF0`.
- **Ink:** fg `#0F1F17` (deep forest near-black), fg-2 `#2F4339`, muted `#6B7D73`.
- **Status:** success `#168A46`, warn `#F5A623` (amber), danger `#E5484D`.
- **Emission / AQI heat ramp (low→high):** `#2ECC71` → `#A3D911` → `#F5C518` → `#F5A623` → `#E5484D`. Ramp also climbs then drops in luminance and is **always** paired with a numeric label or icon — never color alone (colorblind-safe).

Rules: accent green for primary action + selection + state only. Body copy on `--fg` for legibility (verified ≥4.5:1 on white and tinted surfaces). Gray-on-green is banned; tint toward the surface's own hue instead.

## 3. Typography

One family carries the product (per product register — no display/body pairing).

- **Family:** Spline Sans (display weight for headings/route times), Inter / system-ui fallback for body, labels, data. SF Mono for CO₂ figures where tabular alignment helps.
- **Scale (fixed rem, not fluid):** 12 / 14 / 16 / 18 / 22 / 28 / 34.
- **Weights:** 400 body, 500 labels, 600 headings/CTAs, 700 emphasis (route time, CO₂ totals).
- **Leading:** 1.5 body, 1.1 tight (numbers/headings). Display tracking −0.02em.

## 4. Spacing & Grid

8pt baseline grid. Tokens `--space-1…12` (4/8/12/16/20/24/32/48). Consistent internal padding per surface; vary spacing for rhythm, not by accident. Floating elements clear safe-area insets.

## 5. Layout & Composition

- **Map-first shell:** full-bleed map; UI floats — top search pill, bottom sheet for routes, FABs for layers/location.
- **Bottom sheet** is the primary surface for route comparison (drag handle, snap points).
- Hierarchy per screen: one clear primary action; the greenest route is visually first.
- Responsive behavior is structural (sheet snap points, safe-area), not fluid type.

## 6. Components

Every interactive component ships all states: default, hover/press, focus, active, disabled, loading (skeleton, not center spinner), error.

- **Search pill:** floating, rounded-pill, leading search icon, strong focus ring.
- **Route card:** mode icon + route name + time + distance + **CO₂ badge** (heat-ramp colored, labeled). Selected card uses accent border + tint.
- **CO₂ badge:** pill with heat color + numeric gCO₂/kg value + small leaf/exhaust icon. Color never stands alone.
- **AQI chip:** compact, current air quality + heat color + value.
- **FABs:** layers toggle, recenter — circular, ≥48px, elevated.
- **AI chat:** message bubbles (user = accent tint, assistant = surface), quick-reply chips, streaming indicator.
- **Empty/onboarding states** teach the interface; loading uses skeletons.

## 7. Motion & Interaction

- 150–250ms, ease-out (`cubic-bezier(0.2,0,0,1)`). Motion conveys state (sheet snap, route draw, selection), never decoration.
- Route polyline draws in once on compute; heatmap fades in. No orchestrated page-load sequences.
- All motion has a `prefers-reduced-motion: reduce` path (instant / crossfade).

## 8. Voice & Brand

Concise, literal UI labels. Encouraging microcopy that states the benefit ("Greener · saves 1.4 kg CO₂"), never scolds. Honest about tradeoffs ("+6 min, −38% emissions").

## 9. Anti-patterns

- No off-ramp colors when a token solves it. No gradient text, no glassmorphism-by-default, no side-stripe borders, no identical card grids, no per-section uppercase eyebrows.
- No cartoon-leaf eco clipart. No color-only emission encoding. No gray text on green. No nagging copy.
