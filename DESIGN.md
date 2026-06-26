# VivaVoce — Design System: "Ink & Ember"

The name is Latin: *viva voce*, "with the living voice" — the oral examination.
The product should feel like a poised, exacting examiner who is on your side:
academically sharp, calm under pressure, warm rather than clinical. Not childish
edtech, not gamified Duolingo energy, not "AI-future" purple slop.

## Direction

**Editorial academia.** Think a well-set examination paper and a warm reading
room, rendered with Linear/Vercel-grade restraint. Type does the heavy lifting;
color is used sparingly and with intent; motion is physical and quiet.

Three non-negotiables:

1. **A serif carries the voice.** Display type is a serif (Fraunces) — most
   study apps default to Inter-everywhere, so a confident serif instantly reads
   as considered, human, and exam-room serious. UI/body is a clean grotesque.
2. **One signature accent, earned.** Ember-amber is the sound/voice signal —
   warmth, "speaking up," a waveform glowing. It appears on the single most
   important action in any view, never as decoration. Claret is the academic
   gravitas note, used in tiny doses (rules, marks, seals).
3. **Paper and ink, both directions.** A warm parchment light mode and a warm
   near-black dark mode — never cold #000/#fff. Everything is slightly warm.

## Color tokens

Semantic, theme-aware. Source of truth: [`packages/tokens`](packages/tokens).

### Core ramps (warm, never neutral-grey)

| Token            | Light            | Dark             | Use                              |
| ---------------- | ---------------- | ---------------- | -------------------------------- |
| `bg`             | `#F7F4ED` paper  | `#0C0A09` ink    | App background                   |
| `surface`        | `#FFFFFF`        | `#16130F`        | Cards, sheets                    |
| `surface-2`      | `#F1ECE1`        | `#1F1A14`        | Raised / inset                   |
| `border`         | `#E4DDCE`        | `#2A241C`        | Hairlines                        |
| `text`           | `#1A1714`        | `#F4EFE6`        | Primary text                     |
| `text-muted`     | `#6B6256`        | `#A89F90`        | Secondary text                   |
| `text-faint`     | `#9A9081`        | `#6E665A`        | Tertiary / captions              |

### Accents

| Token            | Value             | Use                                          |
| ---------------- | ----------------- | -------------------------------------------- |
| `ember`          | `#D9803B`         | Primary accent — the one important action    |
| `ember-soft`     | `#F2C28A`         | Ember tint (waveform fills, hover wash)       |
| `claret`         | `#7C2D3A`         | Academic gravitas — marks, seals, rules       |
| `sage`           | `#5C7A6B`         | Positive / "strong answer" semantic           |

### Semantic states

`success` → sage · `warning` → ember · `danger` → `#B23A3A` · `info` → a calm
slate `#52606D`. Recording-live uses a dedicated pulsing `live` = claret-red
`#B33A3A` so it is never confused with the ember CTA.

### Contrast

All text/background pairs target **WCAG AA (4.5:1)** for body and **3:1** for
large text and non-text UI. `text` on `bg` ≈ 13:1; `text-muted` on `bg` ≈ 4.7:1.
Ember is used for *fills with dark text* or *text on dark ink*, never small ember
text on paper (it fails AA). The audit lives in [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Typography

| Role        | Family                    | Notes                                   |
| ----------- | ------------------------- | --------------------------------------- |
| Display     | **Fraunces** (opsz, soft) | Headlines, hero, big numbers            |
| UI / body   | **Inter**                 | Everything functional                   |
| Mono        | **JetBrains Mono**        | Metrics, scores, timers, code-ish data  |

Scale (1.25 major-third, rem): `xs .75 · sm .875 · base 1 · lg 1.125 · xl 1.25 ·
2xl 1.5 · 3xl 1.875 · 4xl 2.5 · 5xl 3.5 · 6xl 4.75`. Display sizes use Fraunces
with tight tracking (`-0.02em`) and optical sizing on; body uses Inter at
`-0.011em`. Line-height: 1.5 body, 1.05–1.15 display.

## Spacing & radius

4px base grid: `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64 20=80 24=96`.
Radius: `sm 8 · md 12 · lg 16 · xl 24 · pill 999`. Cards default `lg`; sheets `xl`.

## Elevation

No glow. Soft, warm, layered shadows only (light mode); dark mode uses a 1px
top inner-highlight + border instead of shadow. Tokens: `e1` subtle, `e2` card,
`e3` popover, `e4` modal. Example `e2` light: `0 1px 2px rgba(26,23,20,.04), 0
8px 24px -12px rgba(26,23,20,.12)`.

## Motion

Physical, quiet, purposeful. Tokens (ms / easing):

- `fast 120 · base 200 · slow 360 · deliberate 560`
- Standard easing `cubic-bezier(.2,.8,.2,1)`; entrances `cubic-bezier(.16,1,.3,1)`.
- Recording waveform animates continuously while live; everything else animates
  only on state change.
- **Respect `prefers-reduced-motion`** everywhere — replace transforms with
  opacity, kill the looping waveform, keep functionality identical.

## The voice motif

A waveform is the product's signature. It appears as: the record button's living
core, a thin reactive bar during listening, and a frozen "fingerprint" of a saved
answer in history. It is generated from amplitude data on mobile and stylized SVG
on web. It is never a stock decorative blob.

## Interaction states (every interactive element designs all of these)

`default · hover · active/pressed · focus-visible (2px ember ring, 2px offset) ·
disabled · loading`. Plus session-specific states below.

## Voice-session states (first-class, fully designed)

`idle → listening → processing → feedback-ready → retry-needed`, with edge
states `offline · failed-upload · partial-transcript · ai-unavailable`. Each has
a defined copy, color, icon, motion, and a primary recovery action. See
[PRODUCT.md](PRODUCT.md) for the state machine.

## Mobile specifics

Haptics on record start/stop and on score reveal (`expo-haptics`). Tap targets
≥ 44pt. Dynamic-type aware. Dark mode follows system. Honors reduce-motion.
