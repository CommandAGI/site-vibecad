/**
 * The landing sheet's part prints these checks as facts about the bracket, so each one must be the formula it names,
 * computed here by hand, and must flip where the formula says. A check that passes because it was told to would be a
 * claim the page cannot back (redesign/DESIGN.md, the signature moment).
 */
import { describe, expect, it } from 'vitest';
import { checks, clamp, DEFAULTS } from '../lib/landing/bracket';

const verdicts = (params: Parameters<typeof checks>[0]) => Object.fromEntries(checks(params).map(check => [check.id, check.pass]));
const value = (params: Parameters<typeof checks>[0], id: string) => checks(params).find(check => check.id === id)!.value;

describe('the landing bracket', () => {
    it('opens with one honest failure: a 4 mm PETG upright bends 0.13 mm under the 20 N pull', () => {
        // δ = F L³ / (3 E I): F 20 N, L = 42.3 / 2 mm, E 2100 N/mm², I = 42.3 · 4³ / 12 mm⁴.
        const expected = (20 * 21.15 ** 3) / (3 * 2100 * ((42.3 * 4 ** 3) / 12));
        expect(value(DEFAULTS, 'deflection')).toBeCloseTo(expected, 6);
        expect(expected).toBeCloseTo(0.133, 3);
        expect(verdicts(DEFAULTS)).toEqual({ clearance: true, ligament: true, deflection: false, mass: true });
    });

    it('passes when the wall thickens, and trades stiffness for mass when the material changes', () => {
        expect(verdicts({ ...DEFAULTS, wall: 5 })).toEqual({ clearance: true, ligament: true, deflection: true, mass: true });
        // Aluminium is 33 times stiffer and twice as dense: the 4 mm bracket stops bending and passes 30 g.
        expect(verdicts({ ...DEFAULTS, material: 'al-6061' })).toMatchObject({ deflection: true, mass: false });
        expect(value({ ...DEFAULTS, material: 'al-6061' }, 'mass')).toBeCloseTo(value(DEFAULTS, 'mass') * 2.7 / 1.27, 6);
    });

    it('fails the bore at both ends: no clearance over the 22 mm pilot, no wall left before the screws', () => {
        expect(verdicts({ ...DEFAULTS, bore: 22 })).toMatchObject({ clearance: false });
        expect(verdicts({ ...DEFAULTS, bore: 22.2 })).toMatchObject({ clearance: true });
        // 15.5 √2 − r − 1.7 ≥ 2 holds up to a bore of 36.44 mm.
        expect(verdicts({ ...DEFAULTS, bore: 36 })).toMatchObject({ ligament: true });
        expect(verdicts({ ...DEFAULTS, bore: 37 })).toMatchObject({ ligament: false });
    });

    it('keeps a value typed or dragged past the limits inside them', () => {
        expect(clamp({ wall: 50, bore: Number.NaN, material: 'unobtainium' as never })).toEqual({ wall: 8, bore: 20, material: 'petg' });
    });
});
