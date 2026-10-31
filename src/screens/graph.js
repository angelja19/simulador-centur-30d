// Gráfica verde del CRT (modo AUTO / PRUEBA), como en el video del docente:
// la pieza, la trayectoria dibujándose y la herramienta, con zoom automático a la pieza.
import { arcPoint, stockPolyline } from '../core/index.js';

const G = '#8dffa6', GD = '#2f9c4e', GF = 'rgba(141,255,166,0.55)';

export function drawGraph(cv, A, P, o) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const sim = P.sim || A.sim;
  // zoom automático: la pieza (saliente de la barra) ocupa el cuadro
  const zMin = sim.zJaw - 6, zMax = sim.face + 6, rMax = sim.barR + 4;
  const pad = 10, v = o.view;
  let s = Math.min((W - 2 * pad) / (zMax - zMin), (H - 2 * pad) / (rMax + 3));
  s *= v.zoom || 1;
  const pan = v.pan || { z: 0, r: 0 };
  const cz = (zMin + zMax) / 2 + pan.z, cr = rMax / 2 - 1 + pan.r;
  const X = z => W / 2 + (z - cz) * s, Y = r => H / 2 - (r - cr) * s;

  // marco
  ctx.strokeStyle = G; ctx.lineWidth = 1.5; ctx.strokeRect(4.5, 4.5, W - 9, H - 9);
  ctx.save(); ctx.beginPath(); ctx.rect(5, 5, W - 10, H - 10); ctx.clip();
  ctx.shadowColor = '#5dff8a'; ctx.shadowBlur = 6;

  // eje de giro
  ctx.setLineDash([8, 4, 2, 4]); ctx.strokeStyle = GD; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke(); ctx.setLineDash([]);

  // plato / garras (zona de protección)
  if (o.prot) {
    const jz = sim.zJaw, jh = sim.jawH;
    ctx.strokeStyle = GD; ctx.lineWidth = 1.2;
    ctx.strokeRect(X(jz - 22), Y(sim.barR + jh), (22) * s, (jh) * s);
    ctx.beginPath(); ctx.moveTo(X(jz - 22), Y(sim.barR + jh + 8)); ctx.lineTo(X(jz - 22), Y(0)); ctx.stroke();
  }

  // barra en bruto (contorno punteado)
  ctx.setLineDash([3, 3]); ctx.strokeStyle = GD;
  ctx.strokeRect(X(sim.zJaw), Y(sim.barR), (sim.face - sim.zJaw) * s, sim.barR * s);
  ctx.setLineDash([]);

  if (o.win === 3) { ctx.restore(); return; }   // ventana 3: no se ve la pieza (como advierte el docente)
  // pieza actual (relleno verde)
  const r = P.sim ? P.sim.r : A.final.r, th = P.sim ? P.sim.threads : A.final.threads;
  const pts = stockPolyline(sim, r, th, Math.max(1, Math.floor(0.4 / (s * sim.h))));
  if (pts.length && o.win !== 2) {
    ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(0));
    for (const [z, rr] of pts) ctx.lineTo(X(z), Y(rr));
    ctx.lineTo(X(pts[pts.length - 1][0]), Y(0)); ctx.closePath();
    ctx.fillStyle = GF; ctx.fill(); ctx.strokeStyle = G; ctx.lineWidth = 1.4; ctx.stroke();
  }

  // trayectoria hasta el instante actual
  const M = A.run.moves;
  if (o.trail && P.mi >= 0) {
    for (let i = Math.max(0, o.from); i <= P.mi && i < M.length; i++) {
      const m = M[i];
      if (m.kind === 'rapid' && !o.rapids) continue;
      const f = i < P.mi ? 1 : Math.max(0, Math.min(1, (P.t - m.t0) / Math.max(1e-9, m.t1 - m.t0)));
      ctx.setLineDash(m.kind === 'rapid' ? [2, 4] : []);
      ctx.strokeStyle = m.kind === 'rapid' ? GD : G; ctx.lineWidth = m.kind === 'rapid' ? 1 : 1.3;
      ctx.beginPath();
      if (m.arc) { const n = Math.max(6, Math.ceil(24 * f)); for (let k = 0; k <= n; k++) { const q = arcPoint(m.arc, f * k / n); k ? ctx.lineTo(X(q.z), Y(q.r)) : ctx.moveTo(X(q.z), Y(q.r)); } }
      else { ctx.moveTo(X(m.z0), Y(m.x0 / 2)); ctx.lineTo(X(m.z0 + (m.z1 - m.z0) * f), Y((m.x0 + (m.x1 - m.x0) * f) / 2)); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // cuadro de LÍMITES
  if (v.limits) { ctx.setLineDash([6, 3]); ctx.strokeStyle = G; ctx.strokeRect(X(sim.zJaw - 3), Y(sim.barR + 3), (sim.face - sim.zJaw + 6) * s, (sim.barR + 3) * s); ctx.setLineDash([]); }
  // herramienta
  const p = o.pos;
  if (p && Number.isFinite(p.x)) {
    const tx = X(p.z), ty = Y(p.x / 2), k = 9;
    ctx.fillStyle = '#031007'; ctx.strokeStyle = G; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + k * 0.5, ty - k * 1.6); ctx.lineTo(tx + k * 1.7, ty - k * 0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = G; ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
  }
  ctx.restore();
}
