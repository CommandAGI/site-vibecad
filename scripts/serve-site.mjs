#!/usr/bin/env node
/**
 * Serves the built site the way the host does, so the main flow can be checked before a deploy: a static file at its
 * path, `app.mjs` for everything else, and the environment this process has (the model key comes from .env.local).
 *   node scripts/serve-site.mjs [--port 4173]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'site');
const portArg = process.argv.indexOf('--port');
const port = portArg > 0 ? Number(process.argv[portArg + 1]) : 4173;

try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '..', '.env.local'));
} catch { /* no .env.local: the model routes answer that they are not configured */ }

const { default: server } = await import(path.join(root, 'app.mjs'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.step': 'application/step', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.gz': 'application/gzip', '.bin': 'application/octet-stream' };

async function fileAt(pathname) {
    let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    for (const candidate of [rel, `${rel}/index.html`, `${rel}.html`]) {
        const file = path.join(root, candidate);
        if (!file.startsWith(root)) continue;
        try { if ((await stat(file)).isFile()) return file; } catch { /* next candidate */ }
    }
    return null;
}

createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);
        if (request.method === 'GET' || request.method === 'HEAD') {
            const file = await fileAt(url.pathname);
            if (file) {
                const body = await readFile(file);
                response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'content-length': body.length });
                response.end(request.method === 'HEAD' ? undefined : body);
                return;
            }
        }
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const answer = await server.fetch(new Request(url, { method: request.method, headers: request.headers, ...(body ? { body } : {}) }), process.env);
        response.writeHead(answer.status, Object.fromEntries(answer.headers));
        response.end(Buffer.from(await answer.arrayBuffer()));
    } catch (error) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(`The site failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}).listen(port, '127.0.0.1', () => console.log(`site on http://127.0.0.1:${port}`));
