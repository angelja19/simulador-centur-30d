// Núcleo M9 extraído sin cambios de lógica de legacy/simulador_original.html
import { fmt, arcFromR, arcFromCenter } from './geometry.js';
import { G_KNOWN } from './parse.js';

/* ======================================================================
   INTÉRPRETE
   ====================================================================== */
export const DEFAULT_TOOLS = {
  1: { num: 1, use: 'Desbaste', type: 'turn', k2: 32, name: 'DNMG 55°' },
  3: { num: 3, use: 'Acabado', type: 'turn', k2: 52, name: 'VBMT 35°' },
  5: { num: 5, use: 'Roscado', type: 'thread', name: 'Rosca 60°' },
  7: { num: 7, use: 'Tronzado', type: 'blade', w: 3, ref: 'der', name: 'Cuchilla 3 mm' }
};

export function interpret(parsed, setup) {
  setup = setup || {};
  const tools = setup.tools || DEFAULT_TOOLS;
  const RAPID = setup.rapidFeed || 7500, THR_K = setup.threadConst || 3000, TC_TIME = 2;
  const moves = [], msgs = [], events = [];
  const msg = (sev, line, code, text) => msgs.push({ sev, line, code, text });
  const onceKeys = new Set();
  const once = (key, sev, line, code, text) => { if (!onceKeys.has(key)) { onceKeys.add(key); msg(sev, line, code, text); } };
  const st = { x: null, z: null, mode: 0, abs: true, diam: true, perRev: true, inch: false, css: false, Vc: 0, rpm: 0,
    rpmLimit: Infinity, spindle: 0, F: null, tool: null, corr: null, ended: false, pitch: null, rpmMax: 0 };
  let total = 0, toolChanges = 0;

  const rpmAt = dia => st.css ? Math.min(st.rpmLimit, 1000 * st.Vc / (Math.PI * Math.max(dia, 0.5))) : st.rpm;
  const toolObj = () => st.tool == null ? null : (tools[st.tool] || { num: st.tool, type: 'turn', k2: 30, name: 'Genérica' });

  function addMove(b, kind, x1, z1, extra) {
    const m = Object.assign({ line: b.line, kind, tool: st.tool, x0: st.x, z0: st.z, x1, z1 }, extra || {});
    if (m.arc) {
      const A = m.arc; m.len = Math.abs(A.a1 - A.a0) * (A.R0 + A.R1) / 2;
    } else m.len = Math.hypot((x1 - st.x) / 2, z1 - st.z);
    const dia = Math.max(Math.abs(st.x), Math.abs(x1)) / 2 + Math.min(Math.abs(st.x), Math.abs(x1)) / 2;
    let tmin = 0;
    if (kind === 'rapid') tmin = m.len / RAPID;
    else if (kind === 'thread') { const r = st.rpm || 1; tmin = m.len / (m.pitch * r); m.rpm = r; }
    else {
      const r = rpmAt(dia); m.rpm = r; m.F = st.F;
      tmin = st.perRev ? m.len / Math.max(1e-6, (st.F || 0.1) * Math.max(r, 1)) : m.len / Math.max(1e-6, st.F || 100);
    }
    m.time = tmin * 60;
    m.t0 = total; total += m.time; m.t1 = total;
    if (m.rpm) st.rpmMax = Math.max(st.rpmMax, m.rpm);
    moves.push(m);
    st.x = x1; st.z = z1;
    return m;
  }
  function needCut(b, what) {
    if (st.spindle === 0) once('sp' + b.line, 'error', b.line, 'HUSILLO PRINCIPAL DETENIDO', `${what} con el husillo parado: programa M3 o M4 antes.`);
    if (st.tool == null) once('tool' + b.line, 'warn', b.line, 'SIN HERRAMIENTA', `${what} sin herramienta seleccionada (T).`);
  }
  function threadPass(b, xp, zEnd, K, startZ, retractX) {
    addMove(b, 'rapid', xp, st.z);
    addMove(b, 'thread', xp, zEnd, { pitch: K });
    addMove(b, 'rapid', retractX, zEnd);
    addMove(b, 'rapid', retractX, startZ);
  }

  for (const b of parsed.blocks) {
    if (st.ended) { once('after', 'info', b.line, 'BLOQUES DESPUÉS DEL FIN', 'Los bloques después de M02/M30 no se ejecutan.'); break; }
    const w = b.w;
    const g = w.G ? Math.round(w.G.v) : null;
    const sc = st.inch ? 25.4 : 1;
    let motionG = null, cycle = null;

    if (g !== null) {
      switch (g) {
        case 0: case 1: case 33: st.mode = g; break;
        case 2: case 3: motionG = g; break;
        case 4: {
          const d = w.D ? w.D.v : 0;
          events.push({ line: b.line, type: 'dwell', t: total }); total += d; break;
        }
        case 20: st.diam = true; break;
        case 21: st.diam = false; break;
        case 90: st.abs = true; break;
        case 91: st.abs = false; break;
        case 94: st.perRev = false; break;
        case 95: st.perRev = true; break;
        case 96: st.css = true; break;
        case 97: st.css = false; break;
        case 70: st.inch = true; once('inch', 'warn', b.line, 'PROGRAMA EN PULGADAS', 'G70 activa pulgadas: las cotas se convierten a mm para la simulación.'); break;
        case 71: st.inch = false; break;
        case 92:
          if (w.X || w.Z) once('g92xz', 'warn', b.line, 'G92 X/Z NO SIMULADO', 'El desplazamiento de origen con G92 no se simula; usa G54 en el torno.');
          break;
        case 37: case 76: cycle = g; break;
        case 40: case 53: case 54: case 55: case 99: break;
        case 41: case 42: once('comp', 'info', b.line, 'COMPENSACIÓN DE RADIO', 'G41/G42 no se simula: la trayectoria se dibuja con la punta teórica.'); break;
        default:
          if (G_KNOWN.has(g)) once('g' + g, 'warn', b.line, `G${g} NO SIMULADO`, `La función G${g} existe en el Mach 9 pero este simulador no la ejecuta.`);
      }
    }
    if (w.S) {
      if (g === 92) st.rpmLimit = w.S.v;
      else if (st.css) st.Vc = w.S.v;
      else st.rpm = w.S.v;
    }
    if (w.F) { if (w.F.v <= 0) msg('error', b.line, 'AVANCE INVÁLIDO', 'F debe ser mayor que cero.'); else st.F = w.F.v; }
    if (w.T) {
      const digits = w.T.txt.replace(/[^0-9]/g, '');
      let tn, cn;
      if (digits.length >= 3) { tn = parseInt(digits.slice(0, -2), 10); cn = parseInt(digits.slice(-2), 10); }
      else { tn = parseInt(digits || '0', 10); cn = tn; }
      if (tn === 0) st.tool = null;
      else {
        if (!tools[tn]) once('tdef' + tn, 'warn', b.line, `HERR. #${String(tn).padStart(2, '0')} S/DEF. PROG.`, `La herramienta T${String(tn).padStart(2, '0')} no está en la tabla; se simula como herramienta de torneado.`);
        st.tool = tn; st.corr = cn; toolChanges++; total += TC_TIME;
        events.push({ line: b.line, type: 'tool', tool: tn, t: total });
      }
    }
    if (w.M) {
      const m = Math.round(w.M.v);
      if (m === 3 || m === 4) {
        st.spindle = m;
        if (!st.css && !st.rpm) once('nos', 'warn', b.line, 'ROTACIÓN NO PROGRAMADA', 'M3/M4 sin un valor S de rotación.');
      } else if (m === 5) st.spindle = 0;
      else if (m === 2 || m === 30) { st.ended = true; st.endLine = b.line; }
      else if (m === 0 || m === 1) events.push({ line: b.line, type: 'stop', t: total });
    }

    // ------------ movimiento ------------
    const hasXZ = !!(w.X || w.Z);
    const mg = motionG !== null ? motionG : st.mode;
    const tx = w.X ? (st.abs || st.x == null ? w.X.v * sc * (st.diam ? 1 : 2) : st.x + w.X.v * sc * (st.diam ? 1 : 2)) : st.x;
    const tz = w.Z ? (st.abs || st.z == null ? w.Z.v * sc : st.z + w.Z.v * sc) : st.z;

    if (cycle) {
      if (st.x == null || st.z == null) { msg('error', b.line, `G${cycle} SIN POSICIÓN`, 'Posiciona la herramienta antes del ciclo de roscado.'); continue; }
      if (!w.X || !w.Z || !w.K) { msg('error', b.line, `G${cycle} INCOMPLETO`, `G${cycle} requiere X, Z y K.`); continue; }
      needCut(b, 'Roscado');
      const K = w.K.v * sc, xs = st.x, zs = st.z, Xf = w.X.v * sc, Zf = w.Z.v * sc;
      if (st.rpm > THR_K / K + 1e-6) once('thr' + b.line, 'warn', b.line, 'ROTACIÓN ALTA EN ROSCA', `Máximo ${Math.floor(THR_K / K)} rpm para paso ${fmt(K)} (constante ${THR_K}/K).`);
      if (st.css) once('thrcss' + b.line, 'warn', b.line, 'ROSCA CON G96', 'El roscado requiere rotación fija (G97).');
      const ext = Xf < xs;
      const sign = ext ? 1 : -1;
      let depths = [];
      if (cycle === 37) {
        const E = w.E ? w.E.v * sc : 0, D = w.D ? w.D.v * sc : 0, U = w.U ? w.U.v * sc : 0, L = w.L ? Math.round(w.L.v) : 0;
        const crest = xs - sign * E, H = sign * (crest - Xf);
        if (D <= 0 || H <= 0) { msg('error', b.line, 'G37 DATOS INVÁLIDOS', 'Revisa D (profundidad de la 1ª pasada) y E (aproximación).'); continue; }
        for (let k = 1; k < 200; k++) { const dd = D * Math.sqrt(k); if (dd >= H - U - 1e-9) break; depths.push(crest - sign * dd); }
        depths.push(Xf); for (let k = 0; k < L; k++) depths.push(Xf);
      } else {
        const U = w.U ? w.U.v * sc : 0, W = w.W ? w.W.v * sc : 0;
        if (U <= 0 || W <= 0) { msg('error', b.line, 'G76 DATOS INVÁLIDOS', 'G76 requiere U (profundidad) y W (profundidad por pasada).'); continue; }
        const crest = Xf + sign * U; let acc = 0; const n = Math.max(0, Math.floor(U / W - 1 + 1e-9));
        for (let k = 1; k <= n; k++) { acc = k * W; depths.push(crest - sign * acc); }
        for (const fr of [0.5, 0.25, 0.125, 0.125]) { acc = Math.min(U, acc + W * fr); depths.push(crest - sign * acc); }
      }
      for (const xp of depths) threadPass(b, xp, Zf, K, zs, xs);
      st.pitch = K;
      continue;
    }

    if (motionG !== null && !hasXZ) { msg('error', b.line, 'G02/G03 - DEF. ILEGAL', 'El arco no tiene punto final (X/Z).'); continue; }
    if (!hasXZ) continue;
    if (st.x == null || st.z == null) {
      st.x = tx; st.z = tz;
      if (mg !== 0 && st.x != null && st.z != null) once('firstmv', 'warn', b.line, 'PRIMER MOVIMIENTO EN AVANCE', 'El primer movimiento debería ser un posicionamiento rápido (G0).');
      continue;
    }
    if (mg === 0) addMove(b, 'rapid', tx, tz);
    else if (mg === 1) {
      if (st.F == null) once('nof', 'error', b.line, 'AVANCE NO PROGRAMADO', 'Programa F antes del primer movimiento G1.');
      needCut(b, 'Avance de corte');
      addMove(b, 'feed', tx, tz);
    } else if (mg === 2 || mg === 3) {
      if (st.F == null) once('nof', 'error', b.line, 'AVANCE NO PROGRAMADO', 'Programa F antes del primer movimiento de corte.');
      needCut(b, 'Interpolación circular');
      const p0 = { z: st.z, r: st.x / 2 }, p1 = { z: tz, r: tx / 2 };
      let A;
      if (w.R) {
        if (w.R.v <= 0) { msg('error', b.line, 'REQUIERE RADIO POSITIVO', 'El código R debe ser positivo.'); continue; }
        A = arcFromR(p0, p1, w.R.v * sc, mg === 3);
      } else if (w.I || w.K) {
        const c = { z: w.K ? w.K.v * sc : st.z, r: w.I ? w.I.v * sc / 2 : st.x / 2 };
        A = arcFromCenter(p0, p1, c, mg === 3);
      } else { msg('error', b.line, 'G02/G03 - DEF. ILEGAL', 'Falta el radio R o el centro I/K.'); continue; }
      if (A.err) { msg('error', b.line, 'G02/G03 - DEF. ILEGAL', A.err); st.x = tx; st.z = tz; continue; }
      addMove(b, 'feed', tx, tz, { arc: A, g: mg });
      st.mode = 1; // G2/G3 no son modales y habilitan G1 (manual, pág. 17)
    } else if (mg === 33) {
      if (w.K) st.pitch = w.K.v * sc;
      if (!st.pitch) { msg('error', b.line, 'G33 SIN PASO', 'G33 requiere el paso K.'); continue; }
      needCut(b, 'Roscado');
      if (st.css) once('thrcss' + b.line, 'warn', b.line, 'ROSCA CON G96', 'El roscado requiere rotación fija (G97).');
      if (st.rpm > THR_K / st.pitch + 1e-6) once('thr' + b.line, 'warn', b.line, 'ROTACIÓN ALTA EN ROSCA', `Máximo ${Math.floor(THR_K / st.pitch)} rpm para paso ${fmt(st.pitch)} (constante ${THR_K}/K).`);
      if (w.X && !w.I) { addMove(b, 'rapid', tx, st.z); addMove(b, 'thread', tx, tz, { pitch: st.pitch }); }
      else addMove(b, 'thread', tx, tz, { pitch: st.pitch });
    }
  }
  if (!st.ended) msg('warn', parsed.blocks.length ? parsed.blocks[parsed.blocks.length - 1].line : 0, 'PROG. SIN M02', 'El programa no termina con M02 o M30; el control mostrará “SIN M02”.');
  return { moves, msgs, events, total, toolChanges, ended: st.ended, endLine: st.endLine || 0, rpmMax: st.rpmMax };
}
