// Núcleo M9 extraído sin cambios de lógica de legacy/simulador_original.html
/* ======================================================================
   Datos de corte del manual (pág. 86-88)
   ====================================================================== */
export const KS = {
  'SAE 1010–1025': [360, 260, 190, 136],
  'SAE 1030–1035': [400, 290, 210, 152],
  'SAE 1040–1045': [420, 300, 220, 156],
  'SAE 1065': [440, 315, 230, 164],
  'SAE 1095': [460, 330, 240, 172],
  'Acero inoxidable': [520, 375, 270, 192],
  'Hierro fundido medio': [290, 208, 150, 108],
  'Aluminio': [130, 90, 65, 48],
  'Latón': [160, 115, 85, 60],
  'Bronce fundido': [340, 245, 180, 128]
};
export function ksAt(mat, feed) {
  const t = KS[mat] || KS['SAE 1040–1045'], fx = [0.1, 0.2, 0.4, 0.8];
  const x = Math.log(Math.min(0.8, Math.max(0.1, feed)));
  for (let i = 0; i < 3; i++) {
    const a = Math.log(fx[i]), b = Math.log(fx[i + 1]);
    if (x <= b + 1e-12) return t[i] + (t[i + 1] - t[i]) * (x - a) / (b - a);
  }
  return t[3];
}
// Nc [CV] = Ks·a·p·Vc / (4500·η), η = 0,8 Centur
export const cutPower = (mat, feed, depthRadial, Vc) => ksAt(mat, feed) * feed * depthRadial * Vc / (4500 * 0.8);
