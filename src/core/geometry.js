// Núcleo M9 extraído sin cambios de lógica de legacy/simulador_original.html
export const EPS = 1e-9;
export const round = (v, d) => { const p = Math.pow(10, d); return Math.round(v * p) / p; };
export const ceilTo = (v, d) => { const p = Math.pow(10, d); return Math.ceil(v * p - 1e-6) / p; };
export const floorTo = (v, d) => { const p = Math.pow(10, d); return Math.floor(v * p + 1e-6) / p; };

export function fmt(v, dec) {
  if (dec === undefined) dec = 2;
  let r = round(v, dec);
  if (Math.abs(r) < 0.5 / Math.pow(10, dec)) r = 0;
  if (Math.abs(r - Math.round(r)) < 1e-9) return Math.round(r) + '.';
  return r.toFixed(dec).replace(/0+$/, '');
}
export const fmtS = v => String(Math.round(v));

/* ---------- geometría 2D en el plano (z, r) ---------- */
export const sub = (a, b) => ({ z: a.z - b.z, r: a.r - b.r });
export const dot = (a, b) => a.z * b.z + a.r * b.r;
export const dist = (a, b) => Math.hypot(a.z - b.z, a.r - b.r);
export const cp = p => ({ z: p.z, r: p.r });


// Arco por radio: G2 horario / G3 antihorario con Z → derecha y X → arriba (torre trasera)
export function arcFromR(p0, p1, R, ccw) {
  const cz = p1.z - p0.z, cr = p1.r - p0.r, c = Math.hypot(cz, cr);
  if (c < 1e-9) return { err: 'Punto inicial y final iguales.' };
  const h = c / 2;
  if (R < h - 2e-3) return { err: `El radio R${fmt(R, 3)} es menor que la mitad de la cuerda (${fmt(h, 3)}).` };
  const d = Math.sqrt(Math.max(0, R * R - h * h));
  const lz = -cr / c, lr = cz / c, mz = (p0.z + p1.z) / 2, mr = (p0.r + p1.r) / 2;
  const center = ccw ? { z: mz + d * lz, r: mr + d * lr } : { z: mz - d * lz, r: mr - d * lr };
  return arcFromCenter(p0, p1, center, ccw);
}
export function arcFromCenter(p0, p1, c, ccw) {
  const R0 = dist(p0, c), R1 = dist(p1, c);
  if (R0 < 1e-6 || Math.abs(R0 - R1) > 0.02) return { err: `Los radios al inicio (${fmt(R0, 3)}) y al final (${fmt(R1, 3)}) no coinciden.` };
  let a0 = Math.atan2(p0.r - c.r, p0.z - c.z), a1 = Math.atan2(p1.r - c.r, p1.z - c.z);
  if (ccw) { while (a1 <= a0 + 1e-12) a1 += 2 * Math.PI; } else { while (a1 >= a0 - 1e-12) a1 -= 2 * Math.PI; }
  return { c: cp(c), R0, R1, a0, a1, ccw };
}
export const arcPoint = (A, t) => {
  const a = A.a0 + (A.a1 - A.a0) * t, R = A.R0 + (A.R1 - A.R0) * t;
  return { z: A.c.z + R * Math.cos(a), r: A.c.r + R * Math.sin(a) };
};
export const arcTangentAt = (A, t) => {
  const a = A.a0 + (A.a1 - A.a0) * t, s = A.a1 > A.a0 ? 1 : -1;
  return { z: -Math.sin(a) * s, r: Math.cos(a) * s };
};
