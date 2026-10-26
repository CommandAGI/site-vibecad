/**
 * The files a page loads, from the build's packer to the Worker's answer: packed out of the built folder, served to a
 * client that takes gzip and to one that does not, byte for byte. The host inlines what the Worker carries, so this
 * is the boundary where a wrong type, a missing file or an un-inflated body would reach the browser.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { contentTypeFor, embedAssets } from '../scripts/site-assets.mjs';
import { serveAsset, type AssetMap } from '../server/assets';

const root = path.resolve(import.meta.dirname, '..');
const building = mkdtempSync(path.join(tmpdir(), 'vibecad-site-assets-'));
afterAll(() => rmSync(building, { recursive: true, force: true }));

const real = {
    'models/resistor-din0207.glb': path.join(root, 'public/models/resistor-din0207.glb'),
    'assemblies/stack-chan/parts.json': path.join(root, 'public/assemblies/stack-chan/parts.json'),
    '_next/static/chunks/studio.js': path.join(root, 'lib/studio/catalog-data/parts.json'),
    'fonts/archivo.woff2': path.join(root, 'public/fonts/archivo.woff2'),
    'media/plate-table.av1.mp4': path.join(root, 'public/media/plate-table.av1.mp4'),
};

/** A built site as scripts/build-site.mjs leaves it: pages plus the files a page loads. */
function build() {
    const folder = mkdtempSync(path.join(tmpdir(), 'vibecad-built-'));
    for (const [relative, source] of Object.entries(real)) {
        mkdirSync(path.dirname(path.join(folder, relative)), { recursive: true });
        cpSync(source, path.join(folder, relative));
    }
    writeFileSync(path.join(folder, 'index.html'), '<!doctype html><title>VibeCAD</title>\n');
    mkdirSync(path.join(folder, 'es'));
    writeFileSync(path.join(folder, 'es/index.html'), '<!doctype html><title>VibeCAD</title>\n');
    writeFileSync(path.join(folder, 'site.json'), '{ "v": 1, "slug": "vibecad" }\n');
    return folder;
}

const folder = build();
const packed = embedAssets(folder);
const assets = new Function(`${packed.module.replace('export const ASSETS =', 'return')}`)() as AssetMap;

describe('the built site the host serves', () => {
    it('embeds what a page loads and leaves the pages static', () => {
        expect(Object.keys(assets).sort()).toEqual(Object.keys(real).sort());
        expect(readFileSync(path.join(folder, 'index.html'), 'utf8')).toContain('VibeCAD');
        expect(readFileSync(path.join(folder, 'es/index.html'), 'utf8')).toContain('VibeCAD');
        expect(() => readFileSync(path.join(folder, 'models/resistor-din0207.glb'))).toThrow();
    });

    it('names each file its type, and a hash-named script an immutable cache', async () => {
        const model = await serveAsset(assets, new Request('https://vibecad.commandagi.app/models/resistor-din0207.glb'), '/models/resistor-din0207.glb');
        expect(model?.headers.get('content-type')).toBe('model/gltf-binary');
        expect(model?.headers.get('cache-control')).toBe('public, max-age=300');
        const script = await serveAsset(assets, new Request('https://vibecad.commandagi.app/_next/static/chunks/studio.js'), '/_next/static/chunks/studio.js');
        expect(script?.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
        expect(script?.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
        expect(contentTypeFor('a/b.woff2')).toBe('font/woff2');
        expect(contentTypeFor('a/b.ttf')).toBe('font/ttf');
    });

    it('answers the whole file, the bytes on disk, and never the packed gzip', async () => {
        for (const [relative, source] of Object.entries(real)) {
            const original = readFileSync(source);
            const packed = gunzipSync(Buffer.from(assets[relative][1], 'base64'));
            expect(packed.equals(original)).toBe(true);
            for (const accept of ['gzip, deflate, br', 'identity', '']) {
                const answer = await serveAsset(assets, new Request(`https://vibecad.commandagi.app/${relative}`, { headers: accept ? { 'accept-encoding': accept } : {} }), `/${relative}`);
                // The host compresses the response on the way out; a second gzip here would reach the browser as one.
                expect(answer?.headers.get('content-encoding')).toBeNull();
                expect(answer?.headers.get('content-length')).toBe(String(original.length));
                expect(Buffer.from(await answer!.arrayBuffer()).equals(original)).toBe(true);
            }
        }
    });

    it('answers a HEAD with the headers and no body, and knows nothing of a path it did not pack', async () => {
        const head = await serveAsset(assets, new Request('https://vibecad.commandagi.app/models/resistor-din0207.glb', { method: 'HEAD', headers: { 'accept-encoding': 'gzip' } }), '/models/resistor-din0207.glb');
        expect(head?.headers.get('content-type')).toBe('model/gltf-binary');
        expect(await head!.text()).toBe('');
        expect(await serveAsset(assets, new Request('https://vibecad.commandagi.app/api/status'), '/api/status')).toBeNull();
        expect(await serveAsset(assets, new Request('https://vibecad.commandagi.app/models/absent.glb'), '/models/absent.glb')).toBeNull();
    });

    it('plays a video: its type, and the byte ranges Safari asks for before it plays one', async () => {
        const url = 'https://vibecad.commandagi.app/media/plate-table.av1.mp4';
        const original = readFileSync(real['media/plate-table.av1.mp4']);
        const whole = await serveAsset(assets, new Request(url), '/media/plate-table.av1.mp4');
        expect(whole?.status).toBe(200);
        expect(whole?.headers.get('content-type')).toBe('video/mp4');
        expect(whole?.headers.get('accept-ranges')).toBe('bytes');
        for (const [range, start, end] of [['bytes=0-1', 0, 1], ['bytes=100-', 100, original.length - 1], ['bytes=-500', original.length - 500, original.length - 1]] as const) {
            const part = await serveAsset(assets, new Request(url, { headers: { range } }), '/media/plate-table.av1.mp4');
            expect(part?.status).toBe(206);
            expect(part?.headers.get('content-range')).toBe(`bytes ${start}-${end}/${original.length}`);
            expect(part?.headers.get('content-length')).toBe(String(end - start + 1));
            expect(Buffer.from(await part!.arrayBuffer()).equals(original.subarray(start, end + 1))).toBe(true);
        }
        const past = await serveAsset(assets, new Request(url, { headers: { range: `bytes=${original.length}-` } }), '/media/plate-table.av1.mp4');
        expect(past?.status).toBe(416);
        expect(past?.headers.get('content-range')).toBe(`bytes */${original.length}`);
    });
});
