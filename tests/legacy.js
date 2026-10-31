// Carga el núcleo M9 tal cual está en el HTML original (legacy/) para la prueba de oro.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'legacy', 'simulador_original.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const coreSrc = scripts.find(s => s.includes('class Sim'));
const dataSrc = scripts.find(s => s.includes('DEFAULT_PROGRAM'));
export function loadLegacy() {
  const module = { exports: {} };
  new Function('module', 'globalThis', coreSrc)(module, {});
  const win = {};
  new Function('window', dataSrc)(win);
  return { M9: module.exports, DEFAULT_PROGRAM: win.DEFAULT_PROGRAM, DEFAULT_PROFILE: win.DEFAULT_PROFILE };
}
