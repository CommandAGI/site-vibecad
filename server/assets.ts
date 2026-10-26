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
    const headers = {
        'content-type': asset[0],
        'cache-control': key.startsWith('_next/static/') ? HASHED : SHORT,
        'accept-ranges': 'bytes',
    };
    const range = byteRange(request.headers.get('range'), body.byteLength);
    if (range === 'unsatisfiable') return new Response(null, { status: 416, headers: { ...headers, 'content-range': `bytes */${body.byteLength}` } });
    if (range) {
        const [start, end] = range;
        return new Response(request.method === 'HEAD' ? null : body.slice(start, end + 1), {
            status: 206,
            headers: { ...headers, 'content-range': `bytes ${start}-${end}/${body.byteLength}`, 'content-length': String(end - start + 1) },
        });
    }
    return new Response(request.method === 'HEAD' ? null : body, { headers: { ...headers, 'content-length': String(body.byteLength) } });
}

/**
 * One `bytes=` range of a file of `size` bytes, as [first, last] inclusive; null when there is none to honour (no
 * header, or several ranges: the whole file answers those); 'unsatisfiable' when it starts past the end. Safari asks
 * for `bytes=0-1` before it plays a video and refuses one whose server does not answer 206.
 */
function byteRange(header: string | null, size: number): [number, number] | 'unsatisfiable' | null {
    const match = header?.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (match[1] === '' && match[2] === '')) return null;
    if (match[1] === '') {
        const suffix = Math.min(Number(match[2]), size);
        return suffix === 0 ? 'unsatisfiable' : [size - suffix, size - 1];
    }
    const start = Number(match[1]);
    if (start >= size) return 'unsatisfiable';
    const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
    return end < start ? null : [start, end];
}
