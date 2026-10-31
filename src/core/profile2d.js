// Utilidades del HTML original para dibujar la pieza con roscas (perfil r(z)).
export function threadZones(threads) {
  const z = [];
  for (const t of threads.values()) {
    const lo = Math.min(t.zA, t.reach), hi = Math.max(t.zA, t.reach);
    const ex = z.find(q => Math.abs(q.zA - t.zA) < 1e-6 && Math.abs(q.pitch - t.pitch) < 1e-9);
    if (ex) { ex.root = Math.min(ex.root, t.root); ex.lo = Math.min(ex.lo, lo); ex.hi = Math.max(ex.hi, hi); }
    else z.push({ zA: t.zA, pitch: t.pitch, root: t.root, lo, hi });
  }
  return z;
}
export function threadedR(sim, r0, zones, k) {
  let r = r0[k];
  if (r <= 0 || !zones.length) return r;
  const z = sim.z0 + k * sim.h;
  for (const t of zones) {
    if (z < t.lo || z > t.hi || t.root >= r) continue;
    const u = (t.zA - z) / t.pitch, f = u - Math.floor(u), tri = 1 - Math.abs(2 * f - 1);
    r = Math.min(r, r - (r - t.root) * tri);
  }
  return r;
}
// Perfil [z, r] de la pieza (r = arreglo de radios del Sim), con roscas dibujadas
export function stockPolyline(sim, r, threads, step = 1) {
  r = r || sim.r; threads = threads || sim.threads;
  const zones = threadZones(threads);
  let kEnd = sim.n - 1; while (kEnd > 0 && r[kEnd] <= 1e-5) kEnd--;
  const pts = [];
  for (let k = 0; k <= kEnd; k += step) pts.push([sim.z0 + k * sim.h, threadedR(sim, r, zones, k)]);
  if (pts.length && pts[pts.length - 1][0] < sim.z0 + kEnd * sim.h) pts.push([sim.z0 + kEnd * sim.h, threadedR(sim, r, zones, kEnd)]);
  return pts;
}
// Simplificación Ramer–Douglas–Peucker
export function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [az, ar] = pts[0], [bz, br] = pts[pts.length - 1];
  const dz = bz - az, dr = br - ar, L = Math.hypot(dz, dr) || 1;
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((pts[i][0] - az) * dr - (pts[i][1] - ar) * dz) / L; if (d > dmax) { dmax = d; idx = i; } }
  if (dmax <= eps) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}
