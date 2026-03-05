import * as THREE from 'three';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c1a14);
scene.fog = new THREE.Fog(0x1c1a14, 16, 30);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 60);
camera.position.set(0, 0.8, 7.5);

// ── Lights ────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffe8c8, 0.5));

const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(5, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 30;
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -5;
sun.shadow.bias = -0.001;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xc8d8ff, 0.5);
fill.position.set(-6, 3, -4);
scene.add(fill);

const back = new THREE.DirectionalLight(0xffe0a0, 0.35);
back.position.set(0, 2, -7);
scene.add(back);

scene.add(new THREE.HemisphereLight(0xffe8c0, 0x302810, 0.3));

// ── Texture helpers ───────────────────────────────────────────────────────────
function hexToRGB(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function makeFabricTex(hex, size = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const [r, g, b] = hexToRGB(hex);

  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);

  // Warp threads (horizontal)
  for (let y = 0; y < size; y += 4) {
    const d = y % 8 === 0 ? 22 : -10;
    ctx.fillStyle = `rgba(${r + d},${g + d},${b + d},0.5)`;
    ctx.fillRect(0, y, size, 2);
  }
  // Weft threads (vertical)
  for (let x = 0; x < size; x += 4) {
    const d = x % 8 === 0 ? 14 : -12;
    ctx.fillStyle = `rgba(${r + d},${g + d},${b + d},0.4)`;
    ctx.fillRect(x, 0, 2, size);
  }
  // Noise
  const id = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    id.data[i]     = Math.max(0, Math.min(255, id.data[i]     + n));
    id.data[i + 1] = Math.max(0, Math.min(255, id.data[i + 1] + n));
    id.data[i + 2] = Math.max(0, Math.min(255, id.data[i + 2] + n));
  }
  ctx.putImageData(id, 0, 0);

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 8);
  return t;
}

function makeNormalTex(size = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? '#9090ff' : '#7070ef';
    ctx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? '#8898ff' : '#7870ef';
    ctx.fillRect(x, 0, 2, size);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 8);
  return t;
}

function makeBagWithPrintTex(hex, size = 1024) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  const [r, g, b] = hexToRGB(hex);

  // ── Fabric base — full wrap ──
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    const d = y % 8 === 0 ? 22 : -10;
    ctx.fillStyle = `rgba(${r + d},${g + d},${b + d},0.5)`;
    ctx.fillRect(0, y, size, 2);
  }
  for (let x = 0; x < size; x += 4) {
    const d = x % 8 === 0 ? 14 : -12;
    ctx.fillStyle = `rgba(${r + d},${g + d},${b + d},0.4)`;
    ctx.fillRect(x, 0, 2, size);
  }
  const id2 = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < id2.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    id2.data[i]     = Math.max(0, Math.min(255, id2.data[i]     + n));
    id2.data[i + 1] = Math.max(0, Math.min(255, id2.data[i + 1] + n));
    id2.data[i + 2] = Math.max(0, Math.min(255, id2.data[i + 2] + n));
  }
  ctx.putImageData(id2, 0, 0);

  // ── Printed logo ──
  // LatheGeometry UVs: U 0→1 around circumference (0.5 = front/+Z face), V 0→1 bottom→top
  // Logo occupies U: 0.25→0.75, V: 0.22→0.78
  const lx = size * 0.25, ly = size * 0.22, lw = size * 0.50, lh = size * 0.56;

  // Ink absorption tint
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.fillRect(lx, ly, lw, lh);

  // Outer border
  ctx.strokeStyle = '#183878';
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(lx + size * 0.012, ly + size * 0.012, lw - size * 0.024, lh - size * 0.024);

  // Top red stripe
  ctx.fillStyle = '#bf1515';
  ctx.fillRect(lx, ly, lw, lh * 0.1);

  // Bottom red stripe
  ctx.fillStyle = '#bf1515';
  ctx.fillRect(lx, ly + lh * 0.9, lw, lh * 0.1);

  // White centre panel
  ctx.fillStyle = '#f3ede0';
  ctx.fillRect(lx + size * 0.01, ly + lh * 0.1, lw - size * 0.02, lh * 0.8);

  // Blue header band
  ctx.fillStyle = '#183878';
  ctx.fillRect(lx + size * 0.01, ly + lh * 0.1, lw - size * 0.02, lh * 0.22);

  // Wheat stalk icon (left of brand text)
  const iconCX = lx + lw * 0.22;
  const iconCY = ly + lh * 0.21;
  ctx.save();
  ctx.translate(iconCX, iconCY);
  ctx.strokeStyle = '#f0d060';
  ctx.fillStyle = '#f0d060';
  ctx.lineWidth = size * 0.003;
  ctx.lineCap = 'round';
  // stalk
  ctx.beginPath();
  ctx.moveTo(0, lh * 0.09);
  ctx.lineTo(0, -lh * 0.09);
  ctx.stroke();
  // grain kernels left
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-lw * 0.038, -i * lh * 0.022, lw * 0.022, lh * 0.011, Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // grain kernels right
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(lw * 0.038, -i * lh * 0.022, lw * 0.022, lh * 0.011, -Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Brand name
  const cx2 = lx + lw * 0.56;
  ctx.font = `900 ${Math.round(lw * 0.175)}px Arial Black, Impact, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.004;
  ctx.fillText('HARVEST', cx2, ly + lh * 0.235);
  ctx.font = `bold ${Math.round(lw * 0.088)}px Arial, sans-serif`;
  ctx.fillStyle = '#f0d060';
  ctx.fillText('P R O', cx2, ly + lh * 0.278);
  ctx.shadowBlur = 0;

  // Full-width product line
  const fcx = lx + lw * 0.5;
  ctx.font = `bold ${Math.round(lw * 0.072)}px Arial, sans-serif`;
  ctx.fillStyle = '#bf1515';
  ctx.textAlign = 'center';
  ctx.fillText('GRAIN STORAGE BAG', fcx, ly + lh * 0.43);

  ctx.font = `${Math.round(lw * 0.055)}px monospace`;
  ctx.fillStyle = '#222';
  ctx.fillText('2400 L  ·  50 KG MAX', fcx, ly + lh * 0.53);

  ctx.font = `${Math.round(lw * 0.044)}px monospace`;
  ctx.fillStyle = '#555';
  ctx.fillText('FOOD GRADE · UV STABILISED', fcx, ly + lh * 0.595);

  // Barcode
  const bcX = lx + lw * 0.27, bcY2 = ly + lh * 0.645, bcW = lw * 0.46, bcH = lh * 0.115;
  ctx.fillStyle = '#fff';
  ctx.fillRect(bcX - 2, bcY2 - 2, bcW + 4, bcH + 4);
  for (let i = 0; i < 46; i++) {
    const bw = i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
    ctx.fillStyle = '#111';
    ctx.fillRect(bcX + i * (bcW / 46), bcY2, bw, bcH);
  }
  ctx.font = `${Math.round(lw * 0.038)}px monospace`;
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText('HB-2024-0471', fcx, ly + lh * 0.795);

  // Red band text
  ctx.font = `bold ${Math.round(lw * 0.046)}px Arial, sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText('FOOD-GRADE WOVEN POLYPROPYLENE', fcx, ly + lh * 0.065);
  ctx.fillText('MFG: 04/2024  BATCH: HB471', fcx, ly + lh * 0.955);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

// ── Materials ─────────────────────────────────────────────────────────────────
let currentHex = '#e8e2d4';
let printTex    = makeBagWithPrintTex(currentHex);
let fabricTex   = makeFabricTex(currentHex);
const normalTex = makeNormalTex();

const bagMat = new THREE.MeshStandardMaterial({
  map: printTex,
  normalMap: normalTex,
  normalScale: new THREE.Vector2(0.7, 0.7),
  roughness: 0.85,
  metalness: 0.0,
});

// ── Bag geometry ──────────────────────────────────────────────────────────────
const bagGroup = new THREE.Group();
scene.add(bagGroup);

function buildBagProfile() {
  const pts = [];
  const H = 3.0, R = 0.84, N = 80;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = -H / 2 + t * H;
    let r;
    if (t < 0.05) {
      r = R * 0.3 * Math.pow(t / 0.05, 0.7);
    } else if (t < 0.14) {
      r = R * (0.3 + 0.7 * Math.pow((t - 0.05) / 0.09, 0.55));
    } else if (t > 0.86) {
      r = R * (0.3 + 0.7 * Math.pow((1 - t) / 0.14, 0.55));
    } else if (t > 0.95) {
      r = R * 0.3 * Math.pow((1 - t) / 0.05, 0.7);
    } else {
      const mid = 0.42;
      const bulge = 0.065 * Math.exp(-3.5 * Math.pow(t - mid, 2));
      const wrinkle = Math.sin(t * Math.PI * 18) * 0.009 + Math.sin(t * Math.PI * 7) * 0.006;
      r = R * (1.0 + bulge + wrinkle);
    }
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, 80);
}

const bagMesh = new THREE.Mesh(buildBagProfile(), bagMat);
bagMesh.castShadow = true;
bagMesh.receiveShadow = true;
bagGroup.add(bagMesh);

// Bottom flat cap
const botCapGeo = new THREE.CircleGeometry(0.24, 48);
const botCap = new THREE.Mesh(botCapGeo, bagMat.clone());
botCap.rotation.x = Math.PI / 2;
botCap.position.y = -1.49;
bagGroup.add(botCap);

// ── Seams ─────────────────────────────────────────────────────────────────────
const seamGroup = new THREE.Group();
bagGroup.add(seamGroup);

function buildSeams() {
  while (seamGroup.children.length) seamGroup.remove(seamGroup.children[0]);
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xc8b878, roughness: 0.75 });

  // 2 vertical seams (front & back)
  [0, Math.PI].forEach(angle => {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const y = -1.3 + t * 2.6;
      const r = 0.855 + Math.sin(t * Math.PI * 10) * 0.007;
      pts.push(new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.013, 6);
    seamGroup.add(new THREE.Mesh(geo, seamMat));
  });

  // Top stitched ring
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.017, 8, 72), seamMat);
  topRing.position.y = 1.22;
  topRing.rotation.x = Math.PI / 2;
  seamGroup.add(topRing);

  // Stitch dots along top ring
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.011, 4, 4), seamMat);
    s.position.set(Math.sin(a) * 0.48, 1.21, Math.cos(a) * 0.48);
    seamGroup.add(s);
  }

  // Bottom ring
  const botRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 8, 48), seamMat);
  botRing.position.y = -1.48;
  botRing.rotation.x = Math.PI / 2;
  seamGroup.add(botRing);

  // Horizontal reinforcement band
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.895, 0.02, 6, 72), seamMat);
  band.position.y = -0.1;
  band.rotation.x = Math.PI / 2;
  seamGroup.add(band);
}
buildSeams();

// ── Tie closures ──────────────────────────────────────────────────────────────
const tieGroup = new THREE.Group();
bagGroup.add(tieGroup);

function buildTies() {
  while (tieGroup.children.length) tieGroup.remove(tieGroup.children[0]);
  const neckMat  = new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.88 });
  const twineMat = new THREE.MeshStandardMaterial({ color: 0x9a7828, roughness: 0.92 });

  // Top neck gather
  const topPts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = 1.2 + t * 0.28;
    const r = 0.48 * Math.pow(1 - t, 1.5) * 0.85 + 0.045;
    topPts.push(new THREE.Vector2(r, y));
  }
  const topNeck = new THREE.Mesh(new THREE.LatheGeometry(topPts, 56), neckMat);
  topNeck.castShadow = true;
  tieGroup.add(topNeck);

  // Twine ring
  const twine = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 10, 44), twineMat);
  twine.position.y = 1.47;
  twine.rotation.x = Math.PI / 2;
  tieGroup.add(twine);

  // Knot
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), twineMat);
  knot.scale.set(1.5, 1.0, 1.0);
  knot.position.set(0.15, 1.47, 0);
  tieGroup.add(knot);

  // Twine ears
  [-0.06, 0.06].forEach(dx => {
    const earCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, 1.47, 0),
      new THREE.Vector3(0.15 + dx * 2, 1.55, dx),
      new THREE.Vector3(0.15 + dx * 3, 1.50, dx * 1.5),
    ]);
    tieGroup.add(new THREE.Mesh(new THREE.TubeGeometry(earCurve, 12, 0.013, 6), twineMat));
  });

  // Bottom neck gather
  const botPts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const y = -1.2 - t * 0.2;
    const r = 0.24 * Math.pow(1 - t, 1.4) * 0.9 + 0.04;
    botPts.push(new THREE.Vector2(r, y));
  }
  const botNeck = new THREE.Mesh(new THREE.LatheGeometry(botPts.reverse(), 48), neckMat);
  botNeck.castShadow = true;
  tieGroup.add(botNeck);

  const btwine = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 8, 36), twineMat);
  btwine.position.y = -1.42;
  btwine.rotation.x = Math.PI / 2;
  tieGroup.add(btwine);
}
buildTies();

// ── Label group (logo is baked into bag texture) ───────────────────────────────
const labelGroup = new THREE.Group();
bagGroup.add(labelGroup);

// ── Grain interior (visible in x-ray mode) ────────────────────────────────────
const grainGroup = new THREE.Group();
bagGroup.add(grainGroup);
grainGroup.visible = false;

const grainFillMat = new THREE.MeshStandardMaterial({ color: 0xc89820, roughness: 0.92 });
const grainFill = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.56, 1.85, 52, 1, false), grainFillMat);
grainFill.position.y = -0.55;
grainFill.castShadow = true;
grainGroup.add(grainFill);

// Bumpy grain surface
const grainSurfGeo = new THREE.CircleGeometry(0.74, 52);
const grainSurfPos = grainSurfGeo.attributes.position;
for (let i = 0; i < grainSurfPos.count; i++) {
  grainSurfPos.setZ(i, (Math.random() - 0.5) * 0.05);
}
grainSurfGeo.computeVertexNormals();
const grainSurf = new THREE.Mesh(grainSurfGeo, grainFillMat.clone());
grainSurf.rotation.x = -Math.PI / 2;
grainSurf.position.y = 0.375;
grainGroup.add(grainSurf);

// Individual grain particles
const pGeo = new THREE.SphereGeometry(0.028, 5, 4);
const pMat = new THREE.MeshStandardMaterial({ color: 0xd4a820, roughness: 0.9 });
for (let i = 0; i < 180; i++) {
  const p = new THREE.Mesh(pGeo, pMat);
  const r2 = Math.random() * 0.68;
  const a  = Math.random() * Math.PI * 2;
  p.position.set(Math.cos(a) * r2, 0.39 + Math.random() * 0.06, Math.sin(a) * r2);
  p.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  grainGroup.add(p);
}

// ── Floor ─────────────────────────────────────────────────────────────────────
const floorTex = makeFabricTex('#1a1710', 256);
floorTex.repeat.set(10, 10);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 26),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.68;
floor.receiveShadow = true;
scene.add(floor);

// Shadow disc under bag
const disc = new THREE.Mesh(
  new THREE.CircleGeometry(1.6, 48),
  new THREE.MeshStandardMaterial({ color: 0x141208, roughness: 0.3 })
);
disc.rotation.x = -Math.PI / 2;
disc.position.y = -1.675;
scene.add(disc);

// ── Button controls ───────────────────────────────────────────────────────────
let autoSpin  = false;
let xray      = false;
let showLabel = true;

document.getElementById('btn-auto').addEventListener('click', function () {
  autoSpin = !autoSpin;
  this.classList.toggle('on', autoSpin);
});

document.getElementById('btn-xray').addEventListener('click', function () {
  xray = !xray;
  this.classList.toggle('on', xray);

  [bagMat, botCap.material].forEach(m => {
    m.transparent = xray;
    m.opacity     = xray ? 0.22 : 1.0;
    m.depthWrite  = !xray;
    m.side        = xray ? THREE.DoubleSide : THREE.FrontSide;
    m.needsUpdate = true;
  });

  seamGroup.children.forEach(child => {
    if (!child.material) return;
    child.material.transparent = xray;
    child.material.opacity     = xray ? 0.35 : 1.0;
    child.material.needsUpdate = true;
  });

  grainGroup.visible = xray;
});

const colMap = {
  'col-white': '#e8e2d4',
  'col-brown': '#8a6040',
  'col-green': '#3a5c38',
};

Object.keys(colMap).forEach(id => {
  document.getElementById(id).addEventListener('click', function () {
    Object.keys(colMap).forEach(k => document.getElementById(k).classList.remove('on'));
    this.classList.add('on');
    currentHex = colMap[id];

    const newPrint  = makeBagWithPrintTex(currentHex);
    const newFabric = makeFabricTex(currentHex);

    bagMat.map        = showLabel ? newPrint : newFabric;
    bagMat.transparent = xray;
    bagMat.opacity    = xray ? 0.22 : 1.0;
    bagMat.needsUpdate = true;

    botCap.material.map        = newFabric;
    botCap.material.transparent = xray;
    botCap.material.opacity    = xray ? 0.22 : 1.0;
    botCap.material.needsUpdate = true;
  });
});

document.getElementById('btn-seams').addEventListener('click', function () {
  seamGroup.visible = !seamGroup.visible;
  this.classList.toggle('on', seamGroup.visible);
});

document.getElementById('btn-label').addEventListener('click', function () {
  showLabel = !showLabel;
  this.classList.toggle('on', showLabel);
  bagMat.map = showLabel ? makeBagWithPrintTex(currentHex) : makeFabricTex(currentHex);
  bagMat.needsUpdate = true;
});

document.getElementById('btn-ties').addEventListener('click', function () {
  tieGroup.visible = !tieGroup.visible;
  this.classList.toggle('on', tieGroup.visible);
});

// ── Orbit controls ────────────────────────────────────────────────────────────
let drag = false, rDrag = false;
let prev = { x: 0, y: 0 };
let sph  = { theta: -0.3, phi: 1.28, r: 7.5 };
let tgt  = new THREE.Vector3(0, 0.1, 0);

function camUpdate() {
  camera.position.set(
    tgt.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
    tgt.y + sph.r * Math.cos(sph.phi),
    tgt.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
  );
  camera.lookAt(tgt);
}
camUpdate();

canvas.addEventListener('mousedown', e => {
  drag = true; rDrag = e.button === 2;
  prev = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('mouseup', () => (drag = false));
window.addEventListener('mousemove', e => {
  if (!drag) return;
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  prev = { x: e.clientX, y: e.clientY };
  if (rDrag) {
    const right = new THREE.Vector3()
      .crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up)
      .normalize();
    tgt.addScaledVector(right, -dx * 0.002 * sph.r);
    tgt.addScaledVector(camera.up, dy * 0.002 * sph.r);
  } else {
    sph.theta -= dx * 0.007;
    sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi + dy * 0.007));
  }
  camUpdate();
});
canvas.addEventListener('wheel', e => {
  sph.r = Math.max(2.5, Math.min(16, sph.r + e.deltaY * 0.009));
  camUpdate();
});

// Touch
let lt = 0;
canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { drag = true; prev = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  else lt = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && drag) {
    const dx = e.touches[0].clientX - prev.x, dy = e.touches[0].clientY - prev.y;
    prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    sph.theta -= dx * 0.009;
    sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi + dy * 0.009));
    camUpdate();
  } else if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    sph.r = Math.max(2.5, Math.min(16, sph.r - (d - lt) * 0.018));
    lt = d;
    camUpdate();
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', () => (drag = false));

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Animation loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let t = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  t += dt;
  if (autoSpin) { sph.theta += dt * 0.38; camUpdate(); }
  bagGroup.rotation.z = Math.sin(t * 0.35) * 0.007;
  renderer.render(scene, camera);
}
animate();
