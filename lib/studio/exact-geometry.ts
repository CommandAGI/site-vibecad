import type { Part } from '@classcad/smlibwasm';
import type { DeviceDocument, DevicePart, Solid, Vec3 } from './types';

/**
 * Exact CAD export: the studio's solids as SMLib boundary-representation bodies, written as a
 * STEP AP214 assembly with one product per component.
 *
 * CommandAGI's kernel is SMLib, published as `@classcad/smlibwasm`. Its WebAssembly file is 9.4 MB
 * and the site's Worker may inline 8 MB, most of it already the studio's pages, so the kernel is
 * not bundled: it comes from its pinned, immutable build, and the download is checked against the
 * published SHA-256 before any of it runs. The only thing the site fetches is this kernel; a
 * project that never exports a CAD model never fetches it.
 *
 * `tests/exact-geometry.test.ts` holds the pinned version and digest to the installed package and
 * checks the bodies against analytic volumes and three.js bounds.
 */
export type KernelApi = typeof import('@classcad/smlibwasm');
export type KernelLoader = () => Promise<KernelApi>;

export const KERNEL = {
  version: '0.5.0',
  init: 'https://cdn.jsdelivr.net/npm/@classcad/smlibwasm@0.5.0/dist/init.js',
  wasm: 'https://cdn.jsdelivr.net/npm/@classcad/smlibwasm@0.5.0/wasm/smlibwasm.wasm',
  sha256: 'f9c09613ffe3babab4a29ce8cf0d93f486ba347a9fe16873c80a37991a2e2ca2',
} as const;

/** Bodies a person waits for; past this the page would freeze, so the export refuses instead. */
export const MAX_BODIES = 4000;

export type ExactExport = {
  step: string;
  bodies: number;
  /** Components the STEP file carries, by name. */
  products: string[];
  /** Components that stay in the project file only, with the reason. */
  skipped: string[];
};

export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', view as unknown as BufferSource);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function loadPinnedKernel(): Promise<KernelApi> {
  const response = await fetch(KERNEL.wasm);
  if (!response.ok) throw new Error(`The CAD kernel did not download (HTTP ${response.status}). Nothing was exported.`);
  const bytes = await response.arrayBuffer();
  const digest = await sha256Hex(bytes);
  if (digest !== KERNEL.sha256) throw new Error('The CAD kernel download did not match its published SHA-256. Nothing was exported.');
  const module = (await import(/* webpackIgnore: true */ KERNEL.init)) as { init: (options: { wasmBinary: ArrayBuffer }) => Promise<KernelApi> };
  return module.init({ wasmBinary: bytes });
}

/** A solid the kernel cannot hold exactly: it stays in the project, and the export says why. */
const skippedSolid = (solid: Solid): string | null => {
  if (solid.kind === 'sphere') {
    const [x, y, z] = solid.size;
    if (Math.abs(x - y) > 1e-6 || Math.abs(y - z) > 1e-6) return 'a squashed sphere has no exact primitive';
  }
  return null;
};

/**
 * three.js's Euler order (X, then Y, then Z: its matrix is Rx·Ry·Rz), which the document's
 * rotations are in. SMLib's own three-angle `Rot` composes them the other way, so the axes are
 * multiplied here in the order the viewport applies them.
 */
const euler = (api: KernelApi, [x, y, z]: Vec3) => api.Rot(x, 0, 0).mul(api.Rot(0, y, 0)).mul(api.Rot(0, 0, z));

/** The part's own primitives, placed by its transform, in millimetres. */
export function partBodies(api: KernelApi, part: DevicePart, skipped: string[]): Part[] {
  const bodies: Part[] = [];
  const solids = part.solids.length ? part.solids : [{ kind: 'box' as const, position: [0, 0, 0] as Vec3, size: part.size }];
  for (const solid of solids) {
    const reason = skippedSolid(solid);
    if (reason) {
      skipped.push(`${part.name}: ${reason}`);
      continue;
    }
    const [x, y, z] = solid.size;
    let primitive: Part;
    let alongY = false;
    if (solid.kind === 'cylinder') {
      // three.js builds its cylinder along Y: radiusTop = size[0]/2, radiusBottom = size[2]/2.
      if (Math.abs(x - z) > 1e-6) primitive = api.Cone(z / 2, x / 2, y);
      else primitive = api.Cylinder(x / 2, y);
      alongY = true;
    } else if (solid.kind === 'sphere') primitive = api.Sphere(x / 2);
    else if (solid.kind === 'torus') primitive = api.Torus(Math.max(.1, x), Math.max(.05, y));
    else primitive = api.Box(x, y, z);
    let location = api.Pos(...part.position).mul(euler(api, part.rotation)).mul(api.Pos(...solid.position)).mul(euler(api, solid.rotation || [0, 0, 0]));
    // SMLib's cylinder runs along Z and three.js's along Y, so the solid's rotation is followed by
    // the one quarter turn that puts the axis where the viewport has it.
    if (alongY) location = location.mul(api.Rot(-90, 0, 0));
    bodies.push(location.mul(primitive).named(part.name));
  }
  return bodies;
}

export function buildBodies(api: KernelApi, document: DeviceDocument) {
  const skipped: string[] = [];
  const bodies: Part[] = [];
  for (const part of document.parts) {
    if (part.assetNode) { skipped.push(`${part.name}: the imported model stays in the project file`); continue; }
    if (part.mesh) { skipped.push(`${part.name}: a scanned mesh has no exact primitive`); continue; }
    if (bodies.length + part.solids.length > MAX_BODIES) throw new Error(`This assembly has more than ${MAX_BODIES} exact bodies. Export the component list instead.`);
    bodies.push(...partBodies(api, part, skipped));
  }
  return { bodies, skipped };
}

export async function buildStep(document: DeviceDocument, load: KernelLoader = loadPinnedKernel): Promise<ExactExport> {
  const api = await load();
  const { bodies, skipped } = buildBodies(api, document);
  if (!bodies.length) throw new Error('No component of this assembly can be written exactly. The project file keeps every part.');
  const step = api.toStep(bodies, { unit: 'mm', assembly: true, name: document.name });
  return {
    step,
    bodies: bodies.length,
    products: document.parts.filter(part => !part.assetNode && !part.mesh).map(part => part.name),
    skipped,
  };
}
