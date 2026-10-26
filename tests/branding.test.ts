import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { messagesFor } from '../lib/i18n';

/**
 * The studio was rebuilt from a source the owner holds full rights to (the org's `provenance.md` records it). Every
 * name it carried is VibeCAD's now: a source name, its author's handle or its event wording left in a file, a README
 * or an interface makes the copy a fork instead of VibeCAD's own product.
 */
const SOURCE_WORDS = [/morf/i, /odois/i, /hackathon/i];
const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'site', '.git', 'work']);
const SKIP_FILES = new Set(['package-lock.json', 'tsconfig.tsbuildinfo', 'tests/branding.test.ts']);

function files(folder: string): string[] {
    const found: string[] = [];
    for (const name of readdirSync(folder)) {
        if (SKIP_DIRS.has(name)) continue;
        const path = join(folder, name);
        const stat = statSync(path);
        if (stat.isDirectory()) found.push(...files(path));
        else if (!SKIP_FILES.has(relative('.', path))) found.push(path);
    }
    return found;
}

describe('VibeCAD branding', () => {
    it('carries no source-project or event name in a file, a document or a README', () => {
        const hits: string[] = [];
        for (const path of files('.')) {
            if (/\.(png|jpe?g|webp|gif|glb|gltf|woff2?|ttf|bin|zip|wasm|pdf)$/i.test(path)) continue;
            let text: string;
            try { text = readFileSync(path, 'utf8'); } catch { continue; }
            for (const word of SOURCE_WORDS) if (word.test(text)) hits.push(`${path}: ${word}`);
        }
        expect(hits).toEqual([]);
    });

    it('ships the three locales as their own routes behind the A/文 picker', () => {
        for (const route of ['app/page.tsx', 'app/es/page.tsx', 'app/zh-Hans/page.tsx']) expect(existsSync(route)).toBe(true);
        const picker = readFileSync('components/LocalePicker.tsx', 'utf8');
        expect(picker).toContain('LOCALES');
        const locales = readFileSync('lib/i18n.tsx', 'utf8');
        for (const locale of ["locale: 'en'", "locale: 'es'", "locale: 'zh-Hans'"]) expect(locales).toContain(locale);
        expect(locales).toContain("label: '文'");
    });

    it('carries every message in Spanish and Chinese, translated rather than copied', () => {
        const english = messagesFor('en');
        for (const locale of ['es', 'zh-Hans'] as const) {
            const copy = messagesFor(locale);
            expect(Object.keys(copy).sort()).toEqual(Object.keys(english).sort());
            const copied = Object.entries(copy).filter(([key, value]) => value === english[key]).map(([key]) => key);
            expect(copied).toEqual([]);
        }
    });
});
