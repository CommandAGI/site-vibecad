# VibeCAD: the audit before the redesign (2026-10-26)

What the site is, what works, what is a demo, and what it claims. The redesign keeps every row of the first table.

## Routes and what works on them

| route | what it is | works without a model | needs the server's model key |
|---|---|---|---|
| `/` (before: the studio itself) | becomes the landing sheet; the studio moves to `/studio/` | the hero part, its dimensions and its checks run in the page | — |
| `/studio/`, `/es/studio/`, `/zh-Hans/studio/` | the studio: Explore (desktop computer, mechanical keyboard, Corne study, Stack-chan, GLB import), Studio (describe → assembly), Review, the companion | select, isolate, hide, explode, orbit, build guide, GLB import, share link, undo/redo | describe a device, ask, redesign, visual review |
| `/studio/?example=corne`, `?example=keyboard`, `?example=motion-fan`, `?workspace=explore\|studio`, `?part=`, `?library=`, `#device=` | deep links into the studio | yes | — |
| `/circuits/` | Circuits: derived components, catalog pins, wiring, 3D / illustration / schematic views, firmware, BOM, export | yes | derive from a description |
| `/evaluate/` | the engineering evaluation (a local tool) | yes | — |
| `/api/*` | ask, catalog, compile, constraints, design-sources, device, project, redesign, review, status (`server/index.ts`) | catalog, status | the rest |
| `/es/`, `/zh-Hans/` | the landing in Spanish and Chinese; the A / ES / 文 picker | yes | — |

## What is a demo and what is real

- Real: the catalog of sourced CAD parts (KiCad models, licences in `public/catalog/licenses`), the Corne keyboard's
  source CAD, the Stack-chan board (Apache-2.0), GLB import (actual meshes), the share link, exports (Arduino
  firmware, project JSON, BOM, assembly instructions).
- Generated: a described device is an illustrative design study made by a model; electrical compatibility and
  physical fit still need verification (the studio's own help says so).
- The landing hero's part is a parametric bracket built in the page; its checks are hand formulas (edge distance,
  bore clearance, mass, a cantilever deflection estimate), labeled as such. It is not the studio's review.
- Not wired: CommandAGI's geometry kernel (README). Nothing is fabrication-ready by default.

## Claims the site makes, and their source

| claim | source |
|---|---|
| "Describe a part, get an editable model" | `app/api/device`, `lib/studio/device-generation.ts` |
| "Open an assembly and take it apart" | `components/studio/DeviceStudio.tsx`, `lib/studio/import.ts` |
| "Check the dimensions and motion it has to meet" | `lib/studio/design-constraints.ts`, `motion-verification.ts` |
| "Measurements decide, not the prose" | `lib/studio/review-acceptance.ts` (before/after evidence) |
| "An unknown pin mapping stays unresolved" | `lib/studio/circuit-derive.ts` |

No customers, users, logos, ratings, press or results are claimed, and none are added.

## Brand assets before

Oxanium (variable), a dark header, blue `#1aa3ff` accents, 12 px radii, lucide icons, the VibeCAD face companion.
The redesign keeps the companion (it is a feature) and replaces the shell's type and colour with the brief's.
