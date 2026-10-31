// Núcleo M9 extraído sin cambios de lógica de legacy/simulador_original.html
import { fmt, arcPoint, arcTangentAt } from './geometry.js';
import { DEFAULT_TOOLS } from './interpret.js';

/* ======================================================================
   SIMULACIÓN DE MATERIAL
   ====================================================================== */
export const SAMPLE = 0.01;

export class Sim {
  constructor(run, setup) {
    this.run = run; this.moves = run.moves; this.setup = setup;
    this.tools = setup.tools || DEFAULT_TOOLS;
    this.barR = setup.barD / 2; this.face = setup.faceStock;
    this.stick = setup.barLen - setup.grip;
    this.zJaw = this.face - this.stick;
    this.jawH = Math.max(10, this.barR * 0.9);
    this.h = 0.02;
    this.z0 = this.zJaw - 1;
    this.z1 = this.face + 3;
    this.n = Math.ceil((this.z1 - this.z0) / this.h) + 1;
    this.r = new Float32Array(this.n);
    this.r0 = new Float32Array(this.n);
    this.pre = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) { const z = this.z0 + i * this.h; this.r0[i] = z <= this.face + 1e-9 ? this.barR : 0; }
    const M = this.moves.length;
    this.mDepth = new Float32Array(M); this.mAxis = new Uint8Array(M); this.mRem = new Float32Array(M);
    this.mColl = new Uint8Array(M); this.mChuck = new Uint8Array(M);
    this.reset();
  }
  reset() {
    this.r.set(this.r0); this.mi = 0; this.si = 0; this.threads = new Map(); this.parted = null;
    const m0 = this.moves[0]; this.pos = m0 ? { z: m0.z0, r: m0.x0 / 2, tool: m0.tool } : null;
  }
  nSamples(m) { return Math.max(1, Math.ceil(m.len / SAMPLE)); }
  pointAt(m, t) {
    if (m.arc) return arcPoint(m.arc, t);
    return { z: m.z0 + (m.z1 - m.z0) * t, r: (m.x0 + (m.x1 - m.x0) * t) / 2 };
  }
  dirAt(m, t) {
    if (m.arc) return arcTangentAt(m.arc, t);
    const dz = m.z1 - m.z0, dr = (m.x1 - m.x0) / 2, L = Math.hypot(dz, dr) || 1;
    return { z: dz / L, r: dr / L };
  }
  tool(m) { return m.tool == null ? { type: 'turn', k2: 30 } : (this.tools[m.tool] || { type: 'turn', k2: 30 }); }
  farFromStock(m) {
    if (m.arc) return false;
    const rmin = Math.min(m.x0, m.x1) / 2, zmin = Math.min(m.z0, m.z1);
    return rmin > this.barR + 0.05 || zmin > this.face + 0.05;
  }
  // procesa la muestra s del movimiento i
  sample(i, s, measure) {
    const m = this.moves[i], n = this.nSamples(m), t = s / n;
    const p = this.pointAt(m, t);
    const T = this.tool(m);
    this.pos = { z: p.z, r: p.r, tool: m.tool };
    const R = this.r, h = this.h, z0 = this.z0, N = this.n;
    const leftEdge = T.type === 'blade' ? (T.ref === 'izq' ? p.z : p.z - T.w) : p.z;
    if (leftEdge < this.zJaw + 1e-6 && p.r < this.barR + this.jawH) this.mChuck[i] = 1;
    if (m.kind === 'thread') {
      const key = m.line + '|' + fmt(m.z0) + '|' + fmt(m.z1);
      let th = this.threads.get(key);
      if (!th) { th = { zA: m.z0, zB: m.z1, pitch: m.pitch, root: p.r, line: m.line, reach: m.z0 }; this.threads.set(key, th); }
      th.root = Math.min(th.root, p.r); th.reach = Math.min(th.reach, p.z);
      return;
    }
    if (m.kind === 'rapid' && this.farFromStock(m)) return;
    let rem = 0, bladeRem = 0, zRight = p.z;
    if (T.type === 'blade') {
      const zl = T.ref === 'izq' ? p.z : p.z - T.w, zr = zl + T.w;
      zRight = zr;
      let ca = Math.ceil((zl - z0) / h - 1e-9), cb = Math.floor((zr - z0) / h + 1e-9);
      if (ca < 0) ca = 0; if (cb > N - 1) cb = N - 1;
      const cut = Math.max(0, p.r);
      for (let k = ca; k <= cb; k++) { if (R[k] > cut + 1e-6) { const q = R[k] - cut; if (q > bladeRem) bladeRem = q; R[k] = cut; } }
      rem = bladeRem;
      if (p.r <= 0.005 && m.kind !== 'rapid' && !this.parted) this.parted = { z: zr, line: m.line };
    } else if (T.type === 'thread') {
      // dentro de la zona roscada la herramienta trabaja en su propio surco
      const half = 1.2, tan = Math.tan(60 * Math.PI / 180);
      let ca = Math.max(0, Math.round((p.z - half - z0) / h)), cb = Math.min(N - 1, Math.round((p.z + half - z0) / h));
      for (let k = ca; k <= cb; k++) {
        const zc = z0 + k * h, cut = Math.max(0, p.r + Math.abs(zc - p.z) * tan);
        const eff = Math.min(R[k], this.threadRootAt(zc));
        if (eff > cut + 1e-6) { rem = Math.max(rem, eff - cut); R[k] = cut; }
      }
    } else {
      const tk = Math.tan((T.k2 || 30) * Math.PI / 180);
      // radio de punta rn (mejora): la punta teórica P es la esquina del cuadrado que rodea al círculo
      const rn = T.rn > 0 ? T.rn : 0;
      let c = Math.ceil((p.z - z0) / h - 1e-9);
      if (c < 0) c = 0;
      let quiet = 0;
      for (let k = c; k < N; k++) {
        const dz = z0 + k * h - p.z;
        if (dz > 4 + rn) break;
        const cut = Math.max(0, !rn ? (dz <= 0 ? p.r : p.r + dz * tk)
          : dz <= rn ? p.r + rn - Math.sqrt(Math.max(0, rn * rn - (dz - rn) * (dz - rn))) : p.r + (dz - rn) * tk);
        if (R[k] > cut + 1e-6) {
          const q = R[k] - cut; if (q > rem) rem = q;
          R[k] = cut; quiet = 0;
        } else if (cut > 0 && ++quiet > 12) break;
      }
    }
    if (!measure || rem <= 1e-6) return;
    if (rem > this.mRem[i]) this.mRem[i] = rem;
    if (m.kind === 'rapid') { if (rem > 0.1) this.mColl[i] = 1; return; }
    if (T.type === 'thread') return;
    // al llegar a una esquina cóncava la punta toca el sobremetal de la cara siguiente:
    // no se mide en los últimos 0,3 mm del bloque (en bloques cortos, solo el tramo central)
    if (m.len >= 0.6 ? (1 - t) * m.len < 0.3 : Math.abs(t - 0.5) > 0.25) return;
    const d = this.dirAt(m, t);
    if (T.type === 'blade' && Math.abs(d.r) > Math.sin(60 * Math.PI / 180)) return; // ranurado/tronzado
    // profundidad = distancia de la punta a la superficie sin cortar (antes de esta pasada)
    let nz = d.r, nr = -d.z;
    const side = T.type === 'blade' ? (-nz + nr) : (nz + nr);
    if (side < 0) { nz = -nz; nr = -nr; }
    const dn = this.rayDepth(T.type === 'blade' ? zRight : p.z, p.r, nz, nr);
    const transversal = Math.abs(d.r) > Math.abs(d.z) + 1e-9;
    const depth = transversal ? dn : 2 * dn, axis = transversal ? 2 : 1;
    if (depth > this.mDepth[i]) { this.mDepth[i] = depth; this.mAxis[i] = axis; }
  }
  threadRootAt(z) {
    let r = Infinity;
    for (const th of this.threads.values()) {
      const lo = Math.min(th.zA, th.reach) - 0.5, hi = Math.max(th.zA, th.reach);
      if (z >= lo && z <= hi && th.root < r) r = th.root;
    }
    return r;
  }
  // distancia mínima (rayos a ±30° de la normal) hasta la superficie previa
  rayDepth(pz, pr, nz, nr) {
    const P = this.pre, h = this.h, z0 = this.z0, N = this.n;
    const at = z => {
      const x = (z - z0) / h, k = Math.floor(x);
      if (k < 0 || k >= N - 1) return 0;
      const a = P[k], b = P[k + 1];
      // superficie con escalones: si un vecino es aire, se toma el valor más cercano
      if (a === 0 || b === 0) return x - k < 0.5 ? a : b;
      return a + (b - a) * (x - k);
    };
    const out = (z, r) => Math.abs(r) >= at(z) - 1e-6;
    if (out(pz, pr)) return 0;
    let best = 1.6;
    for (const deg of [-40, -20, 0, 20, 40]) {
      const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
      const uz = nz * c - nr * s, ur = nz * s + nr * c;
      for (let q = 0.01; q < best; q += 0.01) {
        if (out(pz + q * uz, pr + q * ur)) {
          let lo = q - 0.01, hi = q;
          for (let it = 0; it < 7; it++) { const mid = (lo + hi) / 2; if (out(pz + mid * uz, pr + mid * ur)) hi = mid; else lo = mid; }
          if (hi < best) best = hi; break;
        }
      }
    }
    return best;
  }
  // avanza hasta el movimiento mi con fracción frac (0..1)
  advanceTo(mi, frac, measure) {
    const M = this.moves.length;
    if (mi >= M) { mi = M - 1; frac = 1; }
    if (mi < 0) return;
    const target = { mi, s: Math.floor(this.nSamples(this.moves[mi]) * Math.min(1, Math.max(0, frac))) };
    if (target.mi < this.mi || (target.mi === this.mi && target.s < this.si)) this.reset();
    while (this.mi < target.mi || (this.mi === target.mi && this.si < target.s)) {
      const m = this.moves[this.mi], n = this.nSamples(m);
      if (this.si >= n) { this.mi++; this.si = 0; if (this.mi >= M) break; continue; }
      if (this.si === 0 && measure) this.pre.set(this.r);
      this.si++;
      this.sample(this.mi, this.si, measure);
    }
    const m = this.moves[this.mi];
    if (m) { const p = this.pointAt(m, this.si / this.nSamples(m)); this.pos = { z: p.z, r: p.r, tool: m.tool }; }
  }
  runAll() {
    this.reset();
    if (!this.moves.length) return;
    this.advanceTo(this.moves.length - 1, 1, true);
  }
  stockAt(z) { const k = Math.round((z - this.z0) / this.h); return k < 0 || k >= this.n ? 0 : this.r[k]; }
  removedVolume() {
    let v0 = 0, v1 = 0;
    for (let k = 0; k < this.n; k++) { v0 += this.r0[k] * this.r0[k]; v1 += this.r[k] * this.r[k]; }
    return { v0: Math.PI * v0 * this.h, v1: Math.PI * v1 * this.h };
  }
}
