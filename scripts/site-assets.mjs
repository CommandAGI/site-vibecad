/**
 * Packs what a page loads — scripts, styles, fonts, 3D models, catalog data — into the server module instead of
 * leaving it as static files.
 *
 * Why: a site on CommandAGI's hosting is one Worker whose static files are inlined as base64, and the host stops a
 * deploy whose inlined bytes pass 8 MB (`api-worker src/sites/deploy.ts`). Inlined base64 costs a third more than the
 * file, and the studio is about 10 MB of pages, scripts and geometry (app.mjs is already 3.6 MB of server code). Each
 * embedded file is gzipped first (about 3.5× smaller), so the same site fits: the server module answers the file from
 * memory, gzip to a client that takes it, and the raw bytes to one that does not.
 *
 * The pages (.html and .txt) stay static: the host serves those itself, before the server module is asked.
 */
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

/** The types a page loads. Anything else is `application/octet-stream`, which a browser downloads. */
const TYPES = {
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    json: 'application/json',
    map: 'application/json',
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    wasm: 'application/wasm',
    woff2: 'font/woff2',
    woff: 'font/woff',
    ttf: 'font/ttf',
    otf: 'font/otf',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    ico: 'image/x-icon',
};

/** The content type of a served file, by its extension. */
export function contentTypeFor(file) {
    const extension = path.extname(file).slice(1).toLowerCase();
    return TYPES[extension] ?? 'application/octet-stream';
}

/** A page the host serves itself, so it is not embedded. */
const isPage = relative => /\.(html|txt)$/i.test(relative) || path.basename(relative) === 'site.json';

/** Every file under `dir`, relative to it, `/`-separated. */
function walk(dir, base = dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(absolute, base, out);
        else if (entry.isFile()) out.push(path.relative(base, absolute).split(path.sep).join('/'));
    }
    return out;
}

/**
 * Pack the files of a built site into the source of the module the server imports, and remove them from the folder.
 * → { module, files, rawBytes, packedBytes } — `module` is an ES module source exporting `ASSETS`, a map of path →
 * [content type, gzip base64]; `packedBytes` is what those files cost once inlined (base64 of the gzip).
 */
export function embedAssets(dir) {
    const assets = {};
    let files = 0;
    let rawBytes = 0;
    let packedBytes = 0;
    for (const relative of walk(dir).sort()) {
        if (isPage(relative)) continue;
        const absolute = path.join(dir, relative);
        const content = readFileSync(absolute);
        const gzip = gzipSync(content, { level: 9 }).toString('base64');
        assets[relative] = [contentTypeFor(relative), gzip];
        files += 1;
        rawBytes += content.length;
        packedBytes += Math.ceil(gzip.length / 3) * 4;
        rmSync(absolute);
    }
    // Bigger files first: the order shows what to look at when a deploy is close to the host's limit.
    const module = `export const ASSETS = ${JSON.stringify(assets)};\n`;
    return { module, files, rawBytes, packedBytes };
}

/** The bytes of a built folder that the host still inlines as static files: the pages, base64'd. */
export function staticBytes(dir) {
    if (!statSync(dir).isDirectory()) return 0;
    return walk(dir).reduce((total, relative) => total + Math.ceil(readFileSync(path.join(dir, relative)).length / 3) * 4, 0);
}
