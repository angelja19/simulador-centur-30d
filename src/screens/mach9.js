// PANTALLA 1 — réplica del panel MACH 9 con el CRT verde.
// Flujo tomado del video del docente (ver docs/guia_docente.md).
import { el, esc, es, mmss, toast, modal, download, pickFile } from '../ui/dom.js';
import { S, A, on, emit, setCode, save, toolsMap } from '../state.js';
import { P, cycleStart, stop, stepBlock, emergency, resetPlayer, toolPos } from '../player.js';
import { MACHINE, describeBlock, modalStates, stockPolyline } from '../core/index.js';
import { drawGraph } from './graph.js';

// grupos de la fila inferior F10–F14 (se recorren con ▲ / ►)
const BOTTOM = [
  ['SUEL/PREN PIEZA', 'OPERADOR LIBERA', 'AVAN/RETR PINOLA', 'MOV. HUS HORARIO', 'MOV. HUS ANTIHOR'],
  ['REFRIG. MANUAL', 'REFRIG. AUTOMAT.', '', '', ''],
  ['INCREM. AVANCE', 'DECREM. AVANCE', 'SEGURID. PUERTA', 'PLATO EXTERNO', ''],
  ['EN MANDO', 'AVANCA B. CONTRAPUN', 'RETROCED. CONTRAPUN', '', '']
];
const SOFT = {
  acceso: ['', '', '', '', '', '', '', '', ''],
  modo: ['REPOSO', 'EDITOR', 'REFER. TRABAJO', 'CARGAR/ SALVAR', 'AUTO', 'PRUEBA', 'MANUAL', '', 'SOPORTE'],
  editor: ['', 'EDITOR', '', 'PRG. NUEVO', 'PROX. PRG.', 'RENU- MERAR', 'LIMPIAR PROGRAMA', 'LIMPIAR TODO', 'DIREC- TOR.'],
  dir: ['FLAGS', '', '', '', '', '', '', '', 'PROX. PAG.'],
  edit: ['GRAFI- COS', '', '', '', '', '', '', 'BORRA BLOQUE', 'ERROR MSGS'],
  auto: ['LIMPIAR', 'RAPIDOS', 'AJUSTE PROTEC.', 'CERRAR', 'LIMITES AJUSTE', '', 'AMPLIAR', 'REDUCIR', 'VENT. 1'],
  manual: ['EJE X', 'EJE Z', 'INCRE- MENTO', 'MDI', 'REFER. MAQUINA', '', '', '', ''],
  refer: ['', '', '', '', '', '', '', '', ''],
  cargar: ['CARGAR ARCHIVO', 'SALVAR .NC', 'PEGAR', 'EJEMPLO', '', '', '', '', ''],
  soporte: ['', '', '', '', '', '', '', '', ''],
  errores: ['', '', '', '', '', '', '', '', ''],
  ayuda: ['', '', '', '', '', '', '', '', ''],
  reposo: ['', '', '', '', '', '', '', '', '']
};
const SHIFT_SYM = { 7: '(', 8: ')', 9: ';', 4: '=', 5: '*', 6: '/', 1: '<', 2: '>', 3: '#', 0: '%', '-': '+', '.': ',' };

export function mountMach9(root) {
  const M = {
    page: 'acceso', prev: 'modo', access: 0, code: '', axes: false, group: 0, shift: false, ins: false,
    cur: { row: 0, col: 0 }, progInput: '', fsize: 1, dirSel: 0, errSel: 0, gview: { zoom: 1, cx: null, cy: null, win: 1, prot: true },
    trail: true, rapids: true, ref: false, refWait: false, mdi: null, manual: { axis: 'X', inc: 1, x: 100, z: 100 }, explain: null, alarm: null, chuck: true, spindle: 0, coolant: false, quill: false
  };
  if (!S.programs) S.programs = { 1: S.code };
  if (!S.programs[S.progNum]) S.programs[S.progNum] = S.code;

  /* ---------------- construcción del panel ---------------- */
  const key = (id, label, cls = '', extra = {}) => el('button', Object.assign({ class: 'key ' + cls, 'data-k': id, 'aria-label': extra.aria || label.replace(/<[^>]+>/g, '') }, extra.attrs || {}), el('span', { html: label }), extra.sh ? el('span', { class: 'sh' }, extra.sh) : null);
  const scr = el('div', { class: 'scr' });
  const glass = el('div', { class: 'glass' }, scr);
  const crt = el('div', { class: 'crt' }, glass);
  const fcol = el('div', { class: 'fcol' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => key('F' + i, 'F' + i)));
  const frow = el('div', { class: 'frow' }, key('GUP', '▲', 'blue', { aria: 'Grupo anterior de teclas F10 a F14' }), [10, 11, 12, 13, 14].map(i => key('F' + i, 'F' + i)),
    key('GRIGHT', '►', 'blue', { aria: 'Grupo siguiente de teclas F10 a F14' }), key('EXIT', 'EXIT', 'orange'));
  const alpha = el('div', { class: 'alpha' }, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => key(c, c)), key('EOB', 'EOB', 'orange eob', { aria: 'Fin de bloque' }));
  const bluerow = el('div', { class: 'bluerow' }, key('INS', 'INS', 'blue'), key('ERR', 'ERROR<br>MSGS', 'blue'), key('HELP', 'HELP', 'blue'),
    key('ZIN', 'ZOOM<br>IN', 'blue'), key('ZOUT', 'ZOOM<br>OUT', 'blue'), key('SPACE', 'SPACE', 'blue'));
  const nums = el('div', { class: 'nums' }, ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.'].map(c => key(c, c, '', { sh: SHIFT_SYM[c] })));
  const bcol = el('div', { class: 'bcol' }, key('PGUP', 'PÁG<br>▲', 'blue'), key('PGDN', 'PÁG<br>▼', 'blue'), key('BS', 'BORRA', 'blue', { aria: 'Borrar carácter' }), key('DELB', 'BORRA<br>BLOQ.', 'blue', { aria: 'Borrar bloque' }));
  const diamond = el('div', { class: 'diamond' }, key('CU', '<span>▲</span>', '', { aria: 'Cursor arriba' }), key('CR', '<span>►</span>', '', { aria: 'Cursor derecha' }),
    key('CL', '<span>◄</span>', '', { aria: 'Cursor izquierda' }), key('CD', '<span>▼</span>', '', { aria: 'Cursor abajo' }));
  const cursor = el('div', { class: 'cursor' }, diamond, el('div', { class: 'enterrow' }, key('SHIFT', 'SHIFT', 'orange'), key('ENTER', 'ENTER', 'blue')));
  const numpad = el('div', { class: 'numpad' }, nums, bcol, cursor);
  const kbd = el('div', { class: 'kbd' }, alpha, bluerow, numpad);
  const secs = el('div', { class: 'secs' }, ['abc', 'num', 'ctl'].map((s, i) => el('button', { 'data-s': s, class: i === 0 ? 'on' : '' }, ['ABC', '123 ▲▼', 'MANDO'][i])));

  const knob = (id, label, min, max, step, val, cls = '') => {
    const k = el('div', { class: 'knob ' + cls, 'data-knob': id, role: 'slider', tabindex: 0, 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max },
      el('div', { class: 'scale' }), el('div', { class: 'cap' }), el('div', { class: 'val' }), el('div', { class: 'lbl' }, label));
    k._cfg = { min, max, step, val };
    return k;
  };
  const kF = knob('F', 'F %', 0, 140, 10, S.ui.fOv), kS = knob('S', 'S %', 50, 120, 10, S.ui.sOv);
  const kSel = knob('SEL', '− / +', 1, 7, 1, S.ui.speed, 'small');
  const estop = el('button', { class: 'estop', 'aria-label': 'Parada de emergencia' }, el('i'));
  const pb = (cls, label, aria) => el('div', { class: 'pbwrap' }, el('button', { class: 'pb ' + cls, 'aria-label': aria }, el('i')), el('span', null, label));
  const bRed = pb('red', 'STOP', 'Cycle stop'), bOr = pb('orange', 'BLOQUE', 'Bloque a bloque'), bGr = pb('green', 'START', 'Cycle start');
  const lower = el('div', { class: 'lower' }, estop, el('div', { class: 'selk' }, kSel, el('div', { class: 'pm' }, el('span', null, '−'), el('span', null, '+'))), kF, kS,
    el('div', { class: 'badge' }, el('div', { class: 'romi' }, el('b'), 'ROMI', el('span', null, 'MACH 9'))),
    el('div', { class: 'btn3' }, bRed, bOr, bGr));
  const m9 = el('div', { class: 'm9', 'data-sec': 'abc' }, el('div', { class: 'bezel' },
    el('div', { class: 'upper' }, el('div', { class: 'crtcol' }, crt, frow), fcol, secs, kbd), lower));

  // lateral
  const dot = el('span', { class: 'dot' });
  const explain = el('div', { class: 'explain' });
  const dro = el('div', { class: 'dro' });
  const progBar = el('i');
  const side = el('div', { class: 'side' },
    el('div', { class: 'card' }, el('h4', null, dot, 'Explicación del bloque'), explain, el('div', { class: 'prog' }, progBar)),
    el('div', { class: 'card' }, el('h4', null, 'Estado de la máquina'), dro),
    el('div', { class: 'card' }, el('h4', null, 'Programa'),
      el('div', { class: 'acts2' },
        el('button', { class: 'tbtn', onclick: () => pasteProgram() }, '📋 Pegar programa'),
        el('button', { class: 'tbtn', onclick: () => openFile() }, '📂 Abrir archivo'),
        el('button', { class: 'tbtn', onclick: () => download(`P${String(S.progNum).padStart(3, '0')}.nc`, S.code) }, '💾 Guardar .nc'),
        el('button', { class: 'tbtn', onclick: () => { gotoPage('edit'); } }, '⌨ Editar en el CRT')),
      el('p', { style: { color: 'var(--muted)', font: '13px var(--disp)', margin: '8px 0 0' } },
        'También puedes escribir con el teclado de la PC cuando el editor del CRT está abierto. EXIT vuelve al menú.')),
    el('div', { class: 'card guide' }, el('h4', null, 'Pasos como en la clase'), el('ol', { class: 'steps', style: { margin: 0, paddingLeft: '18px', font: '14px/1.5 var(--disp)', color: '#cfdadd' } })));
  root.append(m9, side);

  /* ---------------- render del CRT ---------------- */
  const softDivs = Array.from({ length: 9 }, () => el('div'));
  const botDivs = Array.from({ length: 5 }, () => el('div'));
  const main = el('div', { class: 'main' }), msg = el('div', { class: 'msg' });
  scr.append(main, el('div', { class: 'soft' }, softDivs), msg, el('div', { class: 'bot' }, botDivs, el('div')));
  let gfx = null;

  function fitFont() {
    const h = glass.clientHeight || 300;
    scr.style.setProperty('--crtf', (Math.max(12, h / 24) * M.fsize).toFixed(1) + 'px');
  }
  new ResizeObserver(() => { fitFont(); if (gfx) drawNow(); }).observe(glass);

  const statusTxt = () => {
    if (P.state === 'estop') return 'EMERGENCIA';
    if (M.page === 'auto' || M.page === 'prueba') {
      if (P.state === 'run') return M.page === 'prueba' ? 'PRUEBA EN CURSO' : 'OPERACION AUTOMATICA';
      if (P.state === 'block' || (P.state === 'hold' && P.blockLine != null)) return 'BLOQUE A BLOQUE';
      if (P.state === 'done') return 'FIN DE PROGRAMA';
      if (P.state === 'hold') return 'CICLO DETENIDO';
    }
    return 'INACTIVO';
  };
  const header = (title) => `<div class="hdr">${title}<br>AVANCE ${M.axes ? 'HABILITADO' : 'INHIBIDO'}<br>${statusTxt()}</div>`;

  function renderSoft(list) {
    softDivs.forEach((d, i) => { d.textContent = list[i] || ''; d.className = ''; });
    const g = BOTTOM[M.group];
    botDivs.forEach((d, i) => {
      d.textContent = g[i] || '';
      const on = (g[i] === 'EN MANDO' && M.axes) || (g[i] === 'SUEL/PREN PIEZA' && !M.chuck) || (g[i] === 'MOV. HUS HORARIO' && M.spindle === 3) ||
        (g[i] === 'MOV. HUS ANTIHOR' && M.spindle === 4) || (g[i] === 'REFRIG. MANUAL' && M.coolant) || (g[i] === 'AVAN/RETR PINOLA' && M.quill) || (g[i] === 'PLATO EXTERNO' && M.chuckInv);
      d.className = on ? 'on' : '';
    });
  }
  function setMsg(t) { msg.innerHTML = t ? `<span>${esc(t)}</span>` : ''; }
  function baseMsg() { setMsg(M.alarm || (!M.axes && M.access ? 'EJES DESCONECTADOS' : M.refWait ? 'AGUARDANDO INICIO' : (M.axes && !M.ref && M.page !== 'acceso') ? 'MAQUINA NO REFERENCIADA' : '')); }

  function render() {
    gfx = null;
    const pg = M.page;
    renderSoft(SOFT[pg === 'prueba' ? 'auto' : pg] || SOFT.modo);
    if (pg === 'acceso') {
      main.innerHTML = `${header('PAGINA DE ACCESO')}<div style="margin:2.2em 0 0 3em" class="big">COD ACCESO${M.access ? '-' + M.access : ''}:</div>
        <div style="margin:.4em 0 0 3em" class="big">${'*'.repeat(M.code.length)}<span class="cur">&nbsp;</span></div>
        <div style="margin-top:2.4em" class="dim">Escribe el código de acceso del operador y ENTER.<br>Luego busca EN MANDO con ► y pulsa F10.</div>`;
    } else if (pg === 'modo') {
      main.innerHTML = `${header('PAGINA DE MODO')}<div style="margin:2em 0 0 1em"><span class="inv big" style="padding:.3em 1em">TORNO ROMI<br>&nbsp;CENTUR 30D</span></div>
        <div style="margin-top:2em" class="dim">F2 EDITOR · F5 AUTO · F6 PRUEBA · F7 MANUAL</div>`;
    } else if (pg === 'editor') {
      const code = S.programs[M.progInput ? +M.progInput : S.progNum] || '';
      main.innerHTML = `<div class="hdr">EDITOR</div><div style="margin:.8em 0 0 1em">* EXTERNO *</div>
        <div style="margin:.6em 0 0 1em;line-height:1.35" class="big">Programa ${M.progInput ? M.progInput : S.progNum}<span class="cur">&nbsp;</span><br>Flags<br>Tamano&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${code.length}<br>Disponible ${Math.max(0, 52000 - totalSize())}</div>
        <div style="margin-top:1em" class="dim">Escribe el número de programa y ENTER. F9 DIRECTORIO.</div>`;
    } else if (pg === 'dir') {
      const nums = Object.keys(S.programs).map(Number).sort((a, b) => a - b);
      M.dirSel = Math.min(M.dirSel, nums.length - 1);
      main.innerHTML = `<div class="inv" style="display:block">DIRECTORIO&nbsp;&nbsp;&nbsp;${Math.max(0, 52000 - totalSize())} Disponible</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1em;margin-top:.3em">${nums.map((n, i) => `<div class="${i === M.dirSel ? 'inv' : ''}">P${String(n).padStart(3, '0')}&nbsp;&nbsp;${(S.programs[n] || '').length} car.</div>`).join('')}</div>
        <div style="margin-top:1em" class="dim">▲▼ elige · ENTER abre · EXIT vuelve</div>`;
    } else if (pg === 'edit') {
      main.innerHTML = '';
      main.append(el('div', { html: `Programa&nbsp;&nbsp;${S.progNum}&nbsp;&nbsp;${S.code.trim() ? '' : '*PROG NUEVO*'}&nbsp;&nbsp;<span class="dim">${M.ins ? 'INS' : 'SOBRE'}</span>${M.shift ? ' <span class="inv">SHIFT</span>' : ''}` }), renderEditor());
    } else if (pg === 'auto' || pg === 'prueba') {
      main.innerHTML = '';
      gfx = buildGfx(); main.append(gfx.root); drawNow();
    } else if (pg === 'manual') {
      const tp = currentPos();
      if (M.mdi != null) {
        main.innerHTML = `${header('MDI')}<div class="big" style="margin:1em 0 0 .5em">ENTRADA MANUAL DE DATOS</div><div class="big" style="margin:.6em 0 0 .5em">&gt; ${esc(M.mdi)}<span class="cur">&nbsp;</span></div>
          <div style="margin:.6em 0 0 .5em">X ${es(tp.x, 4)}&nbsp;&nbsp;Z ${es(tp.z, 4)}</div><div class="dim" style="margin-top:.8em">Escribe un bloque (ej. G0 X50. Z5.) y pulsa el botón VERDE. EXIT sale del MDI.</div>`;
      } else
      main.innerHTML = `${header(M.refWait ? 'REFERENCIAR MAQUINA' : 'OPERACION MANUAL')}<div class="big" style="margin:1em 0 0 1em;line-height:1.4">
        <span class="${M.manual.axis === 'X' ? 'inv' : ''}">X ${es(tp.x, 4)}</span><br><span class="${M.manual.axis === 'Z' ? 'inv' : ''}">Z ${es(tp.z, 4)}</span><br>
        INCREMENTO ${es(M.manual.inc, 3)}<br>S ${Math.round((lastS() || 0) * S.ui.sOv / 100)} rpm ${M.spindle ? (M.spindle === 3 ? 'HORARIO' : 'ANTIHORARIO') : 'PARADO'}</div>
        <div class="dim" style="margin-top:.8em">${M.refWait ? 'AGUARDANDO INICIO: verifica que ninguna herramienta pueda chocar y pulsa el botón VERDE.' : (M.ref ? 'MAQUINA REFERENCIADA. ' : 'MAQUINA SIN REFERENCIAR: F5 REFER. MAQUINA. ') + 'F1/F2 eje · F3 incremento · selector − / + mueve'}</div>`;
    } else if (pg === 'refer') {
      const T = toolsMap();
      main.innerHTML = `<div class="hdr">REFERENCIA DE TRABAJO</div><div style="margin-top:.5em">HERR  TIPO        k2   rn    ANCHO</div>` +
        Object.values(T).map(t => `<div>T${String(t.num).padStart(2, '0')}${String(t.num).padStart(2, '0')}  ${(t.use || '').padEnd(10).replace(/ /g, '&nbsp;')}  ${t.k2 != null ? String(t.k2).padStart(3) : '  -'}  ${t.rn ? es(t.rn, 1) : ' - '}  ${t.w ? es(t.w, 1) : '-'}</div>`).join('') +
        `<div style="margin-top:.6em">CERO PIEZA G54: CARA DE LA BARRA (Z0)</div><div class="dim" style="margin-top:.4em">Edita la torreta en el Simulador completo → Herramientas.</div>`;
    } else if (pg === 'cargar') {
      main.innerHTML = `<div class="hdr">CARGAR / SALVAR</div><div style="margin:1em 0 0 1em;line-height:1.5">F1 CARGAR ARCHIVO (.nc .txt)<br>F2 SALVAR P${String(S.progNum).padStart(3, '0')}.NC<br>F3 PEGAR PROGRAMA<br>F4 PROGRAMA DE EJEMPLO DEL CURSO</div>`;
    } else if (pg === 'soporte') {
      const m = MACHINE;
      main.innerHTML = `<div class="hdr">SOPORTE</div><div style="margin-top:.5em;line-height:1.25">${m.model} · CONTROL ${m.control}<br>MOTOR ${m.motor.hp} HP ${m.motor.volts} ${m.motor.hz} HZ ${es(m.motor.amps, 1)} A<br>
        HUSILLO ${m.spindle.rpmMin}-${m.spindle.rpmMax} RPM · AGUJERO Ø${m.spindle.bore}<br>ALTURA DE PUNTA ${m.centerHeight} · ENTRE PUNTAS ${m.betweenCenters}<br>VOLTEO Ø${m.swing} · SOBRE CARRO Ø${m.swingOverCarriage}<br>
        CARRERA X ${m.travel.x} · Z ${m.travel.z}<br>RAPIDO ${m.rapid.x / 1000} M/MIN · TORRETA ${m.turret.model}<br>SIMULADOR EDUCATIVO · NO ES SOFTWARE DE ROMI</div>`;
    } else if (pg === 'errores') {
      const list = A ? A.msgs.filter(m => m.sev !== 'info') : [];
      M.errSel = Math.min(M.errSel, Math.max(0, list.length - 1));
      main.innerHTML = `<div class="hdr">MENSAJES DE ERROR</div><div style="margin-top:.4em">${list.length ? list.slice(Math.max(0, M.errSel - 6), M.errSel + 8).map((m) =>
        `<div class="${list.indexOf(m) === M.errSel ? 'inv' : ''}">${m.line ? 'FILA ' + m.line : 'PROG.'} ${m.sev === 'error' ? 'ERR' : 'AVI'} ${esc(m.code)}</div>`).join('') : 'SIN MENSAJES'}</div>
        <div class="dim" style="margin-top:.5em">▲▼ elige · ENTER va a la fila · EXIT vuelve</div>`;
    } else if (pg === 'ayuda') {
      main.innerHTML = `<div class="hdr">AYUDA</div><div style="margin-top:.4em;line-height:1.2">${HELP[M.prev] || HELP.modo}</div>`;
    } else if (pg === 'reposo') {
      main.innerHTML = `<div class="dim" style="margin-top:40%;text-align:center">REPOSO - PULSE UNA TECLA</div>`;
    }
    baseMsg(); updateSide(); fitFont();
    if (M.alarmBox) main.append(M.alarmBox);
    emit('m9render', M);
  }
  const HELP = {
    acceso: 'Escribe el código de acceso y ENTER.<br>► / ▲ cambian el grupo F10–F14.<br>F10 con EN MANDO conecta los ejes.<br>EXIT va al menú principal.',
    modo: 'F2 EDITOR: escribir programas.<br>F5 AUTO: ejecutar con gráfica.<br>F6 PRUEBA: probar el programa.<br>F7 MANUAL: mover los ejes.<br>F3 REFER. TRABAJO: herramientas.<br>F4 CARGAR/SALVAR: archivos.',
    edit: 'Letras y números escriben.<br>La máquina pone el espacio sola.<br>EOB o ▼ pasan al bloque siguiente.<br>◄ ► mueven el cursor y se escribe encima (INS = insertar).<br>SHIFT + número = símbolo.<br>BORRA borra un carácter.',
    auto: 'Verde: CYCLE START (todo el programa).<br>Naranja: un bloque por pulsación.<br>Rojo: CYCLE STOP.<br>F7/F8 ampliar/reducir · F9 ventana.<br>Perilla F: avance 0–140 %.',
    editor: 'Escribe el número de programa y ENTER.<br>F9 directorio · F4 programa nuevo.'
  };
  HELP.prueba = HELP.auto;

  /* ---------------- editor en el CRT ---------------- */
  const lines = () => S.code.split('\n');
  function renderEditor() {
    const L = lines(), marks = new Map();
    if (A) for (const m of A.msgs) if (m.line && (m.sev === 'error' || (m.sev === 'warn' && marks.get(m.line) !== 'error'))) marks.set(m.line, m.sev);
    const box = el('div', { class: 'ed', tabindex: 0 });
    const runLine = P.state !== 'idle' ? P.lastLine : null;
    L.forEach((t, i) => {
      const cls = ['ln', marks.get(i + 1) || '', i === M.cur.row ? 'sel' : '', runLine === i + 1 ? 'run' : ''].join(' ');
      let body = esc(t);
      if (i === M.cur.row) {
        const c = Math.min(M.cur.col, t.length);
        body = esc(t.slice(0, c)) + `<span class="c ${M.ins ? '' : 'ovr'}">${esc(t[c] || ' ')}</span>` + esc(t.slice(c + 1));
      }
      box.append(el('div', { class: cls, 'data-row': i, html: `<span class="n">${i + 1}</span><span>${body}${t.trim() ? '<span class="dim"> #</span>' : ''}</span>` }));
    });
    box.addEventListener('click', e => { const r = e.target.closest('.ln'); if (r) { M.cur.row = +r.dataset.row; M.cur.col = lines()[M.cur.row].length; render(); } });
    requestAnimationFrame(() => { const s = box.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); });
    return box;
  }
  function commit(L) { S.code = L.join('\n'); S.programs[S.progNum] = S.code; setCode(S.code, { from: 'mach9' }); render(); }
  function typeChar(ch) {
    const L = lines(); let t = L[M.cur.row] || ''; let c = Math.min(M.cur.col, t.length);
    // la máquina coloca el espacio automáticamente antes de una nueva función (clase, min 17:08)
    if (/[A-Z]/.test(ch) && c > 0 && /[0-9.]/.test(t[c - 1]) && !t.slice(0, c).trimStart().startsWith(';')) { t = t.slice(0, c) + ' ' + t.slice(c); c++; }
    if (M.ins || c >= t.length) t = t.slice(0, c) + ch + t.slice(c); else t = t.slice(0, c) + ch + t.slice(c + 1);
    L[M.cur.row] = t; M.cur.col = c + 1; commit(L);
  }
  function eob() {
    const L = lines(); const t = L[M.cur.row] || '';
    if (M.ins && M.cur.col < t.length) { L.splice(M.cur.row, 1, t.slice(0, M.cur.col).trimEnd(), t.slice(M.cur.col).trimStart()); }
    else if (M.cur.row >= L.length - 1 || L[M.cur.row + 1].trim()) { if (t.trim() || M.cur.row === L.length - 1) L.splice(M.cur.row + 1, 0, ''); }
    M.cur.row = Math.min(M.cur.row + 1, L.length - 1); M.cur.col = 0; commit(L);
  }
  function backspace() {
    const L = lines(); const t = L[M.cur.row] || '';
    if (M.cur.col > 0) { L[M.cur.row] = t.slice(0, M.cur.col - 1) + t.slice(M.cur.col); M.cur.col--; }
    else if (M.cur.row > 0) { const p = L[M.cur.row - 1]; M.cur.col = p.length; L.splice(M.cur.row - 1, 2, p + t); M.cur.row--; }
    commit(L);
  }
  function delBlock() { const L = lines(); if (L.length > 1) L.splice(M.cur.row, 1); else L[0] = ''; M.cur.row = Math.min(M.cur.row, L.length - 1); M.cur.col = 0; commit(L); }
  function moveCur(dr, dc) {
    const L = lines();
    if (dr) { M.cur.row = Math.max(0, Math.min(L.length - 1, M.cur.row + dr)); M.cur.col = Math.min(M.cur.col, L[M.cur.row].length); if (dr > 0 && M.cur.row === L.length - 1 && L[M.cur.row].trim() && false) eob(); }
    if (dc) {
      const t = L[M.cur.row]; M.cur.col += dc;
      if (M.cur.col < 0) { if (M.cur.row > 0) { M.cur.row--; M.cur.col = L[M.cur.row].length; } else M.cur.col = 0; }
      if (M.cur.col > t.length) { if (M.cur.row < L.length - 1) { M.cur.row++; M.cur.col = 0; } else M.cur.col = t.length; }
    }
    render();
  }
  const totalSize = () => Object.values(S.programs).reduce((a, s) => a + (s || '').length, 0);
  function openProgram(n) {
    S.programs[S.progNum] = S.code;
    S.progNum = n;
    if (S.programs[n] == null) S.programs[n] = '';
    M.cur = { row: 0, col: 0 }; M.progInput = '';
    setCode(S.programs[n], { from: 'mach9', now: true });
    gotoPage('edit');
  }

  /* ---------------- gráfica (AUTO / PRUEBA) ---------------- */
  function buildGfx() {
    const blk = el('div', { class: 'blk' }), cv = el('canvas'), read = el('div', { class: 'read' }), list = el('div', { class: 'list' });
    const root_ = el('div', { class: 'gfx' }, blk, cv, read, list);
    return { root: root_, blk, cv, read, list };
  }
  function drawNow() {
    if (!gfx || !A) return;
    const b = A.parsed.blocks;
    const curLine = P.lastLine;
    const bi = Math.max(0, b.findIndex(x => x.line === curLine));
    gfx.blk.textContent = b[bi] ? b[bi].code.replace(/\s+/g, '') : '';
    const tp = currentPos();
    const nLabel = P.state === 'idle' ? `${b.length} BLOQUES` : `N${bi + 1} CORRIENDO`;
    gfx.read.innerHTML = `<div>Z ${es(tp.z, 4)}<br>X ${es(tp.x, 4)}</div><div>S ${Math.round(curS() * S.ui.sOv / 100)}<br>F ${es(curF() * S.ui.fOv / 100, 3)}</div><div class="st"><span class="inv">${statusTxt()}</span><br>${nLabel}</div>`;
    if (M.gview.win === 1) {
      gfx.list.style.display = '';
      gfx.list.innerHTML = b.slice(Math.max(0, bi - 1), bi + 3).map((x, i) => `<div class="${x.line === curLine && P.state !== 'idle' ? 'run' : ''}">N${Math.max(0, bi - 1) + i + 1} ${esc(x.raw.trim())}</div>`).join('');
    } else gfx.list.style.display = 'none';
    drawGraph(gfx.cv, A, P, { view: M.gview, trail: M.trail, rapids: M.rapids, from: M.cleared ? M.trailFrom : -1, prot: M.gview.prot, pos: tp, win: M.gview.win });
  }
  const curF = () => { const m = toolPos(); return m && m.m && m.m.F ? m.m.F : 0; };
  const curS = () => { const m = toolPos(); return m && m.m && m.m.rpm ? m.m.rpm : 0; };
  const lastS = () => { if (!A) return 0; const b = [...A.parsed.blocks].reverse().find(x => x.w.S); return b ? b.w.S.v : 0; };
  function currentPos() {
    if (M.page === 'manual' || (P.state === 'idle' && !A)) return { x: M.manual.x, z: M.manual.z };
    const t = toolPos(); return t ? { x: t.x, z: t.z } : { x: M.manual.x, z: M.manual.z };
  }

  /* ---------------- lateral ---------------- */
  const steps = side.querySelector('.steps');
  function updateSide() {
    const st = P.state;
    dot.className = 'dot ' + (st === 'run' || st === 'block' ? 'run' : st === 'estop' ? 'estop' : st === 'hold' ? 'hold' : '');
    if (M.explain) explain.innerHTML = M.explain;
    else explain.innerHTML = '<span style="color:var(--muted)">Pulsa el botón <b style="color:#ffb74a">NARANJA</b> para ejecutar un bloque y ver aquí qué hace. El <b style="color:#5be38b">VERDE</b> corre todo el programa; el <b style="color:#ff6a5c">ROJO</b> lo detiene.</span>';
    const tp = currentPos();
    const tool = toolPos();
    dro.innerHTML = `<div><small>X (Ø)</small><b>${es(tp.x, 4)}</b></div><div><small>Z</small><b>${es(tp.z, 4)}</b></div>
      <div><small>Husillo</small><b>${Math.round(curS() * S.ui.sOv / 100)} rpm</b></div><div><small>Avance</small><b>${es(curF() * S.ui.fOv / 100, 3)}</b></div>
      <div><small>Herramienta</small><b>${tool && tool.tool ? 'T' + String(tool.tool).padStart(2, '0') : '—'}</b></div><div><small>Tiempo</small><b>${mmss(P.t)} / ${A ? mmss(A.run.total) : '—'}</b></div>
      <div><small>Override F / S</small><b>${S.ui.fOv} / ${S.ui.sOv} %</b></div><div><small>Ejes</small><b style="color:${M.axes ? 'var(--ok)' : 'var(--amber)'}">${M.axes ? 'EN MANDO' : 'DESCONECT.'}</b></div>`;
    progBar.style.width = A && A.run.total ? (100 * P.t / A.run.total).toFixed(1) + '%' : '0';
    const done = [M.access > 0, M.axes, M.visitedMode, M.ref, M.visitedEdit, M.visitedAuto];
    steps.innerHTML = ['Código de acceso + ENTER', '► hasta EN MANDO y F10 (conecta los ejes)', 'EXIT hasta la PÁGINA DE MODO', 'F7 MANUAL → F5 REFER. MAQUINA → VERDE', 'F2 EDITOR → número de programa → ENTER', 'F1 GRÁFICOS (o F5 AUTO) → VERDE o NARANJA']
      .map((t, i) => `<li style="${done[i] ? 'color:var(--ok)' : ''}">${done[i] ? '✔ ' : ''}${t}</li>`).join('');
    bGr.firstChild.classList.toggle('lit', st === 'run');
    bOr.firstChild.classList.toggle('lit', st === 'block' || (st === 'hold' && P.blockLine != null));
    bRed.firstChild.classList.toggle('lit', st === 'hold' && P.blockLine == null);
  }

  /* ---------------- navegación ---------------- */
  function gotoPage(p) {
    if (p !== 'ayuda' && p !== 'errores') M.prev = M.page === 'ayuda' || M.page === 'errores' ? M.prev : M.page;
    if (p === 'modo') M.visitedMode = true;
    if (p === 'edit') M.visitedEdit = true;
    if (p === 'auto' || p === 'prueba') M.visitedAuto = true;
    M.page = p; M.alarmBox = null; render();
  }
  function exit() {
    if (M.alarmBox) { M.alarmBox = null; M.pending = null; render(); return; }
    const back = { edit: 'editor', dir: 'editor', editor: 'modo', auto: 'modo', prueba: 'modo', manual: 'modo', refer: 'modo', cargar: 'modo', soporte: 'modo', reposo: 'modo', errores: M.prev, ayuda: M.prev, modo: 'modo' };
    if (M.page === 'acceso') { if (M.access) gotoPage('modo'); return; }
    if (M.page === 'manual' && (M.mdi != null || M.refWait)) { M.mdi = null; M.refWait = false; render(); return; }
    if ((M.page === 'auto' || M.page === 'prueba') && (P.state === 'run' || P.state === 'block')) { toast('Detén el ciclo (rojo) antes de salir.'); return; }
    gotoPage(back[M.page] || 'modo');
  }
  function alarm(text, lines_, onYes) {
    M.pending = onYes;
    M.alarmBox = el('div', { class: 'alarmbox', style: { position: 'absolute', left: '4%', right: '4%', top: '22%', zIndex: 3, background: '#031007' },
      html: `<span class="inv">ALARMA</span> ${esc(text)}<br>${lines_}` });
    render();
  }

  /* ---------------- ejecución ---------------- */
  function canRun() {
    if (P.state === 'estop') { toast('Suelta la parada de emergencia (gírala) para continuar.'); return false; }
    if (!M.axes) { setMsg('EJES DESCONECTADOS'); M.alarm = 'EJES DESCONECTADOS'; toast('Ejes desconectados: busca EN MANDO con ► y pulsa F10.'); return false; }
    if (M.chuckInv) { setMsg('PLATO EN MODO EXTERNO'); toast('El plato está en modo externo/invertido (clase, 36:30): ► hasta PLATO EXTERNO y pulsa su tecla para volver al modo normal.'); return false; }
    if (!M.ref) { toast('La máquina no está referenciada: MANUAL (F7) → F5 REFER. MAQUINA → botón verde.'); setMsg('MAQUINA NO REFERENCIADA'); return false; }
    if (M.page !== 'auto' && M.page !== 'prueba') { gotoPage('auto'); }
    return true;
  }
  function withErrorsCheck(fn) {
    if (A && A.errors && !M.errorsOk) {
      alarm(`PROGRAMA CON ${A.errors} ERROR${A.errors > 1 ? 'ES' : ''}`, 'ENTER = SIMULAR DE TODAS FORMAS<br>EXIT = CANCELAR Y REVISAR (panel de abajo)', () => { M.errorsOk = true; fn(); });
      return;
    }
    fn();
  }
  function green() {
    if (M.page === 'manual' && M.refWait) return doReference();
    if (M.page === 'manual' && M.mdi != null) return runMDI();
    if (!canRun()) return;
    withErrorsCheck(() => { M.explain = null; if (cycleStart()) emit('cycle', 'start'); render(); });
  }
  function orange() {
    if (!canRun()) return;
    withErrorsCheck(() => {
      if (P.state === 'run') stop();
      const b = stepBlock();
      if (!b) { M.explain = '<b>Fin del programa.</b> Pulsa el verde o el naranja para empezar de nuevo.'; render(); return; }
      const st = modalStates(A.parsed.blocks)[A.parsed.blocks.indexOf(b)];
      const n = A.parsed.blocks.indexOf(b) + 1;
      const issues = A.msgs.filter(m => m.line === b.line && m.sev !== 'info');
      M.explain = `<div class="run">N${n} corriendo · Fila ${b.line}</div><code>${esc(b.raw.trim())}</code><p style="margin:.4em 0 0">${esc(describeBlock(b, st) || 'Bloque sin movimiento.')}</p>` +
        issues.map(m => `<p style="margin:.3em 0 0;color:${m.sev === 'error' ? '#ff8a80' : '#ffd27a'}">⚠ ${esc(m.code)}: ${esc(m.effect)}</p>`).join('');
      render();
    });
  }
  // CYCLE STOP: una vez detiene; dos veces seguidas aborta el programa (clase, min 37:00)
  function red() {
    const now = performance.now();
    if (M.lastStop && now - M.lastStop < 1600 && (P.state === 'hold' || P.state === 'done')) {
      resetPlayer(); M.explain = '<b>Programa abortado</b> (CYCLE STOP dos veces). El próximo START empieza desde el primer bloque.'; M.lastStop = 0; toast('Programa abortado.');
    } else { stop(); M.lastStop = now; }
    emit('cycle', 'stop'); render();
  }
  function doReference() {
    if (!M.axes) { toast('Ejes desconectados.'); return; }
    M.refWait = false; toast('Referenciando: los ejes van hasta su fin de carrera…');
    const from = { x: M.manual.x, z: M.manual.z }, to = { x: 200, z: 150 }, t0 = performance.now();
    const anim = now => { const f = Math.min(1, (now - t0) / 1600), e = f * f * (3 - 2 * f);
      M.manual.x = from.x + (to.x - from.x) * e; M.manual.z = from.z + (to.z - from.z) * e; emit('manual', M.manual); render();
      if (f < 1) requestAnimationFrame(anim); else { M.ref = true; emit('ref', true); toast('Máquina referenciada. Ya puedes simular (F5 AUTO).'); render(); } };
    requestAnimationFrame(anim);
  }
  function runMDI() {
    if (!M.axes) { toast('Ejes desconectados.'); return; }
    const t = M.mdi.toUpperCase(); const x = /X(-?\d*\.?\d+)/.exec(t), z = /Z(-?\d*\.?\d+)/.exec(t);
    if (!x && !z) { toast('El bloque MDI necesita X o Z.'); return; }
    const val = m => m[1].includes('.') ? parseFloat(m[1]) : parseFloat(m[1]) / 1000;
    const from = { x: M.manual.x, z: M.manual.z }, to = { x: x ? val(x) : from.x, z: z ? val(z) : from.z }, t0 = performance.now();
    const dur = Math.min(2500, 300 + 8 * Math.hypot(to.x - from.x, to.z - from.z));
    const anim = now => { const f = Math.min(1, (now - t0) / dur);
      M.manual.x = from.x + (to.x - from.x) * f; M.manual.z = from.z + (to.z - from.z) * f; emit('manual', M.manual); render(); if (f < 1) requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
  }

  /* ---------------- teclas ---------------- */
  function press(k) {
    if (M.page === 'reposo') { gotoPage('modo'); return; }
    if (M.alarmBox) { if (k === 'ENTER') { const f = M.pending; M.alarmBox = null; M.pending = null; render(); if (f) f(); } else if (k === 'EXIT') exit(); return; }
    if (k === 'SHIFT') { M.shift = !M.shift; m9.classList.toggle('shift-on', M.shift); render(); return; }
    if (k === 'GUP') { M.group = (M.group + BOTTOM.length - 1) % BOTTOM.length; render(); return; }
    if (k === 'GRIGHT') { M.group = (M.group + 1) % BOTTOM.length; render(); return; }
    if (k === 'EXIT') return exit();
    if (k === 'HELP') return gotoPage(M.page === 'ayuda' ? M.prev : 'ayuda');
    if (k === 'ERR') return gotoPage(M.page === 'errores' ? M.prev : 'errores');
    if (/^F1[0-4]$/.test(k)) return bottomKey(BOTTOM[M.group][+k.slice(1) - 10]);
    if (k === 'ZIN' || k === 'ZOUT') {
      if (gfx) { M.gview.zoom *= k === 'ZIN' ? 1.25 : 0.8; drawNow(); }
      else { M.fsize = Math.max(0.7, Math.min(1.6, M.fsize * (k === 'ZIN' ? 1.1 : 0.91))); fitFont(); }
      return;
    }
    const pg = M.page;
    if (pg === 'acceso') {
      if (/^[A-Z0-9]$/.test(k)) { if (M.code.length < 8) M.code += k; render(); }
      else if (k === 'BS') { M.code = M.code.slice(0, -1); render(); }
      else if (k === 'ENTER') { if (M.code) { M.access = 2; M.code = ''; render(); toast('Acceso nivel 2: ya puedes programar. Ahora conecta los ejes (EN MANDO).'); } }
      return;
    }
    if (pg === 'modo') {
      const map = { F1: 'reposo', F2: 'editor', F3: 'refer', F4: 'cargar', F5: 'auto', F6: 'prueba', F7: 'manual', F9: 'soporte' };
      if (map[k]) gotoPage(map[k]);
      return;
    }
    if (pg === 'editor') {
      if (/^[0-9]$/.test(k)) { if (M.progInput.length < 3) M.progInput += k; render(); }
      else if (k === 'P') { /* el docente escribe "P11": la P es opcional */ }
      else if (k === 'BS') { M.progInput = M.progInput.slice(0, -1); render(); }
      else if (k === 'ENTER') { openProgram(M.progInput ? +M.progInput : S.progNum); }
      else if (k === 'F2') openProgram(S.progNum);
      else if (k === 'F4') { const n = Math.max(0, ...Object.keys(S.programs).map(Number)) + 1; openProgram(n); }
      else if (k === 'F5') { const ks = Object.keys(S.programs).map(Number).sort((a, b) => a - b); openProgram(ks[(ks.indexOf(S.progNum) + 1) % ks.length]); }
      else if (k === 'F6') { renumber(); }
      else if (k === 'F7') { modal('Limpiar programa', el('p', null, `¿Borrar todo el contenido del programa P${String(S.progNum).padStart(3, '0')}?`), [{ label: 'Cancelar', value: false }, { label: 'Borrar', cls: 'danger', value: true }])
        .then(ok => { if (ok) { S.programs[S.progNum] = ''; setCode('', { now: true }); render(); } }); }
      else if (k === 'F8') { modal('Limpiar todo', el('p', null, '¿Borrar TODOS los programas del directorio?'), [{ label: 'Cancelar', value: false }, { label: 'Borrar todo', cls: 'danger', value: true }])
        .then(ok => { if (ok) { S.programs = { 1: '' }; S.progNum = 1; setCode('', { now: true }); render(); } }); }
      else if (k === 'F9') gotoPage('dir');
      return;
    }
    if (pg === 'dir') {
      const nums = Object.keys(S.programs).map(Number).sort((a, b) => a - b);
      if (k === 'CU' || k === 'PGUP') { M.dirSel = Math.max(0, M.dirSel - 1); render(); }
      else if (k === 'CD' || k === 'PGDN' || k === 'F9') { M.dirSel = Math.min(nums.length - 1, M.dirSel + 1); render(); }
      else if (k === 'ENTER') openProgram(nums[M.dirSel]);
      return;
    }
    if (pg === 'edit') {
      if (k === 'F1') return gotoPage('auto');
      if (k === 'F8' || k === 'DELB') return delBlock();
      if (k === 'F9') return gotoPage('errores');
      if (k === 'INS') { M.ins = !M.ins; render(); return; }
      if (k === 'EOB' || k === 'ENTER') return eob();
      if (k === 'BS') return backspace();
      if (k === 'SPACE') return M.shift ? (M.shift = false, m9.classList.remove('shift-on'), backspace()) : typeChar(' ');
      if (k === 'CU') return moveCur(-1, 0); if (k === 'CD') return moveCur(1, 0);
      if (k === 'CL') return moveCur(0, -1); if (k === 'CR') return moveCur(0, 1);
      if (k === 'PGUP') return moveCur(-10, 0); if (k === 'PGDN') return moveCur(10, 0);
      if (/^[A-Z]$/.test(k)) return typeChar(k);
      if (/^[0-9.\-]$/.test(k)) {
        if (M.shift && SHIFT_SYM[k]) { M.shift = false; m9.classList.remove('shift-on'); return typeChar(SHIFT_SYM[k]); }
        return typeChar(k);
      }
      return;
    }
    if (pg === 'auto' || pg === 'prueba') {
      if (k === 'F1') { M.trailFrom = P.mi; M.cleared = true; drawNow(); toast('Gráfica limpia.'); }
      else if (k === 'F2') { M.rapids = !M.rapids; drawNow(); toast(M.rapids ? 'Rápidos visibles (punteados).' : 'Rápidos ocultos.'); }
      else if (k === 'F3') { M.gview.prot = !M.gview.prot; drawNow(); }
      else if (k === 'F5') { M.gview.limits = true; drawNow(); toast('LÍMITES: aparece el cuadro. Pulsa F4 CERRAR para ajustar la pieza a la ventana.'); }
      else if (k === 'F4') { M.gview.zoom = 1; M.gview.pan = null; M.gview.limits = false; drawNow(); }
      else if (k === 'F7') { M.gview.zoom *= 1.25; drawNow(); }
      else if (k === 'F8') { M.gview.zoom *= 0.8; drawNow(); }
      else if (k === 'F9') { M.gview.win = M.gview.win % 3 + 1; SOFT.auto[8] = 'VENT. ' + M.gview.win; if (M.gview.win !== 1) toast(`Ventana ${M.gview.win}: ${M.gview.win === 2 ? 'solo líneas' : 'no se ve la pieza'}. El docente pide usar VENT. 1.`); render(); }
      else if (k === 'CL' || k === 'CR' || k === 'CU' || k === 'CD') { const d = 12 / M.gview.zoom; M.gview.pan = M.gview.pan || { z: 0, r: 0 }; if (k === 'CL') M.gview.pan.z -= d; if (k === 'CR') M.gview.pan.z += d; if (k === 'CU') M.gview.pan.r += d; if (k === 'CD') M.gview.pan.r -= d; drawNow(); }
      else if (k === 'ENTER') green();
      return;
    }
    if (pg === 'manual') {
      if (M.mdi != null) {
        if (/^[A-Z0-9.\-]$/.test(k)) { if (/[A-Z]/.test(k) && /[0-9.]$/.test(M.mdi)) M.mdi += ' '; M.mdi += k; }
        else if (k === 'SPACE') M.mdi += ' '; else if (k === 'BS') M.mdi = M.mdi.slice(0, -1); else if (k === 'ENTER') runMDI();
        render(); return;
      }
      if (k === 'F1') M.manual.axis = 'X'; else if (k === 'F2') M.manual.axis = 'Z';
      else if (k === 'F4') M.mdi = '';
      else if (k === 'F5') { if (!M.axes) toast('Ejes desconectados: conecta EN MANDO primero.'); else M.refWait = true; }
      else if (k === 'F3') { const s = [0.01, 0.1, 1, 10]; M.manual.inc = s[(s.indexOf(M.manual.inc) + 1) % s.length]; }
      render(); return;
    }
    if (pg === 'cargar') {
      if (k === 'F1') openFile(); else if (k === 'F2') download(`P${String(S.progNum).padStart(3, '0')}.nc`, S.code);
      else if (k === 'F3') pasteProgram(); else if (k === 'F4') emit('example');
      return;
    }
    if (pg === 'errores') {
      const list = A ? A.msgs.filter(m => m.sev !== 'info') : [];
      if (k === 'CU') { M.errSel = Math.max(0, M.errSel - 1); render(); }
      else if (k === 'CD') { M.errSel = Math.min(list.length - 1, M.errSel + 1); render(); }
      else if (k === 'ENTER' && list[M.errSel] && list[M.errSel].line) goRow(list[M.errSel].line);
    }
  }
  function bottomKey(name) {
    if (!name) return;
    if (name === 'EN MANDO') {
      if (!M.access) { toast('Primero ingresa el código de acceso.'); return; }
      M.axes = true; M.alarm = null; toast('Ejes conectados (servomotores energizados). Pulsa EXIT para ir al menú.'); emit('axes', true);
    } else if (name === 'SUEL/PREN PIEZA') {
      if (P.state === 'run' || P.state === 'block') { toast('No se puede soltar la pieza con el ciclo en marcha.'); return; }
      M.chuck = !M.chuck; emit('chuck', M.chuck); toast(M.chuck ? 'Pieza presa: garras cerradas.' : 'Pieza suelta: garras abiertas.');
    } else if (name === 'MOV. HUS HORARIO' || name === 'MOV. HUS ANTIHOR') {
      const d = name.endsWith('HORARIO') ? 3 : 4; M.spindle = M.spindle === d ? 0 : d; emit('spindle', M.spindle);
    } else if (name === 'REFRIG. MANUAL' || name === 'REFRIG. AUTOMAT.') { M.coolant = !M.coolant; emit('coolant', M.coolant); }
    else if (name === 'AVAN/RETR PINOLA' || name === 'AVANCA B. CONTRAPUN' || name === 'RETROCED. CONTRAPUN') { M.quill = name === 'RETROCED. CONTRAPUN' ? false : name === 'AVANCA B. CONTRAPUN' ? true : !M.quill; emit('quill', M.quill); }
    else if (name === 'PLATO EXTERNO') { M.chuckInv = !M.chuckInv; toast(M.chuckInv ? 'Plato en modo EXTERNO (invertido): así la pieza no queda bien sujeta.' : 'Plato en modo normal.'); }
    else if (name === 'INCREM. AVANCE') setOverride('F', S.ui.fOv + 10);
    else if (name === 'DECREM. AVANCE') setOverride('F', S.ui.fOv - 10);
    else toast(`${name}: opción no instalada en esta máquina (es la versión básica).`);
    render();
  }
  function renumber() {
    let n = 0; const L = lines().map(t => { const s = t.replace(/^\s*N\d+\s*/i, ''); return s.trim() && !s.trim().startsWith(';') ? `N${++n} ${s}` : s; });
    commit(L); toast('Programa renumerado.');
  }
  function goRow(line) {
    M.cur.row = Math.max(0, line - 1); M.cur.col = 0;
    if (!M.access) { M.access = 2; }
    gotoPage('edit');
  }

  /* ---------------- perillas ---------------- */
  function knobSet(k, v) {
    const c = k._cfg; v = Math.max(c.min, Math.min(c.max, Math.round(v / c.step) * c.step)); c.val = v;
    const frac = (v - c.min) / (c.max - c.min);
    k.style.setProperty('--a', (-135 + 270 * frac) + 'deg');
    k.querySelector('.cap').style.transform = `rotate(${-135 + 270 * frac}deg)`;
    k.querySelector('.val').textContent = k === kSel ? `vel. ×${es(Math.pow(2, v - 3), v < 3 ? 2 : 0)}` : v + ' %';
    k.setAttribute('aria-valuenow', v);
    return v;
  }
  function drawScale(k, labels) {
    const sc = k.querySelector('.scale'); const W = k.offsetWidth || 84;
    sc.innerHTML = labels.map((l, i) => { const a = (-135 + 270 * i / (labels.length - 1)) * Math.PI / 180; const r = W / 2 - 3;
      return `<span style="position:absolute;left:${W / 2 + Math.sin(a) * r}px;top:${W / 2 - Math.cos(a) * r}px;transform:translate(-50%,-50%);font:600 8px var(--mono);color:#d8dcde">${l}</span>`; }).join('');
  }
  function setOverride(which, v) {
    if (which === 'F') { S.ui.fOv = knobSet(kF, v); } else if (which === 'S') { S.ui.sOv = knobSet(kS, v); } else { S.ui.speed = knobSet(kSel, v); }
    save(); emit('override', S.ui); updateSide(); if (gfx) drawNow();
  }
  function knobInput(k, which) {
    let start = null;
    k.addEventListener('pointerdown', e => { k.setPointerCapture(e.pointerId); start = { y: e.clientY, x: e.clientX, v: k._cfg.val, moved: false }; });
    k.addEventListener('pointermove', e => {
      if (!start) return; const d = (e.clientX - start.x) - (e.clientY - start.y);
      if (Math.abs(d) > 4) start.moved = true;
      if (start.moved) setOverride(which, start.v + Math.round(d / 14) * k._cfg.step);
    });
    k.addEventListener('pointerup', e => {
      if (start && !start.moved) { const r = k.getBoundingClientRect(); setOverride(which, k._cfg.val + (e.clientX < r.left + r.width / 2 ? -1 : 1) * k._cfg.step); if (which === 'SEL') selectorStep(e.clientX < r.left + r.width / 2 ? -1 : 1); }
      start = null;
    });
    k.addEventListener('wheel', e => { e.preventDefault(); setOverride(which, k._cfg.val + (e.deltaY < 0 ? 1 : -1) * k._cfg.step); }, { passive: false });
    k.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setOverride(which, k._cfg.val + k._cfg.step); if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setOverride(which, k._cfg.val - k._cfg.step); });
  }
  // en MANUAL el selector − / + mueve el eje elegido
  function selectorStep(dir) {
    if (M.page !== 'manual') return;
    if (!M.axes) { toast('Ejes desconectados.'); return; }
    if (M.manual.axis === 'X') M.manual.x = Math.max(0, M.manual.x + dir * M.manual.inc); else M.manual.z = M.manual.z + dir * M.manual.inc;
    emit('manual', M.manual); render();
  }
  knobInput(kF, 'F'); knobInput(kS, 'S'); knobInput(kSel, 'SEL');
  requestAnimationFrame(() => {
    drawScale(kF, [0, 20, 40, 60, 80, 100, 120, 140]); drawScale(kS, [50, 60, 70, 80, 90, 100, 110, 120]); drawScale(kSel, ['−', '', '', '', '', '', '+']);
    knobSet(kF, S.ui.fOv); knobSet(kS, S.ui.sOv); knobSet(kSel, S.ui.speed);
  });

  /* ---------------- eventos de entrada ---------------- */
  m9.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    b.classList.add('dn'); setTimeout(() => b.classList.remove('dn'), 90);
    if (navigator.vibrate) navigator.vibrate(8);
    press(b.dataset.k);
  });
  secs.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; m9.dataset.sec = b.dataset.s; secs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  estop.onclick = () => { const on_ = !estop.classList.contains('on'); estop.classList.toggle('on', on_); emergency(on_); M.alarm = on_ ? 'EMERGENCIA ACTIVADA' : null; emit('estop', on_); if (on_) toast('PARADA DE EMERGENCIA: todo se detuvo. Pulsa otra vez para liberarla.'); render(); };
  bGr.querySelector('button').onclick = green;
  bOr.querySelector('button').onclick = orange;
  bRed.querySelector('button').onclick = red;

  // teclado físico (PC)
  const KEYMAP = { Enter: 'ENTER', Backspace: 'BS', Escape: 'EXIT', ArrowUp: 'CU', ArrowDown: 'CD', ArrowLeft: 'CL', ArrowRight: 'CR', Insert: 'INS', PageUp: 'PGUP', PageDown: 'PGDN', ' ': 'SPACE', Delete: 'DELB' };
  document.addEventListener('keydown', e => {
    if (S.ui.screen !== 'mach9' || document.querySelector('.modal') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let k = KEYMAP[e.key];
    if (!k && /^F([1-9]|1[0-4])$/.test(e.key)) k = e.key;
    if (!k && e.key.length === 1) {
      const ch = e.key.toUpperCase();
      if (/^[A-Z0-9.\-]$/.test(ch)) k = ch;
      else if (M.page === 'edit' && /^[;#()=*/<>%+,]$/.test(ch)) { e.preventDefault(); typeChar(ch); return; }
    }
    if (!k) return;
    e.preventDefault();
    const b = m9.querySelector(`[data-k="${CSS.escape(k)}"]`); if (b) { b.classList.add('dn'); setTimeout(() => b.classList.remove('dn'), 90); }
    press(k);
  });

  /* ---------------- archivos ---------------- */
  async function pasteProgram() {
    const ta = el('textarea', { placeholder: 'Pega aquí tu programa (un bloque por fila)…', spellcheck: 'false' });
    try { const t = await navigator.clipboard.readText(); if (t && /[GMXZ]\s*-?\d/i.test(t)) ta.value = t; } catch (e) { /* sin permiso de portapapeles */ }
    const ok = await modal('Pegar programa', ta, [{ label: 'Cancelar', value: false }, { label: 'Cargar en P' + String(S.progNum).padStart(3, '0'), cls: 'pri', value: true }]);
    if (ok && ta.value.trim()) loadText(ta.value);
  }
  async function openFile() { const f = await pickFile('.nc,.txt,.tap,.cnc,.gcode,.mpf,text/plain'); if (f) { loadText(f.text); toast(`Abierto: ${f.name}`); } }
  function loadText(t) { setCode(t.replace(/\r\n?/g, '\n').replace(/#\s*$/gm, '').trimEnd() + '\n', { now: true }); S.programs[S.progNum] = S.code; M.cur = { row: 0, col: 0 }; M.errorsOk = false; render(); }
  on('loadtext', loadText);

  /* ---------------- suscripciones ---------------- */
  on('player', () => { if (P.state === 'idle') M.cleared = false; });
  on('analysis', () => { M.errorsOk = false; if (M.page === 'edit' || M.page === 'errores') render(); else if (gfx) drawNow(); else updateSide(); });
  on('frame', () => { if (gfx) drawNow(); else if (M.page === 'edit') { /* resalta la fila en ejecución */ } updateSide(); });
  on('player', () => { if (gfx) drawNow(); updateSide(); if (M.page === 'edit') render(); });
  on('line', () => { if (M.page === 'edit') render(); });
  on('goto', line => { emit('screen', 'mach9'); goRow(line); });
  on('fkey', k => press(k));       // teclas F desde otra pantalla (no usado por defecto)
  on('cycleKey', w => (w === 'start' ? green : w === 'block' ? orange : red)());
  on('mach9state', fn => fn(M));
  // preparación rápida (desde el simulador 3D): acceso, EN MANDO y referencia
  on('quickprep', () => {
    if (!M.access) M.access = 2;
    M.axes = true; M.alarm = null; M.visitedMode = true; emit('axes', true);
    const back = M.page === 'acceso' || M.page === 'manual' ? 'modo' : M.page;
    M.page = 'manual'; M.refWait = true; doReference();
    setTimeout(() => { M.page = back; render(); }, 1750);
    toast('Acceso nivel 2 · EN MANDO · referenciando la máquina…');
  });

  render();
  return { M, press, green, orange, red };
}
