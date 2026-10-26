#!/usr/bin/env node
/**
 * media-src/ (fal's raw output, gitignored) → public/media/ (what the site serves).
 *
 *   FFMPEG=<an ffmpeg with libaom, libx264, libwebp> node scripts/encode-media.mjs
 *
 * Why so small: the host inlines a site's files into one Worker and stops a deploy past 8 MB (scripts/build-site.mjs),
 * and the studio already takes 6.6 MB of it. So a clip is graded to the vellum palette, played forward then back (a
 * seamless loop) and encoded twice: AV1 at 1280 px first, and H.264 at 960 px for the browsers without AV1 (the bigger codec, so the smaller picture). Each clip
 * gets a WebP poster (its first frame), which is also the reduced-motion still. A clip whose mean luminance swings by
 * more than 10% of full scale more than 3 times in any second is refused (WCAG 2.3.1).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'media-src'), OUT = join(ROOT, 'public/media');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// Vellum: lift the blacks, pull the saturation down, warm the paper; a little grain so the AV1 blocks do not show.
const VELLUM = 'eq=saturation=0.72:contrast=0.92:brightness=0.03:gamma=1.04,colorbalance=rm=0.03:bm=-0.03,noise=alls=3:allf=t';
const CLIPS = [
    { name: 'plate-table', width: 1280, fallbackWidth: 960, crf: { av1: 34, h264: 29 } },
];
// crop: w:h:x:y in input pixels (the generated lettering is cropped away where a model wrote any). `at`: a frame of a
// clip (seconds), for a clip the budget has no room to play.
const STILLS = [
    { name: 'plate-part', from: 'plate-part.mp4', at: 2.5, crop: 'iw:ih:0:0', widths: [640, 1280] },
    { name: 'still-lamp', crop: 'iw:ih:0:0', widths: [520, 900] },
    { name: 'still-board', crop: 'iw:ih*0.62:0:ih*0.38', widths: [520, 900] },
];

const ff = args => execFileSync(FFMPEG, ['-loglevel', 'error', '-y', ...args], { maxBuffer: 1 << 28 });

/** The most luminance swings over 10% of full scale in any one-second window. */
function flashes(file) {
    const W = 32, H = 18, fps = 24;
    const raw = execFileSync(FFMPEG, ['-loglevel', 'error', '-i', file, '-vf', `fps=${fps},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
    const means = [];
    for (let o = 0; o + W * H <= raw.length; o += W * H) { let s = 0; for (let k = 0; k < W * H; k++) s += raw[o + k]; means.push(s / (W * H) / 255); }
    const swings = means.slice(1).map((m, i) => Math.abs(m - means[i]) > 0.1);
    let worst = 0;
    for (let i = 0; i < swings.length; i++) worst = Math.max(worst, swings.slice(i, i + fps).filter(Boolean).length);
    return worst;
}

function clip(c) {
    const src = join(SRC, `${c.name}.mp4`), base = join(OUT, c.name);
    const graph = width => `[0:v]${VELLUM},scale=${width}:-2,fps=24,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]`;
    ff(['-i', src, '-filter_complex', graph(c.fallbackWidth ?? c.width), '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(c.crf.h264), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.h264.mp4`]);
    const worst = flashes(`${base}.h264.mp4`);
    if (worst > 3) throw Error(`${c.name}: ${worst} luminance swings in one second (at most 3)`);
    ff(['-i', src, '-filter_complex', graph(c.width), '-map', '[v]', '-an', '-c:v', 'libaom-av1', '-crf', String(c.crf.av1), '-b:v', '0', '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.av1.mp4`]);
    ff(['-i', `${base}.h264.mp4`, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', `${base}.webp`]);
    return { name: c.name, flashes: worst, bytes: Object.fromEntries(['av1.mp4', 'h264.mp4', 'webp'].map(x => [x, statSync(`${base}.${x}`).size])) };
}

function still(s) {
    return { name: s.name, bytes: Object.fromEntries(s.widths.map(w => {
        const out = join(OUT, `${s.name}-${w}.webp`);
        const input = s.from ? ['-ss', String(s.at), '-i', join(SRC, s.from), '-frames:v', '1'] : ['-i', join(SRC, `${s.name}.png`)];
        ff([...input, '-vf', `crop=${s.crop},${VELLUM.replace(/,noise.*$/, '')},scale=${w}:-2`, '-c:v', 'libwebp', '-quality', '80', out]);
        return [w, statSync(out).size];
    })) };
}

mkdirSync(OUT, { recursive: true });
const report = { clips: CLIPS.map(clip), stills: STILLS.map(still) };
writeFileSync(join(ROOT, 'redesign/encode-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
