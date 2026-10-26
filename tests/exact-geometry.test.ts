import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildBodies, buildStep, KERNEL, MAX_BODIES, type KernelApi } from '../lib/studio/exact-geometry';
import type { DeviceDocument, DevicePart, Solid } from '../lib/studio/types';

const packageDir = fileURLToPath(new URL('../node_modules/@classcad/smlibwasm/', import.meta.url));
let api: KernelApi;
beforeAll(async () => { api = await import('@classcad/smlibwasm'); }, 60_000);

function part(solids: Solid[], overrides: Partial<DevicePart> = {}): DevicePart {
  return { id: 'p', name: 'Plate', category: 'structure', description: '', role: '', position: [0, 0, 0], rotation: [0, 0, 0], size: [40, 20, 10], explode: [0, 0, 0], color: '#aabbcc', solids, specs: {}, connections: [], ...overrides };
}
function document_(parts: DevicePart[]): DeviceDocument {
  return { version: 1, id: 'doc', name: 'Desk clock', description: '', provenance: '', parts, steps: [], source: 'model' };
}
const bodiesOf = (doc: DeviceDocument) => buildBodies(api, doc).bodies as { volume: number; bbox: () => { min: THREE.Vector3Like; max: THREE.Vector3Like } }[];

describe('exact CAD export', () => {
  it('pins the kernel version and digest to the build the tests run', () => {
    const manifest = JSON.parse(readFileSync(new URL('package.json', `file://${packageDir}`), 'utf8'));
    expect(manifest.version).toBe(KERNEL.version);
    expect(KERNEL.init.endsWith(`/@classcad/smlibwasm@${KERNEL.version}/dist/init.js`)).toBe(true);
    expect(KERNEL.wasm.endsWith(`/@classcad/smlibwasm@${KERNEL.version}/wasm/smlibwasm.wasm`)).toBe(true);
    expect(createHash('sha256').update(readFileSync(new URL('wasm/smlibwasm.wasm', `file://${packageDir}`))).digest('hex')).toBe(KERNEL.sha256);
  });

  it('writes a box at the viewport values, in millimetres', () => {
    const [body] = bodiesOf(document_([part([{ kind: 'box', position: [5, 0, 0], size: [40, 20, 10] }])]));
    expect(body.volume).toBeCloseTo(40 * 20 * 10, 3);
    const box = body.bbox();
    expect([box.min.x, box.min.y, box.min.z]).toEqual([-15, -10, -5].map(value => expect.closeTo(value, 6)));
    expect([box.max.x, box.max.y, box.max.z]).toEqual([25, 10, 5].map(value => expect.closeTo(value, 6)));
  });

  it('turns a tapered cylinder into a frustum on the viewport Y axis', () => {
    const [body] = bodiesOf(document_([part([{ kind: 'cylinder', position: [0, 0, 0], size: [20, 30, 10] }])]));
    expect(body.volume).toBeCloseTo(Math.PI * 30 * (100 + 50 + 25) / 3, 1);
    const box = body.bbox();
    expect(box.max.y - box.min.y).toBeCloseTo(30, 3);
    expect(box.max.x - box.min.x).toBeCloseTo(20, 3);
    expect(box.max.z - box.min.z).toBeCloseTo(20, 3);
  });

  it('places a rotated component exactly where three.js draws it', () => {
    const solid: Solid = { kind: 'box', position: [3, -2, 1], size: [40, 20, 10], rotation: [12, -8, 21] };
    const placed = part([solid], { position: [10, 20, -30], rotation: [30, 45, 60] });
    const [body] = bodiesOf(document_([placed]));
    const size = new THREE.Vector3(...solid.size);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.scale.copy(size);
    mesh.position.set(...solid.position);
    mesh.rotation.set(...(solid.rotation || [0, 0, 0]).map(THREE.MathUtils.degToRad) as [number, number, number]);
    const group = new THREE.Group();
    group.position.set(...placed.position);
    group.rotation.set(...placed.rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    group.add(mesh);
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh), exact = body.bbox();
    expect(exact.min.x).toBeCloseTo(bounds.min.x, 3); expect(exact.max.x).toBeCloseTo(bounds.max.x, 3);
    expect(exact.min.y).toBeCloseTo(bounds.min.y, 3); expect(exact.max.y).toBeCloseTo(bounds.max.y, 3);
    expect(exact.min.z).toBeCloseTo(bounds.min.z, 3); expect(exact.max.z).toBeCloseTo(bounds.max.z, 3);
  });

  it('writes one named STEP product per component, and names what it left out', async () => {
    const document = document_([
      part([{ kind: 'box', position: [0, 0, 0], size: [40, 20, 10] }]),
      part([{ kind: 'cylinder', position: [30, 0, 0], size: [8, 12, 8] }], { id: 'shaft', name: 'Shaft' }),
      part([], { id: 'scan', name: 'Scanned shell', mesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] } }),
    ]);
    const result = await buildStep(document, async () => api);
    expect(result.step.startsWith('ISO-10303-21;')).toBe(true);
    expect(result.bodies).toBe(2);
    expect(result.step.match(/MANIFOLD_SOLID_BREP/g)).toHaveLength(2);
    expect(result.step).toContain("'Plate'");
    expect(result.step).toContain("'Shaft'");
    expect(result.skipped).toEqual(['Scanned shell: a scanned mesh has no exact primitive']);
    expect(result.products).toEqual(['Plate', 'Shaft']);
  });

  it('refuses an assembly past the body limit instead of freezing the page', () => {
    const many = document_([part(Array.from({ length: MAX_BODIES + 1 }, () => ({ kind: 'box' as const, position: [0, 0, 0] as [number, number, number], size: [1, 1, 1] as [number, number, number] })))]);
    expect(() => buildBodies(api, many)).toThrow(/more than 4000 exact bodies/);
  });

  it('reports a squashed sphere rather than writing a different solid', () => {
    const result = buildBodies(api, document_([part([{ kind: 'sphere', position: [0, 0, 0], size: [10, 4, 10] }])]));
    expect(result.bodies).toHaveLength(0);
    expect(result.skipped[0]).toMatch(/squashed sphere/);
  });
});
