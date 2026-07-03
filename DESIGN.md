# VivaVoce — Design System: "The Practice Room" (v4)

The product is a sparring partner: playful, decisive, a little loud, never
corporate. The design system treats every surface as a **board of live tiles**,
because the strongest thing VivaVoce can show anyone is itself working.

Source of truth: [`packages/tokens`](packages/tokens) → consumed by
`apps/web/src/app/globals.css` and `apps/mobile/src/theme/index.ts`.

## Format (the part that is actually different)

- **No hero, no section stack.** The web landing is a dense bento board where
  every tile is a real widget: the live marking engine (mic + Gemini), an
  auto-touring radar of the five axes, a typewriter viva transcript, a practice
  heat grid, the modes index, and an inline waitlist.
- Inner pages open with one loud statement tile, then content on the canvas.
- Mobile keeps its tab structure; screens are built from the same tile language.

## Color

Bright porcelain canvas with flat, saturated tiles. No gradients, no glow, no
glass.

| Token        | Value     | Use                                    |
| ------------ | --------- | -------------------------------------- |
| `canvas`     | `#F2F1ED` | page background (true neutral, not cream) |
| `card`       | `#FBFAF8` | default tile                           |
| `card-2`     | `#E9E7E1` | inset / hover wash                     |
| `ink`        | `#161412` | text; the dark tile (`tile-ink`)       |
| `verm`       | `#FF4D26` | brand accent; the vermilion tile       |
| `cobalt`     | `#2E45FF` | second brand color; the data tile      |
| `butter`     | `#FFC838` | tiny highlights (active radar dot)     |
| `paper`      | `#FBFAF8` | text on dark/saturated tiles           |

Contrast rules: ink on canvas/card ≈ 13:1; ink on vermilion ≈ 5.6:1 (body-safe);
paper on cobalt ≈ 4.9:1; paper on ink ≈ 15:1. Never white text on vermilion at
body sizes.

## Type

- **Archivo** everywhere. Display = `Archivo Black`, `font-stretch: 118%`,
  tracking −0.025em (web `.display`; mobile `Archivo_900Black`).
- **JetBrains Mono** strictly for marks, timers, counters (`.marks`, tabular).
- No serif anywhere. Emphasis inside a headline = a rotated vermilion chip or
  weight, never a second family.

## Shape & materials

- One radius scale: tiles 24px, buttons pill, small elements 8–14px.
- Tiles: 1px `line` border on light; saturated tiles are borderless blocks.
- Hover: `tile-lift` (−4px translate + soft tinted shadow), pointer-fine only.
- Elevation is otherwise flat; hierarchy comes from color blocks and scale.

## Motion

Purposeful only, springs and quints, 140–300ms UI / up to 800ms for data
draws. Signature moves: the radar polygon drawing in, the score **stamp**
(scale 1.12 → 1, −2° rotate), the typewriter caret, press scale 0.97 on every
pressable. Everything honors `prefers-reduced-motion` (static renders, no
loops).

## Voice (copy)

Short, blunt, coach-like. "Say it out loud before it counts." "Get marked, not
graded." No em-dashes anywhere in visible copy. Scores are guidance, not
grades, and every surface that shows a score says so somewhere honest.

## Mobile mapping

Same tokens: `bg=canvas`, `surface=card`, `accent=verm`, `gravitas/info=cobalt`,
dark mode is the same room with lights off (`#121110` base). Record button is
vermilion; live states use the dedicated `live` red so recording is never
confused with the CTA. Tap targets ≥ 44pt; haptics accompany record start/stop
and score reveal.
