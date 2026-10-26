/**
 * VibeCAD's wordmark: single-stroke drafting letters on a 9 × 14 grid (the construction of ISO 3098 lettering, drawn
 * here, not set in a font), kerned by hand: A tucks under C, I sits on a narrow advance. The vermilion triangle is a
 * drawing's revision mark.
 */
export const WORDMARK_PATHS = [
    'M0 0 4.5 14 9 0',
    'M12.5 0V14',
    'M16 0H21.5A3.5 3.5 0 0 1 21.5 7H16M16 7H22A3.5 3.5 0 0 1 22 14H16V0',
    'M35 0H28V14H35M28 7H33.5',
    'M46.5 3C45.5 1 44 0 42.5 0 40 0 38 3 38 7S40 14 42.5 14C44 14 45.5 13 46.5 11',
    'M48.5 14 53 0 57.5 14M50.2 9H55.8',
    'M60.5 0H64.5C67.5 0 69.5 3 69.5 7S67.5 14 64.5 14H60.5Z',
];

export default function Wordmark({ title = 'VibeCAD' }: { title?: string }) {
    return <svg className="wordmark" viewBox="-1 -1 81 16" role="img" aria-label={title}>
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" strokeLinejoin="miter">{WORDMARK_PATHS.map(d => <path key={d} d={d}/>)}</g>
        <path d="M73 14 76.5 7.5 80 14Z" fill="#f65a35"/>
    </svg>;
}
