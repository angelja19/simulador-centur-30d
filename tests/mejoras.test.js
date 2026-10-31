import { describe, it, expect } from 'vitest';
import { cam, ISO_THREADS, isoExternal, analyze, DEFAULT_PROFILE, MATERIALS, KS, MACHINE } from '../src/core/index.js';

const base = { name: 'T', profileText: DEFAULT_PROFILE, barD: 25, ap: 0.5, F: 0.2, S: 1000, faceStock: 0.5, dec: 2,
  tools: { rough: '0101', finish: '0303', thread: '0505', part: '0707' }, blade: { w: 3, ref: 'der' }, thread: { on: false } };
const tools = { 1: { type: 'turn', k2: 32 }, 3: { type: 'turn', k2: 52 }, 5: { type: 'thread' }, 7: { type: 'blade', w: 3, ref: 'der' } };

describe('mejoras del generador', () => {
  it('F y S separados para desbaste y acabado', () => {
    const r = cam(Object.assign({}, base, { Ff: 0.08, Sf: 1600 }));
    const L = r.text.split('\n');
    const iFin = L.indexOf('T0303 M6');
    expect(L.slice(0, iFin).some(l => /F0\.2$/.test(l))).toBe(true);
    expect(L[iFin + 2]).toBe('S1600 M3');
    expect(L.slice(iFin).some(l => /F0\.08$/.test(l))).toBe(true);
  });
  it('G96 con límite G92 en desbaste y acabado, G97 en roscado', () => {
    const r = cam(Object.assign({}, base, { css: { vcR: 180, vcF: 220, smax: 3000 }, thread: { on: true, dMaj: 11, dMin: 9.65, pitch: 1.25, zStart: 4, zEnd: -19.2 } }));
    const L = r.text.split('\n');
    const i1 = L.indexOf('T0101 M6');
    expect(L.slice(i1 + 1, i1 + 4)).toEqual(['G92 S3000', 'G96', 'S180 M3']);
    const i5 = L.indexOf('T0505 M6');
    expect(L.slice(i5 + 1, i5 + 3)).toEqual(['G97', 'S1000 M3']);
    const a = analyze(r.text, { stock: { barD: 25, barLen: 100, grip: 22, faceStock: 0.5 }, tools, ap: 0.5, material: 'SAE 1045' });
    expect(a.errors).toBe(0);
    expect(a.run.rpmMax).toBeLessThanOrEqual(3000 + 1e-6);
  });
  it('roscas ISO: Ø de fondo = d − 1,22687·P', () => {
    const m12 = ISO_THREADS.find(t => t.name === 'M12');
    expect(m12.p).toBe(1.75);
    expect(m12.dMin).toBeCloseTo(12 - 1.22687 * 1.75, 3);
    expect(isoExternal(20, 2.5).h3).toBeCloseTo(1.5336, 3);
  });
  it('cada material usa una tabla Ks del manual', () => {
    for (const m of Object.values(MATERIALS)) expect(KS[m.ks]).toBeTruthy();
  });
  it('datos de la máquina según la ficha', () => {
    expect(MACHINE.spindle).toMatchObject({ rpmMin: 4, rpmMax: 4000, bore: 53 });
    expect(MACHINE.travel).toEqual({ x: 220, z: 1065 });
    expect(MACHINE.rapid.z).toBe(10000);
    expect([MACHINE.swing, MACHINE.swingOverCarriage, MACHINE.betweenCenters, MACHINE.centerHeight]).toEqual([350, 200, 1000, 215]);
  });
});
