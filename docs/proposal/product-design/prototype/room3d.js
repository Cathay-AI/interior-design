/* Walkable three.js living room for the 3D proposal screen.
 * Furniture uses free-licence models (see models/CREDITS.md); floor, walls, rug and curtains are generated so they
 * can follow the shared element schema. Every object is named after its schema key (floor, wall, sofa, rug, curtain,
 * lamp, table, plant, wall_tv), the same names a voice tool call would target in the real product. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const ROOM = { w: 5, d: 4.2, h: 2.7 };
const EYE = 1.55;
const VIEWS = {
  // yaw 0 faces the sofa wall (-z); positive yaw turns left.
  door: { label: '門口', pos: [1.5, 1.4], yaw: 34, pitch: -12 },
  sofa: { label: '坐在沙發', pos: [-0.4, -1.3], yaw: 180, pitch: -8, eye: 1.15 },
  window: { label: '窗邊', pos: [1.9, -0.6], yaw: 95, pitch: -10 },
};
const NAMES = { floor: '地板', wall: '牆', sofa: '沙發', rug: '地毯', curtain: '窗簾', lamp: '燈具', table: '茶几', plant: '植栽', chair: '單椅', side: '邊櫃', screen: '屏風', accent: '擺飾', wall_tv: '電視牆收納' };

// ---------- procedural textures ----------
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4;
  return t;
}
const rnd = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const shadeHex = (hex, amt) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, amt); return '#' + c.getHexString(); };

function floorTexture(name, hex) {
  const r = rnd(name.length * 97 + 13);
  if (/磁磚|水磨石/.test(name)) {
    return canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = hex; g.fillRect(0, 0, w, h);
      if (/水磨石/.test(name)) for (let i = 0; i < 2600; i++) { g.fillStyle = ['#ffffff', '#8a8378', '#b8a58b', '#5d5a55'][i % 4]; g.globalAlpha = .35 + r() * .4; const s = 1 + r() * 4; g.fillRect(r() * w, r() * h, s, s * (.6 + r())); }
      g.globalAlpha = 1; g.strokeStyle = shadeHex(hex, -.12); g.lineWidth = 3;
      for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
    }, [4, 3.4]);
  }
  const herring = /人字/.test(name);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    const rows = 8, rh = h / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 200;
      while (x < w) {
        const len = herring ? 128 : 180 + r() * 160;
        g.fillStyle = shadeHex(hex, (r() - .5) * .08); g.fillRect(x, y * rh, len, rh);
        g.strokeStyle = shadeHex(hex, -.06); g.globalAlpha = .5;
        for (let k = 0; k < 6; k++) { g.beginPath(); const yy = y * rh + 4 + r() * (rh - 8); g.moveTo(x, yy); g.bezierCurveTo(x + len * .3, yy + (r() - .5) * 6, x + len * .6, yy + (r() - .5) * 6, x + len, yy); g.lineWidth = .6 + r(); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = shadeHex(hex, -.18); g.fillRect(x, y * rh, 2, rh);
        x += len;
      }
      g.fillStyle = shadeHex(hex, -.16); g.fillRect(0, y * rh, w, 2);
    }
  }, herring ? [5, 4] : [3, 2.6]);
}
function plasterTexture(hex) {
  const r = rnd(7);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = r() > .5 ? '#ffffff' : '#000000'; g.globalAlpha = .015 + r() * .02; g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 6); }
  }, [3, 2]);
}
function rugTexture(name, hex) {
  const r = rnd(name.length * 31);
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = r() > .5 ? '#ffffff' : '#000000'; g.globalAlpha = .03; g.fillRect(r() * w, r() * h, 2, 2); }
    g.globalAlpha = 1;
    const ink = shadeHex(hex, -.18), light = shadeHex(hex, .14);
    g.lineWidth = 10; g.strokeStyle = ink; g.strokeRect(22, 22, w - 44, h - 44);
    if (/條紋/.test(name)) {
      g.globalAlpha = 1; g.fillStyle = '#ece7dc';
      for (let y = 36; y < h - 28; y += 44) g.fillRect(24, y, w - 48, 18);
      g.strokeStyle = light; g.lineWidth = 4; g.strokeRect(22, 22, w - 44, h - 44);
    } else if (/編織/.test(name)) {
      g.globalAlpha = .5; g.lineWidth = 3;
      for (let y = 30; y < h - 24; y += 14) { g.strokeStyle = y % 28 < 14 ? light : ink; g.beginPath(); g.moveTo(26, y); g.lineTo(w - 26, y); g.stroke(); }
      for (let x = 30; x < w - 24; x += 14) { g.strokeStyle = x % 28 < 14 ? ink : light; g.beginPath(); g.moveTo(x, 26); g.lineTo(x, h - 26); g.stroke(); }
      g.globalAlpha = 1; g.strokeStyle = ink; g.lineWidth = 6; g.strokeRect(20, 20, w - 40, h - 40);
    } else if (/波斯|花紋/.test(name)) {
      const diamond = (cx, cy, rx, ry, fill, stroke) => { g.beginPath(); g.moveTo(cx, cy - ry); g.lineTo(cx + rx, cy); g.lineTo(cx, cy + ry); g.lineTo(cx - rx, cy); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
      g.lineWidth = 1.5; g.globalAlpha = .55;
      for (let y = 60; y < h - 50; y += 22) for (let x = 60 + (y / 22 % 2) * 14; x < w - 50; x += 28) diamond(x, y, 10, 8, null, light);
      g.globalAlpha = 1; g.lineWidth = 3;
      diamond(w / 2, h / 2, 120, 90, shadeHex(hex, -.1), light); diamond(w / 2, h / 2, 80, 60, null, ink); diamond(w / 2, h / 2, 34, 26, light, null);
      g.strokeStyle = light; g.lineWidth = 4; g.strokeRect(40, 40, w - 80, h - 80);
      for (let x = 56; x < w - 40; x += 24) for (const y of [30, h - 30]) diamond(x, y, 6, 6, light, null);
      for (let y = 54; y < h - 40; y += 24) for (const x of [30, w - 30]) diamond(x, y, 6, 6, light, null);
    } else { g.lineWidth = 3; g.strokeStyle = light; g.strokeRect(40, 40, w - 80, h - 80); }
  });
}
function skyTexture(dusk) {
  return canvasTex(128, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    if (dusk === 'golden') { grd.addColorStop(0, '#f6c68a'); grd.addColorStop(.55, '#ffd9a0'); grd.addColorStop(1, '#fff1d8'); }
    else if (dusk) { grd.addColorStop(0, '#2c2f55'); grd.addColorStop(.6, '#8a5a78'); grd.addColorStop(1, '#f2a46a'); }
    else { grd.addColorStop(0, '#9cc7e4'); grd.addColorStop(.7, '#d9ecf5'); grd.addColorStop(1, '#f3efe2'); }
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // A distant skyline, lit windows after dark, and greenery in front: what a TW apartment really looks out on.
    const r = rnd(42), base = h * .7;
    g.fillStyle = dusk === 'golden' ? '#9a6b58' : dusk ? '#242740' : '#a9bcc9';
    let x = 0;
    while (x < w) { const bw = 7 + r() * 13, bh = 18 + r() * 62; g.fillRect(x, base - bh, bw - 2, bh + h); x += bw; }
    if (dusk === true) { g.fillStyle = '#ffd98a'; for (let i = 0; i < 70; i++) g.fillRect(3 + r() * (w - 6), base - 4 - r() * 54, 1.6, 2.6); }
    g.fillStyle = dusk === 'golden' ? '#5f6b48' : dusk ? '#161d1a' : '#7d9a6f';
    for (let gx = -6; gx < w + 6; gx += 9) { const rr = 7 + r() * 9; g.beginPath(); g.arc(gx, base + 8, rr, 0, Math.PI * 2); g.fill(); }
    g.fillRect(0, base + 8, w, h);
  });
}

// ---------- scene ----------
export async function createRoom({ onProgress, models = './models/', textures = './textures/', shadowSize = 1024 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  const canvas = renderer.domElement;
  canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = .35;
  scene.background = new THREE.Color('#1d1a16');

  // The rig moves the viewer around; in VR the headset drives the camera inside it.
  const rig = new THREE.Group(); scene.add(rig);
  const camera = new THREE.PerspectiveCamera(68, 1, .05, 30);
  rig.add(camera);

  const hemi = new THREE.HemisphereLight('#fff6e8', '#6b5a48', .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  sun.position.set(6, 4.2, -1.2); sun.target.position.set(-.6, 0, -.4);
  sun.castShadow = true; sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: .5, far: 14 });
  scene.add(sun, sun.target);
  const lampLight = new THREE.PointLight('#ffc77a', 0, 7, 1.6); lampLight.position.set(-.4, 2.05, -.3); scene.add(lampLight);
  // Light spilling in from the open front door; only the walk-in sequence uses it.
  const doorLight = new THREE.PointLight('#ffd9a0', 0, 6, 1.8); doorLight.position.set(1.5, 1.9, 2.0); scene.add(doorLight);

  const named = (name, obj) => { obj.name = name; obj.traverse(o => { o.userData.part = name; }); return obj; };
  const std = (opts) => new THREE.MeshStandardMaterial({ roughness: .9, ...opts });

  // Shell: floor, four walls with a window opening on the right wall, ceiling, baseboards.
  const floorMat = std({ roughness: .55 });
  const floor = named('floor', new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorMat));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = std({ roughness: .95 });
  const wallBackMat = std({ roughness: .95 }); // the sofa wall: deeper paint on decorated styles (a feature wall)
  const walls = named('wall', new THREE.Group()); scene.add(walls);
  const wallPanel = (w, h, x, y, z, ry) => { const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + x + z, uv.getY(i) * h); const m = new THREE.Mesh(geo, wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; walls.add(m); return m; };
  const W = ROOM.w / 2, D = ROOM.d / 2, H = ROOM.h;
  wallPanel(ROOM.w, H, 0, H / 2, -D, 0).material = wallBackMat;
  wallPanel(ROOM.d, H, -W, H / 2, 0, Math.PI / 2);
  wallPanel(ROOM.w, H, 0, H / 2, D, Math.PI);
  // Right wall split around a 1.8 × 1.5 window centred at z = -0.3.
  const win = { z: -.3, w: 1.8, y0: .75, y1: 2.25 };
  wallPanel(ROOM.d, win.y0, W, win.y0 / 2, 0, -Math.PI / 2);
  wallPanel(ROOM.d, H - win.y1, W, (H + win.y1) / 2, 0, -Math.PI / 2);
  const sideA = D - (win.z + win.w / 2), sideB = (win.z - win.w / 2) + D;
  wallPanel(sideA, win.y1 - win.y0, W, (win.y0 + win.y1) / 2, (win.z + win.w / 2 + D) / 2, -Math.PI / 2);
  wallPanel(sideB, win.y1 - win.y0, W, (win.y0 + win.y1) / 2, (win.z - win.w / 2 - D) / 2, -Math.PI / 2);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), std({ color: '#f4efe6' }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = H; scene.add(ceiling);
  const trimMat = std({ color: '#f3eee4', roughness: .6 });
  const board = (w, x, z, ry) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .09, .015), trimMat); b.position.set(x, .045, z); b.rotation.y = ry; b.receiveShadow = true; scene.add(b); };
  board(ROOM.w, 0, -D + .008, 0); board(ROOM.d, -W + .008, 0, Math.PI / 2); board(ROOM.w, 0, D - .008, 0); board(ROOM.d, W - .008, 0, Math.PI / 2);

  // Soft ambient shading where walls meet the floor, the ceiling and each other.
  // Real AO is too costly for phones; these gradient strips give the same visual cue for free.
  const fade = dir => canvasTex(32, 32, (g, w, h) => {
    const [x0, y0, x1, y1] = { up: [0, h, 0, 0], down: [0, 0, 0, h], left: [w, 0, 0, 0], right: [0, 0, w, 0] }[dir];
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const aoMat = dir => new THREE.MeshBasicMaterial({ color: '#2a2018', alphaMap: fade(dir), transparent: true, opacity: .22, depthWrite: false });
  const aoUp = aoMat('up'), aoDown = aoMat('down'), aoLeft = aoMat('left'), aoRight = aoMat('right');
  const aoStrip = (mat, w2, h2, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), mat); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 1; scene.add(m); };
  aoStrip(aoUp, ROOM.w, .2, 0, .1, -D + .004, 0);               // back wall, floor line
  aoStrip(aoDown, ROOM.w, .26, 0, H - .13, -D + .004, 0);       // back wall, ceiling line
  aoStrip(aoUp, ROOM.d, .2, -W + .004, .1, 0, Math.PI / 2);     // left wall, floor line
  aoStrip(aoUp, ROOM.d, .2, W - .004, .1, 0, -Math.PI / 2);     // right wall, floor line
  aoStrip(aoRight, .3, H, -W + .15, H / 2, -D + .005, 0);       // back-left corner
  aoStrip(aoLeft, .3, H, W - .15, H / 2, -D + .005, 0);         // back-right corner
  aoStrip(aoRight, .3, H, -W + .005, H / 2, -D + .15, Math.PI / 2); // same corners, on the side walls
  aoStrip(aoLeft, .3, H, W - .005, H / 2, -D + .15, -Math.PI / 2);

  // Window: sky plane outside, frame and mullions.
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(false), toneMapped: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(win.w, win.y1 - win.y0), skyMat);
  sky.position.set(W + .12, (win.y0 + win.y1) / 2, win.z); sky.rotation.y = -Math.PI / 2; scene.add(sky);
  const frameMat = std({ color: '#efe9de', roughness: .5 });
  const bar = (sx, sy, sz, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat); b.position.set(x, y, z); b.castShadow = true; scene.add(b); };
  bar(.12, .06, win.w + .1, W - .02, win.y0, win.z); bar(.12, .06, win.w + .1, W - .02, win.y1, win.z);
  bar(.12, win.y1 - win.y0, .06, W - .02, (win.y0 + win.y1) / 2, win.z - win.w / 2); bar(.12, win.y1 - win.y0, .06, W - .02, (win.y0 + win.y1) / 2, win.z + win.w / 2);
  bar(.05, win.y1 - win.y0, .04, W, (win.y0 + win.y1) / 2, win.z); bar(.05, .04, win.w, W, (win.y0 + win.y1) / 2 + .1, win.z);

  // Curtains: folded panels either side of the window.
  const curtainMat = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .96 });
  const curtains = named('curtain', new THREE.Group()); scene.add(curtains);
  const panelGeo = new THREE.PlaneGeometry(.55, 2.45, 28, 1);
  { const p = panelGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 34) * .035); panelGeo.computeVertexNormals(); }
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(panelGeo, curtainMat); m.position.set(W - .14, 1.32, win.z + s * (win.w / 2 + .18)); m.rotation.y = -Math.PI / 2; m.castShadow = true; curtains.add(m);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, win.w + 1.1), std({ color: '#3a352f', metalness: .6, roughness: .4 }));
  rod.rotation.x = Math.PI / 2; rod.position.set(W - .14, 2.56, win.z); scene.add(rod);

  // Rug
  const rugMat = std({ roughness: 1 });
  const rugRect = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), rugMat);
  const rugRound = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), rugMat);
  const rug = new THREE.Group();
  [rugRect, rugRound].forEach(m => { m.rotation.x = -Math.PI / 2; m.receiveShadow = true; rug.add(m); });
  rugRound.visible = false;
  named('rug', rug); rug.position.set(-.4, .006, -.35); scene.add(rug);

  // TV on the wall facing the sofa.
  const tv = new THREE.Mesh(new THREE.BoxGeometry(1.3, .74, .04), std({ color: '#111', roughness: .25, metalness: .3 }));
  tv.position.set(-.4, 1.35, D - .04); tv.castShadow = true; scene.add(tv);

  // Light shafts from the window: additive sheets that fade away from the glass. Off unless a shot asks for them.
  const beamTex = canvasTex(4, 128, (g, w, h) => { const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,214,150,1)'); grd.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h); });
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const beams = new THREE.Group(); beams.visible = false; scene.add(beams);
  const sheet = (x0, y0, x1, y1) => {
    const z0 = win.z - win.w / 2 + .05, z1 = win.z + win.w / 2 - .05, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, z0, x0, y0, z1, x1, y1, z0, x1, y1, z1], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)); geo.setIndex([0, 2, 1, 1, 2, 3]);
    beams.add(new THREE.Mesh(geo, beamMat));
  };
  sheet(W - .05, win.y1, W - 3.1, .02); sheet(W - .05, win.y0, W - 1.6, .02); sheet(W - .05, (win.y0 + win.y1) / 2, W - 2.4, .02);

  // ---------- scanned materials (textures/<id>/diff|nor|rough.webp) ----------
  const texLoader = new THREE.TextureLoader(), texCache = {};
  let running = false; // declared before redraw: preloaded textures may fire onLoad before the loop section runs
  const redraw = () => { if (!running) renderer.render(scene, camera); };
  function tex(id, kind, rx = 1, ry = rx) {
    const key = `${id}/${kind}/${rx}/${ry}`;
    if (texCache[key]) return texCache[key];
    const t = texLoader.load(`${textures}${id}/${kind}.webp`, redraw);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace;
    return (texCache[key] = t);
  }
  // Fabric maps are tiny and shared; load them up front so a snapshot never catches a half-loaded
  // velvet — an empty roughness map samples as 0 and turns the sofa into chrome.
  ['rough_linen', 'velour_velvet', 'wool_boucle'].forEach(id => { tex(id, 'nor', 6); tex(id, 'rough', 6); });

  // ---------- furniture: one model per slot, fitted to the room by its real size ----------
  const MODELS = (window.HB_CATALOG && window.HB_CATALOG.MODELS) || {};
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, loaded, total) => onProgress && onProgress(loaded / total);
  const loader = new GLTFLoader(manager), raw = {};
  const load = file => raw[file] || (raw[file] = loader.loadAsync(models + file).then(g => { g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g.scene; }));
  const slots = { sofa: null, table: null, lamp: null, plant: null, chair: null, side: null, screen: null, accent: null }, slotKey = {}, fitted = {}, fitWaiters = {};
  const bx = new THREE.Box3(), sz = new THREE.Vector3(), ctr = new THREE.Vector3();
  function fit(key, model) {
    const cfg = MODELS[key], g = new THREE.Group(); g.add(model);
    if (cfg.rotY) model.rotation.y = THREE.MathUtils.degToRad(cfg.rotY);
    if (cfg.scale) model.scale.multiplyScalar(cfg.scale);
    const measure = () => { g.updateMatrixWorld(true); bx.setFromObject(model); bx.getSize(sz); bx.getCenter(ctr); };
    measure();
    let k = 1;
    if (Math.max(sz.x, sz.y, sz.z) > 10) k = 1 / 100; // authored in centimetres
    if (cfg.maxH && sz.y * k > cfg.maxH) k = Math.min(k, cfg.maxH / sz.y);
    if (cfg.maxW && Math.max(sz.x, sz.z) * k > cfg.maxW) k = Math.min(k, cfg.maxW / Math.max(sz.x, sz.z));
    if (k !== 1) { model.scale.multiplyScalar(k); measure(); }
    model.position.x -= ctr.x; model.position.z -= ctr.z; model.position.y -= bx.min.y;
    g.userData.size = sz.clone();
    g.userData.tint = [];
    if (cfg.tint) { const re = new RegExp(cfg.tint, 'i'); model.traverse(o => { if (o.isMesh && re.test(o.material.name)) { o.material = o.material.clone(); o.material.userData.r0 = o.material.roughness; g.userData.tint.push(o.material); } }); }
    return g;
  }
  function placeSlot(slot, g) {
    const s = g.userData.size;
    if (slot === 'sofa') g.position.set(-.4, 0, -D + s.z / 2 + .06);
    if (slot === 'table') g.position.set(-.4, 0, -.25);
    if (slot === 'lamp') g.position.set(-.4, H - s.y, -.3);
    // The accent chair sits on the far side of the table, turned towards the sofa, out of the cameras' foreground.
    if (slot === 'chair') { g.position.set(-1.85, 0, -.15); g.rotation.y = 1.92; }
    if (slot === 'side') { g.rotation.y = Math.PI / 2; g.position.set(-W + s.z / 2 + .04, 0, .75); }
    if (slot === 'screen') { g.position.set(-W + .55, 0, -D + .45); g.rotation.y = .9; }
    if (slot === 'plant' || slot === 'accent') {
      const cfg = MODELS[slotKey[slot]];
      if (cfg && cfg.at === 'table') g.position.set(slot === 'plant' ? -.12 : -.68, slots.table ? slots.table.userData.size.y : .4, slot === 'plant' ? -.18 : -.32);
      else g.position.set(1.05, 0, -D + .45);
    }
  }
  function tintSlot(slot) {
    const g = slots[slot], o = painted && painted.parts[slot];
    if (!g || !o) return;
    g.userData.tint.forEach(m => {
      m.color.set(o.c);
      // Velvet sheen reads as chrome at grazing angles if left at full strength; keep it a fabric.
      if (m.sheenColor) { m.sheenColor.set(o.c).offsetHSL(0, 0, .06); if (m.sheen !== undefined) m.sheen = .35; }
      if (slot === 'sofa') { m.normalMap = o.fab ? tex(o.fab, 'nor', 6) : null; m.roughnessMap = o.fab ? tex(o.fab, 'rough', 6) : null; m.roughness = o.fab ? 1 : m.userData.r0; m.needsUpdate = true; }
    });
  }
  // keys: model key per slot; undefined keeps what is there, null empties the slot.
  let furnishing = Promise.resolve();
  function furnish(keys, strict = false) {
    const show = (slot, g) => {
      if (slots[slot] && slots[slot] !== g) slots[slot].visible = false;
      if (!g.parent) scene.add(g);
      g.visible = true; slots[slot] = g; placeSlot(slot, g);
    };
    const jobs = Object.entries(keys).filter(([slot, k]) => k !== undefined && slotKey[slot] !== k).map(([slot, k]) => {
      slotKey[slot] = k;
      if (!k || !MODELS[k]) { if (slots[slot]) slots[slot].visible = false; slots[slot] = null; return null; }
      // An already-fitted model swaps in synchronously, so a snapshot taken right after paint() sees it.
      if (fitted[k]) { show(slot, fitted[k]); return null; }
      // A snapshot must not photograph the previous design's furniture while the new model streams in.
      if (strict && slots[slot]) { slots[slot].visible = false; slots[slot] = null; }
      return load(MODELS[k].file).then(m => {
        if (!fitted[k]) { fitted[k] = named(slot, fit(k, m)); (fitWaiters[k] || []).forEach(f => f()); delete fitWaiters[k]; }
        if (slotKey[slot] === k) show(slot, fitted[k]);
      });
    }).filter(Boolean);
    Object.keys(slots).forEach(tintSlot);
    furnishing = Promise.all(jobs).then(() => { if (slots.plant) placeSlot('plant', slots.plant); if (slots.accent) placeSlot('accent', slots.accent); Object.keys(slots).forEach(tintSlot); lampGlow(lampLight.intensity > .5); redraw(); });
    return furnishing;
  }
  const isShown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  // When the pendant light is on, its shade should glow too, whatever model hangs there.
  function lampGlow(on) {
    if (!slots.lamp) return;
    slots.lamp.traverse(o => {
      const m = o.material; if (!o.isMesh || !m || !m.emissive) return;
      if (m.userData.e0 === undefined) { m.userData.e0 = m.emissive.getHex(); m.userData.ei0 = m.emissiveIntensity; }
      if (on) { m.emissive.set('#ff9f4a'); m.emissiveIntensity = .7; } else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.ei0; }
    });
  }
  // Wall art above the sofa: 0–3 frames, following the style's decoration level.
  const art = named('art', new THREE.Group()); scene.add(art);
  const ART_LAYOUT = [[], [[-0.4, 1.72, 1.0, .66]], [[-0.78, 1.7, .52, .68], [-0.06, 1.7, .52, .68]], [[-0.98, 1.66, .44, .58], [-0.4, 1.76, .56, .76], [0.18, 1.66, .44, .58]]];
  function artTexture(seed, colors) {
    const r = rnd(seed * 131 + 7);
    return canvasTex(256, 320, (g, w, h) => {
      g.fillStyle = '#f4efe6'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = colors[i % colors.length]; g.globalAlpha = .85;
        if (r() > .5) { g.beginPath(); g.arc(r() * w, r() * h, 30 + r() * 70, 0, Math.PI * 2); g.fill(); }
        else g.fillRect(r() * w * .6, r() * h * .6, 50 + r() * 120, 30 + r() * 140);
      }
      g.globalAlpha = 1;
    });
  }
  let cabinet = null, cabinetLoading = null;
  const ensureCabinet = () => cabinetLoading || (cabinetLoading = load('cabinet.glb').then(c => { named('wall_tv', c); c.rotation.y = Math.PI; c.position.set(-.4, 0, D - .3); c.visible = false; scene.add(c); cabinet = c; return c; }));

  // ---------- applying a design version ----------
  const cache = {};
  const memo = (k, f) => cache[k] || (cache[k] = f());
  let current = null;
  // paint() swaps materials synchronously; apply() also handles the live viewer's day/dusk and the lazy cabinet.
  let painted = null;
  function paint(parts, style = {}, strict = false) {
    painted = { parts, style };
    const f = parts.floor, w = parts.wall, s = parts.sofa, r = parts.rug, c = parts.curtain, l = parts.lamp;
    // Floor: the scanned material when the option has one, otherwise the drawn planks (pool rooms in A/B).
    if (f.tex) { const ry = (f.rep || 3) * ROOM.d / ROOM.w; Object.assign(floorMat, { map: tex(f.tex, 'diff', f.rep, ry), normalMap: tex(f.tex, 'nor', f.rep, ry), roughnessMap: tex(f.tex, 'rough', f.rep, ry), roughness: 1 }); floorMat.color.set('#ffffff'); }
    else { Object.assign(floorMat, { map: memo('f' + f.n + f.c, () => floorTexture(f.n, f.c)), normalMap: null, roughnessMap: null, roughness: .55 }); floorMat.color.set('#ffffff'); }
    floorMat.needsUpdate = true;
    // Walls: a scanned surface (concrete, clay) or paint over a scanned plaster relief. UVs are in metres.
    const wr = w.tex ? 1 / (4 / (w.rep || 2)) : .5, wid = w.tex || 'plastered_wall_04';
    Object.assign(wallMat, { map: w.tex ? tex(wid, 'diff', wr) : null, normalMap: tex(wid, 'nor', wr), roughnessMap: tex(wid, 'rough', wr), roughness: 1 });
    wallMat.color.set(w.tex ? '#ffffff' : w.c); wallMat.needsUpdate = true;
    // Decorated styles get a feature wall behind the sofa: the same paint, one step deeper.
    const accent = (style.deco || 0) >= 2;
    Object.assign(wallBackMat, { map: wallMat.map, normalMap: wallMat.normalMap, roughnessMap: wallMat.roughnessMap, roughness: 1 });
    wallBackMat.color.set(w.tex ? (accent ? '#dcdcdc' : '#ffffff') : (accent ? shadeHex(w.c, -.13) : w.c));
    wallBackMat.needsUpdate = true;
    Object.assign(rugMat, { map: memo('r' + r.n + r.c, () => rugTexture(r.n, r.c)), normalMap: tex('poly_wool_herringbone', 'nor', 3), roughness: 1 }); rugMat.needsUpdate = true;
    rugRect.visible = !r.round; rugRound.visible = !!r.round;
    Object.assign(curtainMat, { normalMap: tex('rough_linen', 'nor', 2, 6) }); curtainMat.needsUpdate = true;
    curtainMat.color.set(c.c); curtainMat.opacity = /紗/.test(c.n) ? .7 : /遮光/.test(c.n) ? 1 : .94;
    const fu = style.furn || {};
    furnish({ sofa: s.m, lamp: l.m, table: fu.table, plant: style.furn ? (style.plant === false ? null : fu.plant) : undefined, chair: fu.chair,
      side: style.furn ? (fu.side || null) : undefined, screen: style.furn ? (fu.screen || null) : undefined, accent: style.furn ? (fu.accent || null) : undefined }, strict);
    art.clear();
    const frameMat = std({ color: (style.deco || 0) >= 3 ? '#b8935a' : '#2f2a24', roughness: .5, metalness: (style.deco || 0) >= 3 ? .6 : 0 });
    (ART_LAYOUT[style.deco || 0] || []).forEach(([x, y, fw, fh], i) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw + .05, fh + .05, .03), frameMat); frame.position.set(x, y, -D + .02); frame.castShadow = true;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(fw - .06, fh - .06), std({ roughness: .8, map: memo(`art${i}${r.n}${s.n}`, () => artTexture(i + 1, [r.c, s.c, shadeHex(w.c, -.25), l.c])) }));
      pic.position.set(x, y, -D + .036); art.add(frame, pic);
    });
  }
  async function apply(v, parts, style = {}) {
    current = v;
    paint(parts, style);
    setDusk(!!v.dusk);
    await furnishing;
    if (v.storage) { const cab = await ensureCabinet(); if (current === v) cab.visible = true; }
    else if (cabinet) cabinet.visible = false;
  }
  function setDusk(dusk) {
    skyMat.map = memo(dusk ? 'skyD' : 'skyN', () => skyTexture(dusk)); skyMat.needsUpdate = true;
    doorLight.intensity = 0; beams.visible = false; sun.color.set('#fff1d6'); sun.position.set(6, 4.2, -1.2);
    sun.intensity = dusk ? 0 : 2.6; hemi.intensity = dusk ? .18 : .9; lampLight.intensity = dusk ? 9 : 0;
    lampGlow(dusk);
    scene.environmentIntensity = dusk ? .12 : .35; renderer.toneMappingExposure = dusk ? 1.2 : 1.05;
  }

  // ---------- viewer controls: drag to look, tap the floor to walk, tap furniture to name it ----------
  const look = { yaw: 0, pitch: 0, target: null, gyro: null };
  const eye = { y: EYE };
  function setView(key) {
    const v = VIEWS[key]; look.target = new THREE.Vector3(v.pos[0], 0, v.pos[1]);
    look.yaw = THREE.MathUtils.degToRad(v.yaw); look.pitch = THREE.MathUtils.degToRad(v.pitch); eye.y = v.eye || EYE;
  }
  setView('door'); rig.position.copy(look.target);
  const turn = deg => { look.yaw -= THREE.MathUtils.degToRad(deg); }; // positive deg = turn right
  const clampInRoom = p => { p.x = THREE.MathUtils.clamp(p.x, -W + .35, W - .35); p.z = THREE.MathUtils.clamp(p.z, -D + 1.15, D - .45); return p; };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(scene.children, true).find(h => isShown(h.object));
    if (!hit) return null;
    const part = hit.object.userData.part;
    if (part === 'floor' || part === 'rug') { look.target = clampInRoom(hit.point.clone().setY(0)); eye.y = EYE; return { walk: true }; }
    return part ? { part, label: NAMES[part] } : null;
  }
  // Gyroscope look-around (phones). iOS needs an explicit permission prompt from a tap.
  async function toggleGyro() {
    if (look.gyro) { window.removeEventListener('deviceorientation', look.gyro); look.gyro = null; return false; }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission(); if (res !== 'granted') throw new Error('denied');
    }
    let a0 = null, yaw0 = look.yaw;
    look.gyro = e => {
      if (e.alpha == null) return;
      if (a0 === null) { a0 = e.alpha; yaw0 = look.yaw; }
      look.yaw = yaw0 + THREE.MathUtils.degToRad(e.alpha - a0);
      look.pitch = THREE.MathUtils.clamp(THREE.MathUtils.degToRad((e.beta ?? 90) - 90), -1.2, 1.2);
    };
    window.addEventListener('deviceorientation', look.gyro);
    return true;
  }
  const keys = new Set();
  let keyScope = null;
  const onKey = e => {
    if (!running || !keyScope || !keyScope.contains(document.activeElement)) return;
    if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) { e.preventDefault(); e.type === 'keydown' ? keys.add(e.code) : keys.delete(e.code); }
  };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);

  // ---------- VR ----------
  const vrSupported = navigator.xr ? await navigator.xr.isSessionSupported('immersive-vr').catch(() => false) : false;
  async function enterVR() {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(session);
    camera.position.set(0, 0, 0);
    return session;
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const fwd = new THREE.Vector3();
  // Adaptive quality: static screens draw single frames, so only the live loop costs anything.
  // While it runs, a rolling average of frame times steps quality down: full → lower resolution → no shadows.
  // Thresholds are relative to the display's own refresh interval (estimated from the fastest frames
  // seen), so the same logic self-calibrates on 60Hz desktops and 120Hz phones alike — no magic constant.
  let tier = 0, frameMs = 16, frameCount = 0, lastShift = 0, vsyncMs = 16.7;
  const dtBuf = [];
  const budget = () => Math.min(Math.max(vsyncMs, 7), 17);
  function setTier(t, now) {
    tier = t; lastShift = now; frameMs = budget() * 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 0 ? 2 : tier === 1 ? 1.4 : 1));
    const shadows = tier < 2;
    if (renderer.shadowMap.enabled !== shadows) { renderer.shadowMap.enabled = shadows; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
    sizeToParent();
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), .05);
    const ms = Math.min(dt * 1000, 100);
    frameCount++;
    // Estimate the display's refresh interval from the MEDIAN of warm frames (26–55): a lone
    // mis-timed delta must not poison the budget — WebKit taught us that a min-based estimate does.
    if (frameCount > 25 && frameCount <= 55) dtBuf.push(ms);
    else if (frameCount === 56 && dtBuf.length) { dtBuf.sort((x, y) => x - y); vsyncMs = dtBuf[Math.floor(dtBuf.length / 2)]; dtBuf.length = 0; }
    frameMs = frameMs * .92 + ms * .08;
    const nowMs = performance.now();
    if (frameCount > 60 && nowMs - lastShift > 2500) {
      if (frameMs > budget() * 2.5 && tier < 2) setTier(tier + 1, nowMs);
      else if (frameMs < budget() * 1.1 && tier > 0 && nowMs - lastShift > 6000) setTier(tier - 1, nowMs);
    }
    const k = (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0);
    const t = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    if (t) look.yaw -= t * 1.6 * dt;
    if (k) { fwd.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw)).multiplyScalar(k * 1.4 * dt); look.target = clampInRoom(rig.position.clone().add(fwd)); }
    if (look.target) rig.position.lerp(look.target, 1 - Math.pow(.002, dt));
    if (!renderer.xr.isPresenting) {
      camera.position.y += (eye.y - camera.position.y) * (1 - Math.pow(.002, dt));
      camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
    }
    const el = canvas.parentElement;
    if (el && !renderer.xr.isPresenting) {
      const w = el.clientWidth, h = el.clientHeight;
      if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio()))) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    }
    renderer.render(scene, camera);
  }
  camera.position.y = EYE;
  // Live walking mode: the rig carries the viewer, the camera sits at eye height inside it.
  const start = () => { if (!running) { cancelAnimationFrame(glideRaf); running = true; camera.clearViewOffset(); camera.position.set(0, eye.y, 0); rig.position.copy(look.target); camera.fov = 68; camera.updateProjectionMatrix(); clock.getDelta(); renderer.setAnimationLoop(frame); } };
  const stop = () => { if (running && !renderer.xr.isPresenting) { running = false; renderer.setAnimationLoop(null); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (canvas.isConnected) start(); });

  // ---------- staged camera: light states, placing, gliding and snapshots ----------
  const MOODS = {
    dark: { sun: 0, sunColor: '#fff1d6', sunPos: [6, 4.2, -1.2], hemi: .015, lamp: 0, env: .02, exposure: .95, sky: true, door: 3.2, beam: 0 },
    day: { sun: 2.6, sunColor: '#fff1d6', sunPos: [6, 4.2, -1.2], hemi: .9, lamp: 0, env: .35, exposure: 1.05, sky: false, door: 0, beam: 0 },
    golden: { sun: 4.4, sunColor: '#ffad62', sunPos: [7, 2.1, -1.6], hemi: .26, lamp: 2, env: .16, exposure: .9, sky: 'golden', door: 0, beam: 1 },
    dusk: { sun: 0, sunColor: '#fff1d6', sunPos: [6, 4.2, -1.2], hemi: .05, lamp: 5.5, env: .05, exposure: 1.0, sky: true, door: 0, beam: 0 },
  };
  const ca = new THREE.Color(), cb = new THREE.Color(), tmp = new THREE.Vector3();
  const mix = (a, b, t) => a + (b - a) * t;
  const lightOf = name => ({ ...MOODS[name] });
  function blendLight(a, b, t) {
    return { sun: mix(a.sun, b.sun, t), sunColor: '#' + ca.set(a.sunColor).lerp(cb.set(b.sunColor), t).getHexString(), sunPos: a.sunPos.map((v, i) => mix(v, b.sunPos[i], t)),
      hemi: mix(a.hemi, b.hemi, t), lamp: mix(a.lamp, b.lamp, t), env: mix(a.env, b.env, t), exposure: mix(a.exposure, b.exposure, t),
      door: mix(a.door || 0, b.door || 0, t), beam: mix(a.beam || 0, b.beam || 0, t), sky: t < .5 ? a.sky : b.sky };
  }
  function setLights(m) {
    sun.intensity = m.sun; sun.color.set(m.sunColor); sun.position.set(...m.sunPos);
    hemi.intensity = m.hemi; lampLight.intensity = m.lamp; doorLight.intensity = m.door || 0;
    scene.environmentIntensity = m.env; renderer.toneMappingExposure = m.exposure;
    skyMat.map = memo('sky' + m.sky, () => skyTexture(m.sky)); skyMat.needsUpdate = true;
    beams.visible = (m.beam || 0) > 0.01; beamMat.opacity = .07 * (m.beam || 0);
    lampGlow((m.lamp || 0) > .5);
  }
  function sizeToParent() {
    const el = canvas.parentElement; if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (w && h && (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio()))) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
  // bias lifts the subject into the upper part of the frame when a panel covers the lower part (0 = centred).
  function aim(v) {
    rig.position.set(0, 0, 0); camera.position.set(...v.pos); camera.fov = v.fov; camera.lookAt(tmp.set(...v.look));
    sizeToParent();
    if (v.bias) camera.setViewOffset(canvas.width, canvas.height, 0, canvas.height * v.bias, canvas.width, canvas.height); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // The current staged view: camera position, look-at point, field of view and light.
  let view = { pos: [1.45, 1.6, 2.02], look: [-0.4, 1.05, -1.5], fov: 60, light: lightOf('dusk') };
  function place(v) {
    stop(); cancelAnimationFrame(glideRaf);
    view = v; setLights(v.light); aim(v);
    renderer.render(scene, camera);
  }
  // Glide from the current view to another one: the cinematic move between screens.
  let glideRaf = 0;
  function glide(to, ms = 1000) {
    cancelAnimationFrame(glideRaf); stop();
    const from = view, t0 = performance.now(), ease = t => 1 - Math.pow(1 - t, 3);
    return new Promise(done => {
      const step = now => {
        const k = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms), e = ease(k);
        const L = (a, b) => a.map((x, i) => x + (b[i] - x) * e);
        view = { pos: L(from.pos, to.pos), look: L(from.look, to.look), fov: mix(from.fov, to.fov, e), bias: mix(from.bias || 0, to.bias || 0, e), light: blendLight(from.light, to.light, e) };
        setLights(view.light); aim(view); renderer.render(scene, camera);
        if (k < 1) glideRaf = requestAnimationFrame(step); else { view = to; done(); }
      };
      glideRaf = requestAnimationFrame(step);
    });
  }
  // Scroll-scrubbed walk (intro): blend two named moods.
  function pose({ pos, look: at, fov = 60, moods: [ma, mb], t = 0, beam = 0 }) {
    const light = blendLight(MOODS[ma], MOODS[mb], t); light.beam = beam;
    place({ pos, look: at, fov, light });
  }
  // Where a named object sits on screen (CSS pixels within the canvas), for labels pinned onto furniture.
  const ANCHOR = { floor: [1.3, 0, 1.05], wall: [1.1, 1.95, -D] };
  function project(name) {
    const o = slots[name] || scene.getObjectByName(name); if (!o || !isShown(o)) return null;
    if (ANCHOR[name]) tmp.set(...ANCHOR[name]); else new THREE.Box3().setFromObject(o).getCenter(tmp);
    tmp.project(camera); if (tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1) return null;
    const r = canvas.getBoundingClientRect();
    return [(tmp.x + 1) / 2 * r.width, (1 - tmp.y) / 2 * r.height];
  }
  // Render another design from another angle into an image, then put the stage back exactly as it was.
  function snapshot({ parts, style = {}, light = 'golden', pos, look: at, fov = 55, w = 640, h = 480 }) {
    const keep = { painted, view }, pr = renderer.getPixelRatio(), size = renderer.getSize(new THREE.Vector2()), aspect = camera.aspect;
    paint(parts, style, true); setLights(typeof light === 'string' ? lightOf(light) : light); camera.clearViewOffset();
    rig.position.set(0, 0, 0); camera.position.set(...pos); camera.fov = fov; camera.lookAt(tmp.set(...at));
    renderer.setSize(w / pr, h / pr, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/jpeg', .86);
    renderer.setSize(size.x, size.y, false); camera.aspect = aspect;
    if (keep.painted) paint(keep.painted.parts, keep.painted.style);
    if (!running) place(keep.view); else camera.updateProjectionMatrix();
    return url;
  }

  function shoot({ pos, look: at, fov = 55, mood = 'golden', beam = false, hide = [] }) {
    stop();
    hide.forEach(n => { const o = slots[n] || scene.getObjectByName(n); if (o) o.visible = false; });
    setLights({ ...MOODS[mood], beam: beam ? 1 : 0 });
    rig.position.set(0, 0, 0); camera.position.set(...pos); camera.fov = fov; camera.lookAt(...at);
    const el = canvas.parentElement, w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  return {
    canvas, apply, paint, shoot, pose, place, glide, snapshot, lightOf, setDusk, project,
    get quality() { return ['高', '中', '低'][tier]; },
    get frameMs() { return frameMs; }, get live() { return running; },
    // For callers that photograph options whose model may still be loading.
    modelReady: k => !!fitted[k],
    whenModel: k => !MODELS[k] || fitted[k] ? Promise.resolve() : load(MODELS[k].file).then(() => fitted[k] ? undefined : new Promise(res => { (fitWaiters[k] = fitWaiters[k] || []).push(res); })),
    keyScope(el) { keyScope = el; }, setView, turn, pick, toggleGyro, enterVR, vrSupported, start, stop,
    views: Object.entries(VIEWS).map(([k, v]) => [k, v.label]),
    // Dragging grabs the scene: drag right and the view swings left, like a photo sphere.
    drag(dx, dy) { look.yaw += dx * .005; look.pitch = THREE.MathUtils.clamp(look.pitch + dy * .004, -1.2, 1.2); },
    get gyroOn() { return !!look.gyro; },
  };
}
