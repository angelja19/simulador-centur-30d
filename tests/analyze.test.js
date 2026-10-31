import { describe, it, expect } from 'vitest';
import { analyze, describeBlock, modalStates, DEFAULT_PROGRAM, DEFAULT_PROFILE, checkStock } from '../src/core/index.js';
import { PROGRAMS } from './fixtures/programs.js';
const tools = { 1: { type: 'turn', k2: 32 }, 3: { type: 'turn', k2: 52 }, 5: { type: 'thread' }, 7: { type: 'blade', w: 3, ref: 'der' } };
const cfg = { stock: { barD: 25, barLen: 100, grip: 22, faceStock: 0.5 }, tools, ap: 0.5, maxDec: 2, material: 'SAE 1045' };

describe('análisis y panel de errores', () => {
  it('el programa del curso no tiene errores', () => {
    const a = analyze(DEFAULT_PROGRAM, Object.assign({ profileText: DEFAULT_PROFILE }, cfg));
    expect(a.errors).toBe(0);
  });
  it('detecta errores con fila, bloque y explicación', () => {
    const a = analyze(PROGRAMS.errores, cfg);
    const t = a.msgs.find(m => m.code === 'T CON MOVIM. ILEGAL');
    expect(t.line).toBe(3); expect(t.raw).toBe('T0101 X10'); expect(t.why).toMatch(/bloques separados/); expect(t.effect.length).toBeGreaterThan(10);
    expect(a.msgs.some(m => m.code === 'DEF. CÓDIGO DOBLE')).toBe(true);
    expect(a.msgs.some(m => m.code === 'ROTACIÓN EXCEDE EL MÁXIMO')).toBe(true);
    expect(a.msgs.some(m => m.code === 'HUSILLO PRINCIPAL DETENIDO')).toBe(true);
  });
  it('detecta choque con el plato y colisión en G0', () => {
    const a = analyze(PROGRAMS.choque, cfg);
    expect(a.msgs.some(m => m.code === 'CHOQUE CON EL PLATO')).toBe(true);
    expect(a.msgs.some(m => m.code.startsWith('COLISIÓN'))).toBe(true);
    expect(a.msgs.some(m => m.code === 'PROG. SIN M02')).toBe(false);
  });
  it('avisa de falta de M02 y de herramienta fuera de la torreta', () => {
    const a = analyze('T0901\nS500 M3\nG0 X30. Z2.\nG1 X20. F0.1\n', cfg);
    expect(a.msgs.some(m => m.code === 'PROG. SIN M02')).toBe(true);
    expect(a.msgs.some(m => m.code === 'HERRAMIENTA INEXISTENTE')).toBe(true);
  });
  it('valida la pieza en bruto contra la máquina', () => {
    expect(checkStock({ barD: 400, barLen: 100, grip: 20 }).some(m => m.code === 'PIEZA MAYOR QUE EL VOLTEO')).toBe(true);
    expect(checkStock({ barD: 60, barLen: 200, grip: 80 }).some(m => m.code === 'LA BARRA NO ENTRA EN EL HUSILLO')).toBe(true);
    expect(checkStock({ barD: 25, barLen: 1200, grip: 30 }).some(m => m.code === 'PIEZA MÁS LARGA QUE ENTRE PUNTAS')).toBe(true);
    expect(checkStock({ barD: 25, barLen: 100, grip: 22 }).filter(m => m.sev === 'error').length).toBe(0);
  });
  it('explica un bloque en español', () => {
    const a = analyze('G0 X30. Z2.\nG1 X22.5 F0.1\n', cfg);
    const st = modalStates(a.parsed.blocks);
    expect(describeBlock(a.parsed.blocks[1], st[1])).toContain('G1 X22.5: avance lineal de corte hasta Ø22,5');
  });
  it('el radio de punta deja material en un cono (efecto sin compensación)', () => {
    const prog = 'T0101\nS1000 M3\nG0 X30. Z2.\nG0 X10. Z1.\nG1 X20. Z-10. F0.1\nZ-20.\nG0 X30.\nM02\n';
    const a0 = analyze(prog, cfg), a1 = analyze(prog, Object.assign({}, cfg, { tools: { 1: { type: 'turn', k2: 32, rn: 0.8 } } }));
    const k = Math.round((-5 - a0.sim.z0) / a0.sim.h);
    expect(a1.final.r[k]).toBeGreaterThan(a0.final.r[k]);
  });
});
describe('regla del punto decimal (clase del docente)', () => {
  it('X10 sin punto se lee como 0,010 mm y es ERROR', () => {
    const a = analyze('G99\nT0101 M6\nS1000 M3\nG0 X30. Z2.\nG1 X10 F0.1\nM30\n', cfg);
    const m = a.msgs.find(x => x.code === 'COTA SIN PUNTO DECIMAL');
    expect(m.sev).toBe('error'); expect(m.line).toBe(5);
    expect(a.run.moves.at(-1).x1).toBeCloseTo(0.01, 6);
  });
  it('S con punto avisa que es velocidad de corte', () => {
    const a = analyze('S100. M3\nM30\n', cfg);
    expect(a.msgs.some(x => x.code === 'S CON PUNTO DECIMAL')).toBe(true);
  });
});
