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

`npm run site` prints what the deploy inlines and stops if it passes the host's limit. The last build: 93 files
(6.87 MB) embedded in a 6.30 MB `app.mjs`; a deploy inlines 6.60 MB of the host's 8.00 MB. `site/` and `out/` are not
committed.

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
