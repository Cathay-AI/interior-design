// Real-time room preview (Three.js, WebGL). Built to stay light:
//  - demand rendering: a frame is drawn only when the camera or the look changes
//  - lower pixel ratio while dragging, full detail once the gesture settles
//  - one shadow map, rendered once (the scene is static)
//  - small canvas textures, no model downloads; everything is disposed on unmount
// This module is loaded lazily (dynamic import) so the first screens never pay for it.
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createRenderScheduler } from './render-scheduler.js';

const TARGET = new T.Vector3(-0.25, 0.75, -0.35);
export const VIEWS = { A: [4.7, 3.1, 4.5], B: [1.2, 1.9, 6.3], C: [5.9, 4.4, 1.4] };
const ROOM = { w: 4.4, d: 3.8, h: 2.6 };

/* ---------- small procedural textures (no downloads) ---------- */
let seed = 71;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function canvasTexture(size, paint, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}
const woodTexture = (color, repeat) => canvasTexture(256, (x, s) => {
  x.fillStyle = color; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 700; i++) {
    x.strokeStyle = `rgba(60,40,20,${rand() * 0.07})`;
    const y = rand() * s;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(s * 0.3, y + rand() * 4, s * 0.7, y - rand() * 4, s, y); x.stroke();
  }
  x.fillStyle = 'rgba(40,25,10,.22)';
  for (let i = 0; i < 4; i++) { x.fillRect(0, i * (s / 4), s, 1); x.fillRect(((i * 97) % s), i * (s / 4), 1, s / 4); }
}, repeat);
const fabricTexture = (color, repeat) => canvasTexture(128, (x, s) => {
  x.fillStyle = color; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.07})`; x.fillRect(rand() * s, rand() * s, 1.5, 1.5); }
}, repeat);

/* ---------- scene ---------- */
const muted = (hex, k = 0.38) => '#' + new T.Color(hex).lerp(new T.Color('#cfc6b8'), k).getHexString();

function buildRoom(look) {
  seed = 71;
  const scene = new T.Scene();
  const owned = []; // textures to dispose
  const std = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const tex = (t) => { owned.push(t); return t; };
  const add = (geo, mat, [x, y, z], { cast = true, receive = true, rot } = {}) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(...rot);
    m.castShadow = cast; m.receiveShadow = receive;
    scene.add(m);
    return m;
  };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const soft = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r);
  const { w, d, h } = ROOM;

  // shell: floor + two walls (cutaway), skirting
  const floorMat = std('#ffffff', { map: tex(woodTexture(look.floor, [3, 5])), roughness: 0.62 });
  add(box(w, 0.1, d), floorMat, [0, -0.05, 0], { cast: false });
  const wallMat = std(look.wall, { roughness: 0.95 });
  add(box(w, h, 0.1), wallMat, [0, h / 2, -d / 2 - 0.05]);
  add(box(0.1, h, d + 0.1), wallMat, [-w / 2 - 0.05, h / 2, -0.05]);
  const trim = std('#f4f1ea', { roughness: 0.7 });
  add(box(w, 0.09, 0.02), trim, [0, 0.045, -d / 2 + 0.01], { cast: false });
  add(box(0.02, 0.09, d), trim, [-w / 2 + 0.01, 0.045, 0], { cast: false });

  // window on the back wall: frame, bright pane, sheer curtain
  const wx = 0.75, wy = 1.5, ww = 1.5, wh = 1.25, wz = -d / 2 + 0.012;
  add(box(ww + 0.12, wh + 0.12, 0.03), trim, [wx, wy, wz], { cast: false });
  add(new T.PlaneGeometry(ww, wh), new T.MeshBasicMaterial({ color: look.win }), [wx, wy, wz + 0.02], { cast: false, receive: false });
  add(box(0.035, wh, 0.04), trim, [wx, wy, wz + 0.02], { cast: false });
  add(box(ww, 0.035, 0.04), trim, [wx, wy + 0.1, wz + 0.02], { cast: false });
  const sheer = std('#ffffff', { transparent: true, opacity: 0.55, roughness: 1, side: T.DoubleSide });
  for (const sx of [-1, 1]) add(new T.PlaneGeometry(0.42, wh + 0.5, 6, 1), sheer, [wx + sx * (ww / 2 + 0.05), wy - 0.05, wz + 0.09], { cast: false, receive: false });
  add(new T.CylinderGeometry(0.012, 0.012, ww + 1.1, 8), std('#3a332c', { metalness: 0.6, roughness: 0.4 }), [wx, wy + wh / 2 + 0.2, wz + 0.09], { rot: [0, 0, Math.PI / 2], cast: false });

  // rug
  if (look.rug) add(box(2.3, 0.02, 1.6), std('#ffffff', { map: tex(fabricTexture(muted(look.rug), [6, 4])), roughness: 1 }), [0.05, 0.01, 0.15], { cast: false });

  // sofa along the left wall
  const sofaMat = std('#ffffff', { map: tex(fabricTexture(look.sofa, [5, 3])), roughness: 0.95 });
  const sx = -w / 2 + 0.55, sz = 0.1, sl = 2.1;
  add(soft(0.92, 0.3, sl), sofaMat, [sx, 0.27, sz]);
  add(soft(0.24, 0.62, sl), sofaMat, [sx - 0.35, 0.56, sz]);
  for (const s of [-1, 1]) add(soft(0.92, 0.5, 0.2), sofaMat, [sx, 0.37, sz + s * (sl / 2 - 0.1)]);
  for (const s of [-1, 1]) add(soft(0.66, 0.16, 0.86, 0.07), sofaMat, [sx + 0.08, 0.49, sz + s * 0.45]);
  const pillow = std(muted(look.accent, 0.25), { roughness: 1 });
  add(soft(0.14, 0.36, 0.4, 0.06), pillow, [sx - 0.14, 0.72, sz - 0.68], { rot: [0, 0, -0.25] });
  add(soft(0.14, 0.34, 0.38, 0.06), std(muted(look.rug ?? '#d9cfc0'), { roughness: 1 }), [sx - 0.14, 0.71, sz + 0.66], { rot: [0, 0, -0.25] });
  const dark = std('#2b2621', { roughness: 0.5, metalness: 0.4 });
  for (const lx of [-0.36, 0.36]) for (const lz of [-0.95, 0.95]) add(new T.CylinderGeometry(0.02, 0.02, 0.12, 8), dark, [sx + lx, 0.06, sz + lz], { receive: false });

  // coffee table
  const woodDark = std('#ffffff', { map: tex(woodTexture(look.accent, [1, 1])), roughness: 0.5 });
  add(new T.CylinderGeometry(0.46, 0.46, 0.04, 40), woodDark, [0.1, 0.38, 0.2]);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.4; add(new T.CylinderGeometry(0.018, 0.014, 0.37, 8), dark, [0.1 + Math.cos(a) * 0.32, 0.185, 0.2 + Math.sin(a) * 0.32]); }
  add(box(0.24, 0.03, 0.17), std('#efe8dc'), [0.2, 0.415, 0.12], { rot: [0, 0.4, 0] });
  add(new T.CylinderGeometry(0.045, 0.035, 0.09, 16), std('#f4f1ea', { roughness: 0.3 }), [-0.08, 0.445, 0.34]);

  // sideboard under the window, with a vase and books
  const board = std('#ffffff', { map: tex(woodTexture(look.floor, [2, 1])), roughness: 0.55 });
  add(soft(1.5, 0.46, 0.4, 0.015), board, [wx, 0.36, -d / 2 + 0.24]);
  for (const lx of [-0.65, 0.65]) add(box(0.03, 0.14, 0.34), dark, [wx + lx, 0.07, -d / 2 + 0.24]);
  add(new T.CylinderGeometry(0.05, 0.08, 0.26, 20), std(look.accent, { roughness: 0.35 }), [wx - 0.45, 0.72, -d / 2 + 0.24]);
  [['#efe8dc', 0.2], [look.sofa, 0.17], [look.accent, 0.22]].forEach(([c, bh], i) => add(box(0.045, bh, 0.15), std(c), [wx + 0.3 + i * 0.055, 0.59 + bh / 2, -d / 2 + 0.24]));

  // plant in the far corner
  const px = w / 2 - 0.5, pz = -d / 2 + 0.5;
  add(new T.CylinderGeometry(0.17, 0.13, 0.34, 24), std('#d9cfc0', { roughness: 0.6 }), [px, 0.17, pz]);
  const leaf = std('#5f7a5f', { roughness: 0.75 });
  const leafGeo = new T.SphereGeometry(0.2, 10, 8);
  [[0, 0.95, 0, 1.25], [0.14, 0.7, 0.1, 1], [-0.15, 0.75, -0.05, 1.05], [0.05, 1.22, -0.08, 0.9], [-0.06, 0.55, 0.14, 0.8]]
    .forEach(([lx, ly, lz, s]) => { const m = add(leafGeo, leaf, [px + lx, ly, pz + lz]); m.scale.set(s * 0.8, s * 1.15, s * 0.8); });
  add(new T.CylinderGeometry(0.015, 0.02, 0.5, 6), std('#5a4632'), [px, 0.5, pz]);

  // pendant lamp over the table
  add(new T.CylinderGeometry(0.004, 0.004, 0.85, 6), dark, [0.1, h - 0.425, 0.2], { cast: false, receive: false });
  add(new T.CylinderGeometry(0.07, 0.24, 0.2, 32, 1, true), std(look.accent, { side: T.DoubleSide, roughness: 0.5 }), [0.1, h - 0.95, 0.2], { receive: false });
  add(new T.SphereGeometry(0.05, 12, 10), new T.MeshBasicMaterial({ color: '#fff1cf' }), [0.1, h - 0.98, 0.2], { cast: false, receive: false });

  // framed print above the sofa
  add(box(0.02, 0.62, 0.86), dark, [-w / 2 + 0.012, 1.55, sz], { cast: false });
  add(box(0.022, 0.54, 0.78), std('#f4f1ea'), [-w / 2 + 0.014, 1.55, sz], { cast: false });
  add(box(0.024, 0.3, 0.3), std(look.accent, { roughness: 1 }), [-w / 2 + 0.016, 1.5, sz - 0.1], { cast: false });
  add(new T.CylinderGeometry(0.11, 0.11, 0.024, 24), std(look.sofa, { roughness: 1 }), [-w / 2 + 0.018, 1.64, sz + 0.14], { rot: [0, 0, Math.PI / 2], cast: false });

  // light: daylight through the window (one static shadow map), soft fill, warm pendant
  const sun = new T.DirectionalLight('#fff3df', 2.4);
  sun.position.set(3.2, 4.6, -1.6);
  sun.target.position.set(-0.4, 0, 0.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 0.5, far: 12 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  scene.add(sun, sun.target, new T.HemisphereLight('#fff7ea', '#b9a58c', 0.55));
  const lamp = new T.PointLight('#ffd9a0', 1.3, 4.5, 2);
  lamp.position.set(0.1, h - 1.05, 0.2);
  scene.add(lamp);

  const dispose = () => {
    scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    owned.forEach((t) => t.dispose());
    scene.environment?.dispose();
  };
  return { scene, dispose };
}

function createRenderer({ alpha = true, preserve = false } = {}) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha, preserveDrawingBuffer: preserve, powerPreference: 'low-power' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // static scene: render the shadow map once per look
  return renderer;
}
function environment(renderer) {
  const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.04).texture;
  room.dispose(); pmrem.dispose();
  return env;
}
const makeCamera = (view, aspect) => {
  const camera = new T.PerspectiveCamera(34, aspect, 0.1, 40);
  camera.position.set(...VIEWS[view]);
  camera.lookAt(TARGET);
  return camera;
};

/**
 * Mount an interactive room into `container`.
 * @param {HTMLElement} container
 * @param {{wall:string,floor:string,sofa:string,rug:string|null,accent:string,win:string}} look
 * @param {'A'|'B'|'C'} view
 * @returns {{setView:(v:'A'|'B'|'C')=>void, dispose:()=>void, stats:()=>object}}
 */
export function mountRoom3D(container, look, view = 'A') {
  const renderer = createRenderer();
  const dpr = (moving) => Math.min(window.devicePixelRatio || 1, moving ? 1 : 1.75);
  renderer.setPixelRatio(dpr(false));
  container.prepend(renderer.domElement);

  const room = buildRoom(look);
  room.scene.environment = environment(renderer);
  room.scene.environmentIntensity = 0.5;
  const camera = makeCamera(view, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  Object.assign(controls, { enableDamping: false, enablePan: false, enableZoom: false, rotateSpeed: 0.6,
    minAzimuthAngle: 0.08, maxAzimuthAngle: 1.45, minPolarAngle: 0.75, maxPolarAngle: 1.5 });
  controls.update();

  let frames = 0, disposed = false, tween = null;
  const scheduler = createRenderScheduler({
    draw: () => { if (!disposed) { renderer.render(room.scene, camera); frames += 1; } },
    onInteraction: (moving) => { renderer.setPixelRatio(dpr(moving)); },
  });
  controls.addEventListener('start', () => { tween = null; scheduler.start(); });
  controls.addEventListener('change', scheduler.request);
  controls.addEventListener('end', scheduler.end);

  const resize = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole room in frame on tall, narrow screens
    camera.fov = Math.min(60, (2 * Math.atan(Math.tan(T.MathUtils.degToRad(17)) * Math.max(1, 1.25 / camera.aspect)) * 180) / Math.PI);
    camera.updateProjectionMatrix();
    scheduler.request();
  });
  resize.observe(container);
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());

  return {
    setView(v) {
      const from = camera.position.clone(), to = new T.Vector3(...VIEWS[v]), t0 = performance.now();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mine = tween = {};
      scheduler.start();
      const step = (now) => {
        if (disposed || tween !== mine) return;
        const t = reduced ? 1 : Math.min(1, (now - t0) / 520), q = t * t * (3 - 2 * t);
        camera.position.lerpVectors(from, to, q);
        controls.update();
        scheduler.request();
        if (t < 1) requestAnimationFrame(step); else scheduler.end();
      };
      requestAnimationFrame(step);
    },
    stats: () => ({ frames, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio() }),
    dispose() {
      if (disposed) return;
      disposed = true;
      scheduler.cancel(); resize.disconnect(); controls.dispose(); room.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}

/**
 * Render one still per look with a single short-lived renderer, then free it.
 * @param {Record<string, object>} looks key -> look
 * @returns {Record<string, string>} key -> JPEG data URL
 */
export function renderThumbnails(looks, size = 360) {
  const renderer = createRenderer({ alpha: false, preserve: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor('#efe8dc');
  const env = environment(renderer);
  const camera = makeCamera('A', 1);
  camera.fov = 31; camera.updateProjectionMatrix();
  const out = {};
  for (const [key, look] of Object.entries(looks)) {
    const room = buildRoom(look);
    room.scene.environment = env; room.scene.environmentIntensity = 0.5;
    renderer.shadowMap.needsUpdate = true;
    renderer.render(room.scene, camera);
    out[key] = renderer.domElement.toDataURL('image/jpeg', 0.82);
    room.scene.environment = null;
    room.dispose();
  }
  env.dispose(); renderer.dispose(); renderer.forceContextLoss();
  return out;
}
