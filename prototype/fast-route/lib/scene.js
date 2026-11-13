// The room itself: geometry, procedural materials and lights for one style ("look").
// Shared by the live view (room3d.js, cut-away walls) and the offline photoreal stills
// (scripts/render-refs.mjs, closed room + path tracing). No downloads besides one small HDRI.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import { ROOM as DEFAULT_ROOM, roomLayout } from './layout.js';

// The room being built. buildScene sets these from the requested size before it places anything
// (building is synchronous, so the helpers below can read them).
let ROOM, WINDOW, CABINET, LAYOUT;
const useRoom = (size) => { ({ room: ROOM, window: WINDOW, cabinet: CABINET, layout: LAYOUT } = roomLayout(size)); };
useRoom(DEFAULT_ROOM);

/* ---------------- deterministic noise + colour helpers ---------------- */
let seed = 1;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rgb = (hex) => { const n = Number.parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const css = ([r, g, b], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const jitter = (hex, amt) => { const k = 1 + (rand() - 0.5) * amt; return css(rgb(hex).map((v) => Math.min(255, v * k))); };
export const mix = (a, b, t) => '#' + new T.Color(a).lerp(new T.Color(b), t).getHexString();

/* ---------------- procedural textures ---------------- */
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTexture(c, srgb = true) {
  const t = new T.CanvasTexture(c);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function blotches(x, s, color, count, rMin, rMax, aMax) {
  for (let i = 0; i < count; i++) {
    const cx = rand() * s, cy = rand() * s, r = rMin + rand() * (rMax - rMin);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, css(color, rand() * aMax)); g.addColorStop(1, css(color, 0));
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}

/** Wood planks: colour map + bump (gaps). One texture tile covers 1.2 m. */
function planks(base, { rows = 6, size = 1024, vary = 0.1, joints = true } = {}) {
  const c = canvas(size), b = canvas(size), x = c.getContext('2d'), y = b.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  y.fillStyle = '#fff'; y.fillRect(0, 0, size, size);
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    let px = -rand() * size;
    while (px < size) {
      const len = joints ? size * (0.5 + rand() * 0.7) : size * 2;
      for (const off of [0, size]) {
        const sx = px - off;
        x.fillStyle = jitter(base, vary); x.fillRect(sx, r * rh, len, rh);
        // grain
        for (let i = 0; i < 46; i++) {
          const gy = r * rh + rand() * rh, a = 0.03 + rand() * 0.07;
          x.strokeStyle = rand() < 0.75 ? `rgba(45,28,12,${a})` : `rgba(255,240,215,${a * 0.8})`;
          x.lineWidth = 0.6 + rand() * 1.6;
          x.beginPath(); x.moveTo(sx, gy);
          x.bezierCurveTo(sx + len * 0.33, gy + (rand() - 0.5) * 6, sx + len * 0.66, gy + (rand() - 0.5) * 6, sx + len, gy + (rand() - 0.5) * 3);
          x.stroke();
        }
        if (rand() < 0.25) { // knot
          const kx = sx + rand() * len, ky = r * rh + rh * (0.3 + rand() * 0.4);
          x.fillStyle = 'rgba(60,35,15,.28)'; x.beginPath(); x.ellipse(kx, ky, 6 + rand() * 8, 3 + rand() * 3, 0, 0, Math.PI * 2); x.fill();
        }
        if (joints) { x.fillStyle = 'rgba(30,18,8,.4)'; x.fillRect(sx + len - 1, r * rh, 1.5, rh); y.fillStyle = '#000'; y.fillRect(sx + len - 1, r * rh, 2, rh); }
      }
      px += len;
    }
    if (joints) { x.fillStyle = 'rgba(30,18,8,.4)'; x.fillRect(0, r * rh, size, 1.5); y.fillStyle = '#000'; y.fillRect(0, r * rh, size, 2); }
  }
  blotches(x, size, [255, 245, 225], 30, 40, 160, 0.06);
  return { map: toTexture(c), bump: toTexture(b, false) };
}

function concrete(base, size = 1024) {
  const c = canvas(size), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  blotches(x, size, [255, 255, 255], 90, 30, 260, 0.05);
  blotches(x, size, [40, 38, 35], 90, 30, 220, 0.04);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '30,28,25'},${rand() * 0.12})`; x.fillRect(rand() * size, rand() * size, 1.4, 1.4); }
  for (let i = 0; i < 160; i++) { x.fillStyle = 'rgba(25,22,20,.25)'; x.beginPath(); x.arc(rand() * size, rand() * size, 0.6 + rand() * 1.6, 0, 7); x.fill(); }
  return toTexture(c);
}
function plaster(base, size = 512) {
  const c = canvas(size), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  blotches(x, size, [255, 255, 255], 60, 20, 140, 0.035);
  blotches(x, size, [60, 50, 40], 60, 20, 140, 0.025);
  return toTexture(c);
}
function fabric(base, kind = 'linen', size = 256) {
  const c = canvas(size), b = canvas(size), x = c.getContext('2d'), y = b.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  y.fillStyle = '#808080'; y.fillRect(0, 0, size, size);
  if (kind === 'leather') {
    blotches(x, size, [255, 230, 200], 40, 10, 70, 0.08);
    blotches(x, size, [20, 10, 5], 50, 10, 60, 0.12);
    for (let i = 0; i < 700; i++) { y.strokeStyle = `rgba(0,0,0,${0.15 + rand() * 0.25})`; const px = rand() * size, py = rand() * size; y.beginPath(); y.moveTo(px, py); y.lineTo(px + (rand() - 0.5) * 9, py + (rand() - 0.5) * 9); y.stroke(); }
  } else {
    const step = kind === 'velvet' ? 2 : 3;
    for (let i = 0; i < size; i += step) {
      x.fillStyle = `rgba(255,255,255,${0.008 + rand() * 0.02})`; x.fillRect(0, i, size, 1);
      x.fillStyle = `rgba(0,0,0,${0.008 + rand() * 0.02})`; x.fillRect(i, 0, 1, size);
      y.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.2})`; y.fillRect(0, i, size, 1);
      y.fillStyle = `rgba(0,0,0,${0.2 + rand() * 0.2})`; y.fillRect(i + 1, 0, 1, size);
    }
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.08})`; x.fillRect(rand() * size, rand() * size, 1.5, 1.5); }
    if (kind === 'velvet') blotches(x, size, [255, 255, 255], 18, 20, 80, 0.07);
  }
  return { map: toTexture(c), bump: toTexture(b, false) };
}
function marble(size = 512) {
  const c = canvas(size), x = c.getContext('2d');
  x.fillStyle = '#ecebe7'; x.fillRect(0, 0, size, size);
  blotches(x, size, [190, 188, 182], 30, 30, 160, 0.12);
  x.filter = 'blur(1.2px)';
  for (let v = 0; v < 14; v++) {
    let px = rand() * size, py = 0;
    x.strokeStyle = `rgba(110,105,98,${0.15 + rand() * 0.35})`; x.lineWidth = 0.5 + rand() * 2.2;
    x.beginPath(); x.moveTo(px, py);
    while (py < size) { px += (rand() - 0.45) * 40; py += 10 + rand() * 30; x.lineTo(px, py); }
    x.stroke();
  }
  x.filter = 'none';
  return toTexture(c);
}
function rugTexture(base, accent, size = 512) {
  const c = canvas(size, Math.round(size * 1.3)), x = c.getContext('2d'), H = c.height;
  x.fillStyle = base; x.fillRect(0, 0, size, H);
  x.strokeStyle = css(rgb(accent), 0.22); x.lineWidth = 10; x.strokeRect(30, 30, size - 60, H - 60);
  for (let i = 0; i < H; i += 3) { x.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '60,45,30'},${0.02 + rand() * 0.05})`; x.fillRect(0, i, size, 1.5); } // flat-weave rows
  for (let i = 0; i < 16000; i++) { x.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.1})`; x.fillRect(rand() * size, rand() * H, 1.6, 1.6); }
  return toTexture(c);
}
function artTexture(look, size = 512) {
  const c = canvas(size, Math.round(size * 0.74)), x = c.getContext('2d'), H = c.height;
  x.fillStyle = '#f2ede4'; x.fillRect(0, 0, size, H);
  const cols = [look.accent, look.sofa, look.rug ?? look.floor, mix(look.wall, '#000', 0.25)];
  x.globalAlpha = 0.92;
  x.fillStyle = cols[0]; x.beginPath(); x.arc(size * 0.36, H * 0.55, H * 0.28, 0, Math.PI * 2); x.fill();
  x.fillStyle = cols[1]; x.fillRect(size * 0.52, H * 0.18, size * 0.22, H * 0.64);
  x.fillStyle = cols[2]; x.beginPath(); x.ellipse(size * 0.7, H * 0.72, size * 0.16, H * 0.1, -0.2, 0, Math.PI * 2); x.fill();
  x.strokeStyle = cols[3]; x.lineWidth = 3; x.beginPath(); x.moveTo(size * 0.12, H * 0.2); x.bezierCurveTo(size * 0.3, H * 0.05, size * 0.5, H * 0.35, size * 0.86, H * 0.16); x.stroke();
  x.globalAlpha = 1;
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '60,50,40'},${rand() * 0.06})`; x.fillRect(rand() * size, rand() * H, 1, 1); }
  return toTexture(c);
}
/** Out-of-focus Taipei-ish view: sky, far towers, a tree line. */
function viewTexture(w = 1024, h = 600) {
  const c = canvas(w, h), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9cc0dc'); g.addColorStop(0.55, '#dbe8ee'); g.addColorStop(1, '#eef1ea');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.filter = 'blur(5px)';
  for (let i = 0; i < 26; i++) {
    const bw = 30 + rand() * 90, bh = 60 + rand() * 260, bx = rand() * w;
    x.fillStyle = `rgba(${150 + rand() * 50},${165 + rand() * 45},${180 + rand() * 40},${0.55 + rand() * 0.35})`;
    x.fillRect(bx, h * 0.7 - bh, bw, bh + h * 0.3);
  }
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(${70 + rand() * 50},${110 + rand() * 50},${70 + rand() * 30},.85)`;
    x.beginPath(); x.arc(rand() * w, h * (0.78 + rand() * 0.18), 30 + rand() * 60, 0, Math.PI * 2); x.fill();
  }
  x.filter = 'none';
  return toTexture(c);
}

/* ---------------- geometry helpers ---------------- */
function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}
/** Box whose UVs are in metres / tile (so textures keep real-world scale on every face). */
function worldBox(w, h, d, tile = 1) {
  const g = new T.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [su, sv] = ax > 0.5 ? [d, h] : ay > 0.5 ? [w, d] : [w, h];
    uv.setXY(i, (uv.getX(i) * su) / tile, (uv.getY(i) * sv) / tile);
  }
  return g;
}
const soft = (w, h, d, r = 0.04, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
function folds(width, height, amp, freq, segX = 90) {
  const g = new T.PlaneGeometry(width, height, segX, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / width) * Math.PI * 2 * freq) * amp);
  g.computeVertexNormals();
  return g;
}
function leafShape() {
  const s = new T.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.09, 0.03, 0.11, 0.17, 0, 0.26);
  s.bezierCurveTo(-0.11, 0.17, -0.09, 0.03, 0, 0);
  return s;
}

/* ---------------- real assets: scanned furniture + PBR materials (Poly Haven, CC0) ---------------- */
const ASSETS = new URL('../assets/', import.meta.url).href;
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loadModel = (name) => once('m:' + name, () => gltf.loadAsync(`${ASSETS}models/${name}.glb`).then((g) => g.scene));
const loadMap = (name, map, srgb) => once(`t:${name}/${map}`, () => new T.TextureLoader().loadAsync(`${ASSETS}tex/${name}/${map}.jpg`).then((t) => {
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
  return t;
}));
const loadTex = (name) => once('t:' + name, () => Promise.all([loadMap(name, 'diff', true), loadMap(name, 'nor'), loadMap(name, 'rough')]).then(([diff, nor, rough]) => ({ diff, nor, rough })));
const loadManifest = () => once('manifest', () => fetch(`${ASSETS}tex/manifest.json`).then((r) => r.json()));

/** Which models and materials a look needs. */
export function assetNames(look) {
  return {
    models: [look.chairModel, look.tableModel, look.pendantModel, 'modern_wooden_cabinet', 'potted_plant_02', 'potted_plant_04', 'ceramic_vase_01', 'side_table_01'].filter(Boolean),
    tex: [look.floorTex, look.wallTex, look.sofaTex, look.cabinetTex, look.woodTex].filter(Boolean),
  };
}
/**
 * Fetch (once, cached for the session) everything `look` needs. Pass the result to buildScene as `assets`.
 * @returns {Promise<{models:Record<string,T.Object3D>, tex:Record<string,{diff:T.Texture,nor:T.Texture,rough:T.Texture}>, mean:Record<string,string>}>}
 */
export async function loadAssets(look) {
  const { models, tex } = assetNames(look);
  const [mean, ms, ts] = await Promise.all([loadManifest(), Promise.all(models.map(loadModel)), Promise.all(tex.map(loadTex))]);
  return { mean, models: Object.fromEntries(models.map((n, i) => [n, ms[i]])), tex: Object.fromEntries(tex.map((n, i) => [n, ts[i]])) };
}

/* ---------------- the room ---------------- */
/**
 * @param {object} look one entry of STYLES (colours and material kinds)
 * @param {{closed?:boolean, pathtrace?:boolean, assets?:object, size?:{w:number,d:number,h:number}}} opts
 *   size: room size in metres (see roomSize in layout.js); furniture stays wall-anchored.
 *   closed: four walls + ceiling (camera inside, for stills); otherwise a cut-away for orbiting.
 *   pathtrace: lighting tuned for the path tracer (area lights instead of fill tricks).
 *   assets: result of loadAssets(look). Without it the room falls back to hand-built furniture and painted textures.
 */
export function buildScene(look, { closed = false, pathtrace = false, assets: A = null, size = DEFAULT_ROOM } = {}) {
  seed = 97;
  useRoom(size);
  const scene = new T.Scene();
  const owned = new Set();
  const tex = (t) => { owned.add(t); return t; };
  const std = (o) => new T.MeshStandardMaterial({ roughness: 0.8, ...o });
  const put = (parent, geo, mat, [x, y, z] = [0, 0, 0], { rot, cast = true, receive = true, scale } = {}) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    m.castShadow = cast; m.receiveShadow = receive;
    parent.add(m);
    return m;
  };
  const add = (geo, mat, pos, o) => put(scene, geo, mat, pos, o);
  const group = (x, y, z, ry = 0) => { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g); return g; };
  const { w, d, h } = ROOM;
  // real material: scanned diffuse / normal / roughness, tinted so its average colour matches `tint`
  const pbr = (name, tint, o = {}) => {
    const t = A.tex[name], c = new T.Color('#ffffff');
    if (tint) { const want = new T.Color(tint), mean = new T.Color(A.mean[name]); c.setRGB(Math.min(2.2, want.r / Math.max(mean.r, 0.02)), Math.min(2.2, want.g / Math.max(mean.g, 0.02)), Math.min(2.2, want.b / Math.max(mean.b, 0.02))); }
    return std({ map: t.diff, normalMap: t.nor, roughnessMap: t.rough, roughness: 1, color: c, ...o });
  };
  const has = (n) => Boolean(A && n && (A.tex[n] || A.models[n]));
  // scanned model, dropped on the floor (or at height y) with its footprint centred on x/z
  const place = (name, x, z, { ry = 0, scale = 1, y = 0, hang = false } = {}) => {
    const g = A.models[name].clone(true);
    g.scale.setScalar(scale); g.rotation.y = ry; g.position.set(0, 0, 0); g.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(g), c = b.getCenter(new T.Vector3());
    // 吊著的東西：垂到離地約 2 公尺（天花板不夠高就貼著天花），由呼叫端補上吊線
    const top = hang ? y - Math.min(1, Math.max(0, y - 2.0 - (b.max.y - b.min.y))) : 0;
    g.position.set(x - c.x, hang ? top - b.max.y : y - b.min.y, z - c.z);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.shared = true; } });
    scene.add(g);
    return b.translate(g.position);
  };

  /* materials */
  const metal = std({ color: look.metal ?? '#2b2621', roughness: 0.35, metalness: 0.85 });
  const brass = std({ color: '#b48a4e', roughness: 0.3, metalness: 1 });
  const white = std({ color: '#f3f0ea', roughness: 0.6 });
  let floorMat;
  if (has(look.floorTex)) floorMat = pbr(look.floorTex, look.floor, { envMapIntensity: 0.6 });
  else if (look.floorType === 'concrete') floorMat = std({ map: tex(concrete(look.floor)), roughness: 0.45, metalness: 0 });
  else { const p = planks(look.floor); floorMat = std({ map: tex(p.map), bumpMap: tex(p.bump), bumpScale: 0.6, roughness: 0.42 }); }
  const wallMat = has(look.wallTex) ? pbr(look.wallTex, look.wall) : std({ map: tex(look.wallType === 'concrete' ? concrete(look.wall, 512) : plaster(look.wall)), roughness: 0.92 });
  const woodTone = (hex) => { const p = planks(hex, { rows: 2, size: 512, vary: 0.04, joints: false }); p.bump.dispose(); p.map.rotation = Math.PI / 2; return std({ map: tex(p.map), roughness: 0.5 }); };
  const cabinetMat = has(look.cabinetTex) ? pbr(look.cabinetTex, null, { roughness: 0.75 }) : look.cabinetWood ? woodTone(look.cabinet) : std({ color: look.cabinet, roughness: 0.55 });
  const accentWood = has(look.woodTex) ? pbr(look.woodTex, null, { roughness: 0.8 }) : has(look.cabinetTex) ? cabinetMat : woodTone(look.woodAccent ?? look.cabinet);
  const fab = has(look.sofaTex) ? null : fabric(look.sofa, look.fabric ?? 'linen');
  const sofaMat = has(look.sofaTex) ? pbr(look.sofaTex, look.sofa, look.fabric === 'leather' ? { roughness: 0.75, envMapIntensity: 0.6 } : { roughnessMap: null, roughness: 1, envMapIntensity: 0.25 }) : std({ map: tex(fab.map), bumpMap: tex(fab.bump), bumpScale: 0.4, roughness: look.fabric === 'leather' ? 0.48 : 0.95, ...(look.fabric === 'velvet' ? { sheen: 1 } : {}) });
  const pillowA = std({ map: tex(fabric(mix(look.accent, '#ffffff', 0.15)).map), roughness: 1 });
  const pillowB = std({ map: tex(fabric(mix(look.rug ?? '#e8e0d2', '#ffffff', 0.1)).map), roughness: 1 });

  /* shell: floor, walls (window opening is real so sunlight falls through it), skirting */
  add(scaleUV(new T.BoxGeometry(w, 0.1, d), w / (A ? 2.4 : 1.2), d / (A ? 2.4 : 1.2)), floorMat, [0, -0.05, 0], { cast: false });
  const T_W = 0.12, bz = -d / 2 - T_W / 2;
  const { x0, x1, y0, y1 } = WINDOW;
  const wallPiece = (pw, ph, px, py) => add(worldBox(pw, ph, T_W, 1.6), wallMat, [px, py, bz]);
  wallPiece(x0 + w / 2, h, (-w / 2 + x0) / 2, h / 2);
  wallPiece(w / 2 - x1, h, (x1 + w / 2) / 2, h / 2);
  wallPiece(x1 - x0, y0, (x0 + x1) / 2, y0 / 2);
  wallPiece(x1 - x0, h - y1, (x0 + x1) / 2, (h + y1) / 2);
  add(worldBox(T_W, h, d + T_W, 1.6), wallMat, [-w / 2 - T_W / 2, h / 2, -T_W / 2]);
  if (closed) {
    add(worldBox(T_W, h, d + T_W * 2, 1.6), wallMat, [w / 2 + T_W / 2, h / 2, 0]);
    add(worldBox(w, h, T_W, 1.6), wallMat, [0, h / 2, d / 2 + T_W / 2]);
    add(new T.BoxGeometry(w + 0.3, 0.1, d + 0.3), std({ color: '#f4f2ee', roughness: 0.95 }), [0, h + 0.05, 0], { cast: true });
    // recessed downlights
    for (const [lx, lz] of [[-1.3, -0.7], [-1.3, 1.2], [0.6, -0.7], [0.6, 1.2], [1.9, 0.3]]) {
      add(new T.CylinderGeometry(0.06, 0.06, 0.01, 24), white, [lx, h - 0.004, lz], { cast: false });
      add(new T.CircleGeometry(0.045, 24), std({ color: '#000', emissive: '#fff1d8', emissiveIntensity: pathtrace ? 3 : 2 }), [lx, h - 0.011, lz], { rot: [Math.PI / 2, 0, 0], cast: false });
    }
  }
  const skirt = std({ color: look.skirting ?? '#f1ede6', roughness: 0.6 });
  add(new T.BoxGeometry(x0 + w / 2, 0.08, 0.015), skirt, [(-w / 2 + x0) / 2, 0.04, -d / 2 + 0.0075], { cast: false });
  add(new T.BoxGeometry(w / 2 - x1, 0.08, 0.015), skirt, [(x1 + w / 2) / 2, 0.04, -d / 2 + 0.0075], { cast: false });
  add(new T.BoxGeometry(0.015, 0.08, d), skirt, [-w / 2 + 0.0075, 0.04, 0], { cast: false });

  /* window: frame, mullion, sill, glass (live only), view outside */
  const frame = std({ color: look.frame ?? '#34312d', roughness: 0.4, metalness: 0.6 });
  const fz = -d / 2 - 0.02, fw = 0.05;
  add(new T.BoxGeometry(x1 - x0, fw, 0.07), frame, [(x0 + x1) / 2, y0 + fw / 2, fz]);
  add(new T.BoxGeometry(x1 - x0, fw, 0.07), frame, [(x0 + x1) / 2, y1 - fw / 2, fz]);
  for (const fx of [x0 + fw / 2, (x0 + x1) / 2, x1 - fw / 2]) add(new T.BoxGeometry(fw, y1 - y0, 0.07), frame, [fx, (y0 + y1) / 2, fz]);
  add(new T.BoxGeometry(x1 - x0 - 0.1, 0.035, 0.07), frame, [(x0 + x1) / 2, 2.05, fz]);
  add(new T.BoxGeometry(x1 - x0 + 0.08, 0.03, 0.2), std({ color: look.sill ?? '#e9e5dd', roughness: 0.35 }), [(x0 + x1) / 2, y0 - 0.015, -d / 2 - 0.02]);
  if (!pathtrace) {
    add(new T.PlaneGeometry(x1 - x0, y1 - y0), new T.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transparent: true, opacity: 0.12, metalness: 0, envMapIntensity: 1.4 }),
      [(x0 + x1) / 2, (y0 + y1) / 2, fz], { cast: false, receive: false });
  }
  // the view outside: in the cut-away it sits right behind the opening so it can never show past the wall
  const vw = closed ? 9 : x1 - x0, vh = closed ? 5.5 : y1 - y0;
  add(new T.PlaneGeometry(vw, vh), std({ color: '#000', emissive: '#ffffff', emissiveMap: tex(viewTexture()), emissiveIntensity: pathtrace ? 2.2 : 1 }),
    [(x0 + x1) / 2, closed ? 1.6 : (y0 + y1) / 2, -d / 2 - (closed ? 1.4 : 0.1)], { cast: false, receive: false });

  /* sheer curtains, bunched at both sides, on a slim track */
  const sheer = std({ color: '#fbfaf6', roughness: 1, transparent: true, opacity: 0.62, side: T.DoubleSide });
  const ch = y1 - 0.02 + 0.2;
  add(folds(0.75, ch, 0.035, 7), sheer, [x0 + 0.18, ch / 2 + 0.02, -d / 2 + 0.11], { cast: false });
  add(folds(0.6, ch, 0.035, 6), sheer, [x1 - 0.12, ch / 2 + 0.02, -d / 2 + 0.11], { cast: false });
  add(new T.BoxGeometry(x1 - x0 + 0.6, 0.025, 0.04), white, [(x0 + x1) / 2, ch + 0.035, -d / 2 + 0.1], { cast: false });

  /* built-in storage wall: two full-height bays + a lit open niche */
  {
    const { x0: cx0, x1: cx1, depth } = CABINET;
    const cw = cx1 - cx0, cz = -d / 2 + depth / 2, top = h;
    const bay = cw / 3, g = 0.004, front = -d / 2 + depth + 0.01, carcass = std({ color: mix(look.cabinet, '#000', 0.08), roughness: 0.7 });
    for (const i of [0, 2]) add(new T.BoxGeometry(bay, top, depth - 0.02), carcass, [cx0 + bay * (i + 0.5), top / 2, cz - 0.01]);
    add(new T.BoxGeometry(bay, 0.88, depth - 0.02), carcass, [cx0 + bay * 1.5, 0.44, cz - 0.01]);
    add(new T.BoxGeometry(bay, top - 1.8, depth - 0.02), carcass, [cx0 + bay * 1.5, (top + 1.8) / 2, cz - 0.01]);
    const door = (bx, by, bw, bh) => add(has(look.cabinetTex) ? worldBox(bw - g * 2, bh - g * 2, 0.02, 1.3) : soft(bw - g * 2, bh - g * 2, 0.02, 0.004, 1), cabinetMat, [bx, by, front]);
    for (const i of [0, 2]) { const bx = cx0 + bay * (i + 0.5); door(bx, 0.09 + (top - 0.18) / 2, bay, top - 0.18); }
    const mx = cx0 + bay * 1.5;
    door(mx, 0.08 + 0.4, bay, 0.8);
    door(mx, (1.8 + top) / 2 + 0.04, bay, top - 1.8 - 0.08);
    add(new T.BoxGeometry(cw, 0.08, 0.02), std({ color: '#2a2622', roughness: 0.9 }), [cx0 + cw / 2, 0.04, front - 0.03], { cast: false });
    // niche (0.88..1.8): back panel in accent wood, shelf, LED strip, books, vase
    add(new T.BoxGeometry(bay - 0.02, 0.92, 0.01), accentWood, [mx, 1.34, -d / 2 + 0.02]);
    add(new T.BoxGeometry(bay - 0.02, 0.025, depth - 0.04), cabinetMat, [mx, 1.33, cz]);
    add(new T.BoxGeometry(bay - 0.06, 0.008, 0.012), std({ color: '#000', emissive: '#ffd9a0', emissiveIntensity: 3 }), [mx, 1.785, front - 0.05], { cast: false });
    books(scene, add, mx - 0.12, 0.88, cz, 7, look);
    vase(add, std({ color: look.ceramic ?? '#e9e2d6', roughness: 0.35 }), mx + 0.12, 1.345, cz, 0.7);
    books(scene, add, mx - 0.05, 1.345, cz, 5, look);
    if (look.handles) for (const bx of [cx0 + bay - 0.03, cx0 + bay * 2 + 0.03]) add(new T.BoxGeometry(0.012, 0.32, 0.02), brass, [bx, 1.05, front + 0.02]);
  }

  /* low sideboard under the window (left out when the window wall is too short) */
  if (!LAYOUT.sideboard) { /* nothing */ } else if (has('modern_wooden_cabinet')) {
    const L = LAYOUT.sideboard, b = place('modern_wooden_cabinet', L.x, -d / 2 + 0.24, { scale: 0.68 });
    place('ceramic_vase_01', L.x - 0.55, -d / 2 + 0.24, { y: b.max.y, scale: 0.9 });
    place('potted_plant_04', L.x + 0.5, -d / 2 + 0.24, { y: b.max.y, scale: 1.1 });
    books(scene, add, L.x + 0.05, b.max.y, -d / 2 + 0.24, 4, look, true);
  } else {
    const L = LAYOUT.sideboard, sg = group(L.x, 0, -d / 2 + 0.2);
    put(sg, soft(L.sx, 0.36, L.sz, 0.012, 2), cabinetMat, [0, 0.29, 0]);
    for (let i = -3; i <= 3; i++) put(sg, new T.BoxGeometry(0.004, 0.3, 0.004), std({ color: '#000', roughness: 1, transparent: true, opacity: 0.3 }), [i * (L.sx / 8), 0.29, L.sz / 2 + 0.001], { cast: false });
    for (const lx of [-L.sx / 2 + 0.06, L.sx / 2 - 0.06]) for (const lz of [-0.13, 0.13]) put(sg, new T.CylinderGeometry(0.014, 0.01, 0.11, 10), metal, [lx, 0.055, lz]);
    vase((g, m, p, o) => put(sg, g, m, p, o), std({ color: look.accent, roughness: 0.3 }), -0.5, 0.47, 0, 1.05);
    const stems = std({ color: '#5b4a36', roughness: 0.9 });
    for (let i = 0; i < 4; i++) put(sg, new T.CylinderGeometry(0.003, 0.004, 0.7, 5), stems, [-0.5 + (i - 1.5) * 0.02, 0.92, 0], { rot: [0, 0, (i - 1.5) * 0.18] });
    books(sg, (g, m, p, o) => put(sg, g, m, p, o), 0.35, 0.47, 0, 4, look, true);
  }

  /* rug */
  if (look.rug) { const R = LAYOUT.rug; add(new T.BoxGeometry(R.sx, 0.012, R.sz), std({ map: tex(rugTexture(mix(look.rug, '#d9d0c2', 0.5), look.accent)), roughness: 1 }), [R.x, 0.006, R.z], { cast: false }); }

  /* sofa against the left wall, an armchair facing it */
  const S = LAYOUT.sofa;
  sofa(group(S.x, 0, S.z, Math.PI / 2), put, { L: S.sz, D: S.sx, seats: S.sz < 1.9 ? 2 : 3, mat: sofaMat, legs: look.legs, metal, wood: accentWood, pillows: [pillowA, pillowB], uv: has(look.sofaTex) ? 2.5 : 1 });
  const C = LAYOUT.chair;
  if (!C) { /* no room for an armchair */ } else if (has(look.chairModel)) place(look.chairModel, C.x, C.z, { ry: Math.PI / 2 + 0.35, scale: look.chairScale ?? 1 });
  else sofa(group(C.x, 0, C.z, -Math.PI / 2 + 0.35), put, { L: 0.86, D: 0.84, seats: 1, mat: look.chairFabric ? std({ map: tex(fabric(look.chairFabric).map), roughness: 0.95 }) : sofaMat, legs: look.legs, metal, wood: accentWood, pillows: [pillowB] });
  // throw on the sofa arm
  add(soft(0.5, 0.05, 0.46, 0.02), pillowB, [S.x + 0.05, 0.665, S.z + S.sz / 2 - 0.12], { rot: [0, 0.1, 0.05] });

  /* coffee table */
  if (!LAYOUT.table) { /* too narrow for a coffee table */ } else if (has(look.tableModel)) {
    const T0 = LAYOUT.table, b = place(look.tableModel, T0.x, T0.z, { scale: look.tableScale ?? 1 });
    add(new T.BoxGeometry(0.22, 0.03, 0.28), std({ color: '#ece6db', roughness: 0.8 }), [T0.x - 0.04, b.max.y + 0.015, T0.z - 0.18], { rot: [0, 0.3, 0] });
    add(new T.BoxGeometry(0.2, 0.025, 0.26), std({ color: look.accent, roughness: 0.8 }), [T0.x - 0.04, b.max.y + 0.042, T0.z - 0.18], { rot: [0, 0.18, 0] });
    vase(add, std({ color: look.ceramic ?? '#e9e2d6', roughness: 0.3 }), T0.x + 0.06, b.max.y, T0.z + 0.2, 0.55);
  } else coffeeTable(look, add, { metal, wood: accentWood, white, marbleMat: () => std({ map: tex(marble()), roughness: 0.18 }), std });

  /* side table + floor lamp + pendant */
  {
    const st = LAYOUT.sidetable;
    if (!st) { /* nothing */ } else if (has('side_table_01')) {
      const b = place('side_table_01', st.x, st.z, { scale: 0.85 });
      add(new T.CylinderGeometry(0.04, 0.035, 0.09, 20), std({ color: look.ceramic ?? '#e9e2d6', roughness: 0.3 }), [st.x + 0.06, b.max.y + 0.045, st.z + 0.05]);
    } else {
      add(new T.CylinderGeometry(0.22, 0.22, 0.025, 36), look.tableType === 'marble' ? std({ map: tex(marble()), roughness: 0.2 }) : accentWood, [st.x, 0.55, st.z]);
      add(new T.CylinderGeometry(0.012, 0.012, 0.54, 10), metal, [st.x, 0.275, st.z]);
      add(new T.CylinderGeometry(0.15, 0.17, 0.015, 28), metal, [st.x, 0.008, st.z]);
      add(new T.CylinderGeometry(0.04, 0.035, 0.09, 20), std({ color: look.ceramic ?? '#e9e2d6', roughness: 0.3 }), [st.x + 0.06, 0.61, st.z + 0.05]);
    }
    const lp = LAYOUT.lamp;
    if (lp) {
    add(new T.CylinderGeometry(0.16, 0.17, 0.02, 32), metal, [lp.x, 0.01, lp.z]);
    add(new T.CylinderGeometry(0.01, 0.01, 1.5, 10), metal, [lp.x, 0.76, lp.z]);
    const shade = std({ color: '#f4ecdc', roughness: 1, side: T.DoubleSide, emissive: '#ffd59a', emissiveIntensity: pathtrace ? 0.6 : 0.35 });
    add(new T.CylinderGeometry(0.19, 0.22, 0.3, 40, 1, true), shade, [lp.x, 1.56, lp.z], { cast: false });
    add(new T.SphereGeometry(0.035, 12, 10), std({ color: '#000', emissive: '#ffe2b0', emissiveIntensity: 4 }), [lp.x, 1.5, lp.z], { cast: false, receive: false });
    }
    if (has(look.pendantModel)) {
      const { x, z } = LAYOUT.pendant, top = place(look.pendantModel, x, z, { y: h, hang: true }).max.y;
      // 吊線與天花板上的吸頂座：看得出燈是從天花板垂下來的，不是飄在半空
      if (h - top > 0.02) add(new T.CylinderGeometry(0.004, 0.004, h - top, 6), metal, [x, (h + top) / 2, z], { cast: false });
      add(new T.CylinderGeometry(0.06, 0.06, 0.025, 24), metal, [x, h - 0.0125, z], { cast: false });
    } else pendant(look, add, { metal, brass, std, pathtrace, white });
  }

  /* art above the sofa */
  {
    const ax = -w / 2 + 0.02, ay = 1.62;
    add(new T.BoxGeometry(0.035, 0.72, 0.98), std({ color: look.frameArt ?? '#2a2622', roughness: 0.5 }), [ax + 0.0175, ay, S.z]);
    add(new T.PlaneGeometry(0.9, 0.64), std({ map: tex(artTexture(look)), roughness: 0.95 }), [ax + 0.037, ay, S.z], { rot: [0, Math.PI / 2, 0], cast: false });
  }

  /* plant */
  if (!LAYOUT.plant) { /* nothing */ } else if (has('potted_plant_02')) place('potted_plant_02', LAYOUT.plant.x, LAYOUT.plant.z, { scale: 1.55, ry: 0.6 });
  else {
    const P = LAYOUT.plant, potMat = std({ color: look.pot ?? '#d8cfc1', roughness: 0.55 });
    const pts = [[0, 0], [0.15, 0], [0.17, 0.02], [0.19, 0.34], [0.2, 0.36], [0.18, 0.36], [0.165, 0.05], [0, 0.05]].map(([x, y]) => new T.Vector2(x, y));
    add(new T.LatheGeometry(pts, 40), potMat, [P.x, 0, P.z]);
    add(new T.CircleGeometry(0.175, 24), std({ color: '#3b2f24', roughness: 1 }), [P.x, 0.32, P.z], { rot: [-Math.PI / 2, 0, 0], cast: false });
    const trunk = std({ color: '#6a5641', roughness: 0.9 });
    const leafGeo = new T.ShapeGeometry(leafShape(), 6);
    const greens = ['#4f6b45', '#5d7a4f', '#45603d', '#68855a'].map((c) => std({ color: c, roughness: 0.55, side: T.DoubleSide }));
    for (let s = 0; s < 3; s++) {
      const lean = (s - 1) * 0.16, top = 1.15 + s * 0.22;
      add(new T.CylinderGeometry(0.008, 0.014, top, 6), trunk, [P.x + lean * top * 0.5, 0.32 + top / 2, P.z + (s - 1) * 0.04], { rot: [0, 0, -lean] });
      for (let i = 0; i < 11; i++) {
        const t = 0.35 + (i / 11) * 0.65, yy = 0.32 + top * t, a = i * 2.4 + s;
        const m = add(leafGeo, greens[(i + s) % 4], [P.x + lean * top * t + Math.cos(a) * 0.04, yy, P.z + (s - 1) * 0.04 + Math.sin(a) * 0.04], { cast: true });
        m.rotation.set(-0.5 - rand() * 0.6, a, 0, 'YXZ');
        m.scale.setScalar(0.8 + t * 0.6);
      }
    }
  }

  /* lights */
  const sun = new T.DirectionalLight('#fff0d6', pathtrace ? 4.2 : 3.2);
  // same sun angle whatever the room size: aimed through the window at the floor in front of it
  const aim = new T.Vector3((x0 + x1) / 2 - 1.45, 0, -d / 2 + 2.7), far = 1 + Math.max(w, d) / 8;
  sun.target.position.copy(aim);
  sun.position.set(aim.x + 3.2 * far, 4.4 * far, aim.z - 8.1 * far);
  sun.castShadow = !pathtrace;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = Math.max(ROOM.w, ROOM.d) * 0.9;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 16 * far + 12 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.025; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  // skylight coming through the window (an area light the path tracer samples directly)
  const sky = new T.RectAreaLight('#eef4ff', pathtrace ? 9 : 0, x1 - x0, y1 - y0);
  sky.position.set((x0 + x1) / 2, (y0 + y1) / 2, -d / 2 + 0.02);
  sky.lookAt((x0 + x1) / 2, (y0 + y1) / 2 - 0.4, 2);
  if (pathtrace) {
    scene.add(sky);
    const fill = new T.RectAreaLight('#fff4e4', 1.2, 1.2, 1.2);
    fill.position.set(-0.4, h - 0.02, 0.6); fill.lookAt(-0.4, 0, 0.6);
    scene.add(fill);
  }
  {
    if (!pathtrace) scene.add(new T.HemisphereLight('#fbf6ee', '#b9a58c', 0.5));
    const warm = new T.PointLight('#ffcf8f', 1.1, 5, 2); warm.position.set(LAYOUT.pendant.x, h - 1.0, LAYOUT.pendant.z); scene.add(warm);
    if (LAYOUT.lamp) { const lamp = new T.PointLight('#ffcf8f', 0.8, 3, 2); lamp.position.set(LAYOUT.lamp.x + 0.1, 1.45, LAYOUT.lamp.z); scene.add(lamp); }
  }

  const dispose = () => {
    scene.traverse((o) => { if (o.isMesh && !o.userData.shared) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
    owned.forEach((t) => t.dispose());
  };
  return { scene, dispose, sun };
}

/* ---------------- furniture ---------------- */
function sofa(g, put, { L, D, seats, mat, legs = 'wood', metal, wood, pillows, uv = 1 }) {
  const p = (geo, m, pos, o) => put(g, uv === 1 || m !== mat ? geo : scaleUV(geo, uv, uv), m, pos, o);
  const legH = legs === 'block' ? 0.06 : 0.13, legMat = legs === 'metal' ? metal : wood;
  for (const lx of [-L / 2 + 0.08, L / 2 - 0.08]) for (const lz of [-D / 2 + 0.08, D / 2 - 0.08]) {
    if (legs === 'block') p(new T.BoxGeometry(0.06, legH, 0.06), legMat, [lx, legH / 2, lz]);
    else if (legs === 'metal') p(new T.BoxGeometry(0.02, legH, 0.02), legMat, [lx, legH / 2, lz]);
    else p(new T.CylinderGeometry(0.022, 0.014, legH, 10), legMat, [lx, legH / 2, lz], { rot: [lz > 0 ? 0.12 : -0.12, 0, 0] });
  }
  const arm = 0.17, baseH = 0.2, y0 = legH;
  p(soft(L, baseH, D, 0.04), mat, [0, y0 + baseH / 2, 0]);
  for (const s of [-1, 1]) p(soft(arm, 0.42, D, 0.07), mat, [s * (L / 2 - arm / 2), y0 + baseH + 0.15, 0]);
  p(soft(L - 0.02, 0.5, 0.2, 0.06), mat, [0, y0 + baseH + 0.22, -D / 2 + 0.1]);
  const inner = L - arm * 2, cw = inner / seats;
  for (let i = 0; i < seats; i++) {
    const cx = -inner / 2 + cw * (i + 0.5);
    p(soft(cw - 0.012, 0.15, D - 0.24, 0.065), mat, [cx, y0 + baseH + 0.075, 0.1]);
    const b = p(soft(cw - 0.02, 0.44, 0.19, 0.08), mat, [cx, y0 + baseH + 0.36, -D / 2 + 0.27]);
    b.rotation.x = -0.14;
  }
  pillows.forEach((pm, i) => {
    const sx = (i === 0 ? -1 : 1) * (inner / 2 - 0.22);
    p(soft(0.4, 0.4, 0.13, 0.06), pm, [seats === 1 ? 0 : sx, y0 + baseH + 0.33, -D / 2 + 0.42], { rot: [-0.25, (i === 0 ? 1 : -1) * 0.15, (i === 0 ? 1 : -1) * 0.12] });
  });
}

const BOOK_COLOURS = ['#e9e2d4', '#c9b79c', '#7d8b74', '#a8643d', '#3d4a52', '#d6cbb8', '#8c7a63', '#efe9df'];
function books(_parent, put, x, y, z, n, look, flat = false) {
  let off = 0;
  for (let i = 0; i < n; i++) {
    const c = i === 2 ? look.accent : BOOK_COLOURS[(i * 3 + 1) % BOOK_COLOURS.length];
    const m = new T.MeshStandardMaterial({ color: c, roughness: 0.85 });
    if (flat) { const th = 0.025 + rand() * 0.015; put(new T.BoxGeometry(0.24 - i * 0.012, th, 0.17), m, [x, y + off + th / 2, z], { rot: [0, (rand() - 0.5) * 0.3, 0] }); off += th; }
    else { const th = 0.022 + rand() * 0.02, bh = 0.2 + rand() * 0.08; put(new T.BoxGeometry(th, bh, 0.16 + rand() * 0.04), m, [x + off, y + bh / 2, z]); off += th + 0.002; }
  }
}
function vase(put, mat, x, y, z, s = 1) {
  const pts = [[0, 0], [0.05, 0], [0.075, 0.06], [0.08, 0.13], [0.05, 0.2], [0.032, 0.25], [0.04, 0.27], [0.036, 0.27], [0.026, 0.24], [0, 0.24]].map(([a, b]) => new T.Vector2(a * s, b * s));
  put(new T.LatheGeometry(pts, 36), mat, [x, y, z]);
}
function coffeeTable(look, add, { metal, wood, white, marbleMat, std }) {
  const L = LAYOUT.table, x = L.x, z = L.z;
  const type = look.tableType ?? 'round-wood';
  if (type === 'marble') {
    add(soft(0.6, 0.035, 1.05, 0.01, 2), marbleMat(), [x, 0.38, z]);
    for (const s of [-1, 1]) add(new T.BoxGeometry(0.42, 0.36, 0.03), metal, [x, 0.18, z + s * 0.36]);
  } else if (type === 'slab-steel') {
    add(new T.BoxGeometry(0.62, 0.06, 1.1), wood, [x, 0.4, z]);
    for (const s of [-1, 1]) { add(new T.BoxGeometry(0.56, 0.03, 0.03), metal, [x, 0.02, z + s * 0.48]); for (const t of [-1, 1]) add(new T.BoxGeometry(0.03, 0.37, 0.03), metal, [x + t * 0.27, 0.185, z + s * 0.48]); }
  } else if (type === 'low-wood') {
    add(soft(0.58, 0.04, 1.0, 0.008, 2), wood, [x, 0.33, z]);
    add(new T.BoxGeometry(0.5, 0.02, 0.9), wood, [x, 0.12, z]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) add(new T.BoxGeometry(0.045, 0.31, 0.045), wood, [x + a * 0.25, 0.155, z + b * 0.46]);
  } else if (type === 'oval-white') {
    add(new T.CylinderGeometry(0.3, 0.3, 0.03, 48), white, [x, 0.4, z], { scale: [1, 1, 1.7] });
    for (const a of [0, 1, 2, 3]) { const ang = a * Math.PI / 2 + Math.PI / 4; add(new T.CylinderGeometry(0.018, 0.012, 0.39, 10), wood, [x + Math.cos(ang) * 0.17, 0.195, z + Math.sin(ang) * 0.32]); }
  } else {
    add(new T.CylinderGeometry(0.45, 0.45, 0.04, 56), wood, [x + 0.05, 0.4, z]);
    add(new T.CylinderGeometry(0.16, 0.2, 0.38, 32), wood, [x + 0.05, 0.19, z]);
  }
  const topY = type === 'low-wood' ? 0.35 : type === 'slab-steel' ? 0.43 : 0.415;
  add(new T.BoxGeometry(0.22, 0.03, 0.28), std({ color: '#ece6db', roughness: 0.8 }), [x - 0.04, topY + 0.015, z - 0.18], { rot: [0, 0.3, 0] });
  add(new T.BoxGeometry(0.2, 0.025, 0.26), std({ color: look.accent, roughness: 0.8 }), [x - 0.04, topY + 0.042, z - 0.18], { rot: [0, 0.18, 0] });
  vase(add, std({ color: look.ceramic ?? '#e9e2d6', roughness: 0.3 }), x + 0.06, topY, z + 0.2, 0.55);
  add(new T.CylinderGeometry(0.11, 0.11, 0.012, 32), std({ color: look.metal ?? '#2b2621', roughness: 0.3, metalness: 0.7 }), [x + 0.08, topY + 0.006, z - 0.02]);
}
function pendant(look, add, { metal, brass, std, pathtrace, white }) {
  const { x, z } = LAYOUT.pendant, h = ROOM.h, y = h - 1.0;
  add(new T.CylinderGeometry(0.003, 0.003, h - y - 0.12, 6), metal, [x, (h + y + 0.12) / 2, z], { cast: false });
  const glow = std({ color: '#000', emissive: '#ffe1ae', emissiveIntensity: 4 });
  const kind = look.pendant ?? 'dome';
  if (kind === 'globe' || kind === 'paper') {
    add(new T.SphereGeometry(kind === 'paper' ? 0.24 : 0.16, 40, 28), std({ color: '#fbf6ec', roughness: 1, emissive: '#ffe6bd', emissiveIntensity: pathtrace ? 1.6 : 0.9 }), [x, y, z], { cast: false });
  } else if (kind === 'disc') {
    add(new T.CylinderGeometry(0.3, 0.3, 0.025, 48), brass, [x, y + 0.1, z], { cast: false });
    add(new T.CircleGeometry(0.28, 48), glow, [x, y + 0.087, z], { rot: [Math.PI / 2, 0, 0], cast: false });
  } else if (kind === 'cone') {
    add(new T.CylinderGeometry(0.035, 0.2, 0.26, 40, 1, true), std({ color: look.accent, roughness: 0.4, metalness: 0.6, side: T.DoubleSide }), [x, y + 0.13, z], { cast: false });
    add(new T.SphereGeometry(0.04, 12, 10), glow, [x, y + 0.04, z], { cast: false, receive: false });
  } else {
    add(new T.SphereGeometry(0.22, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: look.accent, roughness: 0.35, metalness: 0.5, side: T.DoubleSide }), [x, y, z], { cast: false });
    add(new T.SphereGeometry(0.045, 12, 10), glow, [x, y + 0.02, z], { cast: false, receive: false });
  }
  void white;
}
