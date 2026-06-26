# Accessibility audit notes

Target: **WCAG 2.2 AA** across web and mobile. Accessibility is a first-draft
requirement (see [AGENTS.md](../AGENTS.md)), not a retrofit.

## Web — implemented

- **Skip link** to `#main`; one logical `<h1>` per page; sectioned headings.
- **Focus**: a single 2px ember focus ring with offset on every interactive
  element (`:focus-visible`), never removed.
- **Colour contrast**: body text and UI tuned for AA in both themes; ember is used
  as a *fill with dark text* or text-on-ink, never small ember text on paper.
- **Reduced motion**: a global `@media (prefers-reduced-motion: reduce)` kills
  transitions/animations including the looping waveform; `Reveal` renders static.
- **Forms**: labelled inputs (visible or `sr-only`), `aria-invalid`, `role="alert"`
  on errors, `role="status"` on success; the honeypot is off the a11y tree.
- **FAQ** uses native `<details>/<summary>` — keyboard- and SR-operable with no JS.
- **Semantics**: nav landmarks, `aria-expanded` on the mobile menu, descriptive
  `aria-label`s on icon-only buttons.

## Mobile — implemented

- Tap targets ≥ 44pt (`minTapTarget`); buttons expose `accessibilityRole` +
  `accessibilityState` (disabled/busy/checked).
- The record control announces "Start/Stop recording"; the waveform is hidden from
  the a11y tree (`accessibilityElementsHidden`) as decorative.
- Score bars expose `accessibilityRole="progressbar"` with min/max/now.
- Reduced motion honoured via Reanimated's `useReducedMotion` (record pulse &
  waveform fall back to static).
- Dynamic type respected (RN font scaling); dark mode follows system.
- Haptics complement — never replace — visual state changes.

## Voice-first, with alternatives

The product centres on speaking, so alternatives are first-class: type an answer
when speech isn't possible, transcripts are always shown as text, and feedback is
available in writing as well as spoken.

## Known gaps / to do

- Automated axe-core sweep in CI (planned — see [TESTING.md](TESTING.md)).
- Screen-reader pass on the full session flow (VoiceOver/TalkBack) before launch.
- Verify contrast of the `text-muted` token on `surface-2` at small sizes.
