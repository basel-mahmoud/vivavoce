---
name: VivaVoce
description: "The viva room, seen from the hot seat. Say it out loud before it counts."
colors:
  # Brand: never flips with the colour scheme
  verm: "#ff4d26"
  cobalt: "#2e45ff"
  cobalt-deep: "#1f31c9"
  butter: "#ffc838"
  pass: "#2c7a4b"
  coal: "#161412"
  coal-2: "#24211e"
  paper: "#fbfaf8"
  paper-mut: "#c9c4bb"
  line-dark: "rgb(251 250 248 / 0.16)"
  # Themed: light scheme (default)
  canvas: "#f2f1ed"
  card: "#fbfaf8"
  card-2: "#e9e7e1"
  ink: "#161412"
  ink-mut: "#625e57"
  ink-faint: "#726c64"
  line: "#dedbd3"
  verm-text: "#b8310f"
  focus: "#2e45ff"
  # Themed: prefers-color-scheme dark ("lights off")
  canvas-night: "#121110"
  card-night: "#1b1917"
  card-2-night: "#262320"
  ink-night: "#f2efea"
  ink-mut-night: "#aaa49b"
  ink-faint-night: "#7f796f"
  line-night: "rgb(242 239 234 / 0.12)"
  verm-text-night: "#ff6a45"
  focus-night: "#8391ff"
  tile-ink-night: "#0b0a09"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.6rem, 6.2vw, 5.4rem)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.028em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.3rem, 5vw, 4.4rem)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.028em"
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.375
    letterSpacing: "-0.008em"
  lead:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.625
    letterSpacing: "-0.008em"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "-0.008em"
  label:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.333
    letterSpacing: "-0.008em"
  button:
    fontFamily: "Archivo, system-ui, -apple-system, sans-serif"
    fontSize: "0.975rem"
    fontWeight: 700
  marks:
    fontFamily: "JetBrains Mono, ui-monospace, 'SF Mono', monospace"
    fontWeight: 700
    letterSpacing: "0"
    fontFeature: "'tnum' 1"
rounded:
  inset: "1rem"
  tile: "1.5rem"
  field: "2rem"
  pill: "9999px"
spacing:
  gap: "0.75rem"
  gutter-phone: "1rem"
  gutter: "1.25rem"
  tile-pad: "2rem"
  field-pad: "3rem"
  section-phone: "6rem"
  section: "8rem"
components:
  button-primary:
    backgroundColor: "{colors.verm}"
    textColor: "{colors.coal}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  button-primary-hover:
    backgroundColor: "#ff6a45"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  button-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.coal}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  button-paper-hover:
    backgroundColor: "{colors.butter}"
  button-line-dark:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.5rem"
  input-pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.coal}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    height: "3.25rem"
    padding: "0 1.25rem"
  answer-box:
    backgroundColor: "rgb(251 250 248 / 0.04)"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.inset}"
    padding: "0.875rem 1rem"
  tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "2rem"
  field-coal:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "3rem"
  field-verm:
    backgroundColor: "{colors.verm}"
    textColor: "{colors.coal}"
    rounded: "{rounded.field}"
    padding: "3rem"
  chip-subject:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.875rem 1.25rem"
  paddle:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.paper}"
    typography: "{typography.marks}"
    rounded: "{rounded.pill}"
    size: "3rem"
  paddle-hot:
    backgroundColor: "{colors.verm}"
    textColor: "{colors.coal}"
  stamp:
    backgroundColor: "{colors.verm}"
    textColor: "{colors.coal}"
    typography: "{typography.marks}"
    rounded: "{rounded.inset}"
    padding: "0.625rem 1rem"
  nav-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "3.5rem"
  speech-bubble:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "0.75rem 1rem"
---

# Design System: VivaVoce

This file describes the web app (`apps/web`), "The Viva Room" (web theme v5). The tokens live in `apps/web/src/app/globals.css`: themed `--vv-*` custom properties on `:root` with a `prefers-color-scheme: dark` block, and brand colours, radii and easings in its `@theme inline` block. The 3D room's material constants live in `apps/web/src/components/room/Scene.tsx`. The mobile app has not been redesigned yet; see Mobile mapping at the end.

## Overview

**Creative North Star: "The Viva Room"**

The site is the viva room seen from the hot seat. A panel of five examiners, one per scoring axis, sits across a long cobalt bench, and the visitor is the candidate. Every surface is a piece of that room: the porcelain canvas is the floor, the colour fields are its furniture, score paddles carry the marks, and the live marking engine is the moment you answer for real. The voice is short, blunt and coach-like: "Say it out loud before it counts."

The material is flat and physical. Colour fields are solid coal, vermilion, cobalt and butter on a porcelain ground; the 3D figures are clay-matte; shadows are soft, pulled in and tinted with the ground colour. There is no glow, no glass and no gradient text. State is carried by pose, height and shape as well as colour: the examiner in focus rises and leans in while the others recede, a paddle flips up to show its mark, the live rail tick stands tall. Lights off (the dark scheme) is the same room with a warm lamp over the bench.

Density is low and loud: one display headline, one lead paragraph, then the working thing (the scroll story, the live engine, a looping mode preview). Motion is quick and decisive. A quint ease-out (0.23, 1, 0.32, 1) drives nearly everything, at 150 to 320ms for UI and up to 760ms for words rising into focus. A strong in-out (0.77, 0, 0.175, 1) is kept for things that swap or travel (a card flipping, a field widening), and linear timing for constant motion (the subject marquee, a countdown). Under reduced motion the room stands still with its panel marked, loops freeze, scroll reveals are off and headline words simply fade in. The world refuses the category default for AI voice products: a dark landing with a glowing voice orb, a centred headline and a feature grid. Scores are guidance, not grades, and every surface that shows one says so.

**Key Characteristics:**
- Porcelain floor, cobalt bench, five clay-matte examiners: the room is the brand.
- Solid colour fields with fixed text pairings; brand colours never flip with the scheme.
- Vermilion marks whoever is speaking, the axis to fix first, and the primary action.
- Archivo Black expanded for every headline; JetBrains Mono only for marks, counts and countdowns.
- State reads in pose, height and shape, never in colour alone.
- Only what floats casts a shadow; no glow, no glass, no gradient text.
- Every loop, reveal and scroll story has a still, complete reduced-motion version.

## Colors

A porcelain-and-coal room with three saturated brand colours, used as solid fields and marks, never as washes or gradients.

Keys ending in `-night` are the `prefers-color-scheme: dark` values of the themed tokens (canvas, card, card-2, ink, ink-mut, ink-faint, line, verm-text, focus). The brand tokens (verm, cobalt, cobalt-deep, butter, pass, coal, coal-2, paper, paper-mut, line-dark) never flip. `line-dark` is not a night value: it is the hairline inside coal fields in both schemes. There is no manual theme switch; the scheme follows the operating system.

### Primary
- **Speaking Vermilion** (#ff4d26): the brand. Primary buttons, the closing call-to-action field, the score stamp, the paddle of the axis to fix first, the live mic ring, the scroll-rail tick in focus, the text caret and selection, the headline chip, the footer wordmark. In the 3D room it is worn only by the examiner who is speaking or in focus. As text it appears only on coal (5.55:1).
- **Burnt Vermilion** (#b8310f) and **Lamp Vermilion** (#ff6a45 at night): `verm-text`, vermilion for words on the canvas and on cards: the speaker label in speech bubbles, follow-up tags, "Fix first" axis names in previews, the hover colour of ruled index titles, form errors on cards (5.33:1 by day, 6.65:1 at night).

### Secondary
- **Bench Cobalt** (#2e45ff): the bench's top slab, the cobalt examiner's family, cobalt fields and chips (always paper text, 5.90:1), progress bars in previews, and the focus ring by day.
- **Deep Bench Cobalt** (#1f31c9): the bench block beneath the top slab in the 3D room.
- **Lifted Cobalt** (#8391ff): `focus-night`, the focus ring at night.

### Tertiary
- **Service-Bell Butter** (#ffc838): the service bell, the butter examiner, butter fields and chips (always coal text, 11.87:1), the plain-words highlight in the Explain preview, and the hover of paper buttons on coal.

### Semantic
- **Pass Green** (#2c7a4b): success only, as a fill carrying paper (5.04:1): the waitlist confirmation badge and the improved mark in the Explain preview. It is not a text colour on themed surfaces: on `card-2` it reads 4.25:1 by day and 2.97:1 at night.

### Neutral
- **Porcelain Floor** (#f2f1ed) and **Lights-Off Floor** (#121110): `canvas`, the page background and the room's floor; the 3D canvas is transparent over it.
- **Porcelain Card** (#fbfaf8) and **Night Card** (#1b1917): `card`, tiles, the scrolled nav pill, speech bubbles, the panel rail.
- **Worn Porcelain** (#e9e7e1) and **Night Wash** (#262320): `card-2`, hover washes, the sliding nav hover pill, inactive chips, the FAQ disclosure button, the countdown track.
- **Ink** (#161412) and **Night Chalk** (#f2efea): `ink`, primary text on canvas and cards, and the ink button (14.86:1 or better by day, 13.63:1 or better at night).
- **Graphite** (#625e57) and **Night Graphite** (#aaa49b): `ink-mut`, lead paragraphs, body copy in tiles, secondary labels (5.21:1 or better on every light surface, 6.32:1 or better at night).
- **Faint Graphite** (#726c64) and **Night Faint** (#7f796f): `ink-faint`, icons and the scrollbar thumb.
- **Porcelain Hairline** (#dedbd3) and **Night Hairline** (rgb(242 239 234 / 0.12)): `line`, 1px tile borders, ruled index rows, section rules, the loop track, rail ticks at rest.
- **Coal** (#161412): the dark field (`tile-ink`), paddles, the answer bubble, and text on vermilion and butter.
- **Blackout Coal** (#0b0a09): `tile-ink-night`, the coal field at night, one step below the night floor and edged with the night hairline so it still reads as a field.
- **Panel Coal** (#24211e): `coal-2`, the panel side of the live engine and face-down paddles.
- **Placard Paper** (#fbfaf8): text on coal (17.61:1) and cobalt, name placards, paper buttons and the email field.
- **Stone** (#c9c4bb): `paper-mut`, secondary text on coal (10.58:1, 9.23:1 on Panel Coal) and the stone examiner's clay.
- **Chalk Hairline** (rgb(251 250 248 / 0.16)): `line-dark`, hairlines and rules inside coal fields.

### Named Rules
**The Never-Flip Rule.** Brand colours keep their value in both schemes, so each field has one text pairing: coal on vermilion (5.55:1) and butter (11.87:1), paper on cobalt (5.90:1) and coal (17.61:1). On cobalt, secondary text stays paper, because stone falls to 3.55:1 there.

**The Two Vermilions Rule.** Brand vermilion is a field, a mark, or text on coal. Vermilion words on the canvas or a card use `verm-text`, because brand vermilion on porcelain is 2.93:1.

**The Faint-Is-Not-Text Rule.** `ink-faint` is for icons and the scrollbar only. It falls below 4.5:1 on the light wash (4.20:1) and on night surfaces (4.06:1 to 4.37:1), so words use `ink` or `ink-mut`.

## Typography

**Display Font:** Archivo, variable with the `wdth` axis (with system-ui, -apple-system, sans-serif)
**Body Font:** Archivo
**Label/Mono Font:** JetBrains Mono at 500 and 700 (with ui-monospace, 'SF Mono', monospace), for marks only; labels are Archivo

**Character:** One grotesque does all the talking. Archivo at 900 and stretched to width 118 reads like a verdict said out loud; at normal width it stays plain and quick to read. JetBrains Mono is the scoreboard: tabular, and only ever a number.

### Hierarchy
- **Display** (900, width 118, clamp(2.6rem, 6.2vw, 5.4rem), line-height 0.94, -0.028em): page openers (loosened to line-height 1) and the home hero (clamp(2.7rem, 5.6vw, 5.4rem)). Words rise into focus on load, 70ms apart.
- **Headline** (900, width 118, clamp(2.3rem, 5vw, 4.4rem), 0.94, -0.028em): every section h2. The same voice at smaller clamps names the axes in captions and the index, the contact inboxes, and the mobile menu links (1.6rem).
- **Title** (900, normal width, 1.25rem, 1.375): card and step titles, axis questions, FAQ questions (up to 1.6rem), the question in the live engine (up to 1.85rem).
- **Lead** (500, 1.125rem, 1.625; 1.25rem in page openers): the one paragraph under each headline, about 36rem wide, in `ink-mut`.
- **Body** (400, 1rem, 1.625): tile and card copy. Long-form legal and editorial prose runs at 1.0625rem with 1.75 line-height and a 68ch measure, with vermilion list markers and link underlines.
- **Label** (700, 0.75rem, sentence case): speaker tags, rail labels, subject tags, guidance notes (at 600). Footer group titles step up to 0.875rem. Always Archivo.
- **Marks** (JetBrains Mono 700, tabular figures, no tracking): paddle numerals, stamps (2.25rem to 3rem), character counts, countdowns, step numbers, "Question 1 of 10" counters.

Text carries -0.008em tracking site-wide; headings balance their line breaks and paragraphs avoid orphans.

### Named Rules
**The Expanded Voice Rule.** Archivo at 900, width 118 and -0.028em is for headlines and names: every h1 and h2, axis and inbox names in ruled indexes, the mobile menu links and the wordmark. Titles, body and labels stay at normal width.

**The Marks-Only Mono Rule.** JetBrains Mono appears only where a number is being marked, counted or counted down. Labels, tags, captions and navigation are Archivo, sentence case, bold.

**The Stamped Chip Rule.** Emphasis inside a headline is one word set as a vermilion chip with coal text, rotated -2° with a 0.18em radius, stamped in after the words rise. Never a second typeface, italics, or gradient text.

## Layout

A centred container, 1360px at most, with 1rem side gutters on phones and 1.25rem from 640px. Full-width colour fields (the live engine, coal and vermilion fields, the footer) tighten to a 0.75rem gutter on phones so they read as solid blocks. Sections are 6rem apart on phones and 8rem from 640px; page openers clear the floating nav with 8rem of top space (10rem from 640px).

Sections share one shape: a headline, one lead paragraph, then the working thing 3rem below. Two-column splits are asymmetric (1.2fr to 1fr, 0.9fr to 1.3fr, 1.45fr to 1fr). Ruled indexes (the axes, the contact inboxes, the FAQ) separate rows with a 1px `line` instead of boxing them. Sibling blocks sit 0.75rem apart.

The home page opens on a pinned scroll story: a 520svh section holding a 100svh sticky stage. The 3D room fills the stage edge to edge; captions take the left 46% from 768px and sit above the room on narrower screens. Breakpoints are Tailwind's defaults (640, 768, 1024, 1280px). When the stage is about square or taller (aspect ratio below 1.05) the room switches to a compact camera: a steeper angle, so the bench top fills the height a narrow width leaves over, and a 40° lens instead of 46°.

### Named Rules
**The Fitted Frame Rule.** The camera is fitted, never hand-tuned: at every stop it solves for the distance and lens shift that fit the panel into the free region beside the captions (wide screens) or below their measured bottom edge (narrow screens). Nothing the story needs is cropped or covered by text at any aspect ratio.

## Elevation & Depth

Depth comes from the room itself and from colour fields, not from stacked cards. Tiles and fields resting on the canvas are flat: a 1px hairline on light tiles, solid colour on fields. Shadows appear only on things that float over the room or the page. They are soft, pulled in with negative spread, and tinted with the ground colour (`--vv-shadow`: 22 20 18 by day, pure black at night). In the 3D room a soft contact shadow sits under the bench; by day a directional key light casts the clay shadows, and at night a warm lamp (#fff1dc) pools on the bench and panel while a warm backlight (#ffe6cc) rims each figure against the dark.

### Shadow Vocabulary
- **Caption float** (`box-shadow: 0 6px 14px -8px rgb(var(--vv-shadow) / 0.35)`): axis caption tiles over the 3D stage.
- **Bubble float** (`box-shadow: 0 10px 24px -14px rgb(var(--vv-shadow) / 0.55)`): examiner speech bubbles.
- **Pill float** (`box-shadow: 0 12px 32px -20px rgb(var(--vv-shadow) / 0.45)`): the nav pill once scrolled; the panel rail uses 0.5 alpha.
- **Sheet float** (`box-shadow: 0 24px 48px -24px rgb(var(--vv-shadow) / 0.5)`): the mobile menu sheet.
- **Answer float** (`box-shadow: 0 18px 40px -20px rgb(0 0 0 / 0.5)`): the coal answer bubble in the room.
- **Field ring** (`box-shadow: inset 0 0 0 1px rgb(22 20 18 / 0.18)`): the resting edge of the paper email field.

### Named Rules
**The Only-What-Floats Rule.** A shadow means "above the room". Tiles and fields resting on the canvas never take one, and no shadow is ever a hard offset.

**The One Light Rule.** No glow, no glass, no gradient text. The only light-emitting object is the candidate's mic ring, and only while it is listening.

## Shapes

Soft, heavy geometry. Containers are generously rounded rectangles: tiles 1.5rem, full-width colour fields 2rem (the four use-case fields in a row, 1.75rem), and elements set inside a tile 1rem. Everything you press is a full pill. Every mark lives in a circle: paddles, step numbers, the 404 digits. The stamp is the one tilted shape, a 1rem-rounded vermilion block at -2°. Borders are 1px hairlines on tiles, 1.5px on line buttons, and 2px dashed on face-down paddles. The focus ring is a 3px outline in `focus`, offset 3px, with an 8px radius on elements that have no radius of their own.

The 3D room speaks the same language: capsule bodies and sphere heads, a rounded bench, rounded paper placards, disc paddles with a paper rim.

### Named Rules
**The Paddle-Edge Rule.** A paddle keeps its edge on any ground: coal discs carry a paper rim in 3D, and a flat coal paddle on the night canvas turns paper.

## Components

### Buttons
Heavy, rounded and quick to press.
- **Shape:** full pill (9999px), 3rem tall by default, 3.25rem for hero and form actions, 2.25rem to 2.75rem in compact rows; 1.5rem side padding; Archivo 700 at 0.975rem; an optional 14 to 18px line icon with a 0.5rem gap.
- **Primary:** vermilion with coal text; hover lightens to #ff6a45.
- **Ink:** `ink` with `canvas` text, so it inverts at night; hover mixes 14% canvas into the ink.
- **Line:** transparent with a 1.5px `line` border and ink text; hover darkens the border to ink.
- **On coal fields:** paper buttons (coal text, hover butter) and line-dark buttons (1.5px border at 28% paper, paper text, hover full paper).
- **Press / Disabled:** every button scales to 0.97 on press (160ms, quint ease-out). Disabled drops to 50% opacity and stops scaling. Hover effects apply only on fine pointers.

### Chips
- **Subject chips:** pills (0.875rem by 1.25rem padding) pairing a bold 0.82rem subject tag with a bold question, in four tones: card with a hairline (`verm-text` tag), cobalt (paper tag), coal (vermilion tag), butter (coal tag at 70%). They run in two marquee rows that drift at a constant linear speed, speed up with scroll velocity, and pause on hover and off screen.
- **State chips:** small bold pills (0.875rem text) on `card-2` with `ink-mut`; the chosen one is ink with canvas text, as in the Flash Recall schedule.

### Cards / Containers
- **Tile:** `card` background, 1px `line` border, 1.5rem radius, 1.5rem padding on phones and 2rem from 640px. Flat unless it floats over the room.
- **Colour field:** coal (`tile-ink`), vermilion (`tile-verm`), cobalt or butter; 2rem radius; borderless by day; 1.75rem padding on phones, 3rem from 640px and up to 4rem from 1024px. Headlines in a coal field are paper, in a vermilion field coal.
- **Inset elements** (speech bubbles, the answer box, preview cards, the stamp, mode tabs): 1rem radius.

### Inputs / Fields
- **Email field:** a paper pill, 3.25rem tall with 1.25rem padding, coal text and a 1px inset ring; focus draws a 2px coal border. It sits on vermilion or a card under a bold "Your email" label, beside a coal Join button (on vermilion) or a primary one (on a card).
- **Answer box (on coal):** a 1rem-rounded box with a 4% paper wash and a `line-dark` border that brightens to half paper on focus and turns vermilion while the mic is listening. A mono character count sits bottom right.
- **Error:** bold 0.875rem text directly below the field: `verm-text` on cards, coal on vermilion, and a light vermilion (#ff9d82, 9.10:1) on coal.

### Navigation
- **Nav pill:** a floating 3.5rem pill inset 0.75rem from the top, holding the logo (a vermilion rounded-square V-mark with a coal check and cobalt sound arcs, beside "VivaVoce" in the display voice). Transparent at the top of the page; after 24px of scroll it becomes a card with a hairline and the pill float shadow. Links are bold 0.875rem `ink-mut`, turning ink on hover as a single `card-2` pill slides between them on a spring with no bounce. The current page carries a 2px vermilion bar. The primary early-access button closes the row.
- **Mobile:** a compact primary early-access pill (2.25rem tall, 0.82rem text, hidden below 360px wide) sits beside a 44px menu button, which opens a tile sheet of display-voice links (1.6rem, current page vermilion) and a full-width primary button. Focus moves to the first link; Escape closes the sheet and returns focus.
- **Panel rail:** on the home scroll story, five ticks in a card pill at the foot of the stage, one per examiner. The tick in focus fills with vermilion, growing from 40% to full height; the others show only the hairline track. Labels appear from 640px; a click jumps to that examiner.
- **Footer:** a coal field with the logo, a stone blurb, link groups whose underlines draw in vermilion on hover, the disclaimer ("A coaching tool, not an official examiner. Scores are guidance, not grades."), and the kinetic wordmark: "VivaVoce" in vermilion at up to 13rem, whose letters thin and narrow under a fine pointer (weight 900 to 460, width 118 to 70) and spring back.

### The Viva Room (signature)
The 3D room on the home page, seen from the candidate's chair.
- **Set:** a solid Deep Bench Cobalt block under a Bench Cobalt top slab. The canvas is transparent, so the porcelain floor is the page itself. Examiner clay is matte (roughness 0.62, no metal), rendered with neutral tone mapping so brand colours stay true and highlights never clip to white.
- **Panel:** five examiners, left to right Correctness, Clarity, Structure, Conciseness and Confidence, each a capsule body and sphere head with its own silhouette and clay: ink (#2b2723, lifted to #8c8378 at night), butter with a bun (#ffc838), porcelain and tallest (#eeeae2), stone with glasses (#c9c4bb), and cobalt, the smallest (#3347ff, lifted to #7280ff at night). The clays live in one place, `CLAYS` in `apps/web/src/components/room/data.ts`, shared by the scene and the phone key. Heads turn to follow the camera; they blink and breathe.
- **Focus:** the examiner in focus rises, leans in and swells 5% while its clay warms to vermilion; the others step back and shrink 3%. While the scroll story walks the panel they also fade toward the floor colour, 62% toward #e4e1da by day and 50% toward #7a7269 at night, so the one in focus owns the frame. During the hero's follow-up and over the marked bench at the end they fade only about a tenth, so the panel keeps its colours.
- **Paddles:** coal discs (#1b1917) with a paper rim and a paper JetBrains Mono 700 numeral, raised from behind the desk on a spring with a little overshoot, 90ms apart, and flipped to face the room. The weakest axis's paddle turns vermilion.
- **Props:** paper name placards in Archivo 900; the candidate's coal desk mic, whose vermilion ring glows and sends out three ripples only while listening; a butter service bell, struck on the follow-up (the button dips, the dome wobbles, a butter ring spreads); a stack of notes with one vermilion line.
- **Story:** the first viewport opens on the marked panel, then plays scripted example rounds (ask, listen, mark, follow-up) with speech bubbles that type themselves out behind a vermilion caret, labelled "Example round. Scores are guidance, not grades." Scrolling walks the camera down the panel, one examiner and caption per axis (each caption's mark is labelled "Example" under its disc), then rises over the whole marked bench, where the example label returns. Rounds play only while the hero is on screen and the tab is visible.
- **Phones:** every camera stop is fitted to the band left between the caption and a key under the room: five clay discs with a hairline ink ring, one per examiner and named, that show the marks once the panel has marked (the weakest in vermilion) and again at the end. Speech bubbles drop a size (0.85rem text, 0.625rem by 0.875rem padding) so they clear the hero's call to action.
- **Fallbacks:** without WebGL, a flat cobalt bench with coal paddles, each with the room's paper rim, and paper placards. Under reduced motion the room stands still with its panel marked, and the five axes follow as plain tiles.

**The Speaker Wears Vermilion Rule.** In the room, vermilion is worn only by the examiner who is speaking or in focus and by the paddle of the axis to fix first. At rest, every examiner wears its own clay.

### Live Marking Engine (signature)
The real evaluator, playable inside a coal field: the candidate's side (the question, the answer box, Speak and Mark buttons) and the panel's side on Panel Coal (1.5rem radius).
- **Paddles:** five circles, face-down as Panel Coal with a dashed paper edge (pulsing while the panel confers), flipping up over 650ms, 80ms apart, to show a paper face with a coal mark. The weakest turns vermilion and grows 12%. When the quick check cannot judge an axis, that paddle stays down with a note.
- **Verdict:** a vermilion stamp with the overall mark in mono ("/100 overall"), "Fix first:" with the axis in vermilion, one improvement under a `line-dark` rule, then "Scores are guidance, not grades." and who marked it.
- **Mic:** the Speak button carries a coal disc with the mic icon. While listening it becomes a paper Stop button, the answer border turns vermilion, and on fine pointers a live waveform (analysed in the browser with about 60ms attack and 300ms release) draws in paper, turning vermilion when loud, while a vermilion ring swells with the level.

### Score Surfaces
**The Guidance Note Rule.** Any surface that shows a mark (paddles, stamps, captions, index rows, previews) carries "Scores are guidance, not grades." or labels its marks as an example, within the same view.

## Do's and Don'ts

### Do:
- **Do** set every h1 and h2 in the expanded display voice: Archivo 900, width 118, -0.028em.
- **Do** pair text by field: coal on vermilion and butter, paper on cobalt and coal; use `verm-text` for vermilion words on the canvas or a card.
- **Do** say "Scores are guidance, not grades." or label the marks as an example on every surface that shows a score.
- **Do** carry state in pose, height and shape as well as colour: paddles rise and flip, the live rail tick stands tall, the weakest examiner leans in.
- **Do** ease entrances and state changes with the quint ease-out (0.23, 1, 0.32, 1), and keep the strong in-out (0.77, 0, 0.175, 1) for things that swap or travel.
- **Do** scale every button to 0.97 on press, and keep hover effects to fine pointers.
- **Do** give every loop, reveal and scroll story a still, complete version under prefers-reduced-motion.
- **Do** keep a paddle's edge visible on whatever ground it sits on.

### Don't:
- **Don't** use glow, glass (backdrop blur) or gradient text; the only light-emitting object is the live mic ring.
- **Don't** put a shadow on a tile or field resting on the canvas, and never use a hard offset shadow.
- **Don't** set labels, tags or captions in JetBrains Mono; mono is for marks, counts and countdowns.
- **Don't** put a kicker or eyebrow above a headline.
- **Don't** set paper text on vermilion (3.17:1) or coal text on cobalt (2.98:1).
- **Don't** dress an examiner in vermilion at rest; vermilion is for whoever is speaking or in focus.
- **Don't** use em-dashes in visible copy.
- **Don't** use `ink-faint` for words.

## Mobile mapping

**Status: the mobile app (`apps/mobile`) still follows the previous "Practice Room" (v4) tokens, not the Viva Room.** It stays that way until the mobile app is redesigned. Nothing above applies to mobile yet, and mobile tokens should not be changed to match this file in the meantime. The mobile values are hard-coded in `apps/mobile/src/theme/index.ts`. Older notes name `packages/tokens` as their source, but that package currently holds an earlier palette and neither app imports it; only a web unit test does.

Practice Room mapping, kept as written: `bg=canvas`, `surface=card`, `accent=verm`, `gravitas/info=cobalt`, dark mode is the same room with lights off (`#121110` base). Record button is vermilion; live states use the dedicated `live` red so recording is never confused with the CTA. Tap targets ≥ 44pt; haptics accompany record start/stop and score reveal.
