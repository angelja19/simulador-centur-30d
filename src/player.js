// Motor de ejecución: avanza el programa en el tiempo (ciclo continuo o bloque a bloque).
// Lo comparten la pantalla MACH 9 (gráfica) y el simulador 3D.
import { Sim } from './core/index.js';
import { S, A, on, emit } from './state.js';

export const P = {
  sim: null, t: 0, state: 'idle',        // idle | run | block | hold | done | estop
  blockEnd: null, blockLine: null, mi: -1, lastLine: null, raf: 0, last: 0
};

function moves() { return A ? A.run.moves : []; }

export function resetPlayer() {
  P.sim = A ? new Sim(A.run, A.setup) : null;
  P.t = 0; P.mi = -1; P.blockEnd = null; P.blockLine = null; P.lastLine = null;
  if (P.state !== 'estop') P.state = 'idle';
  emit('player', P);
}
on('analysis', () => { stop(); resetPlayer(); });

// índice del movimiento activo en el tiempo t
function moveAt(t) {
  const M = moves(); let lo = 0, hi = M.length - 1;
  if (!M.length) return -1;
  if (t >= M[hi].t1) return hi;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (M[mid].t1 <= t) lo = mid + 1; else hi = mid; }
  return lo;
}
function apply() {
  const M = moves(); if (!P.sim || !M.length) return;
  const i = moveAt(P.t), m = M[i];
  const frac = m.t1 > m.t0 ? Math.min(1, Math.max(0, (P.t - m.t0) / (m.t1 - m.t0))) : 1;
  P.sim.advanceTo(i, frac, false);
  P.mi = i;
  if (m.line !== P.lastLine) { P.lastLine = m.line; emit('line', m.line); }
}

// velocidad: segundos de programa por segundo real, con override F (0–140 %)
function rate(m) {
  const base = Math.pow(2, S.ui.speed - 3);         // selector −/+ de velocidad de simulación
  if (!m) return base;
  const f = m.kind === 'rapid' ? Math.max(S.ui.fOv, 1) / 100 : S.ui.fOv / 100;
  return base * f;
}

function tick(now) {
  const dtReal = Math.min(0.1, (now - P.last) / 1000); P.last = now;
  const M = moves();
  if (!M.length || (P.state !== 'run' && P.state !== 'block')) { P.raf = 0; return; }
  const total = A.run.total;
  let budget = dtReal;
  // avanza movimiento por movimiento respetando el override de cada uno
  while (budget > 1e-6) {
    const limit = P.blockEnd != null ? P.blockEnd : total;
    if (P.t >= limit - 1e-9) break;
    const m = M[moveAt(P.t)], r = rate(m);
    if (r <= 0) break;                           // F 0 %: los ejes se detienen
    const end = Math.min(m.t1 > P.t ? m.t1 : limit, limit);
    const need = (end - P.t) / r;
    if (need > budget) { P.t += budget * r; break; }
    P.t = end; budget -= need;
  }
  apply();
  emit('frame', P);
  if (P.blockEnd != null && P.t >= P.blockEnd - 1e-9) { P.state = 'hold'; P.blockEnd = null; emit('player', P); P.raf = 0; return; }
  if (P.t >= total - 1e-9) { P.state = 'done'; emit('player', P); emit('done', P); P.raf = 0; return; }
  P.raf = requestAnimationFrame(tick);
}
function loop() { if (!P.raf) { P.last = performance.now(); P.raf = requestAnimationFrame(tick); } }

export function cycleStart() {
  if (P.state === 'estop' || !A) return false;
  if (P.state === 'done' || !P.sim) resetPlayer();
  P.blockEnd = null; P.state = 'run'; emit('player', P); loop(); return true;
}
export function stop() { if (P.state === 'run' || P.state === 'block') { P.state = 'hold'; emit('player', P); } cancelAnimationFrame(P.raf); P.raf = 0; }

// Bloque a bloque: ejecuta los movimientos de UN bloque y se detiene. Devuelve el bloque ejecutado.
export function stepBlock() {
  if (P.state === 'estop' || !A) return null;
  if (P.state === 'done' || !P.sim) resetPlayer();
  const blocks = A.parsed.blocks, M = moves();
  // siguiente bloque = el que sigue a P.blockLine
  let idx = P.blockLine == null ? 0 : blocks.findIndex(b => b.line === P.blockLine) + 1;
  if (idx >= blocks.length || (A.run.endLine && P.blockLine >= A.run.endLine)) { P.state = 'done'; emit('player', P); return null; }
  const b = blocks[idx];
  P.blockLine = b.line;
  const bm = M.filter(m => m.line === b.line);
  emit('line', b.line);
  if (bm.length) {
    P.t = Math.max(P.t, bm[0].t0); P.blockEnd = bm[bm.length - 1].t1; P.state = 'block'; emit('player', P); loop();
  } else { P.state = 'hold'; emit('player', P); }
  if (A.run.endLine && b.line >= A.run.endLine && !bm.length) { P.state = 'done'; emit('player', P); }
  return b;
}

export function emergency(on_) {
  if (on_) { stop(); P.state = 'estop'; } else { P.state = 'idle'; resetPlayer(); }
  emit('player', P);
}
export function toEnd() { stop(); if (!A) return; resetPlayer(); P.t = A.run.total; apply(); P.state = 'done'; emit('frame', P); emit('player', P); }

// posición actual de la herramienta (x diámetro, z)
export function toolPos() {
  const M = moves();
  if (!M.length) return null;
  const i = Math.max(0, moveAt(P.t)), m = M[i];
  if (P.t <= 0 && P.mi < 0) return { x: m.x0, z: m.z0, tool: m.tool, m, i: 0 };
  const p = P.sim && P.sim.pos ? P.sim.pos : { z: m.z0, r: m.x0 / 2 };
  return { x: p.r * 2, z: p.z, tool: m.tool, m, i };
}
