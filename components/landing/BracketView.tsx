'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type * as Three from 'three';
import { axisHeight, uprightHeight, BASE, MOTOR, type BracketParams, type Check } from '@/lib/landing/bracket';
import { useT } from '@/lib/i18n';

/**
 * The landing sheet's part, drawn as a technical illustration: pale faces, graphite edges, hidden edges dashed (a
 * second pass that draws only where an edge is behind a face). three.js loads after the poster frame; the callouts,
 * dimensions and markups are HTML and SVG over the canvas, placed by projecting points of the part each frame, so a
 * dimension rides its feature when the part is rebuilt or turned.
 */
export type Revision = 'a' | 'b' | 'c';
type AnchorId = 'base' | 'upright' | 'bore' | 'bolts' | 'slots' | 'wallA' | 'wallB' | 'boreL' | 'boreR' | 'root' | 'centre';
type Point = { x: number; y: number };
type Projected = Record<AnchorId, Point> & { width: number; height: number };

const POSES: Record<Revision, { yaw: number; pitch: number }> = { a: { yaw: -0.62, pitch: 0.42 }, b: { yaw: -0.18, pitch: 0.2 }, c: { yaw: -1.02, pitch: 0.3 } };
const CALLOUTS: { id: AnchorId; key: string }[] = [
    { id: 'base', key: 'part.base' }, { id: 'upright', key: 'part.upright' }, { id: 'bore', key: 'part.bore' },
    { id: 'bolts', key: 'part.bolts' }, { id: 'slots', key: 'part.slots' },
];
/** Which feature a failed check circles. */
const MARKS: Record<Check['id'], AnchorId> = { clearance: 'bore', ligament: 'bolts', deflection: 'root', mass: 'centre' };

function anchors({ wall, bore }: BracketParams): Record<AnchorId, [number, number, number]> {
    const half = MOTOR.face / 2, axis = axisHeight(wall), top = uprightHeight(wall), r = bore / 2, bolt = MOTOR.boltSpacing / 2;
    return {
        base: [-half + 7, wall, BASE.depth * 0.78], upright: [-half + 5, top - 5, wall], bore: [r * 0.71, axis - r * 0.71, wall],
        bolts: [bolt, axis + bolt, wall], slots: [BASE.slotX, wall, wall + (BASE.depth - wall) / 2 + 4],
        wallA: [half, top, 0], wallB: [half, top, wall], boreL: [-r, axis, wall], boreR: [r, axis, wall],
        root: [-half * 0.4, wall, wall], centre: [0, axis * 0.7, BASE.depth * 0.35],
    };
}

/** The two plates as extruded profiles, holes cut, in millimetres: the upright in XY (front face z = wall), the base in XZ. */
function buildPart(T: typeof Three, { wall, bore }: BracketParams) {
    const half = MOTOR.face / 2, axis = axisHeight(wall), top = uprightHeight(wall), bolt = MOTOR.boltSpacing / 2;
    const hole = (x: number, y: number, diameter: number) => { const path = new T.Path(); path.absarc(x, y, diameter / 2, 0, Math.PI * 2, true); return path; };
    const upright = new T.Shape().moveTo(-half, 0).lineTo(half, 0).lineTo(half, top).lineTo(-half, top).closePath();
    upright.holes.push(hole(0, axis, bore));
    for (const [x, y] of [[-bolt, -bolt], [bolt, -bolt], [bolt, bolt], [-bolt, bolt]]) upright.holes.push(hole(x, axis + y, MOTOR.boltHole));
    // The base's profile is drawn with its depth on the shape's y; turned flat it reaches forward from the upright.
    const base = new T.Shape().moveTo(-half, 0).lineTo(half, 0).lineTo(half, BASE.depth).lineTo(-half, BASE.depth).closePath();
    const slotCentre = wall + (BASE.depth - wall) / 2, reach = (BASE.slotLength - BASE.slotWidth) / 2, sr = BASE.slotWidth / 2;
    for (const x of [-BASE.slotX, BASE.slotX]) {
        const slot = new T.Path();
        slot.absarc(x, slotCentre + reach, sr, 0, Math.PI, false);
        slot.absarc(x, slotCentre - reach, sr, Math.PI, Math.PI * 2, false);
        slot.closePath();
        base.holes.push(slot);
    }
    const settings = { depth: wall, bevelEnabled: false, curveSegments: 48 };
    const uprightGeometry = new T.ExtrudeGeometry(upright, settings);
    const baseGeometry = new T.ExtrudeGeometry(base, settings);
    baseGeometry.rotateX(Math.PI / 2);
    baseGeometry.translate(0, wall, 0);
    return [uprightGeometry, baseGeometry];
}

export default function BracketView({ params, revision, failed, label }: { params: BracketParams; revision: Revision; failed: Check['id'][]; label: string }) {
    const t = useT();
    const host = useRef<HTMLDivElement>(null);
    const api = useRef<{ rebuild: (p: BracketParams) => void; pose: (r: Revision) => void; turn: (dy: number, dp: number) => void } | null>(null);
    const latest = useRef({ params, revision });
    latest.current = { params, revision };
    const [projected, setProjected] = useState<Projected | null>(null);
    const [ready, setReady] = useState(false);
    // A markup is drawn on a part that has stopped turning: the pencil circles a feature where it is, not on the way.
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        let disposed = false, frame = 0, cleanup = () => {};
        const element = host.current!;
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        void import('three').then(T => {
            if (disposed) return;
            const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
            // 1.5 keeps the hairlines crisp and the frame cheap where WebGL runs in software.
            renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
            renderer.domElement.setAttribute('aria-hidden', 'true');
            element.prepend(renderer.domElement);
            const scene = new T.Scene();
            scene.add(new T.AmbientLight('#ffffff', 2.1));
            const sun = new T.DirectionalLight('#ffffff', 1.5);
            sun.position.set(-60, 90, 70);
            scene.add(sun);
            const camera = new T.OrthographicCamera(-1, 1, 1, -1, -500, 500);
            camera.position.set(0, 0, 200);
            camera.lookAt(0, 0, 0);
            const turned = new T.Group(), part = new T.Group();
            turned.add(part);
            scene.add(turned);
            const face = new T.MeshLambertMaterial({ color: '#f6f4ee', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
            const edge = new T.LineBasicMaterial({ color: '#272927' });
            const hidden = new T.LineDashedMaterial({ color: '#5d605b', dashSize: 1.4, gapSize: 1.1, transparent: true, opacity: 0.55, depthWrite: false, depthFunc: T.GreaterDepth });
            const pose = { yaw: POSES[latest.current.revision].yaw, pitch: POSES[latest.current.revision].pitch };
            let target = { ...pose }, points = anchors(latest.current.params), pending: BracketParams | null = null;

            const draw = () => {
                const width = element.clientWidth, height = element.clientHeight;
                if (!width || !height) return;
                turned.rotation.set(pose.pitch, pose.yaw, 0, 'XYZ');
                // Fit the part's 50 × 46 × 50 mm envelope with a margin for the callouts.
                const span = 100, aspect = width / height;
                camera.left = -span / 2 * Math.max(aspect, 1); camera.right = span / 2 * Math.max(aspect, 1);
                camera.top = span / 2 / Math.min(aspect, 1); camera.bottom = -span / 2 / Math.min(aspect, 1);
                camera.updateProjectionMatrix();
                renderer.render(scene, camera);
                scene.updateMatrixWorld();
                const out = { width, height } as Projected;
                for (const [id, [x, y, z]] of Object.entries(points) as [AnchorId, [number, number, number]][]) {
                    const v = part.localToWorld(new T.Vector3(x, y, z)).project(camera);
                    out[id] = { x: (v.x + 1) / 2 * width, y: (1 - v.y) / 2 * height };
                }
                setProjected(out);
            };
            const animate = () => {
                frame = 0;
                // Changes that arrive within one frame (a held arrow key, a fast drag) rebuild the part once.
                if (pending) { build(pending); pending = null; }
                const k = still ? 1 : 0.14;
                pose.yaw += (target.yaw - pose.yaw) * k;
                pose.pitch += (target.pitch - pose.pitch) * k;
                draw();
                const moving = Math.abs(target.yaw - pose.yaw) + Math.abs(target.pitch - pose.pitch) > 0.0015;
                setSettled(!moving);
                if (moving) frame = requestAnimationFrame(animate);
            };
            const kick = () => { if (!frame) frame = requestAnimationFrame(animate); };
            const build = (p: BracketParams) => {
                for (const child of [...part.children]) { part.remove(child); (child as Three.Mesh).geometry.dispose(); }
                for (const geometry of buildPart(T, p)) {
                    part.add(new T.Mesh(geometry, face));
                    const lines = new T.EdgesGeometry(geometry, 24);
                    part.add(new T.LineSegments(lines, edge));
                    const behind = new T.LineSegments(lines, hidden);
                    behind.computeLineDistances();
                    behind.renderOrder = 2;
                    part.add(behind);
                }
                part.position.set(0, -uprightHeight(p.wall) / 2, -BASE.depth / 2 + 6);
                points = anchors(p);
            };
            const rebuild = (p: BracketParams) => { pending = p; kick(); };
            api.current = {
                rebuild,
                pose: r => { target = { ...POSES[r] }; kick(); },
                turn: (dy, dp) => { target = { yaw: target.yaw + dy, pitch: Math.max(-0.2, Math.min(1.1, target.pitch + dp)) }; kick(); },
            };
            const resize = () => { renderer.setSize(element.clientWidth, element.clientHeight, false); kick(); };
            const observer = new ResizeObserver(resize);
            observer.observe(element);
            build(latest.current.params);
            resize();
            setReady(true);
            cleanup = () => { observer.disconnect(); renderer.dispose(); renderer.domElement.remove(); };
        });
        return () => { disposed = true; cancelAnimationFrame(frame); cleanup(); api.current = null; };
    }, []);

    useEffect(() => { api.current?.rebuild(params); }, [params]);
    useEffect(() => { api.current?.pose(revision); }, [revision]);

    const drag = useRef<{ x: number; y: number } | null>(null);
    const onPointerDown = (event: PointerEvent) => { drag.current = { x: event.clientX, y: event.clientY }; (event.target as Element).setPointerCapture?.(event.pointerId); };
    const onPointerMove = (event: PointerEvent) => {
        if (!drag.current) return;
        api.current?.turn((event.clientX - drag.current.x) * 0.01, (event.clientY - drag.current.y) * 0.006);
        drag.current = { x: event.clientX, y: event.clientY };
    };
    const onKey = (event: KeyboardEvent) => {
        const step = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] }[event.key];
        if (!step) return;
        event.preventDefault();
        api.current?.turn(step[0], step[1]);
    };

    const p = projected;
    const centre = p ? { x: p.width / 2, y: p.height / 2 } : { x: 0, y: 0 };
    const reach = p && p.width < 520 ? 34 : 58;
    const balloon = (at: Point) => {
        const dx = at.x - centre.x, dy = at.y - centre.y, length = Math.hypot(dx, dy) || 1;
        return { x: Math.min(p!.width - 16, Math.max(16, at.x + dx / length * reach)), y: Math.min(p!.height - 16, Math.max(16, at.y + dy / length * reach)) };
    };

    return (
        <div ref={host} className="bv" data-revision={revision} data-ready={ready || undefined} tabIndex={0} role="img" aria-label={label}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={onKey}>
            {!ready && <img className="bv-poster" src="/media/bracket-poster.webp" alt="" width={1200} height={1000}/>}
            {p && <svg className="bv-overlay" width={p.width} height={p.height} viewBox={`0 0 ${p.width} ${p.height}`} aria-hidden="true">
                <defs>
                    <marker id="bv-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 1.5 10 5 0 8.5z" fill="currentColor"/></marker>
                </defs>
                <g className="bv-callouts">
                    {CALLOUTS.map(({ id }, index) => { const at = p[id], b = balloon(at); return <g key={id} style={{ ['--i' as string]: index }}><line x1={b.x} y1={b.y} x2={at.x} y2={at.y} pathLength={1}/><circle className="bv-dot" cx={at.x} cy={at.y} r={2.2}/></g>; })}
                </g>
                <g className="bv-dims">
                    <Dimension from={p.wallA} to={p.wallB} offset={-26} text={`t ${params.wall.toFixed(1)}`}/>
                    <Dimension from={p.boreL} to={p.boreR} offset={0} text={`Ø${params.bore.toFixed(1)}`} inside/>
                </g>
                <g className="bv-marks">
                    {settled && failed.map(id => { const at = p[MARKS[id]]; return <ellipse key={id} cx={at.x} cy={at.y} rx={id === 'mass' ? 70 : 24} ry={id === 'mass' ? 46 : 17} transform={`rotate(-8 ${at.x} ${at.y})`} pathLength={1}/>; })}
                </g>
            </svg>}
            {p && <ol className="bv-balloons" aria-hidden="true">
                {CALLOUTS.map(({ id, key }, index) => { const b = balloon(p[id]); return <li key={id} style={{ left: b.x, top: b.y, ['--i' as string]: index }} data-side={b.x < centre.x ? 'left' : 'right'}><b>{index + 1}</b><span>{t(key)}</span></li>; })}
            </ol>}
            {!ready && <span className="bv-loading">{t('part.loading')}</span>}
        </div>
    );
}

/** A dimension between two projected points: extension lines, a line with arrowheads set off by `offset` px, its text. */
function Dimension({ from, to, offset, text, inside = false }: { from: Point; to: Point; offset: number; text: string; inside?: boolean }) {
    const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * offset, ny = dx / length * offset;
    const a = { x: from.x + nx, y: from.y + ny }, b = { x: to.x + nx, y: to.y + ny };
    // A short dimension puts its arrows outside, pointing in, as a drawing does.
    const short = length < 26 && !inside;
    const ux = dx / length, uy = dy / length;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return <g className="bv-dim">
        {offset !== 0 && <><line className="bv-ext" x1={from.x} y1={from.y} x2={a.x + nx * 0.25} y2={a.y + ny * 0.25}/><line className="bv-ext" x1={to.x} y1={to.y} x2={b.x + nx * 0.25} y2={b.y + ny * 0.25}/></>}
        {short
            ? <><line x1={a.x - ux * 16} y1={a.y - uy * 16} x2={a.x} y2={a.y} markerEnd="url(#bv-arrow)"/><line x1={b.x + ux * 16} y1={b.y + uy * 16} x2={b.x} y2={b.y} markerEnd="url(#bv-arrow)"/><line x1={a.x} y1={a.y} x2={b.x} y2={b.y}/></>
            : <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} markerStart="url(#bv-arrow)" markerEnd="url(#bv-arrow)"/>}
        <text x={mid.x + nx * 0.5} y={mid.y + ny * 0.5 - (inside ? 7 : 0)} textAnchor="middle">{text}</text>
    </g>;
}
