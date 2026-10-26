#!/usr/bin/env node
/**
 * The landing sheet's generated media, made once on a maintainer's machine (never in a visitor's browser): fal makes
 * the raw clips and stills into media-src/ (gitignored); scripts/encode-media.mjs turns them into public/media/.
 *
 *   COMMANDAGI_ENV_ROOT=<checkout> node scripts/media.mjs [name …]   make the named items (the missing ones by default)
 *
 * The key is SVC__FAL__MAIN__API_KEY of the .env cascade under COMMANDAGI_ENV_ROOT. It is read here and sent only to
 * fal: never written, logged or shipped. Each call's model, prompt, seed and price goes to redesign/media-log.jsonl,
 * which redesign/NOTES.md sums. Art direction: a drafting room in low daylight; never a person, a hand or a screen.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'media-src');
const LOG = join(ROOT, 'redesign/media-log.jsonl');

const LOOK = 'very slow steady camera, calm, no flicker, no flashes, no cuts, no people, no hands, no readable text, no logos, fine paper grain';
const VIDEO = 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video';
const STILL = 'fal-ai/flux-pro/v1.1-ultra';
const NEGATIVE = 'people, hands, fingers, text, letters, watermark, logo, blur, low quality, flashing, strobe, neon, purple, gradient';

export const ITEMS = [
    {
        name: 'plate-table', kind: 'video', model: VIDEO, price: 0.35,
        input: {
            prompt: `Top-down view, a very slow lateral drift across a drafting table covered with pale translucent drafting vellum. Fine graphite pencil orthographic drawings of a machined bracket with dimension lines and arrowheads. A raw CNC-milled aluminium bracket rests on the sheet and casts a long soft shadow. One vermilion-red pencil lies beside it. Warm low morning light rakes in from the left. ${LOOK}`,
            duration: '5', aspect_ratio: '16:9', negative_prompt: NEGATIVE,
        },
    },
    {
        name: 'plate-part', kind: 'video', model: VIDEO, price: 0.35,
        input: {
            prompt: `Macro product shot, a very slow orbit around a raw machined aluminium motor-mount bracket standing on pale grey drafting vellum. Fine milling tool marks catch soft daylight, a precision steel vernier caliper lies open beside it, graphite construction lines on the paper, shallow depth of field, muted warm grey palette. ${LOOK}`,
            duration: '5', aspect_ratio: '16:9', negative_prompt: NEGATIVE,
        },
    },
    {
        name: 'still-caliper', kind: 'image', model: STILL, price: 0.06,
        input: {
            prompt: 'Macro photograph: the steel jaws of a vernier caliper measuring the bore of a raw machined aluminium bracket, on pale drafting vellum with faint graphite lines, soft raking daylight from the left, muted warm grey, a single vermilion pencil mark on the paper, no people, no hands, no text, no numbers legible, high detail',
            aspect_ratio: '4:5', output_format: 'png', safety_tolerance: '2', raw: true,
        },
    },
    {
        name: 'still-parts', kind: 'image', model: STILL, price: 0.06,
        input: {
            prompt: 'Overhead knolling photograph of the disassembled parts of a small desktop robot laid out in precise rows on pale drafting vellum: a printed circuit board, a small servo motor, screws, a white plastic shell in two halves, a ribbon cable; soft even daylight, long gentle shadows, muted warm grey palette, generous empty paper around the parts, no people, no hands, no text, no logos, high detail',
            aspect_ratio: '16:9', output_format: 'png', safety_tolerance: '2', raw: true,
        },
    },
    {
        name: 'still-lamp', kind: 'image', model: STILL, price: 0.06,
        input: {
            prompt: 'Overhead knolling photograph filling the frame: the disassembled parts of a desk lamp laid out in precise rows on pale drafting vellum with faint graphite construction lines: a round weighted steel base, two brushed aluminium arm tubes, an elbow joint with two small springs, a round LED lamp head, a few hex screws and washers; soft daylight from the left, gentle shadows, muted warm grey palette with one vermilion-red wire, no people, no hands, no text, no labels, no logos, high detail',
            aspect_ratio: '4:5', output_format: 'png', safety_tolerance: '2', raw: true,
        },
    },
    {
        name: 'still-board', kind: 'image', model: STILL, price: 0.06,
        input: {
            prompt: 'Macro photograph at a low angle across a bare printed circuit board with a microcontroller module, through-hole resistors and an LED, a thin graphite pencil line on drafting vellum beneath it, soft raking daylight, shallow depth of field, muted desaturated colours, no people, no hands, no legible text, no logos, high detail',
            aspect_ratio: '4:5', output_format: 'png', safety_tolerance: '2', raw: true,
        },
    },
];

function falKey() {
    const root = process.env.COMMANDAGI_ENV_ROOT;
    if (!root) throw Error('set COMMANDAGI_ENV_ROOT to the checkout whose .env cascade holds SVC__FAL__MAIN__API_KEY');
    for (const file of ['.env.api', '.env.local', '.env']) {
        const path = join(root, file);
        if (!existsSync(path)) continue;
        const line = readFileSync(path, 'utf8').split('\n').find(l => l.startsWith('SVC__FAL__MAIN__API_KEY='));
        if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    }
    throw Error('no SVC__FAL__MAIN__API_KEY in the .env cascade');
}

async function run(item, key) {
    const auth = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
    const sent = await fetch(`https://queue.fal.run/${item.model}`, { method: 'POST', headers: auth, body: JSON.stringify(item.input) });
    if (!sent.ok) throw Error(`${item.name}: ${sent.status} ${await sent.text()}`);
    const { status_url, response_url, request_id } = await sent.json();
    // A submitted request is billed whether or not this process sees its answer: log it now.
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), submitted: item.name, model: item.model, request_id, price_usd: item.price }) + '\n');
    for (;;) {
        await new Promise(r => setTimeout(r, 5000));
        const status = await fetch(status_url, { headers: auth }).then(r => r.json()).catch(() => ({ status: 'IN_PROGRESS' }));
        if (status.status === 'COMPLETED') break;
        if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS') throw Error(`${item.name}: ${JSON.stringify(status)}`);
    }
    const answer = await (await fetch(response_url, { headers: auth })).json();
    const url = answer.video?.url ?? answer.images?.[0]?.url;
    if (!url) throw Error(`${item.name}: no media in ${JSON.stringify(answer).slice(0, 300)}`);
    const file = join(OUT, `${item.name}.${item.kind === 'video' ? 'mp4' : 'png'}`);
    writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), name: item.name, model: item.model, request_id, seed: answer.seed ?? null, price_usd: item.price, input: item.input }) + '\n');
    console.log(`${item.name} → ${file} ($${item.price.toFixed(2)})`);
}

const want = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
mkdirSync(dirname(LOG), { recursive: true });
const items = ITEMS.filter(i => want.length ? want.includes(i.name) : !existsSync(join(OUT, `${i.name}.mp4`)) && !existsSync(join(OUT, `${i.name}.png`)));
const key = falKey();
const results = await Promise.allSettled(items.map(i => run(i, key)));
for (const r of results) if (r.status === 'rejected') { console.error(String(r.reason?.message ?? r.reason)); process.exitCode = 1; }
