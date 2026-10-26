# deployment

The studio is live at https://vibecad.commandagi.app on CommandAGI's site hosting, deployed from this folder.

## what a deploy serves

A site there is one Worker. The pages are the Next.js static export (`next build`, `out/`); everything a page loads —
scripts, styles, fonts, the 3D models, the catalog data — is gzipped and embedded in the server module `app.mjs`
(`scripts/site-assets.mjs`), and the server answers those requests from memory (`server/assets.ts`). The reason is the
host's 8 MB limit on what a deploy inlines: inlined base64 costs a third more than the file, and the studio is about
10 MB of pages, scripts and geometry.

```bash
npm ci
npm run site     # next build + scripts/build-site.mjs → site/, which the deploy uploads
commandagi sites deploy site --prod
```

`npm run site` prints what the deploy inlines and stops if it passes the host's limit. The deploy itself must be given
the built folder (`commandagi sites deploy site --prod`): given the repository folder it runs `next build` and collects
`out/` whole, which is already over the limit. The last build: 115 files (7.75 MB) embedded in a 7.38 MB `app.mjs`; a
deploy inlines 7.89 MB of the host's 8.00 MB. `site/` and `out/` are not committed.

Serving detail that cost a deploy on 2026-10-26: Cloudflare compresses a Worker's response itself and does not take
the Worker's `content-encoding` at its word. A body already gzipped and marked `content-encoding: gzip` reached the
browser doubly compressed, and every script failed to parse. The server module therefore answers the whole file and
lets the edge compress it.

## the model key

The model calls run in `app.mjs` and read `OPENROUTER_API_KEY` from the site's environment; the browser never sees a
key (`docs/MODEL.md`). The key is set (2026-10-26, `--secret`), and the site redeployed after it:

```bash
commandagi sites env vibecad set OPENROUTER_API_KEY=… --secret   # applies to the next deploy
```

Without it `/api/status` answers `configured: false` and the studio says "the model is unavailable"; every other flow —
exploring an assembly, parts, the Corne study, Circuits, export — works without it.

## what was verified (2026-10-26)

A real browser check (Chrome for Testing, headless, a fresh profile, driven through the DevTools protocol;
`docs/evidence/live/2026-10-26-browser-check.json`) against the production deploy after the key was set:

- `/`, `/es/`, `/zh-Hans/` and `/circuits/`: 200, no page error, no console error, no failed request, no response of
  400 or more.
- The home page rendered its gallery (3 reference cards), the 3D previews, and the A/ES/文 picker.
- The main flow from a blank visit: Explore → open the saved assembly (the studio rendered its canvas) → ask the object
  assistant a question. The answer arrived in 21 s from `deepseek/deepseek-chat-v3.1` through the site's `/api/ask`
  route, so the server holds the key and the browser does not.
- `/es/` rendered Spanish (Explorar · Estudio · Circuitos), `/zh-Hans/` rendered Chinese.
- The studio's working chrome (Inspect, Ask VibeCAD, Sources, Review, Export and the part inspector) is still English in
  every locale; the gallery and the studio's opening copy are resolved.

## Export → CAD model

The studio writes its exact solids as a STEP AP214 assembly through CommandAGI's CAD kernel (`@classcad/smlibwasm`
0.5.0). The kernel's 9.4 MB WebAssembly file cannot ride in the Worker next to 7.89 MB of pages, so the browser fetches
the pinned published build on the first export and checks its SHA-256 before it runs (`lib/studio/exact-geometry.ts`).
This is the site's only external fetch; a visit that never exports a CAD model never makes it. The site's own tests run
the same kernel from `node_modules` and hold the bodies to analytic volumes and to three.js's bounds, including a
rotated component (`tests/exact-geometry.test.ts`).

Verified on the production deploy in the same browser check (`docs/evidence/live/2026-10-26-cad-export.json`): from a
blank visit, Explore Desktop / 01 → Export → CAD model wrote `desktop-studio-01.step`, 5,815,476 bytes, `ISO-10303-21;`,
1,224 `MANIFOLD_SOLID_BREP` bodies under 32 product names, with no page, console or request error.
