import test from 'node:test';
import assert from 'node:assert/strict';
import { roomsFromPlan, PLAN_SCHEMA } from '../lib/plan.js';
import { serialize, restore } from '../lib/persist.js';

const room = (name, length_m, width_m, size_source = 'labeled') => ({ name, length_m, width_m, size_source });

test('labeled sizes are taken as read; converted or guessed ones are marked for confirmation', () => {
  const rooms = roomsFromPlan({ is_floor_plan: true, rooms: [room('客廳', 5.62, 4.2), room('主臥', 3.9, 4.3, 'scaled'), room('書房', 3, 2.6, 'guessed')] });
  assert.deepEqual(rooms.map((r) => [r.id, r.name, r.len, r.wid, r.unsure ?? false]), [['r1', '客廳', '5.6', '4.2', false], ['r2', '主臥', '4.3', '3.9', true], ['r3', '書房', '3', '2.6', true]]);
  assert.ok(rooms.every((r) => r.on && Array.isArray(r.edits)));
});

test('sizes outside what a room can be are pulled into range and marked', () => {
  const [bath, hall] = roomsFromPlan({ is_floor_plan: true, rooms: [room('客衛', 1.8, 1.5), room('客廳', 420, 380)] });
  assert.deepEqual([bath.len, bath.wid, bath.unsure], ['2', '2', true]);
  assert.deepEqual([hall.len, hall.wid, hall.unsure], ['60', '60', true]);
});

test('bad rows are dropped, long names cut, repeated names numbered', () => {
  const rooms = roomsFromPlan({ is_floor_plan: true, rooms: [null, room('', 3, 3), room('臥室', 3, 3), room('臥室', 3.2, 3), room('一二三四五六七八九十', 3, 3), room('<b>廚房</b>', NaN, 2)] });
  assert.deepEqual(rooms.map((r) => r.name), ['臥室', '臥室 2', '一二三四五六七八', 'b 廚房 /b']);
  assert.equal(rooms[3].unsure, true);
  assert.ok(rooms.every((r) => r.name.length <= 8 && !/[<>&"']/.test(r.name)));
});

test('not a floor plan, or nothing readable, gives null', () => {
  assert.equal(roomsFromPlan({ is_floor_plan: false, rooms: [room('客廳', 5, 4)] }), null);
  assert.equal(roomsFromPlan({ is_floor_plan: true, rooms: [] }), null);
  assert.equal(roomsFromPlan(null), null);
  assert.equal(roomsFromPlan('客廳'), null);
});

test('the schema is strict enough for structured output', () => {
  assert.equal(PLAN_SCHEMA.additionalProperties, false);
  assert.equal(PLAN_SCHEMA.properties.rooms.items.additionalProperties, false);
  assert.deepEqual(PLAN_SCHEMA.properties.rooms.items.required, Object.keys(PLAN_SCHEMA.properties.rooms.items.properties));
});

test('rooms read from a plan survive a reload, with their 請確認 marks', () => {
  const blank = { step: 1, reached: 1, scores: { warm: 0 }, swiped: 0, liked: 0, docs: [], cond: { space: '客廳' }, versions: [], v: 0, view: 'A', history: [], reasons: [] };
  const rooms = roomsFromPlan({ is_floor_plan: true, rooms: [room('客廳', 5.6, 4.2), room('主臥', 4.3, 3.9, 'scaled')] });
  const back = restore(serialize({ ...blank, started: true, home: { rooms, style: null, read: true }, room: 'r2' }), blank);
  assert.equal(back.home.read, true);
  assert.deepEqual(back.home.rooms.map((r) => r.unsure ?? false), [false, true]);
  assert.equal(restore(JSON.stringify({ ...JSON.parse(serialize({ ...blank, started: true, home: { rooms: [{ ...rooms[0], unsure: 'x' }] }, room: 'r1' })) }), blank).home, null);
});
