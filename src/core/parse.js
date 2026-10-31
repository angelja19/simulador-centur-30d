// Núcleo M9 extraído sin cambios de lógica de legacy/simulador_original.html
import { fmt } from './geometry.js';

/* ======================================================================
   PARSER
   ====================================================================== */
export const G_KNOWN = new Set([0, 1, 2, 3, 4, 7, 10, 11, 20, 21, 30, 31, 32, 33, 37, 40, 41, 42, 46, 47, 53, 54, 55, 58, 60, 61, 66, 67, 68, 70, 71, 73, 74, 75, 76, 80, 83, 90, 91, 92, 94, 95, 96, 97, 99]);
export const M_KNOWN = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 36, 37, 38, 39, 42, 43, 44, 45, 46, 50, 51]);
const DEC_CHECK = new Set(['X', 'Z', 'I', 'K', 'R', 'F', 'U', 'W', 'D', 'E']);
const DOT_CHECK = new Set(['X', 'Z', 'I', 'K', 'R']);

export function parse(text, opt) {
  opt = Object.assign({ maxDec: 2 }, opt || {});
  const out = { blocks: [], msgs: [], name: '' };
  const msg = (sev, line, code, text) => out.msgs.push({ sev, line, code, text });
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  let toolDef = false, warnedParen = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1, raw = lines[i];
    let s = raw.trim();
    if (!s) continue;
    if (s[0] === '!') {
      if (/^!\s*TOOL-DEF/i.test(s)) toolDef = true; else if (/^!\s*END/i.test(s)) toolDef = false;
      continue;
    }
    if (toolDef) continue;
    const hashAt = s.indexOf('#');
    let body = hashAt >= 0 ? s.slice(0, hashAt) : s;
    if (hashAt >= 0 && s.slice(hashAt + 1).trim())
      msg('warn', ln, 'TEXTO DESPUÉS DE #', 'El control ignora lo escrito después del fin de bloque (#).');
    if (body.length + 1 > 64)
      msg('warn', ln, 'BLOQUE > 64 CARACTERES', 'Un bloque admite como máximo 64 caracteres, incluido el # (manual, pág. 13).');
    let comment = '';
    const sc = body.indexOf(';');
    if (sc >= 0) { comment = body.slice(sc + 1).trim(); body = body.slice(0, sc); }
    body = body.replace(/\(([^)]*)\)?/g, (m, inner) => {
      if (!warnedParen) { msg('info', ln, 'COMENTARIO ( )', 'En el Mach 9 los comentarios empiezan con punto y coma (;).'); warnedParen = true; }
      comment += (comment ? ' ' : '') + inner; return '';
    });
    const code = body.toUpperCase().replace(/\s+/g, '');
    if (!code) { if (comment && !out.name && !out.blocks.length) out.name = comment; continue; }
    if (comment && /\bM0?[0-2]\b|\bM30\b/i.test(comment))
      msg('warn', ln, 'COMENTARIO CON M', 'El comentario no puede contener M00, M01, M02 ni M30 (manual, pág. 13).');

    const words = [];
    let p = 0, bad = false;
    const numRe = /[-+]?(?:\d+\.?\d*|\.\d+)?/y;
    while (p < code.length) {
      const L = code[p];
      if (L < 'A' || L > 'Z') { msg('error', ln, 'ERROR DE CARÁCTER', `El carácter “${L}” no es válido en un bloque.`); bad = true; break; }
      numRe.lastIndex = p + 1;
      const m = numRe.exec(code);
      const txt = m ? m[0] : '';
      p += 1 + txt.length;
      if (txt === '+' || txt === '-') { msg('error', ln, 'NÚMERO INCOMPLETO', `Falta el valor después de ${L}${txt}.`); bad = true; break; }
      const dotAt = txt.indexOf('.');
      words.push({ L, v: txt === '' ? 0 : parseFloat(txt), txt, dec: dotAt >= 0 ? txt.length - dotAt - 1 : 0, hasDot: dotAt >= 0 });
    }
    if (bad) continue;

    const w = {};
    let dup = false;
    for (const wd of words) {
      if (w[wd.L]) { if (!dup) msg('error', ln, 'DEF. CÓDIGO DOBLE', `La función ${wd.L} aparece dos veces; solo se permite una de cada tipo por bloque.`); dup = true; continue; }
      w[wd.L] = wd;
    }
    if (words.length > 16) msg('error', ln, 'EXCESO DE CÓDIGO EN EL BLOQUE', 'Hay más de 16 códigos en el bloque.');
    if (w.G) {
      const g = w.G.v;
      if (w.G.hasDot || !G_KNOWN.has(g)) msg('error', ln, `G${w.G.txt} INVÁLIDO`, `La función G${w.G.txt} no existe en el Mach 9.`);
    }
    if (w.M && (w.M.hasDot || !M_KNOWN.has(w.M.v))) msg('warn', ln, 'CÓDIGO “M” INVÁLIDO', `M${w.M.txt} no está en la lista de funciones misceláneas del manual.`);
    if (w.T && (w.X || w.Z)) msg('error', ln, 'T CON MOVIM. ILEGAL', 'El cambio de herramienta y el movimiento de los carros deben ir en bloques separados.');
    if (w.T && w.T.hasDot) msg('error', ln, 'CÓDIGO “T” INVÁLIDO', 'La función T usa 4 dígitos sin punto (ej. T0101).');
    if (w.G && (w.G.v === 96 || w.G.v === 97) && words.length > 1)
      msg('warn', ln, `G${w.G.v} EN BLOQUE SEPARADO`, `El manual pide programar G${w.G.v} solo en su bloque (pág. 70).`);
    for (const wd of words) {
      if (DEC_CHECK.has(wd.L) && wd.dec > 4) msg('error', ln, 'CÓDIGO FUERA DE GAMA', `${wd.L}${wd.txt}: el formato admite 4 decimales.`);
      else if (DEC_CHECK.has(wd.L) && wd.dec > opt.maxDec) msg('warn', ln, `MÁS DE ${opt.maxDec} DECIMALES`, `${wd.L}${wd.txt}: tu torno solo admite ${opt.maxDec} decimales.`);
      if (DOT_CHECK.has(wd.L) && wd.txt !== '' && !wd.hasDot && wd.v !== 0)
        msg('info', ln, 'SIN PUNTO DECIMAL', `${wd.L}${wd.txt}: el manual escribe las cotas con punto (${wd.L}${wd.txt}.).`);
    }
    out.blocks.push({ line: ln, raw, code, words, w, comment });
  }
  return out;
}
