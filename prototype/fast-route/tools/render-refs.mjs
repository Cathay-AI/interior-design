// Dev tool: render the photoreal reference stills into assets/refs/.
//   node tools/render-refs.mjs [style ...]      (needs `npm i`, playwright, python3 with numpy + Pillow)
// For each style and camera it path-traces the lighting at low resolution (slow on machines without a GPU),
// renders a clean full-resolution guide with the rasteriser, then tools/compose_refs.py merges the two.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STYLES } from '../lib/taste.js';
import { SHOTS } from './shots.js';

const { chromium } = createRequire(process.env.PLAYWRIGHT_PATH || import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url)), out = root + 'tools/out/';
const PORT = 5179, SAMPLES = Number(process.env.SAMPLES || 28), PT_SCALE = 0.4;
mkdirSync(out, { recursive: true }); mkdirSync(root + 'assets/refs', { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', root], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
async function grab(query, file) {
  if (existsSync(file) && !process.env.FORCE) return;
  const page = await browser.newPage();
  page.on('pageerror', (e) => { if (e.message !== 'raster done') console.error(e.message); });
  await page.goto(`http://127.0.0.1:${PORT}/tools/pathtrace.html?${query}`);
  await page.waitForFunction(() => window.__done, null, { timeout: 0, polling: 1000 });
  const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png')); // waits for the GPU queue
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  await page.close();
}
const styles = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(STYLES);
try {
  for (const shot of Object.keys(SHOTS)) for (const s of styles) {
    const { w, h } = SHOTS[shot], t0 = Date.now(), base = `${out}${s}-${shot}`;
    await grab(`s=${s}&shot=${shot}&raster=1`, `${base}-raster.png`);
    await grab(`s=${s}&shot=${shot}&w=${Math.round(w * PT_SCALE)}&h=${Math.round(h * PT_SCALE)}&samples=${SAMPLES}`, `${base}-pt.png`);
    execFileSync('python3', [root + 'tools/compose_refs.py', `${base}-pt.png`, `${base}-raster.png`, `${root}assets/refs/${s}-${shot}.jpg`], { stdio: 'inherit' });
    console.log(`${s}-${shot} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
} finally { await browser.close(); server.kill(); }
