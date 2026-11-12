import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STYLES } from '../lib/taste.js';

const root = new URL('../assets/', import.meta.url);
const mean = JSON.parse(readFileSync(new URL('tex/manifest.json', root)));

test('every model and material a style names is in the repo', () => {
  for (const [key, look] of Object.entries(STYLES)) {
    for (const m of [look.chairModel, look.tableModel, look.pendantModel]) {
      assert.ok(m && existsSync(new URL(`models/${m}/${m}.gltf`, root)), `${key}: model ${m}`);
    }
    for (const t of [look.floorTex, look.wallTex, look.sofaTex, look.cabinetTex, look.woodTex].filter(Boolean)) {
      assert.ok(mean[t], `${key}: ${t} has a mean colour`);
      for (const map of ['diff', 'nor', 'rough']) assert.ok(existsSync(new URL(`tex/${t}/${map}.jpg`, root)), `${key}: ${t}/${map}`);
    }
  }
});

test('every style has photos for the inspiration wall', () => {
  for (const key of Object.keys(STYLES)) for (const shot of ['hero', 'wide', 'detail', 'corner']) {
    assert.ok(existsSync(new URL(`refs/${key}-${shot}.jpg`, root)), `${key}-${shot}`);
  }
});
