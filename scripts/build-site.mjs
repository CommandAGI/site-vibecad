#!/usr/bin/env node
/**
 * Builds the folder the site host serves: the static export of the pages (`next build`, out/) plus the server module
 * `app.mjs` (server/index.ts and its routes, one bundle). `site/` is what `commandagi sites deploy site --prod`
 * uploads; it is not committed.
 *
 * Why two halves: a site on CommandAGI's hosting is one Worker. Its static files are inlined by the host, and a file
 * named `app.mjs` at the top of the folder is the Worker's server module. The pages are a static export because a
 * Next.js site is hosted that way (packages/runtime/local-host/sites.mjs); the server module is where the model key
 * lives.
 *
 * The pages stay static; every file a page loads is embedded in the server module instead (scripts/site-assets.mjs),
 * because inlined base64 plus the studio's geometry passes the host's 8 MB limit. `BUDGET` is that limit.
 */
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { embedAssets, staticBytes } from './site-assets.mjs';

/** The host's limit on what a deploy inlines (api-worker src/sites/deploy.ts). */
const BUDGET = 8 * 1024 * 1024;

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'out');
const site = path.join(root, 'site');

try {
    await stat(path.join(out, 'index.html'));
} catch {
    console.error('site: run `next build` first (out/index.html is missing).');
    process.exit(1);
}

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });
await cp(out, site, { recursive: true });

// The catalog's geometry is 6.4 MB of JSON. Inside the Worker it is gzipped (about 1 MB); the browser loads it from
// /api/catalog/data. The host keeps a Worker's source under 8 MB, so it must not ride in the bundle as plain text.
const gzipBase64 = async file => gzipSync(await readFile(path.join(root, file)), { level: 9 }).toString('base64');
const catalogModule = `export const partsGzip = ${JSON.stringify(await gzipBase64('lib/studio/catalog-data/parts.json'))};\nexport const objectsGzip = ${JSON.stringify(await gzipBase64('lib/studio/catalog-data/objects.json'))};\n`;

const packed = embedAssets(site);
// What is left is the pages, which the host inlines itself.
const pages = staticBytes(site);

await build({
    entryPoints: [path.join(root, 'server', 'index.ts')],
    outfile: path.join(site, 'app.mjs'),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    tsconfig: path.join(root, 'tsconfig.json'),
    loader: { '.json': 'json' },
    plugins: [{
        name: 'worker-modules',
        setup(builder) {
            // The firmware compiler needs a child process, a temporary folder and the home folder; a Worker has none
            // of them, and the compiler runs in the local app only (`lib/compile.ts` refuses every other host). The
            // module is imported by the bundle all the same, so each name must exist and refuse when it is called.
            const stubs = {
                'node:child_process': ['execFile', 'exec', 'spawn'],
                'node:os': ['homedir', 'tmpdir', 'platform', 'cpus'],
                'node:fs/promises': ['mkdtemp', 'mkdir', 'rm', 'writeFile', 'readFile', 'stat', 'access'],
            };
            const source = names => names
                .map(name => `export function ${name}(){throw new Error("Sketch compilation runs in the local app only.");}`)
                .join('\n') + '\n';
            builder.onResolve({ filter: /^node:(child_process|os|fs\/promises)$/ }, args => ({ path: args.path, namespace: 'local-only' }));
            builder.onLoad({ filter: /.*/, namespace: 'local-only' }, args => ({ contents: source(stubs[args.path]), loader: 'js' }));
        },
    }, {
        name: 'site-data',
        setup(builder) {
            const virtual = {
                'virtual:catalog-data': catalogModule,
                'virtual:site-assets': packed.module,
            };
            builder.onResolve({ filter: /^virtual:/ }, args => ({ path: args.path, namespace: 'vibecad' }));
            builder.onLoad({ filter: /.*/, namespace: 'vibecad' }, args => ({ contents: virtual[args.path], loader: 'js' }));
        },
    }],
    // Workerd provides these through its `nodejs_compat` flag; bundling them would embed a second implementation.
    external: ['node:crypto', 'node:buffer', 'node:stream', 'node:util', 'node:zlib'],
    // Workers have no `process`; the server module installs one per request (server/index.ts installEnv). A module
    // that reads `process.env.NODE_ENV` while it loads still finds an object.
    banner: { js: 'globalThis.process ??= { env: {}, versions: {} };' },
});

const manifest = JSON.parse(await readFile(path.join(root, 'site.json'), 'utf8'));
await writeFile(path.join(site, 'site.json'), JSON.stringify(manifest, null, 2) + '\n');

// The host inlines the pages itself and the server module whole, so app.mjs (the code plus the packed files) and
// the pages are what it counts.
const { size } = await stat(path.join(site, 'app.mjs'));
const inlined = size + pages;
const mb = bytes => (bytes / 1024 / 1024).toFixed(2);
console.log(`site/: ${packed.files} files (${mb(packed.rawBytes)} MB) in app.mjs, which is ${mb(size)} MB`);
console.log(`site/: a deploy inlines ${mb(inlined)} MB of the host's ${mb(BUDGET)} MB`);
if (inlined > BUDGET) {
    console.error(`site: over the host's limit by ${mb(inlined - BUDGET)} MB. Embed less, or shrink the largest files.`);
    process.exit(1);
}
