// Panel de errores (abajo, en las dos pantallas)
import { el, esc } from './dom.js';
import { on, emit } from '../state.js';

export function mountErrors(root) {
  const head = el('div', { class: 'errhead', role: 'button', tabindex: 0, 'aria-label': 'Mostrar u ocultar el panel de errores' });
  const list = el('div', { class: 'errlist' });
  root.append(head, list);
  let land;
  const toggle = () => { root.classList.toggle('min'); if (!land.matches) document.documentElement.style.setProperty('--errh', root.classList.contains('min') ? '40px' : ''); };
  head.onclick = toggle; head.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  let simMsgs = [];
  land = matchMedia('(max-height: 520px) and (orientation: landscape)');
  if (land.matches) root.classList.add('min');
  land.addEventListener('change', e => { root.classList.toggle('min', e.matches); document.documentElement.style.removeProperty('--errh'); });

  function render(A) {
    const all = A.msgs.concat(simMsgs);
    const ne = all.filter(m => m.sev === 'error').length, nw = all.filter(m => m.sev === 'warn').length;
    head.innerHTML = `<h3>REVISIÓN DEL PROGRAMA</h3>
      ${ne ? `<span class="chip e">${ne} ERROR${ne > 1 ? 'ES' : ''}</span>` : ''}
      ${nw ? `<span class="chip w">${nw} AVISO${nw > 1 ? 'S' : ''}</span>` : ''}
      ${!ne && !nw ? '<span class="chip ok">SIN ERRORES</span>' : ''}
      <span class="sp"></span><small style="color:var(--muted)">${A.parsed.blocks.length} bloques</small>
      <svg class="chev" width="18" height="18" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;
    list.innerHTML = '';
    if (!all.length) {
      list.append(el('div', { class: 'err ok' }, el('div', { class: 'h' }, el('span', { class: 'alarm' }, 'PROGRAMA SIN ERRORES')),
        el('p', null, 'Sintaxis, lógica y física revisadas: sin colisiones, dentro de los límites de la máquina y con pasadas dentro de ap.')));
      return;
    }
    for (const m of all) {
      const sevTxt = m.sev === 'error' ? 'ERROR' : m.sev === 'warn' ? 'AVISO' : 'INFO';
      const card = el('div', { class: 'err ' + m.sev },
        el('div', { class: 'h' },
          el('span', { class: 'sev' }, sevTxt),
          m.line ? el('span', { class: 'row' }, `Fila ${m.line}:`) : el('span', { class: 'row' }, m.src === 'sim' ? 'Simulación 3D:' : 'Programa:'),
          m.raw ? el('code', null, m.raw) : null,
          el('span', { class: 'alarm' }, m.code)),
        el('p', { html: esc(m.text) }),
        el('p', { html: `<b>Por qué:</b> ${esc(m.why)}` }),
        el('p', { html: `<b>En la máquina real:</b> ${esc(m.effect)}` }),
        m.fix ? el('p', { html: `<b>Cómo corregir:</b> ${esc(m.fix)}` }) : null,
        m.line ? el('button', { class: 'tbtn go', onclick: () => emit('goto', m.line) }, '↪ Ir a la fila ' + m.line) : null);
      list.append(card);
    }
  }
  let last = null;
  on('analysis', A => { simMsgs = []; last = A; render(A); });
  on('simmsgs', msgs => { simMsgs = msgs; if (last) render(last); });
}
