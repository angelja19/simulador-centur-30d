// Pequeñas utilidades de DOM
export function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const es = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',').replace(/^-(0,0*)$/, '$1') : '—';
export const mmss = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

let tt = 0;
export function toast(text, ms = 3200) {
  let t = document.querySelector('.toast');
  if (!t) { t = el('div', { class: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = text; t.hidden = false;
  clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, ms);
}

export function modal(title, body, actions) {
  return new Promise(res => {
    const close = v => { m.remove(); document.removeEventListener('keydown', kd); res(v); };
    const kd = e => { if (e.key === 'Escape') close(null); };
    const box = el('div', { class: 'box', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, el('h2', null, title), body,
      el('div', { class: 'acts' }, actions.map(a => el('button', { class: 'btn ' + (a.cls || ''), onclick: () => close(a.value !== undefined ? a.value : a.label) }, a.label))));
    const m = el('div', { class: 'modal', onclick: e => { if (e.target === m) close(null); } }, box);
    document.body.append(m); document.addEventListener('keydown', kd);
    const f = box.querySelector('textarea, input, .btn.pri'); if (f) setTimeout(() => f.focus(), 30);
  });
}

export function download(name, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function pickFile(accept) {
  return new Promise(res => {
    const i = el('input', { type: 'file', accept, style: { display: 'none' } });
    i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res({ name: f.name, text: r.result }); r.readAsText(f); };
    document.body.append(i); i.click(); setTimeout(() => i.remove(), 60000);
  });
}
