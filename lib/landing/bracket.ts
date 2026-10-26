/**
 * The landing sheet's part: a NEMA 17 motor bracket (an L of two plates) whose wall, bore and material the visitor
 * changes, and the four checks it must meet. Pure: the view (components/landing/BracketView.tsx) draws what this
 * returns, and the checks are the same numbers the page prints.
 *
 * The checks are hand formulas, not the studio's review: a cantilever for the upright's deflection, plate areas for
 * the mass. The page labels them so. Millimetres, newtons, grams.
 */

export type Material = 'petg' | 'pa-cf' | 'al-6061';

/** Young's modulus (N/mm²) and density (g/cm³): typical datasheet values, rounded. */
export const MATERIALS: Record<Material, { modulus: number; density: number; label: string }> = {
    petg: { modulus: 2100, density: 1.27, label: 'PETG' },
    'pa-cf': { modulus: 6000, density: 1.2, label: 'PA-CF' },
    'al-6061': { modulus: 68900, density: 2.7, label: 'Al 6061-T6' },
};

export type BracketParams = { wall: number; bore: number; material: Material };

export const DEFAULTS: BracketParams = { wall: 4, bore: 22.5, material: 'petg' };
export const LIMITS = { wall: [2, 8], bore: [20, 38] } as const;

/** NEMA 17: a 42.3 mm face, a 22 mm pilot boss, M3 screws on a 31 mm square. */
export const MOTOR = { face: 42.3, pilot: 22, boltSpacing: 31, boltHole: 3.4 } as const;
/** The base reaches 50 mm forward and carries two M4 table slots, 12 mm long. */
export const BASE = { depth: 50, slotWidth: 4.5, slotLength: 12, slotX: 13 } as const;
/** The load case: a 20 N belt pull at the motor axis, sideways to the upright. */
export const LOAD = { force: 20 } as const;
export const REQUIRED = { boreClearance: 0.2, ligament: 2, deflection: 0.1, mass: 30 } as const;

export type Check = { id: 'clearance' | 'ligament' | 'deflection' | 'mass'; value: number; limit: number; unit: string; pass: boolean; rule: string };

export function clamp(params: BracketParams): BracketParams {
    const within = (value: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Number.isFinite(value) ? value : lo));
    return { wall: within(params.wall, LIMITS.wall), bore: within(params.bore, LIMITS.bore), material: params.material in MATERIALS ? params.material : 'petg' };
}

/** The upright's height: the motor face above the base plate. */
export const uprightHeight = (wall: number) => MOTOR.face + wall;
/** The motor axis, measured from the bottom of the base. */
export const axisHeight = (wall: number) => wall + MOTOR.face / 2;

const circle = (diameter: number) => Math.PI * (diameter / 2) ** 2;
const slotArea = () => BASE.slotWidth * (BASE.slotLength - BASE.slotWidth) + circle(BASE.slotWidth);

/** Solid volume (mm³): two plates, less their holes, less the block they share. */
export function volume({ wall, bore }: BracketParams): number {
    const base = (MOTOR.face * BASE.depth - 2 * slotArea()) * wall;
    const upright = (MOTOR.face * uprightHeight(wall) - circle(bore) - 4 * circle(MOTOR.boltHole)) * wall;
    return base + upright - MOTOR.face * wall * wall;
}

/** δ = F L³ / (3 E I), the upright as a cantilever from the base's top face, I = b t³ / 12. */
export function deflection({ wall, material }: BracketParams): number {
    const length = MOTOR.face / 2;
    const inertia = (MOTOR.face * wall ** 3) / 12;
    return (LOAD.force * length ** 3) / (3 * MATERIALS[material].modulus * inertia);
}

/** A value at its limit passes: 22.2 − 22 is 0.19999… in floating point, so a limit is met within a micrometre. */
const EPSILON = 1e-6;

export function checks(input: BracketParams): Check[] {
    const params = clamp(input);
    const clearance = params.bore - MOTOR.pilot;
    const ligament = (MOTOR.boltSpacing / 2) * Math.SQRT2 - params.bore / 2 - MOTOR.boltHole / 2;
    const delta = deflection(params);
    const mass = (volume(params) / 1000) * MATERIALS[params.material].density;
    return [
        { id: 'clearance', value: clearance, limit: REQUIRED.boreClearance, unit: 'mm', pass: clearance >= REQUIRED.boreClearance - EPSILON, rule: 'Ø bore − Ø22 pilot ≥ 0.2' },
        { id: 'ligament', value: ligament, limit: REQUIRED.ligament, unit: 'mm', pass: ligament >= REQUIRED.ligament - EPSILON, rule: '15.5√2 − r bore − r M3 ≥ 2' },
        { id: 'deflection', value: delta, limit: REQUIRED.deflection, unit: 'mm', pass: delta <= REQUIRED.deflection + EPSILON, rule: 'δ = FL³ / 3EI ≤ 0.10' },
        { id: 'mass', value: mass, limit: REQUIRED.mass, unit: 'g', pass: mass <= REQUIRED.mass + EPSILON, rule: 'V · ρ ≤ 30' },
    ];
}
