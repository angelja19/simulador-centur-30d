// Generador de programa (CAM del HTML original) con F y S separados, G96/G92 y roscas ISO.
import { el, modal, toast } from './dom.js';
import { S, emit, save, toolsMap, material } from '../state.js';
import { cam, ISO_THREADS, MACHINE } from '../core/index.js';

export async function openCamDialog() {
  const c = S.cam, st = S.stock, mat = material();
  const num = (id, label, val, step = 'any') => el('label', { class: 'field' }, label, el('input', { id, type: 'number', step, value: val, inputmode: 'decimal' }));
  const prof = el('textarea', { id: 'cProf', spellcheck: 'false', style: { minHeight: '150px' } }); prof.value = S.profileText;
  const thrSel = el('select', { id: 'cIso' }, ISO_THREADS.map(t => el('option', { value: t.name, selected: t.name === c.thread.iso }, `${t.name} · paso ${String(t.p).replace('.', ',')} · Ø fondo ${String(t.dMin).replace('.', ',')}`)));
  const body = el('div', null,
    el('p', { style: { color: 'var(--muted)', margin: '0 0 10px' } }, `Barra: ${st.material} Ø${String(st.barD).replace('.', ',')} × ${st.barLen} mm (cámbiala en Simulador → Cargar pieza). Vc sugerida para ${st.material}: desbaste ${mat.vcR}, acabado ${mat.vcF} m/min.`),
    el('label', { class: 'field' }, 'Perfil final (de Z0 hacia el plato, con G1/G2/G3, cotas con punto)', prof),
    el('div', { class: 'grid2', style: { marginTop: '10px' } },
      num('cAp', 'Profundidad ap (mm, en X)', S.ap), num('cFr', 'F desbaste (mm/v)', c.Fr), num('cSr', 'S desbaste (rpm)', c.Sr, 10),
      num('cFf', 'F acabado (mm/v)', c.Ff), num('cSf', 'S acabado (rpm)', c.Sf, 10), num('cFace', 'Sobremetal de refrentado (mm)', st.faceStock)),
    el('label', { class: 'field', style: { marginTop: '10px', flexDirection: 'row', display: 'flex', gap: '8px', alignItems: 'center' } }, el('input', { id: 'cCss', type: 'checkbox', checked: c.css }), 'Usar velocidad de corte constante G96 con límite G92 (desbaste y acabado)'),
    el('div', { class: 'grid2' }, num('cVr', 'Vc desbaste (m/min)', c.VcR || mat.vcR, 5), num('cVf', 'Vc acabado (m/min)', c.VcF || mat.vcF, 5), num('cSmax', 'G92 límite (rpm)', c.Smax, 50)),
    el('label', { class: 'field', style: { marginTop: '10px', flexDirection: 'row', display: 'flex', gap: '8px', alignItems: 'center' } }, el('input', { id: 'cThr', type: 'checkbox', checked: c.thread.on }), 'Rosca exterior ISO (G33, pasadas decrecientes)'),
    el('div', { class: 'grid2' }, el('label', { class: 'field' }, 'Rosca', thrSel), num('cZs', 'Z inicio', c.thread.zStart), num('cZe', 'Z final', c.thread.zEnd)),
    el('div', { id: 'cOut' }));
  const ok = await modal('Generar programa desde un perfil', body, [{ label: 'Cancelar', value: false }, { label: 'Generar y cargar', cls: 'pri', value: true }]);
  if (!ok) return;
  const v = id => parseFloat(body.querySelector('#' + id).value);
  const iso = ISO_THREADS.find(t => t.name === thrSel.value);
  Object.assign(c, { Fr: v('cFr'), Sr: v('cSr'), Ff: v('cFf'), Sf: v('cSf'), css: body.querySelector('#cCss').checked, VcR: v('cVr'), VcF: v('cVf'), Smax: Math.min(MACHINE.spindle.rpmMax, v('cSmax')),
    thread: { on: body.querySelector('#cThr').checked, iso: thrSel.value, zStart: v('cZs'), zEnd: v('cZe') } });
  S.ap = v('cAp'); st.faceStock = v('cFace'); S.profileText = prof.value;
  const T = toolsMap(), pick = use => { const t = Object.values(T).find(x => x.use === use); return t ? String(t.num).padStart(2, '0').repeat(2) : '0101'; };
  const blade = Object.values(T).find(t => t.type === 'blade') || { w: 3, ref: 'der' };
  const res = cam({ name: 'PIEZA', profileText: prof.value, barD: st.barD, ap: S.ap, F: c.Fr, S: c.Sr, Ff: c.Ff, Sf: c.Sf, faceStock: st.faceStock, dec: S.maxDec,
    css: c.css ? { vcR: c.VcR, vcF: c.VcF, smax: c.Smax } : null,
    tools: { rough: pick('Desbaste'), finish: pick('Acabado'), thread: pick('Roscado'), part: pick('Tronzado') }, blade: { w: blade.w || 3, ref: blade.ref || 'der' },
    thread: c.thread.on && iso ? { on: true, dMaj: iso.dMaj, dMin: iso.dMin, pitch: iso.p, zStart: c.thread.zStart, zEnd: c.thread.zEnd } : { on: false } });
  save();
  if (res.rep.errors.length) { modal('No se pudo generar', el('div', { class: 'note e' }, res.rep.errors.join('\n')), [{ label: 'Cerrar' }]); return; }
  emit('loadtext', res.text);
  toast(`Programa generado: ${res.rep.stats.lines} bloques${res.rep.warnings.length ? ' · ' + res.rep.warnings.length + ' aviso(s)' : ''}.`, 5000);
}
