// Modelo 3D procedural de la ROMI Centur 30D tal como aparece en el video del docente:
// base azul petróleo, carcasa gris clara, interior crema, puerta con frente hexagonal y 6 ventanas,
// panel Mach 9 arriba a la izquierda, plato de 3 garras, torreta Duplomatic y contrapunta.
// Unidades: milímetros. Eje del husillo = eje X del mundo; la cara de las garras está en x = 0.
import * as THREE from 'three';

export const H = 1050;            // altura del eje del husillo sobre el piso (mm)
const C = {
  base: 0x2f5866, body: 0xd9dcd7, cream: 0xeee3c6, dark: 0x3b4045, steel: 0x9aa1a7, chuck: 0x7d858c,
  jaw: 0x8d959b, turret: 0xa3a9ad, red: 0xd2302a, blue: 0x2b5fa8
};

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.05 }, o));
function box(w, h, d, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function rounded(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}

export function buildMachine() {
  const g = new THREE.Group(); g.name = 'maquina';
  const M = {
    base: std(C.base, { roughness: 0.5, metalness: 0.15 }), body: std(C.body, { roughness: 0.42 }), cream: std(C.cream, { roughness: 0.6 }),
    dark: std(C.dark, { roughness: 0.5, metalness: 0.4 }), steel: std(C.steel, { roughness: 0.28, metalness: 0.9 }),
    chuck: std(C.chuck, { roughness: 0.32, metalness: 0.85 }), jaw: std(C.jaw, { roughness: 0.35, metalness: 0.85 }),
    turret: std(C.turret, { roughness: 0.38, metalness: 0.6 }), black: std(0x15181b, { roughness: 0.6 })
  };
  const X0 = -760, X1 = 1560, W = X1 - X0, XC = (X0 + X1) / 2;
  // ---- base (gabinete azul) ----
  box(W - 40, 640, 760, M.base, XC, 320, -20, g);
  box(W - 10, 30, 790, M.dark, XC, 655, -20, g);
  // pies
  for (const x of [X0 + 120, X1 - 120]) box(140, 40, 140, M.dark, x, 20, 250, g);
  // ---- carcasa gris superior ----
  const yTop = 1690, zBack = -420, zFront = 380;
  box(W, 40, zFront - zBack + 40, M.body, XC, yTop, (zBack + zFront) / 2, g);                 // techo
  box(W, yTop - 670, 30, M.body, XC, (yTop + 670) / 2, zBack, g);                             // fondo exterior
  box(30, yTop - 670, zFront - zBack, M.body, X0 + 15, (yTop + 670) / 2, (zBack + zFront) / 2, g); // lateral izq.
  box(30, yTop - 670, zFront - zBack, M.body, X1 - 15, (yTop + 670) / 2, (zBack + zFront) / 2, g); // lateral der.
  // interior crema (zona de corte)
  const zx0 = -150, zx1 = 1200;
  box(zx1 - zx0, yTop - 700, 10, M.cream, (zx0 + zx1) / 2, (yTop + 700) / 2, zBack + 25, g);
  box(zx1 - zx0, 10, zFront - zBack - 30, M.cream, (zx0 + zx1) / 2, yTop - 30, (zBack + zFront) / 2, g);
  // carcasa del cabezal (izquierda) y de la contrapunta (derecha)
  box(zx0 - X0 - 30, yTop - 690, zFront - zBack - 20, M.body, (X0 + zx0) / 2 + 15, (yTop + 690) / 2, (zBack + zFront) / 2 - 10, g);
  box(X1 - zx1 - 30, yTop - 690, zFront - zBack - 20, M.body, (zx1 + X1) / 2 - 15, (yTop + 690) / 2, (zBack + zFront) / 2 - 10, g);
  // pared del cabezal en crema con agujeros decorativos
  const headWall = box(12, yTop - 720, zFront - zBack - 60, M.cream, zx0 + 6, (yTop + 720) / 2, (zBack + zFront) / 2 - 20, g);
  headWall.name = 'paredCabezal';
  // bandeja de virutas inclinada
  const tray = box(zx1 - zx0, 14, zFront - zBack - 60, M.dark, (zx0 + zx1) / 2, 720, (zBack + zFront) / 2 - 10, g);
  tray.rotation.x = -0.12;
  // frente inferior (delantal) gris con logos
  const logo = canvasTex(2048, 360, (c, w, h) => {
    c.fillStyle = '#d9dcd7'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e7e9e5'; c.fillRect(0, 0, w, 10);
    c.font = 'italic 900 150px Arial'; c.fillStyle = '#1b1b1b'; c.fillText('Centur', 120, 200); c.fillStyle = '#d2302a'; c.fillText('30D', 690, 200);
    c.lineWidth = 22; c.strokeStyle = '#2b5fa8'; c.beginPath(); c.arc(1390, 180, 70, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(1420, 210); c.lineTo(1470, 260); c.stroke();
    c.font = '900 150px Arial'; c.fillStyle = '#2b5fa8'; c.fillText('ROMI', 1500, 235);
    c.fillStyle = '#fff'; c.fillRect(110, 250, 430, 70); c.strokeStyle = '#111'; c.lineWidth = 3; c.strokeRect(110, 250, 430, 70);
    c.font = 'italic 700 52px Arial'; c.fillStyle = '#111'; c.fillText('TORNO CNC', 160, 303);
  });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(W, 300, 20), [M.body, M.body, M.body, M.body, new THREE.MeshStandardMaterial({ map: logo, roughness: 0.45 }), M.body]);
  apron.position.set(XC, 830, zFront + 10); apron.castShadow = apron.receiveShadow = true; g.add(apron);
  box(W, 20, 120, M.body, XC, 985, zFront - 40, g);   // repisa sobre el delantal
  // franja superior
  box(W, yTop - 1480, 20, M.body, XC, (yTop + 1480) / 2, zFront + 10, g);

  // ---- bancada y guías ----
  const bed = new THREE.Group(); g.add(bed);
  box(zx1 - zx0 + 200, 120, 260, M.dark, (zx0 + zx1) / 2 + 100, H - 330, -170, bed);
  for (const z of [-250, -90]) box(zx1 - zx0 + 200, 40, 50, M.steel, (zx0 + zx1) / 2 + 100, H - 250, z, bed);

  // ---- husillo y plato ----
  const spindle = new THREE.Group(); spindle.position.set(0, H, 0); g.add(spindle);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(120, 130, 220, 48), M.cream); housing.rotation.z = Math.PI / 2; housing.position.x = -270; housing.castShadow = true; spindle.add(housing);
  const rot = new THREE.Group(); rot.name = 'rotante'; spindle.add(rot);    // gira con el husillo
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(95, 95, 30, 48), M.steel); nose.rotation.z = Math.PI / 2; nose.position.x = -115; rot.add(nose);
  const chuck = new THREE.Mesh(new THREE.CylinderGeometry(82.5, 82.5, 90, 64), M.chuck); chuck.rotation.z = Math.PI / 2; chuck.position.x = -45 - 40; chuck.castShadow = true; rot.add(chuck);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(80, 82.5, 4, 64), M.steel); face.rotation.z = Math.PI / 2; face.position.x = -40; rot.add(face);
  // ranuras de las garras
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * 2 * Math.PI / 3;
    const slot = box(6, 120, 22, M.black, -38, 0, 0, rot, false);
    slot.position.set(-38, Math.cos(a) * 30, Math.sin(a) * 30); slot.rotation.x = -a; slot.scale.y = 1;
  }
  // garras escalonadas
  const jaws = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * 2 * Math.PI / 3;
    const jg = new THREE.Group(); jg.rotation.x = a - Math.PI / 2; rot.add(jg);
    const jaw = new THREE.Group(); jg.add(jaw);
    box(36, 26, 22, M.jaw, -18, 13, 0, jaw);      // escalón 1 (agarre)
    box(36, 22, 22, M.jaw, -24, 37, 0, jaw).scale.x = 0.66;
    box(30, 18, 22, M.jaw, -30, 57, 0, jaw).scale.x = 0.5;
    for (let k = 0; k < 3; k++) { const s = box(2, 2, 23, M.black, -4 - k * 6, 1, 0, jaw, false); s.scale.y = 1; }
    jaws.push(jaw);
  }
  // ---- carro, carro transversal y torreta ----
  // carro (se mueve en X del mundo = Z de la máquina) y carro transversal (radial)
  const carriage = new THREE.Group(); g.add(carriage);
  box(300, 90, 330, M.dark, 0, H - 300, -170, carriage);
  const cross = new THREE.Group(); carriage.add(cross);
  box(260, 60, 240, M.turret, 0, H - 230, -300, cross);
  // torreta: su origen es la PUNTA de la herramienta activa; el disco queda detrás (z negativo)
  const RD = 235;
  const turret = new THREE.Group(); g.add(turret);
  const body = box(170, 150, 200, M.turret, 0, -140, -RD - 40, turret);
  const plate = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#c9ccce'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = 'bold 34px Arial'; c.fillText('DUPLOMATIC', 18, 52); c.font = '24px Arial'; c.fillText('BSV-N', 80, 92); });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5 })); pl.position.set(0, -140, -RD + 61); turret.add(pl);
  const disc = new THREE.Group(); disc.name = 'disco'; disc.position.z = -RD; turret.add(disc);
  const discMesh = new THREE.Mesh(new THREE.CylinderGeometry(110, 110, 70, 8), M.turret); discMesh.rotation.z = Math.PI / 2; discMesh.position.x = 0; discMesh.castShadow = true; disc.add(discMesh);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 74, 32), M.steel); cap.rotation.z = Math.PI / 2; disc.add(cap);
  // ---- contrapunta ----
  const tail = new THREE.Group(); tail.position.set(1000, H, 0); g.add(tail);
  box(160, 200, 220, M.cream, 80, -110, -20, tail);
  const tq = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 160, 32), M.steel); tq.rotation.z = Math.PI / 2; tq.position.x = -20; tq.castShadow = true;
  const quill = new THREE.Group(); quill.add(tq);
  const center = new THREE.Mesh(new THREE.ConeGeometry(22, 50, 32), M.steel); center.rotation.z = Math.PI / 2; center.position.x = -125; quill.add(center);
  tail.add(quill);
  // ---- puerta corrediza: frente hexagonal con 6 ventanas ----
  const door = new THREE.Group(); door.name = 'puerta';
  const dw = 1160, dh = 760;
  const ds = new THREE.Shape();
  ds.moveTo(-dw / 2, -dh / 2); ds.lineTo(dw / 2, -dh / 2); ds.lineTo(dw / 2, dh / 2 - 160); ds.lineTo(dw / 2 - 160, dh / 2); ds.lineTo(-dw / 2 + 160, dh / 2); ds.lineTo(-dw / 2, dh / 2 - 160); ds.closePath();
  const wins = [];
  for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 3; c2++) {
    const cx = -330 + c2 * 330, cy = -150 + r * 300;
    const hp = new THREE.Path(rounded(270, 230, 40).getPoints(12).map(p => new THREE.Vector2(p.x + cx, p.y + cy)));
    ds.holes.push(hp); wins.push([cx, cy]);
  }
  const doorGeo = new THREE.ExtrudeGeometry(ds, { depth: 30, bevelEnabled: true, bevelSize: 6, bevelThickness: 6, bevelSegments: 2, curveSegments: 10 });
  const doorMesh = new THREE.Mesh(doorGeo, std(0xe3e5e0, { roughness: 0.4 })); doorMesh.castShadow = true; door.add(doorMesh);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xd6e6ea, roughness: 0.08, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.16, depthWrite: false });
  for (const [cx, cy] of wins) { const gl = new THREE.Mesh(new THREE.ShapeGeometry(rounded(272, 232, 40)), glassMat); gl.position.set(cx, cy, 14); door.add(gl); }
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(14, 120, 6, 12), M.black); handle.position.set(dw / 2 - 70, -40, 50); door.add(handle);
  door.position.set(430, 1250, zFront + 30); g.add(door);
  // ---- panel Mach 9 (arriba a la izquierda) ----
  const panelTex = canvasTex(1024, 760, (c, w, h) => {
    c.fillStyle = '#d9dbd7'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#34383d'; c.fillRect(30, 30, w - 60, h - 60);
    const grd = c.createRadialGradient(260, 250, 20, 260, 250, 260); grd.addColorStop(0, '#0b3a1b'); grd.addColorStop(1, '#021006');
    c.fillStyle = '#151719'; c.fillRect(60, 60, 420, 360); c.fillStyle = grd; c.fillRect(78, 78, 384, 324);
    c.fillStyle = '#8dffa6'; c.font = '28px monospace'; c.fillText('PAGINA DE MODO', 100, 120); c.fillText('TORNO ROMI', 140, 220);
    for (let i = 0; i < 9; i++) { c.fillStyle = '#f3f2ec'; c.fillRect(500, 70 + i * 38, 46, 30); }
    for (let i = 0; i < 8; i++) { c.fillStyle = i === 0 || i === 6 ? '#5cb8e2' : i === 7 ? '#f2a33a' : '#f3f2ec'; c.fillRect(70 + i * 56, 440, 48, 30); }
    for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) { c.fillStyle = r === 4 && k > 1 ? (k < 4 ? '#f2a33a' : '#34383d') : '#f3f2ec'; c.fillRect(590 + k * 62, 70 + r * 50, 52, 42); }
    for (let k = 0; k < 6; k++) { c.fillStyle = '#5cb8e2'; c.fillRect(590 + k * 62, 330, 52, 34); }
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = '#f3f2ec'; c.fillRect(590 + k * 50, 380 + r * 42, 42, 34); }
    c.save(); c.translate(870, 450); c.rotate(Math.PI / 4); c.fillStyle = '#5cb8e2'; c.fillRect(-55, -55, 110, 110); c.restore();
    c.fillStyle = '#2b2e32'; c.fillRect(60, 540, w - 120, 150);
    c.fillStyle = '#f6d13a'; c.beginPath(); c.arc(140, 615, 52, 0, 7); c.fill(); c.fillStyle = '#d4241b'; c.beginPath(); c.arc(140, 615, 34, 0, 7); c.fill();
    for (const x of [270, 400, 530]) { c.fillStyle = '#111'; c.beginPath(); c.arc(x, 615, 36, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.font = 'bold 26px Arial'; c.fillText('ROMI  MACH 9', 650, 600);
    [['#d4241b', 700], ['#f2a33a', 790], ['#1fae55', 880]].forEach(([col, x]) => { c.fillStyle = '#555'; c.fillRect(x - 6, 624, 52, 52); c.fillStyle = col; c.fillRect(x, 630, 40, 40); });
  });
  const pan = new THREE.Group(); pan.position.set(-520, 1880, zFront - 40); g.add(pan);
  box(560, 420, 90, M.body, 0, 0, -40, pan);
  const face9 = new THREE.Mesh(new THREE.PlaneGeometry(540, 400), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.5 })); face9.position.z = 6; pan.add(face9);
  box(80, 200, 80, M.body, 0, -300, -60, pan);
  // ---- lámpara interior ----
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(600, 14, 60), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.4 }));
  lamp.position.set(400, yTop - 50, -150); g.add(lamp);
  // ---- tobera de refrigerante ----
  const nozzle = new THREE.Group(); turret.add(nozzle);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-70, 40, -RD), new THREE.Vector3(-60, 110, -120), new THREE.Vector3(-25, 45, -30)]), 20, 6, 8), std(0x2f6fb0, { roughness: 0.4 }));
  nozzle.add(hose);

  return { group: g, spindle, rot, jaws, carriage, cross, turret, disc, RD, tail, quill, door, M, zFront, yTop, interior: { x0: zx0, x1: zx1 } };
}

// Herramienta para la torreta (punta en el origen, apuntando hacia +z = hacia el eje)
export function buildTool(t, M) {
  const g = new THREE.Group();
  const holder = new THREE.Mesh(new THREE.BoxGeometry(25, 25, 110), M.dark); holder.position.set(12, 0, -70); holder.castShadow = true; g.add(holder);
  const carbide = std(0xd8b04a, { roughness: 0.3, metalness: 0.8 });   // inserto recubierto (dorado)
  if (!t || t.type === 'turn') {
    const ang = ((t && t.k2) || 30) > 40 ? 35 : 55;               // VBMT 35° o DNMG 55°
    const s = new THREE.Shape(), L = 14, a = ang * Math.PI / 180;
    s.moveTo(0, 0); s.lineTo(L * Math.cos(a / 2) * 1.8, L * Math.sin(a / 2) * 0.9); s.lineTo(L * 2.4, 0); s.lineTo(L * Math.cos(a / 2) * 1.8, -L * Math.sin(a / 2) * 0.9); s.closePath();
    const ins = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false }), carbide);
    ins.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + 0.6); ins.position.set(0, 2, 0); g.add(ins);
  } else if (t.type === 'thread') {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(8, -16); s.lineTo(-8, -16); s.closePath();
    const ins = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false }), carbide);
    ins.rotation.x = -Math.PI / 2; ins.rotation.z = Math.PI; ins.position.set(0, 2.5, 0); g.add(ins);
  } else if (t.type === 'blade') {
    const w = t.w || 3, off = t.ref === 'izq' ? w / 2 : -w / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w, 26, 60), std(0x9aa1a7, { metalness: 0.9, roughness: 0.3 })); blade.position.set(off, 0, -30); g.add(blade);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 6, 4), carbide); tip.position.set(off, 0, -2); g.add(tip);
  }
  return g;
}
