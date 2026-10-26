'use client';
import '@/app/landing.css';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { preload } from 'react-dom';
import { LOCALES, useLocale, useT } from '@/lib/i18n';
import { checks, clamp, DEFAULTS, LIMITS, MATERIALS, type BracketParams, type Material } from '@/lib/landing/bracket';
import Wordmark from './Wordmark';
import type { Revision } from './BracketView';

/**
 * The landing sheet (redesign/DESIGN.md): a drawing set of five sheets in one page. Sheet 1 is the part the visitor
 * turns, changes and checks; the title block (bottom right, a strip on a phone) is the navigation and counts the sheet
 * in view. Every link goes to a working route of the studio.
 */
// The poster is in the static page (the placeholder below), so the hero has its box and its picture before any script.
const BracketView = dynamic(() => import('./BracketView'), { ssr: false, loading: () => <div className="bv" aria-hidden="true"><img className="bv-poster" src="/media/bracket-poster.webp" alt="" width={1200} height={1000} fetchPriority="high"/></div> });

const REVISIONS: Revision[] = ['a', 'b', 'c'];
const SHEETS = 5;

export default function Landing() {
    // The poster is the largest thing on the first screen: ask for it in the head, before the scripts.
    preload('/media/bracket-poster.webp', { as: 'image', fetchPriority: 'high' });
    const t = useT();
    const locale = useLocale();
    const root = LOCALES.find(entry => entry.locale === locale)?.path ?? '/';
    const studio = `${root}studio/`;
    const [params, setParams] = useState<BracketParams>(DEFAULTS);
    const [revision, setRevision] = useState<Revision>('a');
    const [sheet, setSheet] = useState(1);
    const results = useMemo(() => checks(params), [params]);
    const failed = results.filter(check => !check.pass).map(check => check.id);
    const sentinels = useRef<(HTMLDivElement | null)[]>([]);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);

    // The hero's revisions follow the scroll where the hero is a scroll scene (a tall section, see landing.css).
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) if (entry.isIntersecting) setRevision(REVISIONS[Number((entry.target as HTMLElement).dataset.rev)]);
        }, { rootMargin: '-50% 0px -50% 0px' });
        for (const element of sentinels.current) if (element) observer.observe(element);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) if (entry.isIntersecting) setSheet(Number((entry.target as HTMLElement).dataset.sheet));
        }, { rootMargin: '-45% 0px -45% 0px' });
        for (const element of document.querySelectorAll('[data-sheet]')) observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const choose = (next: Revision, focus = false) => {
        setRevision(next);
        if (focus) tabs.current[REVISIONS.indexOf(next)]?.focus();
        const sentinel = sentinels.current[REVISIONS.indexOf(next)];
        if (sentinel && sentinel.offsetHeight > 0 && getComputedStyle(sentinel).position === 'absolute') {
            // An instant jump: the part's own turn shows the change, and a smooth scroll would race the observer above.
            window.scrollTo({ top: sentinel.getBoundingClientRect().top + window.scrollY - innerHeight * 0.3, behavior: 'instant' });
        }
    };
    const onTabKey = (event: React.KeyboardEvent, index: number) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        choose(REVISIONS[(index + step + REVISIONS.length) % REVISIONS.length], true);
    };
    const set = (patch: Partial<BracketParams>) => setParams(current => clamp({ ...current, ...patch }));
    const passed = results.filter(check => check.pass).length;
    const material = MATERIALS[params.material].label;

    return (
        <div className="sheet" lang={LOCALES.find(entry => entry.locale === locale)?.lang}>
            <a className="skip" href="#sheet-1">{t('landing.skip')}</a>
            <Frame/>
            <main>
                <section id="sheet-1" className="hero" data-sheet={1} aria-labelledby="hero-title">
                    <div className="hero-track">
                        {REVISIONS.map((rev, index) => <div key={rev} className="hero-sentinel" data-rev={index} ref={element => { sentinels.current[index] = element; }} aria-hidden="true"/>)}
                        <div className="hero-stage">
                            <header className="hero-copy">
                                <p className="lettering kicker">{t('hero.kicker')}</p>
                                <h1 id="hero-title"><span>{t('hero.title.a')}</span> <span className="hero-second">{t('hero.title.b')}</span></h1>
                            </header>
                            <div className="hero-lead">
                                <p className="lede">{t('hero.lede')}</p>
                                <a className="stamp stamp-primary" href={`${studio}?workspace=explore`}><span className="stamp-rev" aria-hidden="true">▲</span>{t('hero.cta')}</a>
                            </div>
                            <figure className="hero-figure">
                                <div className="rev-tabs" role="tablist" aria-label={t('rev.aria')}>
                                    {REVISIONS.map((rev, index) => <button key={rev} ref={element => { tabs.current[index] = element; }} role="tab" id={`rev-tab-${rev}`} aria-controls="rev-panel" aria-selected={revision === rev} tabIndex={revision === rev ? 0 : -1} onClick={() => choose(rev)} onKeyDown={event => onTabKey(event, index)}>
                                        <span className="rev-letter" aria-hidden="true">{rev.toUpperCase()}</span><span className="lettering">{t(`rev.${rev}`)}</span>
                                    </button>)}
                                </div>
                                <BracketView params={params} revision={revision} failed={revision === 'c' ? failed : []} label={t('part.canvas', { wall: params.wall.toFixed(1), bore: params.bore.toFixed(1), material })}/>
                                <figcaption><span className="lettering">{t('part.title')}</span><span className="mono-note">{t('part.drag')}</span></figcaption>
                            </figure>
                            <div className="rev-panel" id="rev-panel" role="tabpanel" aria-labelledby={`rev-tab-${revision}`} data-revision={revision}>
                                <p className="rev-note">{t(`rev.${revision}.note`)}</p>
                                {revision === 'a' && <ol className="legend">
                                    {['part.base', 'part.upright', 'part.bore', 'part.bolts', 'part.slots'].map((key, index) => <li key={key}><b>{index + 1}</b>{t(key)}</li>)}
                                </ol>}
                                {revision === 'b' && <div className="controls">
                                    <Slider label={t('mod.wall')} symbol="t" value={params.wall} range={LIMITS.wall} step={0.5} onChange={wall => set({ wall })}/>
                                    <Slider label={t('mod.bore')} symbol="Ø" value={params.bore} range={LIMITS.bore} step={0.5} onChange={bore => set({ bore })}/>
                                    <fieldset className="materials"><legend className="lettering">{t('mod.material')}</legend>
                                        {(Object.keys(MATERIALS) as Material[]).map(id => <label key={id} className="stamp stamp-choice"><input type="radio" name="material" value={id} checked={params.material === id} onChange={() => set({ material: id })}/>{MATERIALS[id].label}</label>)}
                                    </fieldset>
                                </div>}
                                {revision === 'c' && <ul className="checks">
                                    {results.map(check => <li key={check.id} data-pass={check.pass}>
                                        <span className="check-mark" aria-hidden="true">{check.pass ? '✓' : '✕'}</span>
                                        <span className="check-name">{t(`chk.${check.id}`)}</span>
                                        <span className="check-value">{check.value.toFixed(check.unit === 'g' ? 1 : 2)} {check.unit}</span>
                                        <span className="check-verdict lettering">{t(check.pass ? 'chk.pass' : 'chk.fail')}</span>
                                        <code className="check-rule">{check.rule}</code>
                                    </li>)}
                                </ul>}
                                <p className="sr-only" aria-live="polite">{t('chk.summary', { passed })}</p>
                                {revision === 'c' && <p className="check-summary"><strong>{t('chk.summary', { passed })}</strong> {failed.length > 0 && t('chk.fix')}</p>}
                                {revision === 'c' && <p className="mono-note">{t('chk.honest')}</p>}
                            </div>
                        </div>
                    </div>
                </section>

                <Sheets studio={studio}/>
            </main>
            <TitleBlock sheet={sheet} root={root} studio={studio}/>
            <Revisions/>
        </div>
    );
}

/** Sheets 2–5, the notes and the revision table: they do not change with the part, so a slider step skips them. */
const Sheets = memo(function Sheets({ studio }: { studio: string }) {
    const t = useT();
    return <>
        <section id="sheet-2" className="plate plate-film" data-sheet={2} aria-labelledby="s2-title">
            <LoopVideo name="plate-table"/>
            <div className="plate-film-copy">
                <p className="lettering kicker">{t('s2.kicker')}</p>
                <h2 id="s2-title">{t('s2.title')}</h2>
                <p className="lede">{t('s2.lede')}</p>
                <ul className="stamps">
                    <li><a className="stamp" href={`${studio}?workspace=studio`}><span className="stamp-rev" aria-hidden="true">▲</span>{t('s2.desktop')}</a></li>
                    <li><a className="stamp" href={`${studio}?example=corne`}><span className="stamp-rev" aria-hidden="true">▲</span>{t('s2.corne')}</a></li>
                    <li><a className="stamp" href={`${studio}?workspace=explore`}><span className="stamp-rev" aria-hidden="true">▲</span>{t('s2.import')}</a></li>
                </ul>
            </div>
            <p className="media-label">{t('media.video')}</p>
        </section>

        <section id="sheet-3" className="plate plate-describe" data-sheet={3} aria-labelledby="s3-title">
            <header className="plate-head"><p className="lettering kicker">{t('s3.kicker')}</p><h2 id="s3-title">{t('s3.title')}</h2></header>
            <figure className="describe-still">
                <img src="/media/still-lamp-900.webp" srcSet="/media/still-lamp-520.webp 520w, /media/still-lamp-900.webp 900w" sizes="(min-width: 900px) 40vw, 100vw" alt={t('media.still')} width={900} height={1117} loading="lazy"/>
                <figcaption className="media-label">{t('media.still')}</figcaption>
            </figure>
            <div className="describe-flow">
                <p className="prompt"><span className="prompt-mark" aria-hidden="true">›</span><span className="prompt-text">{t('s3.prompt')}</span></p>
                <ol className="parts-out">{[1, 2, 3, 4, 5].map(n => <li key={n} style={{ ['--n' as string]: n }}><b>{n}</b>{t(`s3.part.${n}`)}</li>)}</ol>
                <p className="markup-note">{t('s3.label')}</p>
                <a className="stamp" href={`${studio}?workspace=explore`}><span className="stamp-rev" aria-hidden="true">▲</span>{t('s3.cta')}</a>
            </div>
        </section>

        <section id="sheet-4" className="plate plate-wire" data-sheet={4} aria-labelledby="s4-title">
            <figure className="wire-still">
                <img src="/media/still-board-900.webp" srcSet="/media/still-board-520.webp 520w, /media/still-board-900.webp 900w" sizes="(min-width: 900px) 40vw, 100vw" alt={t('media.still')} width={900} height={698} loading="lazy"/>
                <figcaption className="media-label">{t('media.still')}</figcaption>
            </figure>
            <div className="wire-copy">
                <p className="lettering kicker">{t('s4.kicker')}</p>
                <h2 id="s4-title">{t('s4.title')}</h2>
                <Schematic unresolved={t('s4.unresolved')}/>
                <p className="lede">{t('s4.lede')}</p>
                <a className="stamp" href="/circuits/"><span className="stamp-rev" aria-hidden="true">▲</span>{t('s4.cta')}</a>
            </div>
        </section>

        <section id="sheet-5" className="plate plate-build" data-sheet={5} aria-labelledby="s5-title">
            <header className="plate-head"><p className="lettering kicker">{t('s5.kicker')}</p><h2 id="s5-title">{t('s5.title')}</h2></header>
            <figure className="build-still">
                <img src="/media/plate-part-1280.webp" srcSet="/media/plate-part-640.webp 640w, /media/plate-part-1280.webp 1280w" sizes="(min-width: 900px) 58vw, 100vw" alt={t('media.still')} width={1280} height={720} loading="lazy"/>
                <figcaption className="media-label">{t('media.still')}</figcaption>
            </figure>
            <table className="parts-list">
                <caption className="lettering">{t('s5.list')}</caption>
                <thead><tr><th scope="col">#</th><th scope="col">{t('s5.col.item')}</th><th scope="col">{t('s5.col.what')}</th></tr></thead>
                <tbody>
                    {[['firmware', '.ino'], ['project', '.json'], ['bom', '.csv'], ['guide', '.md']].map(([key, format], index) => <tr key={key}><td>{index + 1}</td><td>{t(`s5.${key}`)}</td><td><code>{format}</code></td></tr>)}
                </tbody>
            </table>
            <a className="stamp stamp-primary build-cta" href="/evaluate/"><span className="stamp-rev" aria-hidden="true">▲</span>{t('s5.cta')}</a>
        </section>

        <section className="notes" aria-labelledby="notes-title">
            <h2 id="notes-title" className="lettering">{t('notes.title')}</h2>
            <ol>{[1, 2, 3, 4, 5].map(n => <li key={n}>{t(`notes.${n}`)}</li>)}</ol>
        </section>
    </>;
});

const Revisions = memo(function Revisions() {
    const t = useT();
    return (
        <footer className="revisions">
            <table>
                <caption className="lettering">{t('footer.revs')}</caption>
                <tbody>{(['a', 'b', 'c'] as const).map(rev => <tr key={rev}><th scope="row">{rev.toUpperCase()}</th><td>{t(`footer.rev.${rev}`)}</td></tr>)}</tbody>
            </table>
            <p>{t('footer.company')}</p>
        </footer>
    );
});

function Slider({ label, symbol, value, range, step, onChange }: { label: string; symbol: string; value: number; range: readonly [number, number]; step: number; onChange: (value: number) => void }) {
    const fraction = (value - range[0]) / (range[1] - range[0]);
    return <label className="slider" style={{ ['--f' as string]: fraction }}>
        <span className="slider-head"><span className="lettering">{label}</span><output className="slider-value">{symbol} {value.toFixed(1)} mm</output></span>
        <input type="range" min={range[0]} max={range[1]} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/>
        <span className="slider-scale" aria-hidden="true"><span>{range[0]}</span><span>{range[1]}</span></span>
    </label>;
}

/** The fullscreen loop: loaded and played only while it is on screen, never with sound, a still when motion is reduced. */
function LoopVideo({ name }: { name: string }) {
    const video = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const element = video.current!;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { element.preload = 'auto'; void element.play().catch(() => {}); } else element.pause();
        }, { threshold: 0.15 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return <video ref={video} className="plate-video" muted loop playsInline preload="none" poster={`/media/${name}.webp`} aria-hidden="true" tabIndex={-1}>
        <source src={`/media/${name}.av1.mp4`} type='video/mp4; codecs="av01.0.05M.08"'/>
        <source src={`/media/${name}.h264.mp4`} type="video/mp4"/>
    </video>;
}

/** The sheet's border: zone numbers across the top, letters down the side. Decoration only. */
function Frame() {
    return <div className="frame" aria-hidden="true">
        <ol className="zones zones-x">{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <li key={n}>{n}</li>)}</ol>
        <ol className="zones zones-y">{['A', 'B', 'C', 'D', 'E', 'F'].map(n => <li key={n}>{n}</li>)}</ol>
    </div>;
}

function TitleBlock({ sheet, root, studio }: { sheet: number; root: string; studio: string }) {
    const t = useT();
    const locale = useLocale();
    const links = <>
        <a href={`${studio}?workspace=explore`}>{t('tb.studio')}</a>
        <a href="/circuits/">{t('tb.circuits')}</a>
        <a href="/evaluate/">{t('tb.evaluate')}</a>
    </>;
    const languages = <span className="tb-langs">{LOCALES.map(entry => <a key={entry.locale} href={entry.path} hrefLang={entry.lang} lang={entry.lang} aria-current={entry.locale === locale ? 'page' : undefined} title={entry.name}>{entry.label}</a>)}</span>;
    return <nav className="title-block" aria-label={t('tb.aria')}>
        <a className="tb-mark" href={root} aria-label={t('tb.home')}><Wordmark/></a>
        <span className="tb-cell tb-dwg"><small>{t('tb.dwg')}</small>VC-001</span>
        <span className="tb-cell tb-sheet"><small>{t('tb.sheet')}</small><span aria-live="off">{sheet}/{SHEETS}</span></span>
        <span className="tb-cell tb-rev"><small>{t('tb.rev')}</small>C</span>
        <span className="tb-links">{links}{languages}</span>
        <button className="tb-menu-button" popoverTarget="tb-menu" type="button">{t('tb.sheets')}</button>
        <div id="tb-menu" className="tb-menu" popover="auto">{links}{languages}</div>
    </nav>;
}

/** A small drawn circuit: a microcontroller, a resistor and an LED, and one wire whose pin is not known. */
function Schematic({ unresolved }: { unresolved: string }) {
    return <svg className="schematic" viewBox="0 0 420 170" role="img" aria-label={`ESP32 GPIO2 → 220 Ω → LED → GND; GPIO? → ${unresolved}`}>
        <g className="sch-part"><rect x="14" y="22" width="112" height="126"/><text x="70" y="16" textAnchor="middle">U1 ESP32</text>
            <text x="120" y="52" textAnchor="end">GPIO2</text><text x="120" y="92" textAnchor="end">GND</text><text x="120" y="132" textAnchor="end">GPIO?</text></g>
        <g className="sch-wire"><path d="M126 48H190" pathLength={1}/><path d="M250 48H300V70" pathLength={1}/><path d="M300 88V100H136V88H126" pathLength={1}/></g>
        <g className="sch-part"><path d="M190 48l6-10 10 20 10-20 10 20 10-20 4 10h10"/><text x="220" y="28" textAnchor="middle">R1 220 Ω</text>
            <path d="M288 70h24l-12 18z M288 88h24"/><path d="M314 74l10-8 M318 82l10-8"/><text x="338" y="84">D1</text></g>
        <g className="sch-open"><path d="M126 128H230" pathLength={1}/><circle cx="238" cy="128" r="7"/><text x="252" y="133">{unresolved}</text></g>
    </svg>;
}
