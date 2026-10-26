'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { setCatalogData } from '@/lib/studio/catalog';
import { setObjectData } from '@/lib/studio/object-catalog';

/**
 * Loads the CAD catalog before the studio renders. The catalog's geometry is about 6 MB of JSON: it is one request
 * to the site's server route instead of part of the page bundle, which keeps the pages small and the deploy inside
 * the host's size limit. A failed load is said plainly and offered again; nothing is invented in its place.
 */
export default function CatalogBoot({ children }: { children: ReactNode }) {
    const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let live = true;
        setState('loading');
        fetch('/api/catalog/data')
            .then(response => {
                if (!response.ok) throw new Error(`The catalog answered ${response.status}.`);
                return response.json();
            })
            .then((data: { parts: Parameters<typeof setCatalogData>[0]; objects: Parameters<typeof setObjectData>[0] }) => {
                if (!live) return;
                setCatalogData(data.parts);
                setObjectData(data.objects);
                setState('ready');
            })
            .catch(() => { if (live) setState('failed'); });
        return () => { live = false; };
    }, [attempt]);
    if (state === 'ready') return <>{children}</>;
    return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff8ed', color: '#463b2c', fontFamily: 'var(--font-vibecad), system-ui, sans-serif' }}>
            <div style={{ textAlign: 'center', maxWidth: 420, padding: 32 }}>
                <div style={{ fontSize: 30, fontWeight: 650, letterSpacing: '-1.5px' }}>vibecad<span style={{ color: '#c8843d' }}>.</span></div>
                <p style={{ color: '#967b60', fontSize: 13, lineHeight: 1.8, margin: '18px 0 0' }}>
                    {state === 'failed' ? 'The part catalog did not load. Check the connection and try again.' : 'Opening the part catalog…'}
                </p>
                {state === 'failed' && (
                    <button onClick={() => setAttempt(n => n + 1)} style={{ marginTop: 18, background: '#f6cc84', color: '#65451f', border: '1px solid #dcb27f', borderRadius: 6, padding: '8px 16px', font: 'inherit', fontSize: 12, cursor: 'pointer' }}>
                        Try again
                    </button>
                )}
            </div>
        </main>
    );
}
