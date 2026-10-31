// PRUEBA DE ORO: el núcleo refactorizado (src/core) debe dar exactamente
// los mismos resultados que el núcleo del HTML original (legacy/).
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadLegacy } from './legacy.js';
import { summarize } from './summarize.js';
import * as M9 from '../src/core/index.js';

const legacy = loadLegacy();
const G = new URL('./fixtures/golden.json', import.meta.url);

describe('prueba de oro del núcleo M9', () => {
  const ref = summarize(legacy.M9, legacy);
  it('el original coincide con la referencia congelada', () => {
    if (!existsSync(G)) writeFileSync(G, JSON.stringify(ref, null, 1));
    expect(ref).toEqual(JSON.parse(readFileSync(G, 'utf8')));
  });
  it('el núcleo refactorizado reproduce al original', () => {
    const now = summarize(M9, { DEFAULT_PROGRAM: M9.DEFAULT_PROGRAM, DEFAULT_PROFILE: M9.DEFAULT_PROFILE });
    for (const k of Object.keys(ref)) expect(now[k], k).toEqual(ref[k]);
  });
});
