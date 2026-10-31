// Núcleo M9 extraído sin cambios de lógica de legacy/simulador_original.html
import { round, ceilTo, floorTo, fmt, fmtS, sub, dot, dist, cp, arcFromR, arcFromCenter, arcPoint } from './geometry.js';
import { parse } from './parse.js';

/* ======================================================================
   PERFIL (contorno final) y GENERADOR CAM
   ====================================================================== */
export function parseProfile(text) {
  const p = parse(text, { maxDec: 4 });
  const segs = [], errs = [];
  p.msgs.filter(m => m.sev === 'error').forEach(m => errs.push(`Línea ${m.line}: ${m.code}`));
  let cur = null, mode = 1;
  for (const b of p.blocks) {
    const w = b.w, g = w.G ? Math.round(w.G.v) : null;
    let mg = mode;
    if (g === 0 || g === 1) { mode = g; mg = g; } else if (g === 2 || g === 3) mg = g;
    if (!w.X && !w.Z) continue;
    const x = w.X ? w.X.v : (cur ? cur.r * 2 : null), z = w.Z ? w.Z.v : (cur ? cur.z : null);
    if (x == null || z == null) { errs.push(`Línea ${b.line}: el primer punto necesita X y Z.`); continue; }
    const pt = { z, r: x / 2 };
    if (!cur) { cur = pt; continue; }
    if (dist(cur, pt) < 1e-9) continue;
    if (mg === 2 || mg === 3) {
      let A;
      if (w.R) A = arcFromR(cur, pt, w.R.v, mg === 3);
      else if (w.I || w.K) A = arcFromCenter(cur, pt, { z: w.K ? w.K.v : cur.z, r: w.I ? w.I.v / 2 : cur.r }, mg === 3);
      else { errs.push(`Línea ${b.line}: el arco necesita R.`); cur = pt; continue; }
      if (A.err) { errs.push(`Línea ${b.line}: ${A.err}`); cur = pt; continue; }
      segs.push({ t: 'A', p0: cp(cur), p1: cp(pt), c: A.c, ccw: mg === 3, line: b.line });
    } else segs.push({ t: 'L', p0: cp(cur), p1: cp(pt), line: b.line });
    cur = pt;
  }
  if (!segs.length && !errs.length) errs.push('El perfil necesita un punto inicial y al menos un tramo.');
  return { segs, errs };
}
export const segLen = s => s.t === 'L' ? dist(s.p0, s.p1) : (() => { const A = arcFromCenter(s.p0, s.p1, s.c, s.ccw); return A.err ? dist(s.p0, s.p1) : Math.abs(A.a1 - A.a0) * (A.R0 + A.R1) / 2; })();
export function segPoint(s, t) {
  if (s.t === 'L') return { z: s.p0.z + (s.p1.z - s.p0.z) * t, r: s.p0.r + (s.p1.r - s.p0.r) * t };
  const A = arcFromCenter(s.p0, s.p1, s.c, s.ccw); return arcPoint(A, t);
}
function tangent(s, p) {
  if (s.t === 'L') { const d = sub(s.p1, s.p0), L = Math.hypot(d.z, d.r) || 1; return { z: d.z / L, r: d.r / L }; }
  const vz = p.z - s.c.z, vr = p.r - s.c.r, L = Math.hypot(vz, vr) || 1;
  return s.ccw ? { z: -vr / L, r: vz / L } : { z: vr / L, r: -vz / L };
}
// malla del perfil r(z)
export function profileGrid(segs, zLo, zHi, h) {
  const n = Math.ceil((zHi - zLo) / h) + 1;
  const rp = new Float64Array(n).fill(-Infinity);
  for (const s of segs) {
    const L = segLen(s), k = Math.max(2, Math.ceil(L / (h / 4)));
    for (let j = 0; j <= k; j++) {
      const p = segPoint(s, j / k), c = Math.round((p.z - zLo) / h);
      if (c >= 0 && c < n && p.r > rp[c]) rp[c] = p.r;
    }
  }
  return { rp, n, zLo, h };
}

// radio exacto del perfil en cada columna (para comparar pieza vs plano)
export function profileExact(segs, zLo, n, h) {
  const rp = new Float64Array(n).fill(-Infinity);
  for (const s of segs) {
    const za = Math.min(s.p0.z, s.p1.z), zb = Math.max(s.p0.z, s.p1.z);
    const ka = Math.max(0, Math.ceil((za - zLo) / h - 1e-9)), kb = Math.min(n - 1, Math.floor((zb - zLo) / h + 1e-9));
    if (s.t === 'L') {
      const dz = s.p1.z - s.p0.z;
      for (let k = ka; k <= kb; k++) {
        const z = zLo + k * h;
        const r = Math.abs(dz) < 1e-12 ? Math.max(s.p0.r, s.p1.r) : s.p0.r + (s.p1.r - s.p0.r) * (z - s.p0.z) / dz;
        if (r > rp[k]) rp[k] = r;
      }
    } else {
      const A = arcFromCenter(s.p0, s.p1, s.c, s.ccw); if (A.err) continue;
      const R = (A.R0 + A.R1) / 2;
      const inSweep = ang => { let a = ang; if (A.ccw) { while (a < A.a0 - 1e-9) a += 2 * Math.PI; while (a > A.a0 + 2 * Math.PI) a -= 2 * Math.PI; return a <= A.a1 + 1e-9; } while (a > A.a0 + 1e-9) a -= 2 * Math.PI; while (a < A.a0 - 2 * Math.PI) a += 2 * Math.PI; return a >= A.a1 - 1e-9; };
      for (let k = ka; k <= kb; k++) {
        const z = zLo + k * h, dz = Math.max(-1, Math.min(1, (z - s.c.z) / R));
        const ca = Math.acos(dz);
        for (const ang of [ca, -ca]) if (inSweep(ang)) { const r = s.c.r + R * Math.sin(ang); if (r > rp[k]) rp[k] = r; }
      }
    }
  }
  return rp;
}

function offsetSeg(s, a) {
  if (s.t === 'L') {
    const d = tangent(s), nrm = { z: d.r, r: -d.z };
    return { t: 'L', p0: { z: s.p0.z + nrm.z * a, r: s.p0.r + nrm.r * a }, p1: { z: s.p1.z + nrm.z * a, r: s.p1.r + nrm.r * a }, src: s };
  }
  const R0 = dist(s.p0, s.c), R1 = dist(s.p1, s.c), R = (R0 + R1) / 2, Rn = s.ccw ? R + a : R - a;
  if (Rn <= 1e-4) return null;
  return { t: 'A', c: cp(s.c), ccw: s.ccw, R: Rn,
    p0: { z: s.c.z + (s.p0.z - s.c.z) * Rn / R0, r: s.c.r + (s.p0.r - s.c.r) * Rn / R0 },
    p1: { z: s.c.z + (s.p1.z - s.c.z) * Rn / R1, r: s.c.r + (s.p1.r - s.c.r) * Rn / R1 }, src: s };
}
function intersect(A, B) {
  const circ = S => ({ c: S.c, R: S.R !== undefined ? S.R : dist(S.p0, S.c) });
  if (A.t === 'L' && B.t === 'L') {
    const d1 = sub(A.p1, A.p0), d2 = sub(B.p1, B.p0), den = d1.z * d2.r - d1.r * d2.z;
    if (Math.abs(den) < 1e-12) return [];
    const t = ((B.p0.z - A.p0.z) * d2.r - (B.p0.r - A.p0.r) * d2.z) / den;
    return [{ z: A.p0.z + t * d1.z, r: A.p0.r + t * d1.r }];
  }
  if (A.t === 'A' && B.t === 'L') return intersect(B, A);
  if (A.t === 'L' && B.t === 'A') {
    const C = circ(B), d = sub(A.p1, A.p0), f = sub(A.p0, C.c);
    const a = dot(d, d), b = 2 * dot(f, d), c = dot(f, f) - C.R * C.R;
    let disc = b * b - 4 * a * c; if (disc < 0) { if (disc > -1e-9) disc = 0; else return []; }
    const sq = Math.sqrt(disc);
    return [(-b - sq) / (2 * a), (-b + sq) / (2 * a)].map(t => ({ z: A.p0.z + t * d.z, r: A.p0.r + t * d.r }));
  }
  const C1 = circ(A), C2 = circ(B), dd = dist(C1.c, C2.c);
  if (dd < 1e-12 || dd > C1.R + C2.R + 1e-9 || dd < Math.abs(C1.R - C2.R) - 1e-9) return [];
  const aa = (C1.R * C1.R - C2.R * C2.R + dd * dd) / (2 * dd), hh = Math.sqrt(Math.max(0, C1.R * C1.R - aa * aa));
  const mz = C1.c.z + aa * (C2.c.z - C1.c.z) / dd, mr = C1.c.r + aa * (C2.c.r - C1.c.r) / dd;
  return [{ z: mz + hh * (C2.c.r - C1.c.r) / dd, r: mr - hh * (C2.c.z - C1.c.z) / dd }, { z: mz - hh * (C2.c.r - C1.c.r) / dd, r: mr + hh * (C2.c.z - C1.c.z) / dd }];
}
const nearest = (pts, q) => pts.reduce((b, p) => (!b || dist(p, q) < dist(b, q)) ? p : b, null);

// contorno desplazado (equidistante) con uniones redondeadas en esquinas convexas
export function offsetChain(segs, a) {
  const res = [];
  let prevSrc = null, skipped = false;
  for (const s of segs) {
    const o = offsetSeg(s, a);
    if (!o) { skipped = true; continue; }
    if (!res.length) { res.push(o); prevSrc = s; skipped = false; continue; }
    const P = res[res.length - 1];
    const tA = tangent(prevSrc, prevSrc.p1), tB = tangent(s, s.p0);
    const cross = tA.z * tB.r - tA.r * tB.z, dp = dot(tA, tB);
    if (!skipped && Math.abs(cross) < 2e-3 && dp > 0) {
      if (dist(P.p1, o.p0) > 1e-6) res.push({ t: 'L', p0: cp(P.p1), p1: cp(o.p0) });
      res.push(o);
    } else if (!skipped && cross > 0) {
      res.push({ t: 'A', c: cp(s.p0), R: a, ccw: true, p0: cp(P.p1), p1: cp(o.p0) });
      res.push(o);
    } else {
      const pts = intersect(P, o);
      const X = nearest(pts, { z: (P.p1.z + o.p0.z) / 2, r: (P.p1.r + o.p0.r) / 2 });
      if (X && dist(X, s.p0) < 10 * a + 1) { P.p1 = cp(X); o.p0 = cp(X); }
      else res.push({ t: 'L', p0: cp(P.p1), p1: cp(o.p0) });
      res.push(o);
    }
    prevSrc = s; skipped = false;
  }
  // elimina tramos rectos invertidos por el recorte
  for (let it = 0; it < 20; it++) {
    const k = res.findIndex(q => q.t === 'L' && q.src && dot(sub(q.p1, q.p0), sub(q.src.p1, q.src.p0)) <= 1e-9);
    if (k < 0) break;
    res.splice(k, 1);
    if (k > 0 && k < res.length) {
      const X = nearest(intersect(res[k - 1], res[k]), res[k].p0);
      if (X) { res[k - 1].p1 = cp(X); res[k].p0 = cp(X); }
    }
  }
  return res;
}

// recorta o prolonga el final de una cadena hasta z = zc
function clipChainAtZ(chain, zc) {
  for (let k = 0; k < chain.length; k++) {
    const s = chain[k];
    const zmin = Math.min(s.p0.z, s.p1.z) - 1e-9, zmax = Math.max(s.p0.z, s.p1.z) + 1e-9;
    if (s.t === 'L' && zc >= zmin && zc <= zmax && Math.abs(s.p1.z - s.p0.z) > 1e-9) {
      const t = (zc - s.p0.z) / (s.p1.z - s.p0.z);
      s.p1 = { z: zc, r: s.p0.r + (s.p1.r - s.p0.r) * t };
      return chain.slice(0, k + 1);
    }
    if (s.t === 'A') {
      const R = dist(s.p0, s.c);
      if (Math.abs(zc - s.c.z) <= R) {
        const A = arcFromCenter(s.p0, s.p1, s.c, s.ccw);
        const ca = Math.acos((zc - s.c.z) / R);
        for (const ang of [ca, -ca]) {
          let a = ang;
          if (A.ccw) { while (a < A.a0) a += 2 * Math.PI; while (a > A.a0 + 2 * Math.PI) a -= 2 * Math.PI; if (a <= A.a1 + 1e-9) { s.p1 = { z: zc, r: s.c.r + R * Math.sin(a) }; return chain.slice(0, k + 1); } }
          else { while (a > A.a0) a -= 2 * Math.PI; while (a < A.a0 - 2 * Math.PI) a += 2 * Math.PI; if (a >= A.a1 - 1e-9) { s.p1 = { z: zc, r: s.c.r + R * Math.sin(a) }; return chain.slice(0, k + 1); } }
        }
      }
    }
  }
  // prolongar el último tramo
  const s = chain[chain.length - 1];
  if (!s) return chain;
  if (s.t === 'A') {
    const R = dist(s.p1, s.c);
    if (Math.abs(zc - s.c.z) <= R) { const rr = Math.sqrt(R * R - (zc - s.c.z) ** 2); s.p1 = { z: zc, r: s.c.r + (s.p1.r >= s.c.r ? rr : -rr) }; return chain; }
  } else if (Math.abs(s.p1.z - s.p0.z) > 1e-9) {
    const t = (zc - s.p0.z) / (s.p1.z - s.p0.z);
    s.p1 = { z: zc, r: s.p0.r + (s.p1.r - s.p0.r) * t }; return chain;
  }
  chain.push({ t: 'L', p0: cp(s.p1), p1: { z: zc, r: s.p1.r } });
  return chain;
}

function splitSeg(s, P) {
  if (s.t === 'L') return [{ t: 'L', p0: cp(s.p0), p1: cp(P) }, { t: 'L', p0: cp(P), p1: cp(s.p1) }];
  return [{ t: 'A', p0: cp(s.p0), p1: cp(P), c: cp(s.c), ccw: s.ccw }, { t: 'A', p0: cp(P), p1: cp(s.p1), c: cp(s.c), ccw: s.ccw }];
}

// Generador de programa
export function cam(P) {
  const dec = P.dec || 2;
  const f = v => fmt(v, dec);
  const rep = { warnings: [], errors: [], stats: {} };
  const prof = parseProfile(P.profileText);
  if (prof.errs.length) { rep.errors.push(...prof.errs); return { text: '', rep }; }
  let segs = prof.segs.map(s => Object.assign({}, s, { p0: cp(s.p0), p1: cp(s.p1), c: s.c ? cp(s.c) : undefined }));
  const start = segs[0].p0;
  for (const s of segs) {
    if (s.p1.z > s.p0.z + 1e-6) { rep.errors.push(`Línea ${s.line}: el perfil debe avanzar hacia el plato (Z decreciente).`); return { text: '', rep }; }
  }
  if (Math.abs(start.z) > 1e-6) rep.warnings.push(`El perfil empieza en Z${f(start.z)}; se esperaba Z0 (cara refrentada).`);
  const lastS = segs[segs.length - 1];
  if (lastS.t === 'L' && Math.abs(lastS.p1.z - lastS.p0.z) < 1e-6 && lastS.p1.r < lastS.p0.r - 1e-6) segs.pop();
  if (!segs.length) { rep.errors.push('El perfil está vacío.'); return { text: '', rep }; }
  const end = segs[segs.length - 1].p1, zEnd = end.z, rEnd = end.r;
  const barD = P.barD, barR = barD / 2, ap = P.ap, a = ap / 2, F = P.F, S = P.S;
  // mejora: F y S separados para acabado y velocidad de corte constante (G96 con límite G92)
  const Ff = P.Ff != null ? P.Ff : F, Sf = P.Sf != null ? P.Sf : S, css = P.css || null;
  let Fnow = F;
  const blade = P.blade || { w: 3, ref: 'der' };
  const W = blade.w, zProgBlade = zRight => blade.ref === 'izq' ? zRight - W : zRight;

  // pico (radio máximo, el más cercano al plato)
  let best = null;
  segs.forEach((s, si) => {
    const cands = [{ p: s.p0, t: 0 }, { p: s.p1, t: 1 }];
    if (s.t === 'A') {
      const A = arcFromCenter(s.p0, s.p1, s.c, s.ccw);
      const R = (A.R0 + A.R1) / 2;
      for (let k = -2; k <= 2; k++) {
        const ang = Math.PI / 2 + 2 * Math.PI * k;
        const t = (ang - A.a0) / (A.a1 - A.a0);
        if (t > 1e-9 && t < 1 - 1e-9) cands.push({ p: { z: s.c.z, r: s.c.r + R }, t });
      }
    }
    for (const c of cands) {
      if (!best || c.p.r > best.p.r + 1e-6 || (Math.abs(c.p.r - best.p.r) <= 1e-6 && c.p.z < best.p.z)) best = { p: cp(c.p), si, t: c.t };
    }
  });
  let front, back;
  if (best.t > 0 && best.t < 1) { const sp = splitSeg(segs[best.si], best.p); front = segs.slice(0, best.si).concat([sp[0]]); back = [sp[1]].concat(segs.slice(best.si + 1)); }
  else if (best.t >= 1) { front = segs.slice(0, best.si + 1); back = segs.slice(best.si + 1); }
  else { front = segs.slice(0, best.si); back = segs.slice(best.si); }
  const zPeak = best.p.z, rPeak = best.p.r;
  const hasBack = back.length > 0 && rPeak - rEnd > 0.01;
  const pf = v => String(round(v, 2)).replace('.', ',');
  if (rPeak > barR + 1e-3) { rep.errors.push(`La barra Ø${pf(barD)} es más chica que la pieza (Ø${pf(2 * rPeak)}). Elige una barra mayor.`); return { text: '', rep }; }
  if (rPeak + a > barR + 1e-3) rep.warnings.push(`En el diámetro máximo (Ø${pf(2 * rPeak)}) el sobremetal de la barra es menor que la profundidad de corte.`);
  if (!front.length) { rep.errors.push('El perfil empieza en el diámetro máximo; agrega la parte frontal.'); return { text: '', rep }; }
  front.forEach(s => { const d = tangent(s, s.p0); if (s.t === 'L' && d.r < -Math.sin(28 * Math.PI / 180)) rep.warnings.push(`Línea ${s.line || '?'}: bajada pronunciada; la herramienta de desbaste podría rozar con el filo secundario.`); });

  // mallas
  const h = 0.002, zLo = zEnd - W - 4, zHi = 2;
  const G = profileGrid(segs, zLo, zHi, h);
  const n = G.n, Z = i => zLo + i * h, idx = z => Math.max(0, Math.min(n - 1, Math.round((z - zLo) / h)));
  const K = Math.max(1, Math.round(a / h)), wk = [];
  for (let k = 0; k <= K; k++) wk.push(Math.sqrt(Math.max(0, a * a - (k * h) ** 2)));
  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let m = -Infinity;
    for (let k = -K; k <= K; k++) { const j = i + k; if (j < 0 || j >= n) continue; const v = G.rp[j]; if (v === -Infinity) continue; const t = v + wk[Math.abs(k)]; if (t > m) m = t; }
    env[i] = m;
  }
  const Wn = Math.round(W / h), envWin = new Float64Array(n);
  { const dq = []; for (let i = 0; i < n; i++) { while (dq.length && env[dq[dq.length - 1]] <= env[i]) dq.pop(); dq.push(i); while (dq[0] < i - Wn) dq.shift(); envWin[i] = env[dq[0]]; } }

  const zLimF = hasBack ? zPeak : zEnd - W - 1;
  const endFromRight = rl => { let i = n - 1; while (i > 0 && env[i - 1] <= rl + 1e-7) i--; return Math.max(ceilTo(Z(i), dec), round(zLimF, dec)); };

  // ---------- programa ----------
  const L = [];
  let curF = null, mode = null;
  const push = s => L.push(s);
    const fs = () => { if (curF !== Fnow) { curF = Fnow; return ' F' + f(Fnow); } return ''; };
    const toolChange = (T, kind) => {
      push(`T${T} M6`);
      const fin = kind === 'finish';
      Fnow = fin ? Ff : F;
      if (css && kind !== 'thread' && kind !== 'part') { push(`G92 S${fmtS(css.smax)}`); push('G96'); push(`S${fmtS(fin ? css.vcF : css.vcR)} M3`); }
      else { push('G97'); push(`S${fmtS(fin ? Sf : S)} M3`); }
      curF = null; mode = null;
    };
  const bd2 = barD + 2;
  if (P.name) push(';' + P.name.replace(/[#;]/g, '').toUpperCase().slice(0, 40));
  push('G99'); push('G54'); push('G0 X100. Z100.');
  toolChange(P.tools.rough);
  push('M8');

  // refrentado
  const zfs = []; { let zf = P.faceStock; while (zf > 1e-6) { zf = Math.max(0, round(zf - ap, 4)); zfs.push(zf); } }
  zfs.forEach((zf, k) => {
    if (k === 0) push(`G0 X${f(bd2)} Z${f(zf)}`); else { push(`G0 X${f(bd2)}`); push(`Z${f(zf)}`); }
    push(`G1 X-0.5${fs()}`); push('G0 Z2.');
  });
  if (zfs.length) push(`X${f(barD + 1)}`);
  else push(`G0 X${f(barD + 1)} Z2.`);

  // desbaste longitudinal
  const levels = [];
  for (let k = 1; k < 2000; k++) {
    const D = round(barD - k * ap, 4);
    if (D < 0.2) break;
    const ze = endFromRight(D / 2);
    if (ze > -0.005) break;
    levels.push({ D, ze });
  }
  levels.forEach((lv, k) => {
    push(`${k === 0 ? 'G0 ' : ''}X${f(lv.D)}`); push(`G1 Z${f(lv.ze)}${fs()}`); push(`G0 X${f(bd2)}`); push('Z2.');
  });

  // cavidades (entre resaltes)
  const zLimP = hasBack ? zPeak : zEnd;
  const pockets = [];
  for (const lv of levels) {
    if (lv.ze <= zLimP + 0.05) continue;
    const rl = lv.D / 2, iLim = idx(zLimP);
    let i = idx(lv.ze) - 1;
    while (i > iLim) {
      while (i > iLim && env[i] > rl + 1e-7) i--;
      if (i <= iLim) break;
      let j = i; while (j > iLim && env[j - 1] <= rl + 1e-7) j--;
      if (j <= iLim) break;
      const zr = floorTo(Z(i), dec), zl = ceilTo(Z(j), dec);
      if (zr - zl > 0.05) pockets.push({ D: lv.D, zr, zl });
      i = j - 1;
    }
  }
  let safeP = bd2;
  if (pockets.length) {
    const zmin = Math.min(...pockets.map(p => p.zl));
    let mx = 0;
    for (let i = idx(zmin); i < n; i++) {
      const z = Z(i); if (z > 0) break;
      let s = barR; for (const lv of levels) if (lv.ze <= z + 1e-9) s = Math.min(s, lv.D / 2);
      if (s > mx) mx = s;
    }
    safeP = Math.min(bd2, Math.ceil((2 * mx + 1) * 2 - 1e-9) / 2);
    push(`G0 X${f(safeP)}`);
    for (const p of pockets) { push(`Z${f(p.zr)}`); push(`G1 X${f(p.D)}${fs()}`); push(`Z${f(p.zl)}`); push(`G0 X${f(safeP)}`); }
  }

  // emisor de contornos
  let pos = null;
  function emitChain(chain, zShift) {
    zShift = zShift || 0;
    for (const s of chain) {
      const x = round(2 * s.p1.r, dec), z = round(s.p1.z + zShift, dec);
      if (pos && Math.abs(pos.x - x) < 1e-9 && Math.abs(pos.z - z) < 1e-9) continue;
      if (s.t === 'L') {
        const parts = [];
        if (mode !== 1) parts.push('G1');
        if (!pos || Math.abs(pos.x - x) > 1e-9) parts.push('X' + f(x));
        if (!pos || Math.abs(pos.z - z) > 1e-9) parts.push('Z' + f(z));
        push(parts.join(' ') + fs()); mode = 1;
      } else {
        const p0 = pos ? { z: pos.z, r: pos.x / 2 } : { z: s.p0.z + zShift, r: s.p0.r };
        const p1 = { z, r: x / 2 };
        let R = (dist(s.p0, s.c) + dist(s.p1, s.c)) / 2;
        let Rr = round(R, dec);
        const half = dist(p0, p1) / 2;
        if (Rr < half + 1e-4) Rr = ceilTo(half + 0.001, dec);
        push(`${s.ccw ? 'G3' : 'G2'} X${f(x)} Z${f(z)} R${f(Rr)}${fs()}`); mode = 2;
      }
      pos = { x, z };
    }
  }

  // semiacabado frontal (deja ap/2 por lado = ap en X)
  const semi = offsetChain(front, a);
  let S0;
  const c0 = semi[0];
  if (c0.t === 'L' && Math.abs(c0.p1.z - c0.p0.z) > 1e-9) { const t = (1 - c0.p0.z) / (c0.p1.z - c0.p0.z); S0 = { z: 1, r: c0.p0.r + (c0.p1.r - c0.p0.r) * t }; }
  else S0 = { z: 1, r: c0.p0.r };
  if (S0.r < 0) S0.r = 0;
  push('G0 Z1.'); push(`X${f(2 * S0.r)}`); mode = 0;
  pos = { x: round(2 * S0.r, dec), z: 1 };
  if (c0.t === 'A' || Math.abs(c0.p1.z - c0.p0.z) <= 1e-9) emitChain([{ t: 'L', p0: S0, p1: c0.p0 }]);
  emitChain(semi);
  push(`G0 X${f(bd2)}`); mode = 0;
  push('G54'); push('G0 X100. Z100.');

  // acabado frontal
  toolChange(P.tools.finish, 'finish');
  push(`G0 X${f(Math.max(0, 2 * start.r - 2))} Z2.`);
  push(`G1 X${f(2 * start.r)} Z${f(start.z)}${fs()}`); mode = 1; pos = { x: round(2 * start.r, dec), z: round(start.z, dec) };
  emitChain(front);
  push(`G1 X${f(barD + 1)}`);
  push('G54'); push('G0 X100. Z100.');

  // rosca
  let threadPasses = 0;
  const th = P.thread || {};
  if (th.on) {
    const H = th.dMaj - th.dMin;
    if (!(H > 0) || !(th.pitch > 0) || !(th.zEnd < th.zStart)) rep.warnings.push('Revisa los datos de la rosca (Ø mayor > Ø de fondo, paso > 0, Z final < Z inicio).');
    else {
      if (S > 3000 / th.pitch) rep.warnings.push(`Para paso ${f(th.pitch)} el manual limita la rotación a ${Math.floor(3000 / th.pitch)} rpm.`);
      toolChange(P.tools.thread, 'thread');
      const xs = th.dMaj + 2;
      push(`G0 X${f(xs)} Z${f(th.zStart)}`);
      const nP = Math.max(4, Math.ceil((H / ap) ** 2 - 1e-9));
      const ds = [];
      for (let i = 1; i <= nP; i++) ds.push(i === nP ? th.dMin : ceilTo(th.dMaj - H * Math.sqrt(i / nP), dec));
      ds.push(th.dMin);
      for (const d of ds) { push(`X${f(d)}`); push(`G33 Z${f(th.zEnd)} K${f(th.pitch)}`); push(`G0 X${f(xs)}`); push(`Z${f(th.zStart)}`); }
      threadPasses = ds.length;
      push('G54'); push('G0 X100. Z100.');
    }
  }

  // parte trasera y tronzado
  let backPasses = 0;
  toolChange(P.tools.part, 'part');
  if (hasBack) {
    const zGR = round(zEnd - a, dec);
    const i0 = idx(zGR);
    const grX = Math.ceil(2 * envWin[Math.min(n - 1, i0 + 1)] * 10 - 1e-9) / 10 + 0.1;
    push(`G0 X${f(bd2)} Z${f(zProgBlade(zGR))}`);
    push(`G1 X${f(grX)}${fs()}`);
    push(`G0 X${f(bd2)}`);
    for (let k = 1; k < 2000; k++) {
      const D = round(barD - k * ap, 4);
      if (D < grX + ap - 1e-9) break;
      const rl = D / 2;
      if (envWin[i0] > rl + 1e-7) continue;
      let i = i0; while (i + 1 < n && Z(i + 1) <= zPeak + 1e-9 && envWin[i + 1] <= rl + 1e-7) i++;
      const ze = Math.min(floorTo(Z(i), dec), round(zPeak, dec));
      if (ze - zGR < 0.05) continue;
      push(`X${f(D)}`); push(`G1 Z${f(zProgBlade(ze))}`); push(`G0 X${f(bd2)}`); push(`Z${f(zProgBlade(zGR))}`);
      backPasses++;
    }
    const shift = zProgBlade(0);
    // semiacabado trasero
    push(`Z${f(zPeak + shift)}`);
    push(`G1 X${f(2 * (rPeak + a))}`); mode = 1; pos = { x: round(2 * (rPeak + a), dec), z: round(zPeak + shift, dec) };
    let bsemi = offsetChain(back, a);
    bsemi = clipChainAtZ(bsemi, zGR);
    emitChain(bsemi, shift);
    push(`G0 X${f(bd2)}`); mode = 0;
    // acabado trasero y tronzado
    push(`Z${f(zPeak + shift)}`);
    push(`G1 X${f(2 * rPeak)}`); mode = 1; pos = { x: round(2 * rPeak, dec), z: round(zPeak + shift, dec) };
    emitChain(back, shift);
    push('G1 X0.');
    push(`G0 X${f(bd2)}`);
  } else {
    push(`G0 X${f(bd2)} Z${f(zProgBlade(zEnd))}`);
    push(`G1 X0.${fs()}`);
    push(`G0 X${f(bd2)}`);
  }
  push('G54'); push('G0 X100. Z100.');
  push('M9'); push('M5'); push('M02');

  rep.stats = { lines: L.length, levels: levels.length, pockets: pockets.length, backPasses, threadPasses, zPeak, rPeak, zEnd, rEnd, hasBack, facing: zfs.length };
  return { text: L.join('\n') + '\n', rep, segs };
}
