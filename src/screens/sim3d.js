// PANTALLA 2 — SIMULADOR COMPLETO: la máquina en 3D con la pieza cortándose en vivo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { S, on, emit, save, reanalyze, toolsMap, material } from '../state.js';
import * as state from '../state.js';
import { P, toolPos } from '../player.js';
import { buildMachine, buildTool, H } from './machine3d.js';
import { el, es, esc, mmss, toast, modal } from '../ui/dom.js';
import { MATERIALS, BAR_SIZES, barLabel, TOOL_LIBRARY, MACHINE, checkStock, stockPolyline, rdp, explain } from '../core/index.js';

const A = () => state.A;
const BOTTOM_NAMES = [
  ['SUEL/PREN PIEZA', 'OPERADOR LIBERA', 'AVAN/RETR PINOLA', 'MOV. HUS HORARIO', 'MOV. HUS ANTIHOR'],
  ['REFRIG. MANUAL', 'REFRIG. AUTOMAT.', '', '', ''],
  ['INCREM. AVANCE', 'DECREM. AVANCE', 'SEGURID. PUERTA', 'PLATO EXTERNO', ''],
  ['EN MANDO', 'AVANCA B. CONTRAPUN', 'RETROCED. CONTRAPUN', '', '']
];
const F_LABELS = ['LIMPIAR', 'RAPIDOS', 'AJUSTE PROTEC.', 'CERRAR', 'LIMITES', 'SEGUIR HERRAM.', 'AMPLIAR', 'REDUCIR', 'VENT.'];

export function mountSim3D(root) {
  /* ---------------- DOM ---------------- */
  const view = el('div', { class: 's3view' });
  const hud = el('div', { class: 's3hud' });
  const flash = el('div', { class: 's3flash' });
  const intro = el('div', { class: 's3intro' }, el('b', null, 'ROMI Centur 30D'), el('span', null, 'Entrando a la zona de corte…'));
  const tools = el('div', { class: 's3tools' });
  const drawer = el('aside', { class: 's3drawer' });
  const strip = el('div', { class: 's3keys' });
  const prep = el('div', { class: 's3prep', hidden: true });
  view.append(hud, flash, intro, tools, prep);
  root.append(el('div', { class: 's3main' }, view, strip), drawer);

  /* ---------------- three.js ---------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.localClippingEnabled = true;
  view.prepend(renderer.domElement);
  const labels = new CSS2DRenderer(); labels.domElement.className = 's3labels'; view.append(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a2126);
  scene.fog = new THREE.Fog(0x1a2126, 5000, 11000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7;
  const camera = new THREE.PerspectiveCamera(42, 1, 5, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxDistance = 7000; controls.minDistance = 40;

  scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x2a2c2e, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1200, 3200, 2200); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -1800, right: 2400, top: 2400, bottom: -600, near: 100, far: 7000 }); sun.shadow.bias = -0.0004;
  scene.add(sun);
  const lampL = new THREE.PointLight(0xfff1d6, 2.2, 2200, 1.2); lampL.position.set(400, 1560, -60); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); scene.add(lampL);
  // piso de concreto con línea amarilla (como el taller del video)
  const floorTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#8c8d88'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = 120 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v - 6},0.25)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(4200, 60), new THREE.MeshStandardMaterial({ color: 0xe7b416, roughness: 0.8 }));
  line.rotation.x = -Math.PI / 2; line.position.set(400, 1, 1150); scene.add(line);

  const mac = buildMachine(); scene.add(mac.group);
  const toolGroups = new Map();   // posición de torreta → herramienta 3D

  /* ---------------- pieza ---------------- */
  let stockMat = new THREE.MeshStandardMaterial({ color: 0x8e979f, metalness: 0.92, roughness: 0.38, side: THREE.DoubleSide });
  const stock = new THREE.Mesh(new THREE.BufferGeometry(), stockMat); stock.castShadow = true; stock.receiveShadow = true;
  stock.rotation.z = -Math.PI / 2; mac.rot.add(stock);
  const falling = new THREE.Mesh(new THREE.BufferGeometry(), stockMat); falling.rotation.z = -Math.PI / 2; falling.visible = false; scene.add(falling);
  let fallState = null;
  const pathGroup = new THREE.Group(); scene.add(pathGroup);
  const limitsBox = new THREE.Box3Helper(new THREE.Box3(), 0x8dffa6); limitsBox.visible = false; scene.add(limitsBox);

  function applyMaterial() {
    const m = material();
    stockMat.color.setHex(m.color); stockMat.metalness = m.metal; stockMat.roughness = m.rough; stockMat.needsUpdate = true;
    chipMat.color.setHex(m.color);
  }
  const W = z => z - simRef().zJaw;               // Z de la pieza → x del mundo
  const simRef = () => (P.sim || A().sim);
  let lastKey = '';
  function rebuildStock(force) {
    const a = A(); if (!a) return;
    const sim = simRef(), r = P.sim ? P.sim.r : a.final.r, th = P.sim ? P.sim.threads : a.final.threads;
    const key = (P.sim ? P.sim.mi + ':' + P.sim.si : 'f') + '|' + a.run.total;
    if (!force && key === lastKey) return; lastKey = key;
    let pts = stockPolyline(sim, r, th, 1).filter(p => p[1] >= 0);
    pts = rdp(pts, 0.004);
    const parted = P.sim ? P.sim.parted : a.final.parted;
    let main = pts, rest = null;
    if (parted) { main = pts.filter(p => p[0] <= parted.z + 1e-6); rest = pts.filter(p => p[0] >= parted.z - 1e-6); }
    stock.geometry.dispose(); stock.geometry = latheFrom(main, sim, true);
    if (parted && rest && rest.length > 2 && !fallState) startFall(rest, sim);
    if (!parted) { falling.visible = false; fallState = null; }
  }
  function latheFrom(pts, sim, withGrip) {
    const v = [];
    const grip = S.stock.grip;
    if (withGrip) { v.push(new THREE.Vector2(0, -grip)); v.push(new THREE.Vector2(sim.barR, -grip)); }
    else if (pts.length) v.push(new THREE.Vector2(0, W(pts[0][0])));
    for (const [z, rr] of pts) v.push(new THREE.Vector2(Math.max(0.0001, rr), W(z)));
    if (pts.length) v.push(new THREE.Vector2(0, W(pts[pts.length - 1][0])));
    const g = new THREE.LatheGeometry(v, 96); g.computeVertexNormals(); return g;
  }
  function startFall(rest, sim) {
    falling.geometry.dispose(); falling.geometry = latheFrom(rest, sim, false);
    falling.position.set(0, H, 0); falling.rotation.set(0, 0, -Math.PI / 2); falling.visible = true;
    fallState = { v: 0, t: 0 };
  }

  /* ---------------- virutas y refrigerante ---------------- */
  const NCH = 500;
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 0.95, roughness: 0.3 });
  const chips = new THREE.InstancedMesh(new THREE.TorusGeometry(3, 0.6, 4, 12, Math.PI * 1.4), chipMat, NCH);
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage); chips.castShadow = true; scene.add(chips);
  const chipData = Array.from({ length: NCH }, () => ({ p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }));
  let chipNext = 0;
  const dummy = new THREE.Object3D();
  const NCO = 260;
  const cool = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xbfe6ff, size: 3, transparent: true, opacity: 0.6, depthWrite: false }));
  cool.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NCO * 3), 3)); scene.add(cool);
  const coolData = Array.from({ length: NCO }, () => ({ t: Math.random(), o: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6) }));
  const sparks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffb347, size: 5, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3)); scene.add(sparks); sparks.visible = false;
  let sparkData = [];

  /* ---------------- estado de máquina por bloque ---------------- */
  let lineState = new Map();
  function computeLineStates() {
    lineState = new Map(); const st = { sp: 0, cool: false };
    for (const b of A().parsed.blocks) {
      const m = b.w.M ? Math.round(b.w.M.v) : null;
      if (m === 3 || m === 4) st.sp = m; else if (m === 5 || m === 2 || m === 30) st.sp = 0;
      if (m === 8) st.cool = true; else if (m === 9 || m === 2 || m === 30) st.cool = false;
      lineState.set(b.line, { sp: st.sp, cool: st.cool });
    }
  }
  const m9 = {}; on('m9render', M => Object.assign(m9, M)); emit('mach9state', M => Object.assign(m9, M));

  /* ---------------- torreta ---------------- */
  function buildTurretTools() {
    for (const g of toolGroups.values()) mac.disc.remove(g);
    toolGroups.clear();
    const T = toolsMap();
    for (let pos = 1; pos <= MACHINE.turret.positions; pos++) {
      const holder = new THREE.Group(); holder.rotation.x = -(pos - 1) * Math.PI / 4;
      const t = T[pos];
      if (t) { const tg = buildTool(t, mac.M); tg.position.z = mac.RD; holder.add(tg); }
      else { const blank = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), mac.M.dark); blank.position.z = mac.RD - 120; holder.add(blank); }
      mac.disc.add(holder); toolGroups.set(pos, holder);
    }
  }
  let turretAngle = 0, turretTarget = 0, curTool = 1;
  function setTool(n) { if (!n || n === curTool) return; curTool = n; turretTarget = (n - 1) * Math.PI / 4; }

  /* ---------------- garras / contrapunta / puerta ---------------- */
  let jawOpen = 1, jawTarget = 0, doorOpen = 1, doorTarget = 1, quill = 0, quillTarget = 0;
  function setJaws(r) { for (const j of mac.jaws) j.position.y = r; }
  on('chuck', closed => { jawTarget = closed ? 0 : 1; });
  on('quill', q => { quillTarget = q ? 1 : 0; });

  /* ---------------- cámara ---------------- */
  let camMode = 1, follow = false, camAnim = null;
  function camPreset(n) {
    const sim = simRef(); const stick = sim ? sim.face - sim.zJaw : 80, cx = stick * 0.45;
    if (n === 1) return { p: new THREE.Vector3(cx + 150, H + 150, 300), t: new THREE.Vector3(cx - 15, H - 15, -45) };
    if (n === 2) return { p: new THREE.Vector3(1700, 1900, 3300), t: new THREE.Vector3(250, 1050, 0) };
    if (n === 3) return { p: new THREE.Vector3(cx, H + 900, 60), t: new THREE.Vector3(cx, H, -20) };
    return { p: new THREE.Vector3(cx + 60, H + 120, 260), t: new THREE.Vector3(cx, H, 0) };
  }
  function flyTo(n, ms = 1400) {
    const to = camPreset(n); camMode = n;
    camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: to.p, t1: to.t, s: performance.now(), ms };
  }

  /* ---------------- HUD y teclas ---------------- */
  function renderTools() {
    tools.innerHTML = '';
    const b = (txt, title, fn, on_) => el('button', { class: 's3btn' + (on_ ? ' on' : ''), title, onclick: fn }, txt);
    tools.append(
      b('📦 Cargar pieza', 'Pieza en bruto', () => openDrawer('stock'), drawerTab === 'stock' && drawer.classList.contains('open')),
      b('🔧 Herramientas', 'Torreta y biblioteca', () => openDrawer('tools'), drawerTab === 'tools' && drawer.classList.contains('open')),
      b('🔍 Pieza final', 'Ver la pieza en detalle', () => { openDrawer('final'); setInspect(true); }, inspect),
      b('🎥', 'Cambiar vista (VENT.)', () => fkey('F9')));
  }
  let group = 3;
  function renderStrip() {
    strip.innerHTML = '';
    const k = (id, label, cls = '', title) => el('button', { class: 'key ' + cls, 'data-k': id, title: title || label }, el('span', { html: label }));
    const fl = el('div', { class: 'fl' }, F_LABELS.map((l, i) => k('F' + (i + 1), `<small>F${i + 1}</small>${l}`)));
    const g = BOTTOM_NAMES[m9.group != null ? m9.group : group];
    const fb = el('div', { class: 'fb' }, k('GUP', '▲', 'blue', 'Grupo anterior'), [10, 11, 12, 13, 14].map((n, i) => k('F' + n, `<small>F${n}</small>${g[i] || '—'}`)), k('GRIGHT', '►', 'blue', 'Grupo siguiente'), k('EXIT', 'EXIT', 'orange'));
    const pb = (cls, label, fn) => el('div', { class: 'pbwrap' }, el('button', { class: 'pb ' + cls, 'aria-label': label, onclick: fn }, el('i')), el('span', null, label));
    const ov = el('label', { class: 'ov' }, 'F %', el('input', { type: 'range', min: 0, max: 140, step: 10, value: S.ui.fOv, oninput: e => { S.ui.fOv = +e.target.value; emit('override', S.ui); save(); } }));
    strip.append(fl, fb, el('div', { class: 'cyc' }, ov, pb('red', 'STOP', () => emit('cycleKey', 'stop')), pb('orange', 'BLOQUE', () => emit('cycleKey', 'block')), pb('green', 'START', () => emit('cycleKey', 'start'))));
  }
  strip.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) fkey(b.dataset.k); });
  function fkey(k) {
    if (/^F1[0-4]$|^GUP$|^GRIGHT$/.test(k)) { emit('fkey', k); setTimeout(renderStrip, 30); return; }
    if (k === 'EXIT') { if (inspect) setInspect(false); else if (drawer.classList.contains('open')) closeDrawer(); else flyTo(2); return; }
    const sh = shift; shift = false;
    if (sh && k === 'F1') return toggleSection();
    if (sh && k === 'F2') return toggleDims();
    if (sh && k === 'F3') return toggleCompare();
    if (sh && k === 'F4') return setInspect(!inspect);
    switch (k) {
      case 'F1': for (const c of chipData) c.life = 0; pathGroup.clear(); toast('Virutas y trayectoria limpias.'); break;
      case 'F2': showPath = !showPath; buildPath(); toast(showPath ? 'Trayectoria visible (punteado = rápido).' : 'Trayectoria oculta.'); break;
      case 'F3': doorTarget = doorTarget ? 0 : 1; toast(doorTarget ? 'Puerta abierta.' : 'Puerta cerrada.'); break;
      case 'F4': flyTo(inspect ? 4 : 1); break;
      case 'F5': limitsBox.visible = !limitsBox.visible; updateLimits(); break;
      case 'F6': follow = !follow; toast(follow ? 'La cámara sigue a la herramienta.' : 'Cámara libre.'); break;
      case 'F7': dolly(0.75); break;
      case 'F8': dolly(1.33); break;
      case 'F9': flyTo(camMode % 3 + 1); toast(['', 'Vista 1: zona de corte', 'Vista 2: máquina completa', 'Vista 3: superior'][camMode]); break;
    }
  }
  let shift = false;
  function dolly(f) { const d = camera.position.clone().sub(controls.target).multiplyScalar(f); camera.position.copy(controls.target).add(d); }
  document.addEventListener('keydown', e => {
    if (S.ui.screen !== 'sim3d' || document.querySelector('.modal') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (/^F([1-9]|1[0-4])$/.test(e.key)) { e.preventDefault(); shift = e.shiftKey; fkey(e.key); }
    else if (e.key === 'Escape') fkey('EXIT');
    else if (e.key === ' ') { e.preventDefault(); emit('cycleKey', P.state === 'run' ? 'stop' : 'start'); }
    else if (e.key === 'Enter') emit('cycleKey', 'block');
  });

  /* ---------------- trayectoria 3D ---------------- */
  let showPath = false;
  function buildPath() {
    pathGroup.clear(); if (!showPath || !A()) return;
    const feed = [], rap = [];
    for (const m of A().run.moves) {
      const arr = m.kind === 'rapid' ? rap : feed;
      arr.push(W(m.z0), H, -m.x0 / 2, W(m.z1), H, -m.x1 / 2);
    }
    const mk = (arr, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const l = new THREE.LineSegments(g, mat); l.computeLineDistances(); return l; };
    pathGroup.add(mk(feed, new THREE.LineBasicMaterial({ color: 0x41ff86 })), mk(rap, new THREE.LineDashedMaterial({ color: 0x2f9c4e, dashSize: 3, gapSize: 3 })));
  }
  function updateLimits() { const sim = simRef(); if (!sim) return; limitsBox.box.set(new THREE.Vector3(W(sim.zJaw), H - sim.barR, -sim.barR), new THREE.Vector3(W(sim.face), H + sim.barR, sim.barR)); }

  /* ---------------- inspección de la pieza final ---------------- */
  let inspect = false, section = false, dims = false, compare = false;
  const insp = new THREE.Group(); insp.visible = false; scene.add(insp);
  const inspMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: false, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
  inspMesh.rotation.z = -Math.PI / 2; inspMesh.castShadow = true; insp.add(inspMesh);
  const capMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xc94b3d, roughness: 0.7, side: THREE.DoubleSide })); insp.add(capMesh);
  const targetLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffd54a, dashSize: 1.2, gapSize: 0.8 })); insp.add(targetLine);
  const dimGroup = new THREE.Group(); insp.add(dimGroup);
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(160, 170, 20, 64), new THREE.MeshStandardMaterial({ color: 0x23292e, roughness: 0.6, metalness: 0.3 }));
  insp.add(turntable);

  function finalProfile() {
    const a = A(); const sim = a.sim; let pts = stockPolyline(sim, a.final.r, a.final.threads, 1).filter(p => p[1] > 0);
    if (a.final.parted) pts = pts.filter(p => p[0] >= a.final.parted.z - 1e-6);   // la pieza tronzada
    else pts = pts.filter(p => p[0] >= sim.zJaw - 0.01);
    return rdp(pts, 0.004);
  }
  function buildInspect() {
    const a = A(); if (!a) return;
    const pts = finalProfile(); if (pts.length < 2) return;
    const z0 = pts[0][0], z1 = pts[pts.length - 1][0], L = z1 - z0, rmax = Math.max(...pts.map(p => p[1]));
    insp.position.set(0, H - 40, 0);
    const v = [new THREE.Vector2(0, 0)].concat(pts.map(([z, r]) => new THREE.Vector2(r, z - z0)), [new THREE.Vector2(0, L)]);
    const g = new THREE.LatheGeometry(v, 128); g.computeVertexNormals();
    // colores por desvío respecto al perfil objetivo
    const m = material();
    const col = new THREE.Color(m.color), cols = [], pos = g.attributes.position;
    const dev = a.dev;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), rr = Math.hypot(pos.getX(i), pos.getZ(i));
      let c = col;
      if (compare && dev && dev.RP) {
        const k = Math.round((y + z0 - a.sim.z0) / a.sim.h), rp = dev.RP[k];
        if (Number.isFinite(rp) && rr > 0.05) { const d = rr - rp; c = d < -0.05 ? new THREE.Color(0xff3b30) : d > 0.1 ? new THREE.Color(0xffb020) : new THREE.Color(0x3ddc84); }
      }
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    inspMesh.geometry.dispose(); inspMesh.geometry = g;
    inspMesh.material.vertexColors = true; inspMesh.material.color.set(0xffffff); inspMesh.material.metalness = compare ? 0.2 : m.metal; inspMesh.material.roughness = compare ? 0.6 : m.rough;
    inspMesh.material.clippingPlanes = section ? [clip] : []; inspMesh.material.needsUpdate = true;
    inspMesh.position.set(-L / 2, 0, 0);
    turntable.position.set(0, -rmax - 25, 0); { const k = Math.max(0.25, L * 0.75 / 160); turntable.scale.set(k, 1, k); }
    // tapa de la sección
    if (section) {
      const sh = new THREE.Shape(); sh.moveTo(-L / 2, 0); pts.forEach(([z, r]) => sh.lineTo(z - z0 - L / 2, r)); sh.lineTo(L / 2, 0);
      [...pts].reverse().forEach(([z, r]) => sh.lineTo(z - z0 - L / 2, -r)); sh.closePath();
      capMesh.geometry.dispose(); capMesh.geometry = new THREE.ShapeGeometry(sh); capMesh.visible = true;
    } else capMesh.visible = false;
    // perfil objetivo
    if (compare && a.prof) {
      const tp = [];
      for (const s of a.prof.segs) for (let k = 0; k <= 16; k++) { const q = segPt(s, k / 16); tp.push(new THREE.Vector3(q.z - z0 - L / 2, q.r, 0.6)); }
      targetLine.geometry.dispose(); targetLine.geometry = new THREE.BufferGeometry().setFromPoints(tp); targetLine.computeLineDistances(); targetLine.visible = true;
    } else targetLine.visible = false;
    // cotas
    dimGroup.clear();
    for (const o of [...dimGroup.children]) dimGroup.remove(o);
    if (dims) addDims(pts, z0, L);
    return { L, rmax };
  }
  function segPt(s, t) {
    if (s.t === 'L') return { z: s.p0.z + (s.p1.z - s.p0.z) * t, r: s.p0.r + (s.p1.r - s.p0.r) * t };
    const R = Math.hypot(s.p0.z - s.c.z, s.p0.r - s.c.r); let a0 = Math.atan2(s.p0.r - s.c.r, s.p0.z - s.c.z), a1 = Math.atan2(s.p1.r - s.c.r, s.p1.z - s.c.z);
    if (s.ccw) { while (a1 <= a0) a1 += 2 * Math.PI; } else { while (a1 >= a0) a1 -= 2 * Math.PI; }
    const a = a0 + (a1 - a0) * t; return { z: s.c.z + R * Math.cos(a), r: s.c.r + R * Math.sin(a) };
  }
  function label(txt, x, y, z, cls = '') { const d = el('div', { class: 'dimlbl ' + cls }, txt); const o = new CSS2DObject(d); o.position.set(x, y, z); dimGroup.add(o); return o; }
  function addDims(pts, z0, L) {
    const rmax = Math.max(...pts.map(p => p[1]));
    const lm = new THREE.LineBasicMaterial({ color: 0xffd54a });
    const ln = (a, b) => dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lm));
    const yL = -rmax - 14;
    ln(new THREE.Vector3(-L / 2, yL, 0), new THREE.Vector3(L / 2, yL, 0));
    label(`${es(L, 2)} mm`, 0, yL - 4, 0, 'len');
    // diámetros de los tramos cilíndricos
    const steps = []; let i = 0;
    while (i < pts.length - 1) {
      let j = i; while (j + 1 < pts.length && Math.abs(pts[j + 1][1] - pts[i][1]) < 0.01) j++;
      if (pts[j][0] - pts[i][0] > 2) steps.push({ z: (pts[i][0] + pts[j][0]) / 2, r: pts[i][1], len: pts[j][0] - pts[i][0] });
      i = j + 1;
    }
    const seen = new Set();
    for (const s of steps.slice(0, 10)) {
      const key = s.r.toFixed(2); if (seen.has(key) && steps.length > 5) continue; seen.add(key);
      const x = s.z - z0 - L / 2;
      ln(new THREE.Vector3(x, -s.r, 0), new THREE.Vector3(x, s.r, 0));
      label(`Ø${es(2 * s.r, 2)}`, x, s.r + 6, 0);
    }
  }
  function setInspect(onv) {
    if (onv && (!A() || P.state === 'run' || P.state === 'block')) { toast('Espera a que termine el programa.'); return; }
    inspect = onv; insp.visible = onv; renderPrep(); mac.group.visible = !onv; floor.visible = true; chips.visible = !onv; pathGroup.visible = !onv;
    if (onv) { const r = buildInspect(); const d = Math.max(90, (r ? r.L : 100) * 1.25); camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(d * 0.35, H + d * 0.25, d * 0.9), t1: new THREE.Vector3(0, H - 40, 0), s: performance.now(), ms: 900 }; }
    else flyTo(1);
    renderTools(); renderDrawer();
  }
  const toggleSection = () => { section = !section; if (inspect) buildInspect(); renderDrawer(); };
  const toggleDims = () => { dims = !dims; if (inspect) buildInspect(); renderDrawer(); };
  const toggleCompare = () => { compare = !compare; if (!A().prof) toast('No hay perfil objetivo: defínelo en Archivo → Generar programa.'); if (inspect) buildInspect(); renderDrawer(); };

  /* ---------------- cajón lateral ---------------- */
  let drawerTab = 'stock';
  function openDrawer(t) { if (drawer.classList.contains('open') && drawerTab === t) return closeDrawer(); drawerTab = t; drawer.classList.add('open'); renderDrawer(); renderTools(); }
  function closeDrawer() { drawer.classList.remove('open'); renderTools(); }
  function renderDrawer() {
    drawer.innerHTML = '';
    const head = el('div', { class: 'dh' }, ['stock', 'tools', 'final'].map(t => el('button', { class: drawerTab === t ? 'on' : '', onclick: () => { drawerTab = t; renderDrawer(); } }, { stock: 'Pieza en bruto', tools: 'Herramientas', final: 'Pieza final' }[t])),
      el('button', { class: 'x', 'aria-label': 'Cerrar', onclick: closeDrawer }, '✕'));
    drawer.append(head);
    if (drawerTab === 'stock') drawer.append(stockForm());
    else if (drawerTab === 'tools') drawer.append(toolsForm());
    else drawer.append(finalPanel());
  }
  function stockForm() {
    const st = Object.assign({}, S.stock);
    const f = el('div', { class: 'dbody' });
    const matSel = el('div', { class: 'mats' }, Object.entries(MATERIALS).map(([name, m]) => el('button', { class: 'mat' + (st.material === name ? ' on' : ''), onclick: () => { st.material = name; f.querySelectorAll('.mat').forEach(b => b.classList.toggle('on', b.dataset.n === name)); check(); }, 'data-n': name },
      el('i', { style: { background: '#' + m.color.toString(16).padStart(6, '0'), boxShadow: m.metal > 0.5 ? 'inset -4px -4px 8px #0006, inset 3px 3px 6px #fff8' : 'inset -3px -3px 6px #0003' } }), name)));
    const num = (k, label, step = 'any') => el('label', { class: 'field' }, label, el('input', { type: 'number', step, value: st[k], inputmode: 'decimal', oninput: e => { st[k] = parseFloat(e.target.value); check(); } }));
    const pills = el('div', { class: 'pills' }, BAR_SIZES.map(d => el('button', { class: 'pill' + (Math.abs(d - st.barD) < 1e-6 ? ' on' : ''), onclick: e => { st.barD = d; f.querySelector('input').value = d; f.querySelectorAll('.pill').forEach(p => p.classList.toggle('on', p === e.target)); check(); } }, barLabel(d))));
    const notes = el('div');
    const check = () => {
      const ms = checkStock(st); notes.innerHTML = '';
      if (!ms.length) notes.append(el('div', { class: 'note ok' }, `✔ La pieza cabe en la máquina (volteo Ø${MACHINE.swing}, husillo Ø${MACHINE.spindle.bore}, entre puntas ${MACHINE.betweenCenters} mm).`));
      for (const m of ms) notes.append(el('div', { class: 'note ' + (m.sev === 'error' ? 'e' : 'w') }, el('b', null, m.code), el('br'), m.text, el('br'), el('small', null, 'En la máquina real: ' + explain(m.code).effect)));
    };
    const mat = MATERIALS[st.material];
    f.append(el('h4', null, 'Material'), matSel,
      el('h4', null, 'Diámetro de la barra (mm)'), el('div', { class: 'grid2' }, num('barD', 'Diámetro Ø')), el('small', { class: 'hint' }, 'Medidas comerciales:'), pills,
      el('div', { class: 'grid2' }, num('barLen', 'Longitud total (mm)'), num('grip', 'Largo sujeto en las garras (mm)'), num('faceStock', 'Sobremetal en la cara (mm)')),
      el('small', { class: 'hint' }, `Datos de corte del material: Vc desbaste ≈ ${mat ? mat.vcR : '—'} m/min, acabado ≈ ${mat ? mat.vcF : '—'} m/min; se usan en el cálculo de potencia (Ks del manual).`),
      notes,
      el('div', { class: 'acts' }, el('button', { class: 'btn pri', onclick: () => loadStock(st) }, 'Cargar pieza en el plato')));
    check(); return f;
  }
  function loadStock(st) {
    const errs = checkStock(st).filter(m => m.sev === 'error');
    const go = () => {
      jawTarget = 1; doorTarget = 1;                 // abre garras y puerta
      setTimeout(() => { Object.assign(S.stock, st); save(); emit('stock', S.stock); reanalyze(true); applyMaterial(); loadAnim = performance.now(); setTimeout(() => { jawTarget = 0; toast(`Pieza cargada: ${st.material} Ø${es(st.barD, 2)} × ${es(st.barLen, 0)} mm. Garras cerradas.`); }, 650); }, 500);
    };
    if (errs.length) modal('La pieza no cabe en la máquina', el('div', null, errs.map(m => el('div', { class: 'note e' }, el('b', null, m.code), el('br'), m.text))), [{ label: 'Corregir', value: false }, { label: 'Cargar igual', cls: 'danger', value: true }]).then(ok => ok && go());
    else go();
  }
  let loadAnim = 0;
  function toolsForm() {
    const f = el('div', { class: 'dbody' });
    const rows = [];
    for (let pos = 1; pos <= MACHINE.turret.positions; pos++) {
      const cur = S.turret.find(t => t.num === pos);
      const sel = el('select', null, el('option', { value: '' }, '— vacía —'), TOOL_LIBRARY.map(l => el('option', { value: l.id, selected: cur && cur.lib === l.id }, l.name)));
      const rn = el('input', { type: 'number', step: '0.1', min: 0, value: cur && cur.rn ? cur.rn : 0, title: 'Radio de punta (mm)', style: { width: '70px' } });
      rows.push({ pos, sel, rn });
      f.append(el('div', { class: 'trow' }, el('b', null, 'T' + String(pos).padStart(2, '0')), sel, el('label', { class: 'rn' }, 'rn', rn)));
    }
    f.prepend(el('p', { class: 'hint' }, `Torreta ${MACHINE.turret.model} · ${MACHINE.turret.positions} posiciones (por confirmar). rn = radio de punta: con rn > 0 la simulación deja el material que dejaría la punta redondeada sin compensación G41/G42.`));
    f.append(el('div', { class: 'acts' }, el('button', { class: 'btn pri', onclick: () => {
      S.turret = rows.filter(r => r.sel.value).map(r => { const l = TOOL_LIBRARY.find(x => x.id === r.sel.value); return Object.assign({ num: r.pos, lib: l.id, use: l.use, type: l.type }, l.k2 != null ? { k2: l.k2 } : {}, l.w ? { w: l.w, ref: l.ref } : {}, l.type === 'turn' ? { rn: parseFloat(r.rn.value) || 0 } : {}); });
      save(); buildTurretTools(); reanalyze(true); toast('Torreta actualizada.');
    } }, 'Aplicar a la torreta')));
    return f;
  }
  function finalPanel() {
    const a = A(); const f = el('div', { class: 'dbody' });
    if (!a) return f;
    const st = a.stats;
    f.append(el('div', { class: 'acts2' },
      el('button', { class: 'tbtn' + (inspect ? ' on' : ''), onclick: () => setInspect(!inspect) }, inspect ? '↩ Volver a la máquina' : '🔍 Ver en detalle'),
      el('button', { class: 'tbtn' + (section ? ' on' : ''), onclick: toggleSection }, '✂ Sección'),
      el('button', { class: 'tbtn' + (dims ? ' on' : ''), onclick: toggleDims }, '📏 Cotas'),
      el('button', { class: 'tbtn' + (compare ? ' on' : ''), onclick: toggleCompare }, '🎯 Comparar')),
      el('div', { class: 'dro', style: { marginTop: '10px' } },
        ...[['Tiempo de ciclo', mmss(st.time)], ['Bloques', st.blocks], ['Material quitado', es(st.removed / 1000, 1) + ' cm³'], ['Masa quitada', es(st.mass, 0) + ' g'], ['Vc máx.', es(st.vcMax, 0) + ' m/min'], ['Pasada máx.', es(st.maxDepth, 2) + ' mm']]
          .map(([k, v]) => el('div', null, el('small', null, k), el('b', null, String(v))))));
    if (a.dev) {
      f.append(el('h4', null, 'Comparación con el perfil objetivo'), devChart(a),
        el('p', { class: 'hint' }, `Sobrecorte máx.: ${es(a.dev.over, 3)} mm · Material sobrante máx.: ${es(a.dev.left, 3)} mm. Verde = dentro de ±0,05 mm; rojo = bajo medida; ámbar = sobre medida.`));
    } else f.append(el('p', { class: 'hint' }, 'Sin perfil objetivo. Define uno en Archivo → Generar programa (CAM) para comparar.'));
    f.append(el('h4', null, 'Exportar'), el('div', { class: 'acts2' },
      el('button', { class: 'tbtn', onclick: async () => (await import('../export.js')).exportSTL() }, '🧊 STL'),
      el('button', { class: 'tbtn', onclick: async () => (await import('../export.js')).exportPNG(api) }, '🖼 PNG'),
      el('button', { class: 'tbtn', onclick: async () => (await import('../export.js')).exportPDF(api) }, '📄 Reporte PDF')));
    return f;
  }
  function devChart(a) {
    const sim = a.sim, RP = a.dev.RP, w = 300, h = 110, pts = [];
    let zmin = Infinity, zmax = -Infinity;
    for (let k = 0; k < sim.n; k += 5) if (Number.isFinite(RP[k]) && a.final.r[k] > 0) { const z = sim.z0 + k * sim.h, d = a.final.r[k] - RP[k]; pts.push([z, d]); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
    if (!pts.length) return el('div');
    const dm = Math.max(0.1, ...pts.map(p => Math.abs(p[1])));
    const X = z => 10 + (z - zmin) / (zmax - zmin || 1) * (w - 20), Y = d => h / 2 - d / dm * (h / 2 - 8);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    return el('div', { class: 'devc', html: `<svg viewBox="0 0 ${w} ${h}" width="100%"><rect x="0" y="0" width="${w}" height="${h}" rx="8" fill="#0a0f12"/>
      <rect x="10" y="${Y(0.05)}" width="${w - 20}" height="${Y(-0.05) - Y(0.05)}" fill="#3ddc8422"/><line x1="10" x2="${w - 10}" y1="${Y(0)}" y2="${Y(0)}" stroke="#3ddc84" stroke-dasharray="3 3"/>
      <path d="${path}" fill="none" stroke="#ffd54a" stroke-width="1.5"/><text x="12" y="14" fill="#93a2a6" font-size="10">+${es(dm, 2)} mm</text><text x="12" y="${h - 4}" fill="#93a2a6" font-size="10">−${es(dm, 2)} mm</text>
      <text x="${w - 12}" y="${h - 4}" fill="#93a2a6" font-size="10" text-anchor="end">Z ${es(zmin, 0)} … ${es(zmax, 0)}</text></svg>` });
  }

  /* ---------------- preparación rápida ---------------- */
  function renderPrep() {
    const ready = (m9.axes && m9.ref) || inspect;
    prep.hidden = ready;
    if (!ready) {
      prep.innerHTML = '';
      prep.append(el('div', null, el('b', null, 'La máquina no está lista'), el('br'),
        !m9.access ? 'Falta el código de acceso, conectar los ejes (EN MANDO) y referenciar.' : !m9.axes ? 'Ejes desconectados: busca EN MANDO y pulsa F10.' : 'Máquina sin referenciar: MANUAL → F5 → START.'),
        el('div', { class: 'acts2' }, el('button', { class: 'tbtn', onclick: () => emit('screen', 'mach9') }, 'Hacerlo en el panel'), el('button', { class: 'btn pri', onclick: () => emit('quickprep') }, 'Preparar automáticamente')));
    }
  }

  /* ---------------- eventos ---------------- */
  let prevMi = -1, lastImpact = -1;
  function onAnalysis() {
    computeLineStates(); applyMaterial(); buildTurretTools(); lastKey = ''; rebuildStock(true); buildPath(); updateLimits();
    lastImpact = -1; prevMi = -1; if (inspect) buildInspect(); if (drawerTab === 'final' && drawer.classList.contains('open')) renderDrawer();
    tail();
  }
  function tail() { const sim = simRef(); if (!sim) return; mac.tail.position.x = Math.max(W(sim.face) + 140, 700); }
  on('analysis', onAnalysis);
  on('frame', () => { rebuildStock(); checkImpacts(); });
  on('player', () => { rebuildStock(true); if (P.state === 'run' || P.state === 'block') { doorTarget = 0; if (inspect) setInspect(false); } if (P.state === 'done') { doorTarget = 1; setTimeout(() => toast('Programa terminado. Abre “Pieza final” para verla en detalle.', 4000), 200); } renderPrep(); });
  on('m9render', () => { renderStrip(); renderPrep(); });
  on('screenShown', n => { if (n === 'sim3d') { resize(); renderStrip(); renderPrep(); } });

  function checkImpacts() {
    const a = A(); if (!a || P.mi < 0) return;
    for (let i = Math.max(prevMi, 0); i <= P.mi; i++) {
      if (i <= lastImpact) continue;
      if (a.sim.mColl[i] || a.sim.mChuck[i]) {
        lastImpact = i; const m = a.run.moves[i];
        impact(a.sim.mChuck[i] ? 'CHOQUE CON EL PLATO' : 'COLISIÓN EN RÁPIDO (G0)', m);
      }
    }
    prevMi = P.mi;
    // pieza suelta: el programa corre con las garras abiertas
    if (jawTarget === 1 && (P.state === 'run' || P.state === 'block') && !looseWarned) {
      looseWarned = true;
      emit('simmsgs', [simMsg('error', P.lastLine, 'PIEZA SUELTA', 'El ciclo se ejecuta con las garras abiertas (SUEL/PREN PIEZA).', 'Las garras no sujetan la barra: no se puede cortar sin sujetarla.', 'Con la barra suelta girando, la herramienta la arranca y sale despedida: peligro grave para el operador y daño de la máquina.', 'Pulsa SUEL/PREN PIEZA (F10) para cerrar las garras antes del ciclo.')]);
      toast('¡PIEZA SUELTA! Las garras están abiertas.');
    }
  }
  let looseWarned = false; on('chuck', () => { looseWarned = false; });
  function simMsg(sev, line, code, text, why, effect, fix) {
    const a = A(); return { sev, line: line || 0, code, text, why, effect, fix, src: 'sim', raw: line && a ? (a.lines[line - 1] || '').trim() : '' };
  }
  function impact(code, m) {
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    shake = 1;
    const tip = toolTipWorld();
    sparkData = Array.from({ length: 120 }, () => ({ p: tip.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.2) * 3), life: 1 }));
    sparks.visible = true;
    toast(`¡${code}! Fila ${m.line}: ${explain(code).effect}`, 5000);
  }
  let shake = 0;

  /* ---------------- bucle de render ---------------- */
  function toolTipWorld() {
    const tp = toolPos();
    if (P.state === 'idle' && P.mi < 0) {
      const sim = simRef(); const mp = m9.manual || { x: 100, z: 100 };
      if (!tp || m9.page === 'manual') return new THREE.Vector3(W(mp.z), H, -mp.x / 2);
    }
    return tp ? new THREE.Vector3(W(tp.z), H, -tp.x / 2) : new THREE.Vector3(200, H, -60);
  }
  function resize() {
    const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); labels.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(view);
  let last = performance.now(), spinAngle = 0;
  const tmpV = new THREE.Vector3();
  function loop(now) {
    requestAnimationFrame(loop);
    if (S.ui.screen !== 'sim3d') return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const a = A();
    // cámara
    if (camAnim) {
      const f = Math.min(1, (now - camAnim.s) / camAnim.ms), e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, e); controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
      if (f >= 1) camAnim = null;
    }
    // herramienta y carros
    const tip = toolTipWorld();
    mac.turret.position.copy(tip); mac.carriage.position.x = tip.x; mac.cross.position.z = tip.z + 60;
    if (follow && !inspect && !camAnim) { tmpV.copy(tip).sub(controls.target).multiplyScalar(0.08); controls.target.add(tmpV); camera.position.add(tmpV); }
    // torreta
    const tp = toolPos(); if (tp && tp.tool && P.mi >= 0) setTool(tp.tool); else if (a && P.mi < 0 && a.run.moves[0]) setTool(a.run.moves[0].tool || 1);
    turretAngle += (turretTarget - turretAngle) * Math.min(1, dt * 8); mac.disc.rotation.x = turretAngle;
    // husillo
    const ls = tp && tp.m ? lineState.get(tp.m.line) : null;
    const running = P.state === 'run' || P.state === 'block';
    let sp = ls && P.mi >= 0 && P.state !== 'idle' && P.state !== 'estop' ? ls.sp : 0;
    if (!running && m9.spindle) sp = m9.spindle;
    const rpm = sp ? (tp && tp.m && tp.m.rpm ? tp.m.rpm : 600) * S.ui.sOv / 100 : 0;
    const w = Math.min(rpm, 520) / 60 * 2 * Math.PI * (sp === 4 ? -1 : 1);
    spinAngle += w * dt; mac.rot.rotation.x = spinAngle;
    // garras, puerta, contrapunta
    jawOpen += (jawTarget - jawOpen) * Math.min(1, dt * 6);
    const barR = a ? a.sim.barR : 12.5; setJaws(barR + jawOpen * 18);
    doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 4); mac.door.position.x = 430 + doorOpen * 980;
    quill += (quillTarget - quill) * Math.min(1, dt * 5); mac.quill.position.x = -quill * 120;
    // carga de la barra (desliza hacia el plato)
    if (loadAnim) { const f = Math.min(1, (now - loadAnim) / 600); stock.position.y = (1 - f) * 120; if (f >= 1) loadAnim = 0; }
    // virutas
    const cutting = running && a && P.mi >= 0 && a.run.moves[P.mi] && a.run.moves[P.mi].kind !== 'rapid' && a.sim.mRem[P.mi] > 0.005 && sp;
    if (cutting && S.ui.fOv > 0) for (let k = 0; k < 3; k++) {
      const c = chipData[chipNext]; chipNext = (chipNext + 1) % NCH;
      c.p.copy(tip).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, 1));
      c.v.set((Math.random() - 0.3) * 50, 40 + Math.random() * 90, 25 + Math.random() * 60); c.w.set(Math.random() * 14, Math.random() * 14, Math.random() * 14); c.life = 3;
    }
    for (let i = 0; i < NCH; i++) {
      const c = chipData[i];
      if (c.life > 0) {
        c.life -= dt; c.v.y -= 900 * dt; c.p.addScaledVector(c.v, dt);
        if (c.p.y < 760) { c.p.y = 760; c.v.set(0, 0, 0); }
        c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
        dummy.position.copy(c.p); dummy.rotation.copy(c.r); dummy.scale.setScalar(1);
      } else { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0.0001); }
      dummy.updateMatrix(); chips.setMatrixAt(i, dummy.matrix);
    }
    chips.instanceMatrix.needsUpdate = true;
    // refrigerante
    const coolOn = (ls && ls.cool && running) || m9.coolant;
    cool.visible = !!coolOn && !inspect;
    if (cool.visible) {
      const src = tip.clone().add(new THREE.Vector3(-25, 45, -30)), arr = cool.geometry.attributes.position.array;
      coolData.forEach((d, i) => { d.t = (d.t + dt * 2.2) % 1; const p = src.clone().lerp(tip, d.t).add(d.o.clone().multiplyScalar(d.t)); p.y -= d.t * d.t * 20; arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
      cool.geometry.attributes.position.needsUpdate = true;
    }
    // chispas
    if (sparks.visible) {
      const arr = sparks.geometry.attributes.position.array; let alive = 0;
      sparkData.forEach((s, i) => { s.life -= dt * 1.2; s.v.y -= dt * 6; s.p.addScaledVector(s.v, 60 * dt); arr[i * 3] = s.p.x; arr[i * 3 + 1] = s.p.y; arr[i * 3 + 2] = s.p.z; if (s.life > 0) alive++; });
      sparks.geometry.attributes.position.needsUpdate = true; sparks.material.opacity = Math.max(0, sparkData[0] ? sparkData[0].life : 0); if (!alive) sparks.visible = false;
    }
    // pieza que cae tras el tronzado
    if (fallState) { fallState.v += 900 * dt; falling.position.y -= fallState.v * dt; falling.rotation.x += dt * 2; if (falling.position.y < 780) { falling.position.y = 780; fallState.v = 0; } }
    // sacudida por choque
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 6; camera.position.y += (Math.random() - 0.5) * shake * 6; shake = Math.max(0, shake - dt * 2.5); }
    if (inspect) { if (section || dims) insp.rotation.y = 0; else insp.rotation.y += dt * 0.15; }
    // HUD
    if (now - (loop.h || 0) > 90) { loop.h = now; updateHud(tp, rpm); }
    controls.update();
    renderer.render(scene, camera);
    if (inspect && dims) labels.render(scene, camera); else if (labels.domElement.childElementCount) labels.domElement.innerHTML = '';
  }
  function updateHud(tp, rpm) {
    const a = A(); if (!a) return;
    const b = a.parsed.blocks, bi = tp && tp.m ? b.findIndex(x => x.line === tp.m.line) : -1;
    const pos = toolTipWorld();
    const status = P.state === 'run' ? 'OPERACION AUTOMATICA' : P.state === 'block' || (P.state === 'hold' && P.blockLine != null) ? 'BLOQUE A BLOQUE' : P.state === 'done' ? 'FIN DE PROGRAMA' : P.state === 'estop' ? 'EMERGENCIA' : P.state === 'hold' ? 'CICLO DETENIDO' : 'INACTIVO';
    hud.innerHTML = `<div class="st ${P.state}">${status}</div>
      <div class="xz"><span>X</span><b>${es(-pos.z * 2, 4)}</b><span>Z</span><b>${es(pos.x + simRef().zJaw, 4)}</b></div>
      <div class="row"><span>S ${Math.round(rpm)} rpm</span><span>F ${es((tp && tp.m && tp.m.F ? tp.m.F : 0) * S.ui.fOv / 100, 3)}</span><span>T${String(curTool).padStart(2, '0')}</span><span>${mmss(P.t)} / ${mmss(a.run.total)}</span></div>
      ${bi >= 0 && P.state !== 'idle' ? `<div class="blk">N${bi + 1} corriendo · <code>${esc(b[bi].raw.trim())}</code></div>` : ''}
      <div class="mtl">${esc(S.stock.material)} · Ø${es(S.stock.barD, 2)} × ${es(S.stock.barLen, 0)}</div>`;
  }

  // arranque: la cámara entra desde fuera a la zona de corte
  onAnalysis(); applyMaterial(); renderStrip(); renderTools(); renderDrawer(); renderPrep();
  const p2 = camPreset(2); camera.position.copy(p2.p).add(new THREE.Vector3(800, 400, 1500)); controls.target.copy(p2.t);
  resize();
  setTimeout(() => { flyTo(2, 900); setTimeout(() => { doorTarget = 1; flyTo(1, 2200); setTimeout(() => intro.classList.add('off'), 1600); }, 950); }, 100);
  requestAnimationFrame(loop);

  const api = { view: n => flyTo(n, 10), renderer, scene, camera, get inspect() { return inspect; }, snapshot: (type = 'image/png') => { renderer.render(scene, camera); return renderer.domElement.toDataURL(type, 0.9); }, finalProfile, stockMesh: () => (inspect ? inspMesh : stock) };
  window.__sim3d = api;
  return api;
}
