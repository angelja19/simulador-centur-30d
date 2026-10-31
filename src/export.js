// Exportar: imagen PNG, pieza STL y reporte PDF.
import { S } from './state.js';
import * as state from './state.js';
import { download, toast, es, mmss } from './ui/dom.js';
import { MACHINE, stockPolyline, rdp } from './core/index.js';
import { drawGraph } from './screens/graph.js';

const A = () => state.A;
const progName = () => `P${String(S.progNum).padStart(3, '0')}`;

// dibujo 2D de la pieza final y la trayectoria (estilo CRT)
function graph2D(w = 1600, h = 800, type = 'image/png') {
  const a = A(); const cv = document.createElement('canvas');
  Object.assign(cv.style, { position: 'fixed', left: '-99999px', top: 0, width: w + 'px', height: h + 'px' });
  document.body.append(cv);
  const fakeP = { sim: null, mi: a.run.moves.length - 1, t: a.run.total };
  const ctx = cv.getContext('2d');
  drawGraph(cv, a, fakeP, { view: { zoom: 1 }, trail: true, rapids: true, from: -1, prot: true, pos: null, win: 1 });
  const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height;
  const o = out.getContext('2d'); o.fillStyle = '#031007'; o.fillRect(0, 0, out.width, out.height); o.drawImage(cv, 0, 0);
  cv.remove(); void ctx;
  return out.toDataURL(type, 0.9);
}

export function exportPNG(sim3d) {
  if (!A()) return;
  const url = S.ui.screen === 'sim3d' && sim3d ? sim3d.snapshot() : graph2D();
  fetch(url).then(r => r.blob()).then(b => download(`${progName()}_${S.ui.screen === 'sim3d' ? '3D' : 'grafica'}.png`, b, 'image/png'));
  toast('Imagen PNG exportada.');
}

function finalPoints() {
  const a = A(), sim = a.sim;
  let pts = stockPolyline(sim, a.final.r, a.final.threads, 1).filter(p => p[1] > 0);
  if (a.final.parted) pts = pts.filter(p => p[0] >= a.final.parted.z - 1e-6);
  return rdp(pts, 0.003);
}

export async function exportSTL() {
  if (!A()) return;
  const THREE = await import('three');
  const { STLExporter } = await import('three/addons/exporters/STLExporter.js');
  const pts = finalPoints(); if (pts.length < 2) { toast('No hay pieza para exportar.'); return; }
  const z0 = pts[0][0];
  const v = [new THREE.Vector2(0, 0)].concat(pts.map(([z, r]) => new THREE.Vector2(r, z - z0)), [new THREE.Vector2(0, pts[pts.length - 1][0] - z0)]);
  const g = new THREE.LatheGeometry(v, 180);
  g.rotateX(Math.PI / 2);                       // eje de la pieza = eje Z (como en CAD)
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  const data = new STLExporter().parse(mesh, { binary: true });
  download(`${progName()}_pieza.stl`, new Blob([data], { type: 'model/stl' }));
  toast('Pieza exportada en STL (milímetros, eje = Z).');
}

export async function exportPDF(sim3d) {
  const a = A(); if (!a) return;
  toast('Generando el reporte PDF…');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14; let y = 16;
  const line = (txt, size = 10, style = 'normal', color = [20, 24, 28]) => {
    pdf.setFont('helvetica', style); pdf.setFontSize(size); pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(txt), W - 2 * M);
    for (const l of lines) { if (y > 282) { pdf.addPage(); y = 16; } pdf.text(l, M, y); y += size * 0.45; }
  };
  const gap = (h = 3) => { y += h; };
  // encabezado
  pdf.setFillColor(15, 20, 24); pdf.rect(0, 0, W, 26, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.text(`Reporte de simulación · ${MACHINE.model} · ${MACHINE.control}`, M, 12);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.text(`Programa ${progName()} · ${new Date().toLocaleString('es-BO')} · Simulador educativo, no es software de ROMI`, M, 20);
  y = 34;
  const st = a.stats, s = S.stock;
  line('Pieza en bruto', 12, 'bold');
  line(`${s.material} · Ø ${es(s.barD, 2)} mm × ${es(s.barLen, 1)} mm · sujeto ${es(s.grip, 1)} mm · sobremetal en la cara ${es(s.faceStock, 2)} mm`);
  gap();
  line('Resultados', 12, 'bold');
  line(`Tiempo de ciclo ${mmss(st.time)} · ${st.blocks} bloques · ${st.moves} movimientos · ${st.toolChanges} cambios de herramienta`);
  line(`Material quitado ${es(st.removed / 1000, 2)} cm³ (${es(st.mass, 0)} g) · Vc máx. ${es(st.vcMax, 0)} m/min · rpm máx. ${Math.round(st.rpmMax)} · pasada máx. ${es(st.maxDepth, 2)} mm (ap = ${es(S.ap, 2)})`);
  if (a.dev) line(`Comparación con el perfil: sobrecorte máx. ${es(a.dev.over, 3)} mm · sobrante máx. ${es(a.dev.left, 3)} mm`);
  gap();
  // imágenes
  try {
    const img2d = graph2D(1600, 700, 'image/jpeg');
    if (y > 200) { pdf.addPage(); y = 16; }
    pdf.addImage(img2d, 'JPEG', M, y, W - 2 * M, (W - 2 * M) * 700 / 1600); y += (W - 2 * M) * 700 / 1600 + 4;
    if (sim3d) {
      const img3 = sim3d.snapshot('image/jpeg'); const ar = sim3d.renderer.domElement.height / sim3d.renderer.domElement.width;
      const hh = Math.min(110, (W - 2 * M) * ar);
      if (y + hh > 285) { pdf.addPage(); y = 16; }
      pdf.addImage(img3, 'JPEG', M, y, hh / ar, hh); y += hh + 4;
    }
  } catch (e) { line('(No se pudieron incluir las imágenes)', 9, 'italic'); }
  // errores
  line(`Revisión del programa: ${a.errors} error(es), ${a.warns} aviso(s)`, 12, 'bold');
  if (!a.msgs.length) line('Sin errores: sintaxis, lógica y física revisadas.');
  for (const m of a.msgs.slice(0, 40)) {
    const col = m.sev === 'error' ? [190, 30, 25] : m.sev === 'warn' ? [170, 110, 0] : [20, 100, 140];
    line(`${m.sev === 'error' ? 'ERROR' : m.sev === 'warn' ? 'AVISO' : 'INFO'} · ${m.line ? 'Fila ' + m.line + ': ' + m.raw : 'Programa'} · ${m.code}`, 10, 'bold', col);
    line(m.text, 9);
    line('Por qué: ' + m.why, 9, 'normal', [70, 75, 80]);
    line('En la máquina real: ' + m.effect, 9, 'normal', [70, 75, 80]);
    if (m.fix) line('Cómo corregir: ' + m.fix, 9, 'normal', [70, 75, 80]);
    gap(1.5);
  }
  // programa
  pdf.addPage(); y = 16;
  line(`Programa ${progName()}`, 12, 'bold');
  pdf.setFont('courier', 'normal'); pdf.setFontSize(8); pdf.setTextColor(20, 24, 28);
  const L = S.code.split('\n'); const perCol = 88, colW = (W - 2 * M) / 3;
  for (let i = 0; i < L.length; i++) {
    const page = Math.floor(i / (perCol * 3)), col = Math.floor((i % (perCol * 3)) / perCol), row = i % perCol;
    if (i && i % (perCol * 3) === 0) pdf.addPage();
    pdf.text(`${String(i + 1).padStart(3)} ${L[i]}`.slice(0, 34), M + col * colW, (page === 0 ? 24 : 16) + row * 3.05);
  }
  pdf.save(`${progName()}_reporte.pdf`);
}
