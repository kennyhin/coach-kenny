import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkLoosestCutoffs,
  forbiddenPublicFields,
  groupMileBoards,
  normalizeMileRow,
  publicMileName,
  shortHomeroom,
  payloadFromJson,
} from './mile-leaderboard.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.join(here, '../data/mile-leaderboard.json');

test('public names are first name plus last initial only', () => {
  assert.equal(publicMileName('Ava', 'B'), 'Ava B.');
  assert.equal(publicMileName('Ava', 'B.'), 'Ava B.');
  assert.equal(publicMileName('Anna Marie', 'Q'), 'Anna Marie Q.');
});

test('homeroom display drops the section code', () => {
  assert.equal(shortHomeroom('406-4 Rivera/Chen'), 'Rivera/Chen');
  assert.equal(shortHomeroom('Cole'), 'Cole');
});

test('each sample time is at or under the loosest cutoff for its grade', () => {
  const payload = JSON.parse(readFileSync(samplePath, 'utf8'));
  assert.equal(payload.sample, true);
  const rows = payload.rows.map((row) => normalizeMileRow(row)).filter(Boolean);
  const mismatches = checkLoosestCutoffs(rows);
  assert.deepEqual(mismatches, []);
});

test('a time slower than the loosest cutoff for its grade is flagged', () => {
  const mismatches = checkLoosestCutoffs([
    normalizeMileRow({ name: 'Ava B.', grade: '3', homeroom: 'Cole', time: '12:31', level: 'National' }),
    normalizeMileRow({ name: 'Milo B.', grade: '4', homeroom: 'Patel', time: '11:52', level: 'National' }),
    normalizeMileRow({ name: 'Sasha B.', grade: '5', homeroom: 'Shaw', time: '11:23', level: 'National' }),
  ]);
  assert.deepEqual(mismatches.map((row) => [row.grade, row.time, row.cutoff]), [
    ['3', '12:31', '12:30'],
    ['5', '11:23', '11:22'],
  ]);
});

test('sample payload has no sex, age, or other private fields', () => {
  const payload = JSON.parse(readFileSync(samplePath, 'utf8'));
  assert.equal(payload.sample, true);
  assert.equal('sex' in payload, false);
  for (const row of payload.rows) {
    assert.deepEqual(forbiddenPublicFields(row), []);
    assert.match(row.name, /^.+ [A-Z]\.$/);
    assert.equal(row.name.includes('Alvarez'), false);
  }
});

test('boards rank fastest first inside each grade and award level', () => {
  const boards = groupMileBoards([
    normalizeMileRow({ name: 'Milo B.', grade: '4', homeroom: 'Patel', time: '8:10', level: 'Presidential' }),
    normalizeMileRow({ name: 'Ava B.', grade: '4', homeroom: 'Cole', time: '7:40', level: 'Presidential' }),
    normalizeMileRow({ name: 'Nico G.', grade: '4', homeroom: 'Patel', time: '10:05', level: 'National' }),
  ]);
  assert.deepEqual(boards['4'].Presidential.map((row) => [row.place, row.name, row.time]), [
    [1, 'Ava B.', '7:40'],
    [2, 'Milo B.', '8:10'],
  ]);
  assert.equal(boards['4'].National[0].place, 1);
  assert.equal(boards['4'].National[0].name, 'Nico G.');
});

test('payloadFromJson keeps only public fields and sample labeling', () => {
  const payload = payloadFromJson({
    sample: true,
    rows: [{ name: 'Ava B.', grade: '3', homeroom: 'Cole', time: '8:01', level: 'Presidential', sex: 'hidden' }],
  });
  assert.equal(payload.sample, true);
  assert.deepEqual(Object.keys(payload.rows[0]).sort(), ['grade', 'homeroom', 'level', 'name', 'time', 'timeSeconds']);
});
