/**
 * The studio's files as the Worker carries them: each one gzipped and base64'd into the server module
 * (`scripts/site-assets.mjs` packs them; `virtual:site-assets` is the map). A request for one is answered here, before
 * anything else runs, so loading the model's page never pays for the catalog.
 *
 * The answer is the whole file, not the packed gzip: Cloudflare compresses a Worker's response on the way out and
 * does not take the Worker's own `content-encoding` at its word — a gzip body marked gzip arrived doubly compressed
 * (checked on the live site, 2026-10-26), and the browser refused every script. Each file is inflated once per
 * isolate and kept, so the second request for it costs a lookup.
 */

/** Path (no leading `/`) → [content type, gzip base64]. */
export type AssetMap = Record<string, [string, string]>;

const HASHED = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=300';

/** The files this isolate has already inflated, by path. */
const whole = new Map<string, ArrayBuffer>();

function bytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
    return out;
}

async function inflate(gzip: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
    const stream = new Blob([gzip]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
}

/**
 * The response for one of the embedded files, or null when the request is not for one. A file under `_next/static/`
 * carries a hash of its content in its name, so it is cached for good; everything else for five minutes.
 */
export async function serveAsset(assets: AssetMap, request: Request, pathname: string): Promise<Response | null> {
    const key = pathname.replace(/^\/+/, '');
    const asset = Object.hasOwn(assets, key) ? assets[key] : null;
    if (!asset) return null;
    let body = whole.get(key);
    if (!body) {
        body = await inflate(bytes(asset[1]));
        whole.set(key, body);
    }
    return new Response(request.method === 'HEAD' ? null : body, {
        headers: {
            'content-type': asset[0],
            'cache-control': key.startsWith('_next/static/') ? HASHED : SHORT,
            'content-length': String(body.byteLength),
        },
    });
}
