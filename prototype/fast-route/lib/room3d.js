// Real-time room preview (Three.js, WebGL). Built to look good and stay light:
//  - demand rendering: a frame is drawn only when the camera or the look changes
//  - while dragging: plain pass at a lower pixel ratio; once settled: full detail + ambient occlusion
//  - one shadow map, rendered once (the scene is static)
//  - procedural materials, one 100KB HDRI for reflections; everything is disposed on unmount
// This module is loaded lazily (dynamic import) so the first screen never pays for it.
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRenderScheduler } from './render-scheduler.js';
import { buildScene } from './scene.js';

const TARGET = new T.Vector3(-0.35, 0.85, -0.2);
export const VIEWS = { A: [5.9, 3.6, 6.2], B: [1.2, 2.2, 8.2], C: [7.8, 4.8, 2.4] };
const BACKDROP = '#ebe4d8';

let hdri = null; // decoded once, reused by every mount
const loadHDRI = () => (hdri ??= new EXRLoader().loadAsync(new URL('../assets/env/apartment.exr', import.meta.url).href)
  .then((t) => { t.mapping = T.EquirectangularReflectionMapping; return t; }));

/**
 * Mount an interactive room into `container`.
 * @param {HTMLElement} container
 * @param {object} look one entry of STYLES (possibly edited)
 * @param {'A'|'B'|'C'} view
 * @returns {{setView:(v:'A'|'B'|'C')=>void, dispose:()=>void, stats:()=>object}}
 */
export function mountRoom3D(container, look, view = 'A') {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // static scene: render the shadow map once
  // phones and low-core machines get a lighter settled frame so it never stutters
  const lite = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4;
  const dpr = (moving) => Math.min(window.devicePixelRatio || 1, moving ? 1 : lite ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr(false));
  container.prepend(renderer.domElement);

  const room = buildScene(look);
  if (lite) room.sun.shadow.mapSize.set(1024, 1024);
  room.scene.background = new T.Color(BACKDROP);
  room.scene.environmentIntensity = 0.55;
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(...VIEWS[view]);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  Object.assign(controls, { enableDamping: false, enablePan: false, enableZoom: false, rotateSpeed: 0.6,
    minAzimuthAngle: 0.06, maxAzimuthAngle: 1.42, minPolarAngle: 0.8, maxPolarAngle: 1.45 });
  controls.update();

  // settled frames go through the composer (MSAA + ambient occlusion); moving frames render directly
  const composer = new EffectComposer(renderer, new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: lite ? 2 : 4 }));
  composer.addPass(new RenderPass(room.scene, camera));
  const ao = new GTAOPass(room.scene, camera, 1, 1);
  ao.blendIntensity = 0.9;
  ao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: lite ? 8 : 16 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: lite ? 8 : 16 });
  composer.addPass(ao);
  composer.addPass(new OutputPass());

  let frames = 0, disposed = false, tween = null, moving = false;
  const scheduler = createRenderScheduler({
    draw: () => {
      if (disposed) return;
      if (moving) renderer.render(room.scene, camera); else composer.render();
      frames += 1;
    },
    onInteraction: (m) => { moving = m; renderer.setPixelRatio(dpr(m)); if (!m) composer.setPixelRatio(dpr(false)); },
  });
  controls.addEventListener('start', () => { tween = null; scheduler.start(); });
  controls.addEventListener('change', scheduler.request);
  controls.addEventListener('end', scheduler.end);

  loadHDRI().then((t) => {
    if (disposed) return;
    const pmrem = new T.PMREMGenerator(renderer);
    room.scene.environment = pmrem.fromEquirectangular(t).texture;
    pmrem.dispose();
    scheduler.request();
  }).catch(() => {});

  const resize = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // keep the whole room in frame on tall, narrow screens
    camera.fov = Math.min(62, (2 * Math.atan(Math.tan(T.MathUtils.degToRad(16)) * Math.max(1, 1.3 / camera.aspect)) * 180) / Math.PI);
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
      room.scene.environment?.dispose();
      composer.dispose(); ao.dispose?.();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
