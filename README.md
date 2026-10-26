# VibeCAD

**See what's inside. Shape what's next.**

VibeCAD is a conversational CAD studio. Describe a part and it builds an editable model; or open an assembly and take
it apart. Select a component, isolate it, hide it, ask about it, change it, and check the dimensions and motion it has
to meet before anything is built.

## Explore, modify, check

- **Explore:** open the desktop computer, the mechanical keyboard, the sourced Corne keyboard study, or an imported
  GLB assembly. Select, isolate, hide, explode, orbit and inspect each part.
- **Studio:** describe an object and the model builds it, with parts from a sourced CAD catalog. Edit a component, ask
  a question about it, animate a supported mechanism, and let the VibeCAD companion point at the detail it means.
- **Review:** render the actual geometry, ask the model to inspect it, and check the dimensional and motion
  requirements it must meet. A correction keeps before/after evidence, and the measurements decide, not the prose.
- **Circuits:** derive electronic components from the Studio object, see their catalog pins, edit the connections, and
  switch between the 3D, illustration and schematic views. An unknown pin mapping stays unresolved and is said so.
- **Build and export:** follow the assembly and wiring guide; read or download the Arduino firmware, the project JSON,
  the bill of materials and the assembly instructions. Studio and Circuits share one saved project.

## Run it here

Node.js 24 or newer.

```bash
npm ci
cp .env.example .env.local       # OPENROUTER_API_KEY=...  (server side only)
npm run dev                      # http://127.0.0.1:3001
```

```bash
npm test          # the studio's tests
npm run typecheck
npm run build     # the static pages
npm run site      # build + server/app.mjs → site/  (what the host serves)
npm run serve:site
```

The key stays on the server: `server/index.ts` is the site's server module, and no variable named `NEXT_PUBLIC_*` holds
a provider key. `docs/MODEL.md` has the model configuration.

## Where it runs

The site is deployed on CommandAGI's site hosting at https://vibecad.commandagi.app from the `site/` folder
(`scripts/build-site.mjs`), with the static pages exported by Next and `app.mjs` as the Worker's server module. The
locales are `/` (English), `/es/` and `/zh-Hans/`, each a static route with the A/文 picker in the header.

## Where the code came from

VibeCAD's studio began as an open-source conversational 3D workspace that the owner holds full rights to, with no
attribution required; it is rebuilt here as VibeCAD in VibeCAD's own style. `THIRD_PARTY.md` records the permission and
the third-party notices that came with that source. The Review checks measure through the studio's own constraint
layer; CommandAGI's geometry kernel is not wired in yet.
