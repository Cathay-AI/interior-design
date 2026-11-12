// Lightweight CSS-3D room (no WebGL): floor, two walls, sofa, table, rug, plant, lamp.
// Drag to rotate; preset views A/B/C. Keeps the 3D 提案 honest: a real 3D scene, not one image.
import { shade } from './art.js';

export const VIEWS = { A: [-18, -38], B: [-14, -8], C: [-28, -62] };
const W = 340, D = 300, H = 200;

function el(style) { const d = document.createElement('div'); d.style.cssText = style; return d; }
function face(w, h, bg, transform, extra = '') {
  const f = el(`width:${w}px;height:${h}px;margin-left:${-w / 2}px;margin-top:${-h / 2}px;background:${bg};transform:${transform};${extra}`);
  f.className = 'f';
  return f;
}
function box(w, h, d, x, y, z, color) {
  const g = el(`position:absolute;transform:translate3d(${x}px,${y}px,${z}px)`);
  g.append(
    face(w, h, shade(color, -0.05), `translateZ(${d / 2}px)`),
    face(w, h, shade(color, -0.2), `rotateY(180deg) translateZ(${d / 2}px)`),
    face(d, h, shade(color, -0.15), `rotateY(90deg) translateZ(${w / 2}px)`),
    face(d, h, shade(color, -0.25), `rotateY(-90deg) translateZ(${w / 2}px)`),
    face(w, d, shade(color, 0.08), `rotateX(90deg) translateZ(${h / 2}px)`),
  );
  return g;
}

/**
 * @param {HTMLElement} scene container (needs .scene styles)
 * @param {import('./taste.js').Style} look
 * @param {'A'|'B'|'C'} view
 * @returns {{setView:(v:'A'|'B'|'C')=>void}}
 */
export function mountRoom3D(scene, look, view = 'A') {
  const world = el('');
  world.className = 'world';
  world.append(
    face(W, D, look.floor, `translateY(${H / 2}px) rotateX(90deg)`, 'background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 2px,transparent 2px 34px)'),
    face(W, H, shade(look.wall, -0.06), `translateZ(${-D / 2}px)`),
    face(D, H, look.wall, `translateX(${-W / 2}px) rotateY(90deg)`),
    face(96, 70, look.win, `translate3d(70px,-30px,${-D / 2 + 1}px)`, `border:6px solid ${shade(look.wall, 0.4)}`),
    look.rug ? face(170, 140, look.rug, `translate3d(20px,${H / 2 - 1}px,30px) rotateX(90deg)`, 'border-radius:6px') : el(''),
    box(56, 34, 180, -W / 2 + 44, H / 2 - 17, 10, look.sofa),
    box(18, 62, 180, -W / 2 + 14, H / 2 - 31, 10, shade(look.sofa, -0.1)),
    box(64, 24, 44, 30, H / 2 - 12, 30, look.accent),
    box(26, 28, 26, W / 2 - 40, H / 2 - 14, -D / 2 + 40, shade(look.accent, -0.1)),
    box(34, 46, 34, W / 2 - 40, H / 2 - 50, -D / 2 + 40, '#6f8f7a'),
    box(8, 70, 8, -40, -H / 2 + 35, -20, '#3a332c'),
    box(40, 18, 40, -40, -H / 2 + 78, -20, look.accent),
  );
  scene.prepend(world);

  let [rx, ry] = VIEWS[view];
  const apply = () => { const s = Math.min(1, scene.clientWidth / 560); world.style.transform = `scale(${s}) rotateX(${rx}deg) rotateY(${ry}deg)`; };
  let drag = null;
  scene.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, rx, ry]; scene.setPointerCapture(e.pointerId); });
  scene.addEventListener('pointermove', (e) => {
    if (!drag) return;
    ry = Math.max(-80, Math.min(10, drag[3] + (e.clientX - drag[0]) * 0.35));
    rx = Math.max(-40, Math.min(-4, drag[2] - (e.clientY - drag[1]) * 0.25));
    apply();
  });
  const end = () => { drag = null; };
  scene.addEventListener('pointerup', end);
  scene.addEventListener('pointercancel', end);
  new ResizeObserver(apply).observe(scene);
  requestAnimationFrame(apply);

  return {
    setView(v) {
      [rx, ry] = VIEWS[v];
      world.style.transition = 'transform .5s';
      apply();
      setTimeout(() => { world.style.transition = ''; }, 520);
    },
  };
}
