// Estado compartido de la app + análisis automático del programa.
import { analyze, DEFAULT_PROGRAM, DEFAULT_PROFILE, DEFAULT_TURRET, TOOL_LIBRARY, MATERIALS } from './core/index.js';

const STORE = 'centur30d-app-v1';
export const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => bus.addEventListener(type, e => fn(e.detail));

const defaults = () => ({
  code: DEFAULT_PROGRAM,
  progNum: 11,
  profileText: DEFAULT_PROFILE,
  stock: { material: 'SAE 1045', barD: 25, barLen: 100, grip: 22, faceStock: 0.5 },
  ap: 0.5, maxDec: 2,
  turret: DEFAULT_TURRET.map(t => Object.assign({}, t)),
  cam: { Fr: 0.2, Sr: 1000, Ff: 0.1, Sf: 1400, css: false, VcR: 170, VcF: 220, Smax: 3000, thread: { on: true, iso: 'M11x1,25', zStart: 4, zEnd: -19.2 } },
  ui: { screen: 'mach9', fOv: 100, sOv: 100, speed: 6 }
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (s && s.code != null) { const d = defaults(); return Object.assign(d, s, { stock: Object.assign(d.stock, s.stock), cam: Object.assign(d.cam, s.cam), ui: Object.assign(d.ui, s.ui) }); }
  } catch (e) { /* almacenamiento no disponible */ }
  return defaults();
}

export const S = load();
export let A = null; // último análisis

export function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } }

export function toolsMap() {
  const m = {};
  for (const t of S.turret) {
    const lib = TOOL_LIBRARY.find(l => l.id === t.lib) || {};
    m[t.num] = Object.assign({ name: lib.name || t.use }, lib, t);
  }
  return m;
}
export const material = () => MATERIALS[S.stock.material] || MATERIALS['SAE 1045'];

let timer = 0;
export function reanalyze(now) {
  clearTimeout(timer);
  const run = () => {
    A = analyze(S.code, { stock: S.stock, tools: toolsMap(), ap: S.ap, maxDec: S.maxDec, material: S.stock.material, profileText: S.profileText });
    save();
    emit('analysis', A);
  };
  if (now) run(); else timer = setTimeout(run, 250);
}

export function setCode(code, opts = {}) {
  S.code = String(code).replace(/\r\n?/g, '\n');
  emit('code', { from: opts.from || 'app' });
  reanalyze(opts.now);
}
export function resetAll() { Object.assign(S, defaults()); save(); emit('code', { from: 'app' }); emit('stock', S.stock); reanalyze(true); }
