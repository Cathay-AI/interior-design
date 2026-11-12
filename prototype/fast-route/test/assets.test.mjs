import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STYLES } from '../lib/taste.js';

const root = new URL('../assets/', import.meta.url);
const mean = JSON.parse(readFileSync(new URL('tex/manifest.json', root)));

test('every model and material a style names is in the repo', () => {
  for (const [key, look] of Object.entries(STYLES)) {
    for (const m of [look.chairModel, look.tableModel, look.pendantModel]) {
      assert.ok(m && existsSync(new URL(`models/${m}.glb`, root)), `${key}: model ${m}`);
    }
    for (const t of [look.floorTex, look.wallTex, look.sofaTex, look.cabinetTex, look.woodTex].filter(Boolean)) {
      assert.ok(mean[t], `${key}: ${t} has a mean colour`);
      for (const map of ['diff', 'nor', 'rough']) assert.ok(existsSync(new URL(`tex/${t}/${map}.jpg`, root)), `${key}: ${t}/${map}`);
    }
  }
});

test('the inspiration wall covers every style and every pin has a source', async () => {
  const { PINS } = await import('../lib/pins.js');
  assert.equal(new Set(PINS.map((p) => p.id)).size, PINS.length, 'ids are unique');
  for (const key of Object.keys(STYLES)) assert.ok(PINS.filter((p) => p.style === key).length >= 6, key);
  for (const p of PINS) {
    assert.match(p.src, /^https:\/\/i\.pinimg\.com\/474x\/[0-9a-f/]+\.jpg$/);
    assert.match(p.source, /^https:\/\/www\.pinterest\.com\//);
    assert.ok(p.w > 0 && p.h > 0);
  }
});

test('index.html preloads the first swipe card, and every module app.js imports', async () => {
  const { PINS } = await import('../lib/pins.js');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`rel="preload" as="image" href="${PINS[0].src}"`), 'first card image');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  for (const [, lib] of app.matchAll(/from '\.\/lib\/([a-z-]+)\.js'/g)) assert.ok(html.includes(`modulepreload" href="./lib/${lib}.js"`), `modulepreload ${lib}`);
});
