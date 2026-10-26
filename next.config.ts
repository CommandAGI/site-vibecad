import type { NextConfig } from 'next';

/**
 * VibeCAD is served by one Worker per site (AGENTS.md of CommandAGI: a site is a folder; `app.mjs` is its server module).
 * The pages are a static export; the model calls live in `server/` and are bundled into `app.mjs` by
 * `scripts/build-site.mjs`. `pageExtensions` keeps Next from treating the route files under `app/api/` as its own
 * handlers — they are the Worker's handlers, and the same files are the ones the tests import.
 */
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  pageExtensions: ['tsx'],
  devIndicators: false,
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default config;
