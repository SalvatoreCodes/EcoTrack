# Product

## Register

product

## Users

Indonesian urban commuters, Jabodetabek (Greater Jakarta) first. They move daily A→B by car, motorbike, bicycle, or public transit (TransJakarta, KRL, bus). They are on a phone, often mid-commute, deciding *how* to travel and *which way*. Many are climate-curious but time- and convenience-constrained: they will choose the greener option when it is shown clearly and isn't much less convenient. Outdoor daylight glare and one-handed use are the norm.

## Product Purpose

EcoTrack is a navigation app that ranks routes by **climate emission**, not just time. It shows a live emission/air-quality **heatmap** over the city, computes per-route CO₂, and offers an **AI chatbot** that explains *why* the recommended route is greener and suggests switching to bike or bus when that's genuinely more convenient. Success: users take measurably lower-emission trips and understand the tradeoff they're making — without feeling lectured.

## Brand Personality

Calm, credible, encouraging. Voice is a knowledgeable local guide, not an eco-preacher. It informs and nudges; it never guilt-trips. Numbers are honest (including when the green route costs you 6 extra minutes). Three words: **trustworthy · clear · quietly-optimistic**.

## Anti-references

- **Eco-shaming / guilt UI** — no wagging-finger copy, no "you destroyed the planet" framing.
- **Greenwash clipart** — no cartoon leaves, dewdrops, or stock-photo forests pasted over a UI.
- **Cluttered legacy nav apps** — no dense toolbar soup competing with the map.
- **Generic SaaS dashboard** — this is a moving-context map tool, not a metrics console.
- **Neon gamified fitness look** — emission is serious data, not a score to grind.

## Design Principles

1. **Emission is the hero, nagging is banned.** The lowest-CO₂ option leads, but copy informs ("saves 1.4 kg CO₂") instead of scolding.
2. **Glanceable while moving.** Map-first, large touch targets (≥44px), high outdoor contrast, one-handed reach. A driver reads it in a glance at a light.
3. **Trust through transparency.** Always pair the recommendation with the *why* — real numbers plus a plain-language AI explanation. Never a black box.
4. **Familiar affordances, green only where it means something.** Borrow Waze/Maps muscle memory (search bar, route cards, bottom sheet). Green carries data (emission state), not decoration.
5. **Convenience honesty.** Suggest bike/bus only when distance, time, and conditions make it practical. A bad suggestion burns trust faster than a missed one.

## Accessibility & Inclusion

- Target **WCAG 2.2 AA**. Body text ≥4.5:1; large/UI text ≥3:1; verified against tinted surfaces.
- **Colorblind-safe heat ramp.** The green→red emission ramp must also vary in luminance and always carry a numeric/text label or icon — never color alone (protects deuteranopia/protanopia users).
- **Outdoor legibility.** Tuned for high-glare daylight; avoid low-contrast "elegant" grays.
- **Touch targets ≥44×44px**; primary actions reachable one-handed.
- **Reduced motion** honored: heatmap pulses, sheet transitions, and route draws degrade to instant/crossfade under `prefers-reduced-motion`.
- Bilingual-ready copy (Bahasa Indonesia / English); keep strings externalizable.
