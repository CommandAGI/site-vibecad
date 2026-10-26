/**
 * VibeCAD's server module for the site Worker (`app.mjs` in the deployed build). The site's pages are a static export
 * (next.config.ts); everything that needs a secret — the model calls — is here, so the browser never sees a key.
 *
 * The handlers are the Next route files under `app/api/` and are used unchanged: Next's own build doesn't see them
 * (`pageExtensions` excludes `.ts`), esbuild bundles them into this module, and the tests import the same files.
 * Env comes from the site's environment (a site's `.env`, set with `commandagi sites env`), never from the client.
 */
import { ASSETS } from 'virtual:site-assets';
import { serveAsset } from './assets';
import { loadCatalog } from './catalog-data';
import * as ask from '../app/api/ask/route';
import * as catalog from '../app/api/catalog/route';
import * as catalogData from '../app/api/catalog/data/route';
import * as catalogModel from '../app/api/catalog/models/[id]/route';
import * as compile from '../app/api/compile/route';
import * as constraints from '../app/api/constraints/route';
import * as designSources from '../app/api/design-sources/route';
import * as device from '../app/api/device/route';
import * as project from '../app/api/project/route';
import * as redesign from '../app/api/redesign/route';
import * as review from '../app/api/review/route';
import * as status from '../app/api/status/route';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the route files declare their own contexts
type Handler = (request: Request, context?: any) => Promise<Response> | Response;
type RouteModule = { GET?: Handler; POST?: Handler };

const routes: { pattern: RegExp; module: RouteModule }[] = [
    { pattern: /^\/api\/ask\/?$/, module: ask },
    { pattern: /^\/api\/catalog\/?$/, module: catalog },
    { pattern: /^\/api\/catalog\/data\/?$/, module: catalogData },
    { pattern: /^\/api\/catalog\/models\/([^/]+)\/?$/, module: catalogModel },
    { pattern: /^\/api\/compile\/?$/, module: compile },
    { pattern: /^\/api\/constraints\/?$/, module: constraints },
    { pattern: /^\/api\/design-sources\/?$/, module: designSources },
    { pattern: /^\/api\/device\/?$/, module: device },
    { pattern: /^\/api\/project\/?$/, module: project },
    { pattern: /^\/api\/redesign\/?$/, module: redesign },
    { pattern: /^\/api\/review\/?$/, module: review },
    { pattern: /^\/api\/status\/?$/, module: status },
];

/** The handlers read `process.env` (the route files also run under Node in the tests). Workers have no process, so
 *  one is installed whose env is the site's environment for that request. */
function installEnv(env: Record<string, unknown>) {
    const scope = globalThis as { process?: { env: Record<string, unknown> } };
    const plain = Object.fromEntries(Object.entries(env).filter(([, value]) => typeof value === 'string'));
    scope.process = { env: { ...(scope.process?.env ?? {}), ...plain } };
}

async function route(request: Request, env: Record<string, unknown>): Promise<Response> {
    const url = new URL(request.url);
    const hit = routes.map(entry => ({ entry, match: entry.pattern.exec(url.pathname) })).find(item => item.match);
    if (!hit?.match) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const handler = request.method === 'GET' ? hit.entry.module.GET : request.method === 'POST' ? hit.entry.module.POST : undefined;
    if (!handler) return new Response('Method not allowed', { status: 405, headers: { allow: hit.entry.module.GET ? 'GET' : 'POST' } });
    const params = hit.match.slice(1);
    return handler(request, params.length ? { params: Promise.resolve({ id: decodeURIComponent(params[0]) }) } : undefined);
}

export default {
    async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
        // A page's scripts, styles, fonts and geometry come from memory before the catalog is filled: a model's page
        // loads a few megabytes of them and none of the catalog.
        const asset = await serveAsset(ASSETS, request, new URL(request.url).pathname);
        if (asset) return asset;
        installEnv(env);
        try {
            await loadCatalog();
            return await route(request, env);
        } catch (error) {
            // The deployed handler's own messages are the contract; a crash is one plain line, never a stack.
            const message = error instanceof Error && error.message ? error.message : 'The request could not be completed.';
            return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
        }
    },
};
