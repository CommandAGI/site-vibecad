# VibeCAD — sheet VC-001, revision C

*The designer: an industrial designer who began as a draughtsman. The brief (CommandAGI
`docs/design/startup-redesign-2027.md` §4) gives the concept: a living engineering drawing sheet. Title block, zones,
revision letters, red-pencil markups. The viewport is the protagonist.*

## Concept

The whole site is one drawing sheet. A drawing is the most honest document a maker owns: every line is a fact with a
tolerance, and the notes say what is not known. So the page reads the way a drawing reads. A border with zone
letters and numbers frames the screen. The title block, bottom right, is the navigation. Each section is a sheet of
the set, with a sheet number. The marks of a person checking the drawing (vermilion circles, ticks, clouded
revisions) are the only decoration. The hero is not a picture of the product: it is a part the visitor turns,
resizes and checks, in the page.

## Type

- **Archivo** (variable, `wdth` 62–125, `wght` 100–900). Two voices from one family:
  - *Lettering* (labels, zone marks, the title block): `wdth` 62, `wght` 640, uppercase, tracking +0.08em. The
    condensed hand of a drawing's lettering.
  - *Display*: `wdth` 125, `wght` 220, sentence case, tracking −0.035em. Wide and thin, a pen-plotter line.
  - *Text*: `wdth` 100, `wght` 400, 17/27 px, `text-wrap: pretty`, never more than three sentences in a row.
- **Martian Mono** (`wdth` 75–112): dimensions, values, part numbers and code. Tabular figures by construction;
  `wdth` 75 for dimension text on the part.
- Scale: a perfect fourth (1.333), fluid with `clamp()` from 320 to 1440: 12 · 13.5 · 17 · 22.7 · 30 · 40 · 53 · 71 ·
  95 px. Headings `text-wrap: balance`. Real quotes, real × and Ø, real minus.
- Subset WOFF2 (Latin-1, punctuation, arrows, ×, Ø, ±, ✓, ✕), self-hosted, `size-adjust`-matched Arial fallback.
  Chinese falls to the system's CJK face on purpose; the drawing's construction stays.

## Colour (OKLCH, sRGB fallback; contrast measured on vellum `#eeece6`)

| token | OKLCH | hex | on vellum | use |
|---|---|---|---|---|
| `--vellum` | `oklch(94.1% 0.008 95)` | `#eeece6` | — | the sheet |
| `--vellum-2` | `oklch(90.5% 0.01 95)` | `#e2dfd6` | — | the grid, the title block cells |
| `--graphite` | `oklch(27.5% 0.005 145)` | `#272927` | 12.4 : 1 | lines, text, the primary stamp |
| `--graphite-2` | `oklch(47% 0.008 130)` | `#5d605b` | 5.4 : 1 | secondary text, construction lines |
| `--vermilion` | `oklch(66% 0.2 37)` | `#f65a35` | 2.8 : 1 | markups only (circles, ticks, clouds): never text |
| `--vermilion-ink` | `oklch(52% 0.16 35)` | `#b83a1b` | 4.9 : 1 | a markup's words, a failed check |
| `--blue` | `oklch(56% 0.11 250)` | `#347cbb` | 3.8 : 1 | dimension lines and arrowheads (non-text, 3 : 1 holds) |
| `--blue-ink` | `oklch(46% 0.11 250)` | `#25609a` | 5.5 : 1 | dimension values, links in text |
| `--verified` | `oklch(47% 0.1 152)` | `#286b44` | 5.6 : 1 | only a check that passed |

Media is graded into the sheet: saturation down, blacks lifted, warm paper. No gradients, no glow, no glass.

## Shapes, the one radius language

Zero radius everywhere. A control is a **stamp**: a rectangle with a 1.5 px graphite rule and one 45° chamfer on its
top-right corner (`clip-path`), a leading `▲` revision triangle. Primary: graphite fill, vellum letters. Hover: the
chamfer grows and the triangle turns vermilion. Focus: a dashed vermilion markup line 4 px out — designed,
visible, never removed. No shadows. Thick rules (1.5 px) for parts, hairlines (0.75 px) for construction.

## Layout

The sheet border is fixed: 28 px at 1440, 18 px at 768, 10 px at 390 and 320, with zone numbers across the top
(1–8; 1–4 on a phone) and letters down the left (A–F). A 5 mm grid (19 px) is printed faintly on the vellum.

- **2560**: content held to 1680 px, the border keeps to the viewport; the hero part grows to 1100 px.
- **1440**: the headline runs across the top in two lines; below it the live part (7 parts of 12) and, beside it, the
  lede, the stamp and the revision's notes (5 parts). The title block is fixed bottom right, 330 × 86 px: wordmark,
  drawing number, sheet n/5, revision, then the links and the languages.
- **768**: the part above, the headline below; the title block becomes a full-width strip at the bottom, 64 px.
- **390**: one column: the headline, the part (square, full width), its revision's notes and sliders at thumb reach,
  then the lede and the stamp; the strip holds the wordmark, the sheet number and a "Sheets" popover with the links
  and the languages. The headline narrows to `wdth` 88 to hold two lines.
- **320**: as 390, the display drops to 40 px, the zone marks to 1–3, the revision tabs stay one row (A B C).

## Motion grammar: draughting

Things are *drawn*, not faded: lines grow along their length (`stroke-dashoffset`), a dimension slides with its
value, a check ticks with one pencil stroke. Timing 240 ms, `cubic-bezier(.3,0,.1,1)`, like a drafting machine's arm
stopping on a detent. Scroll drives the hero through its three revisions (`animation-timeline: view()` where it
exists, an IntersectionObserver otherwise), and the revision tabs do the same by keyboard. The sheet number in the
title block counts with the scroll.

Reduced motion: no drawing and no scroll scenes; every revision is shown whole, the part holds still until dragged,
each video is its poster. Nothing flashes; the encoder refuses a clip with more than 3 luminance swings a second.

## Media plan (fal; NOTES.md has prompts, models and cost)

- *Sheet 2, fullscreen*: `plate-table`, a slow drift over a drafting table: vellum, pencil drawings, a milled
  bracket, one vermilion pencil. Kling 2.5 turbo pro, 5 s, played forward then back.
- *Sheet 5*: one frame of `plate-part` (a milled bracket and a caliper) as a still; the budget holds one clip.
- *Stills*: `still-lamp` (a desk lamp's parts laid out, the sheet's own example), `still-board` (a board and a
  pencil). Crops remove any lettering a model invented; two stills with invented lettering were not used (NOTES.md).
- Budget: the host inlines the whole site in 8 MB and the studio takes 6.6 MB, so all media together stays under
  about 0.5 MB: 1280 px AV1 with a 960 px H.264 fallback, WebP posters and stills. Every generated item is captioned "generated" where it
  shows; none stands for a customer, a user or a result.

## The signature moment

Revision A — **Understand**: a NEMA 17 motor bracket, drawn as a technical illustration (pale faces, graphite
edges, orthographic). Callouts with balloon numbers draw their leaders to the base, the upright, the pilot bore, the
M3 pattern and the table slots. Revision B — **Modify**: dimension lines appear; drag *t* (wall) or *Ø* (bore), or
change the material, and the part is rebuilt while the dimension text rides its line. Revision C — **Verify**: four
checks tick or fail in the page: bore clearance over the motor's 22 mm pilot, the ligament between the bore and the
bolts, deflection under a 20 N belt pull (cantilever, δ = FL³ / 3EI), mass. A failed check is circled in vermilion.
They are hand formulas, and the sheet says so; the studio's review measures real geometry.

## Sections (each says one thing)

0. **Hero, sheet 1** — "See what’s inside. Shape what’s next." + the part + revision tabs A B C + "Open the studio".
1. **Sheet 2** — fullscreen video: "Open an assembly. Take it apart." Three stamps: the desktop computer, the Corne
   study, your own GLB.
2. **Sheet 3** — composed plate: the parts still, and a description typed in mono becoming a parts list. "Describe a
   device. Get an editable study." Labeled: a model's study, illustrative.
3. **Sheet 4** — the board still and a drawn schematic: "Pins from the catalog. Unknown stays unknown." → Circuits.
4. **Sheet 5** — the part video beside a parts-list block of what exports: firmware, project, BOM, instructions.
5. **General notes** — numbered drawing notes: what is generated, what is measured, what is not wired yet.
6. **Revision table** (the footer): links, languages, "a company of CommandAGI".

## Don'ts

No rounded cards, no bento, no logo cloud, no testimonials, no gradient, no glass, no glow, no icon in a rounded
square, no tilted screenshot, no stock person. No vermilion text below 4.5 : 1. No claim the studio cannot back. No
video with sound, none autoplaying when reduced motion is asked for. Never a check that passes because it was told to.
