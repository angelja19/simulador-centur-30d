// Arranque de la app: barra superior, dos pantallas, panel de errores, menú y PWA.
import './styles/app.css';
import './styles/mach9.css';
import './styles/sim3d.css';
import { S, A, on, emit, reanalyze, setCode, save } from './state.js';
import { mountErrors } from './ui/errors.js';
import { mountMach9 } from './screens/mach9.js';
import { el, toast, modal, download, pickFile } from './ui/dom.js';
import { DEFAULT_PROGRAM, MACHINE } from './core/index.js';
import { openCamDialog } from './ui/camdialog.js';
import * as player from './player.js';

const $ = s => document.querySelector(s);
mountErrors($('#errors'));
const mach9 = mountMach9($('#scr-mach9'));
let sim3d = null;

async function showScreen(name) {
  S.ui.screen = name; save();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.scr === name));
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'scr-' + name));
  if (name === 'sim3d' && !sim3d) {
    const host = $('#scr-sim3d');
    host.append(el('div', { class: 'loading3d' }, 'Cargando la máquina 3D…'));
    const mod = await import('./screens/sim3d.js');
    host.innerHTML = '';
    sim3d = mod.mountSim3D(host);
  }
  emit('screenShown', name);
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showScreen(t.dataset.scr)));
on('screen', showScreen);

// menú Archivo
const menu = $('#menu');
$('#menuBtn').addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
document.addEventListener('click', () => menu.classList.remove('open'));
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; menu.querySelector('[data-act="install"]').hidden = false; });

menu.querySelector('.drop').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  menu.classList.remove('open');
  const act = b.dataset.act;
  const ex = () => import('./export.js');
  if (act === 'paste') {
    const ta = el('textarea', { placeholder: 'Pega aquí tu programa…', spellcheck: 'false' });
    if (await modal('Pegar programa', ta, [{ label: 'Cancelar', value: false }, { label: 'Cargar', cls: 'pri', value: true }]) && ta.value.trim()) emit('loadtext', ta.value);
  } else if (act === 'open') { const f = await pickFile('.nc,.txt,.tap,.cnc,.gcode,.mpf,text/plain'); if (f) { emit('loadtext', f.text); toast('Abierto: ' + f.name); } }
  else if (act === 'example') emit('example');
  else if (act === 'cam') openCamDialog();
  else if (act === 'nc') download(`P${String(S.progNum).padStart(3, '0')}.nc`, S.code.replace(/\n/g, '\r\n'));
  else if (act === 'png') (await ex()).exportPNG(sim3d);
  else if (act === 'stl') (await ex()).exportSTL();
  else if (act === 'pdf') (await ex()).exportPDF(sim3d);
  else if (act === 'install' && installEvt) { installEvt.prompt(); installEvt = null; b.hidden = true; }
  else if (act === 'about') {
    modal('Acerca de', el('div', { html: `<p><b>Simulador ${MACHINE.model} · ${MACHINE.control}</b> — versión 1.0.</p>
      <p>Simulador <b>educativo</b> hecho a partir de la clase CNC N° 6 del docente y de la ficha técnica de la máquina. <b>No es software de ROMI</b> ni está afiliado a Indústrias Romi S.A.; las marcas pertenecen a sus dueños.</p>
      <p>Funciona sin internet una vez instalado. Código abierto con licencia MIT.</p>` }), [{ label: 'Cerrar', cls: 'pri' }]);
  }
});
on('example', () => { emit('loadtext', DEFAULT_PROGRAM); toast('Programa de ejemplo del curso cargado.'); });

// arranque
reanalyze(true);
if (S.ui.screen === 'sim3d') showScreen('sim3d');

// PWA: service worker (solo en la versión web compilada)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !import.meta.env.DEV) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* sin SW */ });
}
window.__app = { S, get A() { return A; }, mach9, emit, setCode, player };
