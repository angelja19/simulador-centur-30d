// Bibliotecas de materiales, herramientas y roscas ISO.
// Ks: tabla del manual (pág. 86-88) que ya traía el HTML original (cutting.js).
// Vc y avances recomendados: valores de partida típicos para metal duro; el usuario puede editarlos.

export const MATERIALS = {
  'SAE 1010–1025': { ks: 'SAE 1010–1025', density: 7.87, color: 0x9aa3ab, metal: 0.92, rough: 0.34, vcR: 200, vcF: 260 },
  'SAE 1030–1035': { ks: 'SAE 1030–1035', density: 7.85, color: 0x959ea6, metal: 0.92, rough: 0.36, vcR: 180, vcF: 240 },
  'SAE 1045':      { ks: 'SAE 1040–1045', density: 7.85, color: 0x8e979f, metal: 0.92, rough: 0.38, vcR: 170, vcF: 220 },
  'SAE 1065':      { ks: 'SAE 1065', density: 7.85, color: 0x8a9299, metal: 0.92, rough: 0.4, vcR: 150, vcF: 200 },
  'SAE 1095':      { ks: 'SAE 1095', density: 7.85, color: 0x868d93, metal: 0.92, rough: 0.42, vcR: 130, vcF: 180 },
  'Acero inoxidable': { ks: 'Acero inoxidable', density: 7.93, color: 0xc4ccd2, metal: 0.96, rough: 0.2, vcR: 140, vcF: 180 },
  'Hierro fundido': { ks: 'Hierro fundido medio', density: 7.2, color: 0x5e6266, metal: 0.6, rough: 0.7, vcR: 160, vcF: 220 },
  'Aluminio':      { ks: 'Aluminio', density: 2.7, color: 0xd5d9dd, metal: 0.9, rough: 0.28, vcR: 400, vcF: 600 },
  'Latón':         { ks: 'Latón', density: 8.5, color: 0xc9a34a, metal: 0.95, rough: 0.27, vcR: 250, vcF: 320 },
  'Bronce':        { ks: 'Bronce fundido', density: 8.8, color: 0xa86f3c, metal: 0.92, rough: 0.33, vcR: 180, vcF: 240 },
  'Cobre':         { ks: 'Latón', density: 8.96, color: 0xc0704a, metal: 0.97, rough: 0.25, vcR: 200, vcF: 260 },
  'Nylon / Duralón': { ks: 'Aluminio', density: 1.15, color: 0xeee8d8, metal: 0.0, rough: 0.6, vcR: 300, vcF: 400 }
};

// Medidas comerciales de barra redonda (mm) – pulgadas y métricas habituales en el mercado
export const BAR_SIZES = [12.7, 15.875, 16, 19.05, 20, 22, 22.225, 25, 25.4, 28.575, 30, 31.75, 32, 38.1, 40, 44.45, 50, 50.8, 63.5, 76.2];
export const barLabel = d => {
  const inch = { 12.7: '1/2"', 15.875: '5/8"', 19.05: '3/4"', 22.225: '7/8"', 25.4: '1"', 28.575: '1 1/8"', 31.75: '1 1/4"', 38.1: '1 1/2"', 44.45: '1 3/4"', 50.8: '2"', 63.5: '2 1/2"', 76.2: '3"' }[d];
  return inch ? `${inch} (${String(d).replace('.', ',')})` : `Ø${String(d).replace('.', ',')}`;
};

// Herramientas: type turn (k2 = ángulo del filo secundario), thread, blade (w = ancho)
// rn = radio de punta (mm). Por defecto las 4 del HTML original.
export const TOOL_LIBRARY = [
  { id: 'DNMG', name: 'DNMG 55° desbaste', type: 'turn', k2: 32, rn: 0.8, use: 'Desbaste' },
  { id: 'CNMG', name: 'CNMG 80° desbaste pesado', type: 'turn', k2: 5, rn: 0.8, use: 'Desbaste' },
  { id: 'VBMT', name: 'VBMT 35° acabado', type: 'turn', k2: 52, rn: 0.4, use: 'Acabado' },
  { id: 'VNMG', name: 'VNMG 35° copiado', type: 'turn', k2: 52, rn: 0.2, use: 'Acabado' },
  { id: 'TCMT', name: 'TCMT 60°', type: 'turn', k2: 30, rn: 0.4, use: 'Acabado' },
  { id: 'R60', name: 'Rosca 60° métrica', type: 'thread', use: 'Roscado' },
  { id: 'BL3', name: 'Cuchilla tronzar 3 mm', type: 'blade', w: 3, ref: 'der', use: 'Tronzado' },
  { id: 'BL4', name: 'Cuchilla ranurar 4 mm', type: 'blade', w: 4, ref: 'der', use: 'Tronzado' }
];

export const DEFAULT_TURRET = [
  { num: 1, lib: 'DNMG', use: 'Desbaste', type: 'turn', k2: 32, rn: 0 },
  { num: 3, lib: 'VBMT', use: 'Acabado', type: 'turn', k2: 52, rn: 0 },
  { num: 5, lib: 'R60', use: 'Roscado', type: 'thread' },
  { num: 7, lib: 'BL3', use: 'Tronzado', type: 'blade', w: 3, ref: 'der' }
];

// Roscas métricas ISO de paso grueso (ISO 261) y algunas de paso fino.
export const ISO_THREADS = [
  ['M6', 6, 1], ['M8', 8, 1.25], ['M10', 10, 1.5], ['M12', 12, 1.75], ['M14', 14, 2], ['M16', 16, 2],
  ['M18', 18, 2.5], ['M20', 20, 2.5], ['M22', 22, 2.5], ['M24', 24, 3], ['M27', 27, 3], ['M30', 30, 3.5],
  ['M36', 36, 4], ['M42', 42, 4.5], ['M48', 48, 5],
  ['M8x1', 8, 1], ['M10x1,25', 10, 1.25], ['M11x1,25', 11, 1.25], ['M12x1,5', 12, 1.5], ['M16x1,5', 16, 1.5], ['M20x1,5', 20, 1.5], ['M24x2', 24, 2]
].map(([name, d, p]) => ({ name, d, p, ...isoExternal(d, p) }));

// Rosca exterior ISO 68: altura de filete h3 = 0,61343·P → Ø de fondo d3 = d − 1,22687·P
export function isoExternal(d, p) {
  const h3 = 0.61343 * p;
  return { h3, dMin: +(d - 2 * h3).toFixed(3), dMaj: +(d - 0.1 * p).toFixed(3) };
}
