// Análisis completo de un programa: sintaxis + lógica + física + máquina.
// Lo usan las dos pantallas y el panel de errores.
import { parse } from './parse.js';
import { interpret } from './interpret.js';
import { Sim } from './sim.js';
import { parseProfile, profileExact } from './cam.js';
import { cutPower } from './cutting.js';
import { fmt } from './geometry.js';
import { MACHINE, checkMachine, checkStock } from './machine.js';
import { MATERIALS } from './library.js';
import { explain } from './explain.js';

export const es = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',').replace(/^-(0,0*)$/, '$1') : '—';

// cfg: { stock:{barD,barLen,grip,faceStock}, tools:{num:{type,k2,rn,w,ref}}, ap, maxDec, material, profileText, rapid }
export function analyze(code, cfg) {
  const stock = cfg.stock;
  const setup = { barD: stock.barD, barLen: stock.barLen, grip: stock.grip, faceStock: stock.faceStock,
    tools: cfg.tools, rapidFeed: cfg.rapid || MACHINE.rapid.z, threadConst: MACHINE.threadConst };
  const parsed = parse(code, { maxDec: cfg.maxDec || 2 });
  // Regla del Mach 9 explicada en la clase (min 44:14–44:50): una cota sin punto se lee en milésimas
  // de milímetro (X10 = 0,010 mm). Se aplica a X, Z, I, K y R (las que el manual escribe con punto).
  if (cfg.noDotMicrons !== false) {
    for (const b of parsed.blocks) for (const wd of b.words) {
      if ('XZIKR'.includes(wd.L) && wd.txt !== '' && !wd.hasDot && wd.v !== 0 && !(wd.L === 'K' && b.w.G && [33, 37, 76].includes(Math.round(b.w.G.v)))) {
        wd.v = wd.v / 1000; wd.micron = true;
      }
    }
    for (const m of parsed.msgs) if (m.code === 'SIN PUNTO DECIMAL' && parsed.blocks.some(b => b.line === m.line && b.words.some(w => w.micron && w.L === m.text[0]))) {
      m.sev = 'error'; m.code = 'COTA SIN PUNTO DECIMAL';
      m.text = m.text.replace(/: el manual.*$/, ': sin punto el Mach 9 la lee en milésimas de mm.');
    }
  }
  const run = interpret(parsed, setup);
  const sim = new Sim(run, setup);
  sim.runAll();
  const final = { r: sim.r.slice(), threads: new Map([...sim.threads].map(([k, v]) => [k, Object.assign({}, v)])), parted: sim.parted };

  // comparación con el perfil objetivo (si hay)
  let prof = null, dev = null;
  if (cfg.profileText && cfg.profileText.trim()) {
    const pr = parseProfile(cfg.profileText);
    if (!pr.errs.length && pr.segs.length) {
      prof = pr;
      const RP = profileExact(pr.segs, sim.z0, sim.n, sim.h);
      const zEnd = pr.segs[pr.segs.length - 1].p1.z, zStart = pr.segs[0].p0.z;
      const zones = [...final.threads.values()].map(t => [Math.min(t.zA, t.reach) - 0.6, Math.max(t.zA, t.reach)]);
      let over = 0, overZ = 0, left = 0, leftZ = 0, cnt = 0;
      for (let k = 0; k < sim.n; k++) {
        const z = sim.z0 + k * sim.h;
        if (z > zStart - 0.05 || z < zEnd + 0.05 || !Number.isFinite(RP[k])) continue;
        if (zones.some(zz => z >= zz[0] && z <= zz[1])) continue;
        const r = final.r[k]; if (r <= 0) continue;
        cnt++;
        const d = r - RP[k];
        if (-d > over) { over = -d; overZ = z; }
        if (d > left) { left = d; leftZ = z; }
      }
      if (cnt) dev = { over, overZ, left, leftZ, RP };
    }
  }

  // mensajes
  const lines = String(code).replace(/\r\n?/g, '\n').split('\n');
  const out = [], seen = new Set();
  const add = (m) => {
    const k = m.sev + '|' + m.line + '|' + m.code; if (seen.has(k)) return; seen.add(k);
    const ex = explain(m.code);
    out.push(Object.assign({ raw: m.line ? (lines[m.line - 1] || '').trim() : '' }, ex, m));
  };
  parsed.msgs.concat(run.msgs).forEach(add);
  const M = run.moves, ap = cfg.ap || 1;
  M.forEach((m, i) => {
    if (sim.mColl[i]) add({ sev: 'error', line: m.line, code: 'COLISIÓN EN RÁPIDO (G0)', text: `El avance rápido atraviesa material hasta X${fmt(m.x1)} Z${fmt(m.z1)}.`, mi: i });
    if (sim.mChuck[i]) add({ sev: 'error', line: m.line, code: 'CHOQUE CON EL PLATO', text: `La herramienta pasa la cara de las garras (Z${es(sim.zJaw, 2)}).`, mi: i });
    const d = sim.mDepth[i];
    if (d > ap + 0.05) add({ sev: 'warn', line: m.line, code: 'PROFUNDIDAD MAYOR QUE ap', text: `Esta pasada corta ${es(d, 2)} mm en ${sim.mAxis[i] === 2 ? 'Z' : 'X'}; el máximo elegido es ap = ${es(ap, 2)} mm.`, mi: i });
  });
  const mat = MATERIALS[cfg.material] || MATERIALS['SAE 1045'];
  checkMachine(parsed, run, stock, { cutPower, material: mat.ks, depths: Array.from(sim.mDepth) }).forEach(add);
  checkStock(stock).forEach(add);
  if (dev && dev.over > 0.05) {
    const mi = M.findIndex(m => m.kind !== 'rapid' && Math.min(m.z0, m.z1) <= dev.overZ + 0.05 && Math.max(m.z0, m.z1) >= dev.overZ - 0.05);
    add({ sev: 'warn', line: mi >= 0 ? M[mi].line : 0, code: 'SOBRECORTE RESPECTO AL PERFIL', text: `La pieza queda ${es(dev.over, 2)} mm por debajo del perfil en Z${es(dev.overZ, 2)}.` });
  }
  if (dev && dev.left > 0.1) add({ sev: 'info', line: 0, code: 'MATERIAL SOBRANTE', text: `Quedan ${es(dev.left, 2)} mm sobre el perfil en Z${es(dev.leftZ, 2)}.` });
  const rank = { error: 0, warn: 1, info: 2 };
  out.sort((a, b) => rank[a.sev] - rank[b.sev] || a.line - b.line);

  // estadísticas
  let cuts = 0, vcMax = 0, maxDepth = 0;
  M.forEach((m, i) => {
    if (m.kind !== 'rapid' && sim.mRem[i] > 0.005) cuts++;
    maxDepth = Math.max(maxDepth, sim.mDepth[i]);
    if (m.kind !== 'rapid' && sim.mRem[i] > 0.005 && m.rpm) vcMax = Math.max(vcMax, Math.PI * Math.max(Math.abs(m.x0), Math.abs(m.x1)) * m.rpm / 1000);
  });
  const vol = sim.removedVolume();
  const stats = { time: run.total, blocks: parsed.blocks.length, moves: M.length, cuts, toolChanges: run.toolChanges,
    rpmMax: run.rpmMax, vcMax, maxDepth, removed: vol.v0 - vol.v1, v0: vol.v0, mass: (vol.v0 - vol.v1) / 1000 * mat.density };

  const errors = out.filter(m => m.sev === 'error').length, warns = out.filter(m => m.sev === 'warn').length;
  return { parsed, run, sim, final, prof, dev, msgs: out, stats, errors, warns, lines, setup };
}

// Explica en español qué hace un bloque (modo bloque a bloque).
// Estado modal mínimo antes de cada bloque (para describeBlock)
export function modalStates(blocks) {
  const st = { mode: 0, css: false, perRev: true }, res = [];
  for (const b of blocks) {
    res.push(Object.assign({}, st));
    const g = b.w.G ? Math.round(b.w.G.v) : null;
    if ([0, 1, 33].includes(g)) st.mode = g; else if (g === 2 || g === 3) st.mode = 1;
    if (g === 96) st.css = true; if (g === 97) st.css = false;
    if (g === 94) st.perRev = false; if (g === 95) st.perRev = true;
  }
  return res;
}

export function describeBlock(b, state) {
  if (!b) return '';
  const w = b.w, parts = [];
  const n = v => es(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : (String(v).split('.')[1] || '').length > 2 ? 3 : 2);
  const g = w.G ? Math.round(w.G.v) : null;
  const motion = g != null && [0, 1, 2, 3, 33].includes(g) ? g : state.mode;
  const dest = [];
  if (w.X) dest.push(`Ø${n(w.X.v)}`);
  if (w.Z) dest.push(`Z${n(w.Z.v)}`);
  const G_TXT = { 4: `pausa (tiempo de espera D${w.D ? n(w.D.v) : ''})`, 20: 'programación en diámetro', 21: 'programación en radio',
    40: 'anula la compensación de radio', 41: 'compensación de radio a la izquierda', 42: 'compensación de radio a la derecha',
    53: 'anula el decalaje de origen (cero máquina)', 54: 'activa el origen de pieza G54', 55: 'activa el origen de pieza G55',
    70: 'cotas en pulgadas', 71: 'cotas en milímetros', 90: 'cotas absolutas', 91: 'cotas incrementales',
    94: 'avance en mm/min', 95: 'avance en mm/vuelta', 96: 'velocidad de corte constante (S = m/min)', 97: 'rotación constante (S = rpm)',
    92: w.S ? `limita la rotación a ${n(w.S.v)} rpm` : 'decalaje de origen', 99: 'función de inicio del programa del curso (ver manual Mach 9)',
    37: 'ciclo automático de roscado G37', 76: 'ciclo de roscado G76' };
  if (g != null && G_TXT[g]) parts.push(`G${g}: ${G_TXT[g]}`);
  if (w.T) parts.push(`T${w.T.txt}: gira la torreta a la herramienta ${w.T.txt.slice(0, -2) || w.T.txt} con corrector ${w.T.txt.slice(-2)}`);
  if (w.S && g !== 92) parts.push(state.css ? `S${w.S.txt}: velocidad de corte ${n(w.S.v)} m/min` : `S${w.S.txt}: rotación de ${n(w.S.v)} rpm`);
  if (w.F) parts.push(`F${w.F.txt}: avance de ${n(w.F.v)} ${state.perRev ? 'mm/vuelta' : 'mm/min'}`);
  const M_TXT = { 0: 'parada programada', 1: 'parada opcional', 2: 'fin de programa', 30: 'fin de programa y rebobinado', 3: 'husillo en sentido horario',
    4: 'husillo en sentido antihorario', 5: 'detiene el husillo', 6: 'cambio de herramienta', 8: 'enciende el refrigerante', 9: 'apaga el refrigerante' };
  if (w.M) parts.push(`M${w.M.txt}: ${M_TXT[Math.round(w.M.v)] || 'función miscelánea'}`);
  if (dest.length) {
    const label = { 0: 'avance rápido (sin cortar) hasta', 1: 'avance lineal de corte hasta', 2: 'arco horario de corte hasta', 3: 'arco antihorario de corte hasta', 33: 'roscado hasta' }[motion] || 'movimiento hasta';
    const gtxt = g != null && [0, 1, 2, 3, 33].includes(g) ? `G${g} ` : '';
    let s = `${gtxt}${[w.X ? 'X' + w.X.txt : '', w.Z ? 'Z' + w.Z.txt : ''].filter(Boolean).join(' ')}: ${label} ${dest.join(' ')}`;
    if (w.R) s += ` con radio R${n(w.R.v)}`;
    if (w.K && motion === 33) s += ` con paso ${n(w.K.v)} mm`;
    parts.push(s);
  }
  if (!parts.length && b.comment) parts.push(`Comentario: ${b.comment}`);
  return parts.join(' · ');
}
