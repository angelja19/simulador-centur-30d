// Datos de la máquina ROMI Centur 30D con control Mach 9.
// FUENTE: ficha técnica entregada por el usuario (placa / catálogo del taller) y
// lo observado en el video "Tecno 1 - Clase CNC - N°6" del docente.
// Lo que no se pudo confirmar está marcado como "pendiente" y se repite en el README.

export const MACHINE = {
  model: 'ROMI Centur 30D',
  control: 'Mach 9',
  motor: { hp: 10, cv: 10.14, kw: 7.46, volts: '380-220 V', hz: 50, amps: 6.1, drive: 'direct drive' }, // ficha técnica
  spindle: { rpmMin: 4, rpmMax: 4000, bore: 53 },        // ficha: 4–4000 rpm, agujero Ø 53 mm
  centerHeight: 215,                                     // ficha: altura de punta 215 mm
  betweenCenters: 1000,                                  // ficha: distancia entre puntas 1000 mm
  swing: 350,                                            // ficha: volteo Ø 350 mm
  swingOverCarriage: 200,                                // ficha: Ø admisible sobre el carro 200 mm
  travel: { x: 220, z: 1065 },                           // ficha: carrera X 220 mm, Z 1065 mm
  rapid: { x: 10000, z: 10000 },                         // ficha: 10 m/min en X y Z (mm/min)
  turret: {
    model: 'Duplomatic BSV-N',                           // placa visible en el video (t ≈ 05:30)
    positions: 8,                                        // PENDIENTE: "aparentemente 8"; no se pudo contar en el video
    gangOption: true                                     // ficha: opción gang
  },
  chuck: { type: 'Plato de 3 garras', diameter: 165, jawDepth: 40 }, // tipo: video. Ø y profundidad: estimados (pendiente)
  efficiency: 0.8,                                       // η = 0,8 usado por el HTML original (pág. 86-88 del manual)
  threadConst: 3000                                      // rpm máx. en rosca = 3000 / paso (HTML original)
};

const fmtc = (v, d = 1) => Number(v).toFixed(d).replace('.', ',');

// Revisa un programa ya interpretado contra los datos de la máquina.
// Devuelve mensajes { sev, line, code, text } con el estilo de alarmas del Mach 9.
export function checkMachine(parsed, run, stock, opts = {}) {
  const out = [];
  const add = (sev, line, code, text, data) => out.push(Object.assign({ sev, line, code, text }, data || {}));
  const M = MACHINE;

  // rotación
  let css = false;
  for (const b of parsed.blocks) {
    const w = b.w;
    const g = w.G ? Math.round(w.G.v) : null;
    if (g === 96) css = true; else if (g === 97) css = false;
    if (!w.S) continue;
    if (g === 92) {
      if (w.S.v > M.spindle.rpmMax) add('error', b.line, 'G92 S MAYOR QUE EL MÁXIMO', `El límite de rotación S${w.S.txt} supera las ${M.spindle.rpmMax} rpm del husillo.`);
      continue;
    }
    if (css) continue; // en G96 la S es velocidad de corte (m/min)
    // Clase del docente (min 20:20): en este Mach 9 una S con punto se toma como velocidad de corte
    if (w.S.hasDot) add('warn', b.line, 'S CON PUNTO DECIMAL', `S${w.S.txt}: con punto el control la toma como velocidad de corte (m/min), no como rpm.`);
    if (w.S.v > M.spindle.rpmMax) add('error', b.line, 'ROTACIÓN EXCEDE EL MÁXIMO', `S${w.S.txt}: el husillo de la Centur 30D gira como máximo ${M.spindle.rpmMax} rpm.`);
    else if (w.S.v > 0 && w.S.v < M.spindle.rpmMin) add('warn', b.line, 'ROTACIÓN MENOR QUE EL MÍNIMO', `S${w.S.txt}: el mínimo del husillo es ${M.spindle.rpmMin} rpm.`);
  }
  if (run.rpmMax > M.spindle.rpmMax + 0.5) {
    const m = run.moves.find(mv => mv.rpm > M.spindle.rpmMax + 0.5);
    if (m) add('warn', m.line, 'G96 SIN LÍMITE DE ROTACIÓN', `Con velocidad de corte constante la rotación llega a ${Math.round(m.rpm)} rpm; programa G92 S${M.spindle.rpmMax} o menos.`);
  }

  // herramientas fuera de la torreta
  for (const b of parsed.blocks) {
    if (!b.w.T) continue;
    const d = b.w.T.txt.replace(/[^0-9]/g, '');
    const tn = d.length >= 3 ? parseInt(d.slice(0, -2), 10) : parseInt(d || '0', 10);
    if (tn > M.turret.positions) add('error', b.line, 'HERRAMIENTA INEXISTENTE', `T${String(tn).padStart(2, '0')}: la torreta ${M.turret.model} tiene ${M.turret.positions} posiciones.`);
  }

  // carreras (las cotas son de pieza; se compara el recorrido total pedido)
  const mv = run.moves;
  if (mv.length) {
    let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity;
    for (const m of mv) for (const [x, z] of [[m.x0, m.z0], [m.x1, m.z1]]) {
      if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (z < zmin) zmin = z; if (z > zmax) zmax = z;
    }
    const xMove = mv.find(m => Math.max(m.x0, m.x1) / 2 > M.travel.x);
    if (xMove) add('error', xMove.line, 'FIN DE CURSO X+', `Se pide X${fmtc(Math.max(xMove.x0, xMove.x1), 1)} (radio ${fmtc(Math.max(xMove.x0, xMove.x1) / 2, 1)} mm): la carrera X es de ${M.travel.x} mm.`);
    if ((xmax - xmin) / 2 > M.travel.x) add('error', mv[0].line, 'CARRERA X EXCEDIDA', `El programa recorre ${fmtc((xmax - xmin) / 2)} mm en X (radio); la carrera es de ${M.travel.x} mm.`);
    const zMove = mv.find(m => m.z1 === zmin);
    if (zmax - zmin > M.travel.z) add('error', zMove ? zMove.line : mv[0].line, 'CARRERA Z EXCEDIDA', `El programa recorre ${fmtc(zmax - zmin)} mm en Z; la carrera es de ${M.travel.z} mm.`);
    if (xmax > M.swing) add('error', mv.find(m => Math.max(m.x0, m.x1) === xmax).line, 'DIÁMETRO MAYOR QUE EL VOLTEO', `X${fmtc(xmax)} supera el volteo de Ø ${M.swing} mm.`);
  }

  // potencia de corte (Nc = Ks·f·ap·Vc / (4500·η), en CV)
  if (opts.cutPower && opts.depths) {
    const P = opts;
    mv.forEach((m, i) => {
      if (m.kind !== 'feed' || !m.rpm || !m.F) return;
      const ap = (opts.depths[i] || 0) / 2;
      if (ap <= 0.01) return;
      const D = Math.max(Math.abs(m.x0), Math.abs(m.x1));
      const Vc = Math.PI * D * m.rpm / 1000;
      const Nc = P.cutPower(P.material, m.F, ap, Vc);
      if (Nc > M.motor.cv) add('error', m.line, 'POTENCIA INSUFICIENTE', `Esta pasada pide ${fmtc(Nc)} CV y el motor entrega ${fmtc(M.motor.cv)} CV (10 hp).`, { once: 'pow' });
      else if (Nc > 0.85 * M.motor.cv) add('warn', m.line, 'POTENCIA CERCA DEL LÍMITE', `Esta pasada pide ${fmtc(Nc)} CV de ${fmtc(M.motor.cv)} CV disponibles.`, { once: 'pow' });
    });
  }
  // solo un aviso de potencia por fila
  const seen = new Set();
  return out.filter(m => { const k = m.code + m.line; if (seen.has(k)) return false; seen.add(k); return true; });
}

// Valida que la pieza en bruto quepa en la máquina.
export function checkStock(stock) {
  const M = MACHINE, out = [];
  const add = (sev, code, text) => out.push({ sev, line: 0, code, text });
  const { barD, barLen, grip } = stock;
  if (!(barD > 0) || !(barLen > 0)) { add('error', 'PIEZA SIN MEDIDAS', 'Indica el diámetro y la longitud de la barra.'); return out; }
  if (barD > M.swing) add('error', 'PIEZA MAYOR QUE EL VOLTEO', `Ø ${fmtc(barD)} mm supera el volteo de Ø ${M.swing} mm: la pieza golpearía la bancada.`);
  else if (barD > M.swingOverCarriage) add('warn', 'PIEZA MAYOR QUE EL Ø SOBRE EL CARRO', `Ø ${fmtc(barD)} mm supera los Ø ${M.swingOverCarriage} mm admisibles sobre el carro: solo se puede trabajar cerca del plato.`);
  if (barD > M.chuck.diameter) add('warn', 'PIEZA MAYOR QUE EL PLATO', `Ø ${fmtc(barD)} mm es mayor que el plato estimado de Ø ${M.chuck.diameter} mm: haría falta invertir las garras.`);
  if (grip > M.chuck.jawDepth && barD > M.spindle.bore) add('error', 'LA BARRA NO ENTRA EN EL HUSILLO', `Con Ø ${fmtc(barD)} mm la barra no pasa por el agujero de Ø ${M.spindle.bore} mm; el largo sujeto no puede superar ${M.chuck.jawDepth} mm.`);
  const out_ = barLen - grip;
  if (out_ > M.betweenCenters) add('error', 'PIEZA MÁS LARGA QUE ENTRE PUNTAS', `El voladizo de ${fmtc(out_)} mm supera la distancia entre puntas de ${M.betweenCenters} mm.`);
  if (grip < Math.min(10, barD * 0.5)) add('warn', 'SUJECIÓN CORTA', `Solo ${fmtc(grip)} mm sujetos en las garras: la barra puede salirse o vibrar.`);
  if (out_ / barD > 4) add('warn', 'VOLADIZO LARGO SIN CONTRAPUNTA', `El voladizo es ${fmtc(out_ / barD)} veces el diámetro: usa contrapunta o reduce el saliente.`);
  if (out_ <= 0) add('error', 'BARRA TODA DENTRO DEL PLATO', 'El largo sujeto es mayor o igual a la longitud total.');
  return out;
}
