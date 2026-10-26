# VibeCAD redesign: notes (2026-10-26)

## Generated media (fal)

Made by `scripts/media.mjs` (prompts, models and inputs are in that file; every call is a line of
`redesign/media-log.jsonl`), encoded by `scripts/encode-media.mjs` into `public/media/` (sizes in
`redesign/encode-report.json`). Raw output is in `media-src/`, which git ignores.

| item | model | price | used as |
|---|---|---|---|
| `plate-table` | `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`, 5 s 16:9 | $0.35 | sheet 2, the fullscreen loop (AV1 174 KB, H.264 179 KB, poster 19 KB) |
| `plate-part` | same | $0.35 | sheet 5, one frame as a still (the budget has no room for a second clip) |
| `still-lamp` | `fal-ai/flux-pro/v1.1-ultra`, 4:5 | $0.06 | sheet 3 |
| `still-board` | same | $0.06 | sheet 4 (cropped below its invented silkscreen) |
| `still-parts` | same | $0.06 | not used: mostly empty paper, and lettering on a cable |
| `still-caliper` | same | $0.06 | not used: the caliper's display reads invented words |
| **total** | 6 calls | **$0.94** | of the $15 allowed |

Every generated item is captioned "Generated footage, not a product shot." or "Generated image." where it shows. No
person, hand, customer, logo or result is depicted.

Not fal: the hero part is three.js drawing the bracket of `lib/landing/bracket.ts`; its poster frame
(`public/media/bracket-poster.webp`), the share image (`public/og.png`, 1200 × 630) and the touch icon come from
`redesign/poster.py` rendering the built site. The wordmark and favicon are drawn SVG (`components/landing/Wordmark.tsx`,
`public/favicon.svg`).

## The deploy budget

The host inlines the whole site into one Worker and stops at 8 MB. The studio took 6.60 MB before; the site now takes
7.89 MB (`node scripts/build-site.mjs` prints it). That is why there is one clip, the H.264 fallback is 960 px, and
the stills are WebP under 30 KB. Anything added next must take something out.

## Self-scores (§5 step 4: average 8, nothing under 7)

From the screenshots in `redesign/shots/` (1440, 768, 390, 320, reduced motion, three revisions, every sheet, es and
zh-Hans):

| axis | score | why |
|---|---|---|
| art direction | 8 | one idea held everywhere: the sheet border, zones, title block, revision triangles, red-pencil markups; media graded into the vellum |
| brand specificity | 9 | nothing here would fit another site of the set: drafting lettering, hidden lines dashed, a parts list as the export table |
| product expression | 8 | the hero is a part you turn, size and check, with real formulas; every sheet links to a working studio route |
| interaction | 8 | scroll and keyboard both drive the revisions; sliders and material change the geometry live; checks flip at their formula's limit (tested) |
| technical quality | 7 | static, no layout shift from the poster, AV1 + H.264, subset fonts; three.js is the one heavy chunk, loaded after the poster; the deploy is near the host's cap |
| craft | 8 | measured contrast, designed focus (a dashed vermilion markup line), mobile title strip with a popover |
| **average** | **8.0** | |

## Measured

Live, https://vibecad.commandagi.app, `python3 redesign/perf.py` three times (cold cache, Chromium, 1.6 Mbps / 150 ms
RTT, 4× CPU, software WebGL: this machine's headless Chromium reaches no GPU; `redesign/perf-live.jsonl` holds the last
three runs):

| width | LCP (the hero's poster) | CLS | JS before interaction | three.js (lazy, after the poster) | slowest interaction |
|---|---|---|---|---|---|
| 1440 | 1016 – 2044 ms | 0.0005 | 164 KB | 186 KB | 144 – 256 ms |
| 390 | 928 – 1152 ms | 0.0019 | 164 KB | 186 KB | 64 – 80 ms |

The brief's bars: LCP < 2.5 s and CLS < 0.1 hold in every run; JS before interaction ≤ ~200 KB holds (it includes
Cloudflare's 10 KB beacon). INP < 200 ms holds at 390 and not in every 1440 run: the slowest interaction is a slider
step re-rendering a 0.9-megapixel canvas in software WebGL on a machine shared with other agents. The steps that cut
it are in: rebuilds coalesced to one per frame, the static sheets memoised, the pixel ratio capped at 1.5, the
revision jump instant. On a GPU it is unmeasured here.

- Contrast (WCAG): graphite 12.4 : 1, graphite-2 5.4, vermilion-ink 4.9, blue-ink 5.5, verified 5.6 on vellum;
  vermilion (2.8) and blue (3.8) carry no text.
- Flashes: 0 luminance swings over 10% in any second of the loop (the encoder refuses more than 3).
- Tests: `tests/landing-bracket.test.ts` (the four checks against their formulas, the limits), `tests/site-assets.test.ts`
  (a video's type and byte ranges, which Safari needs), `tests/branding.test.ts` (every landing message in es and
  zh-Hans).
