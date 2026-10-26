import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

/**
 * The one root of every route. It loads the two faces the whole site is set in (redesign/DESIGN.md § type) and
 * nothing else: the landing sheet imports app/landing.css, the studio routes import app/studio-styles.ts, so neither
 * pays for the other's styles.
 */
const archivo = localFont({
    src: '../public/fonts/archivo.woff2',
    variable: '--font-vibecad',
    display: 'swap',
    weight: '100 900',
    declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
    adjustFontFallback: 'Arial',
});
const martian = localFont({
    src: '../public/fonts/martian-mono.woff2',
    variable: '--font-mono',
    display: 'swap',
    weight: '100 800',
    declarations: [{ prop: 'font-stretch', value: '75% 112.5%' }],
    adjustFontFallback: false,
    // Not on the first screen's largest paint: it loads when a dimension or a code first needs it.
    preload: false,
});

export const metadata: Metadata = {
    metadataBase: new URL('https://vibecad.commandagi.app'),
    title: 'VibeCAD — Understand. Modify. Verify.',
    description: 'Describe a part and get an editable model. Open an assembly and take it apart. Check it before anything is built.',
    icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
    openGraph: { type: 'website', siteName: 'VibeCAD', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'VibeCAD: a motor bracket drawn on a drawing sheet, with its dimensions and checks.' }] },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export const viewport: Viewport = { themeColor: '#eeece6', colorScheme: 'light' };

export default function Layout({ children }: { children: React.ReactNode }) {
    return <html lang="en" className={`${archivo.variable} ${martian.variable}`}><body>{children}</body></html>;
}
