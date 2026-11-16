import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOARD_NOTE,
  EMPTY_EVENT_NOTE,
  FITNESS_CATEGORIES,
  FITNESS_EVENTS,
  checkLoosestCutoffs,
  forbiddenPublicFields,
  groupMileBoards,
  normalizeMileRow,
  parseAgeGroup,
  parseEventId,
  publicMileName,
  shortHomeroom,
  pagePayloadFromJson,
  payloadFromJson,
  renderFitnessLeaderboardsHTML,
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

test('ageGroup is read from age_group or ageGroup and must be 8-11', () => {
  assert.equal(parseAgeGroup({ age_group: '11' }), 11);
  assert.equal(parseAgeGroup({ ageGroup: 8 }), 8);
  assert.equal(parseAgeGroup({ age: 11 }), null);
  assert.equal(parseAgeGroup({ age_group: 7 }), null);
  assert.equal(parseAgeGroup({ age_group: 12 }), null);
});

test('each sample time is at or under the loosest cutoff for its age group', () => {
  const payload = JSON.parse(readFileSync(samplePath, 'utf8'));
  assert.equal(payload.sample, true);
  const rows = payload.rows.map((row) => normalizeMileRow(row)).filter(Boolean);
  assert.equal(rows.length, payload.rows.length);
  const mismatches = checkLoosestCutoffs(rows);
  assert.deepEqual(mismatches, []);
  const groups = new Set(rows.map((row) => row.ageGroup));
  assert.deepEqual([...groups].sort((a, b) => a - b), [8, 9, 10, 11]);
});

test('a time slower than the loosest cutoff for its age group is flagged', () => {
  const mismatches = checkLoosestCutoffs([
    normalizeMileRow({ name: 'Ava B.', ageGroup: 8, homeroom: 'Cole', time: '12:31', level: 'National' }),
    normalizeMileRow({ name: 'Milo B.', ageGroup: 9, homeroom: 'Patel', time: '11:52', level: 'National' }),
    normalizeMileRow({ name: 'Sasha B.', ageGroup: 11, homeroom: 'Shaw', time: '11:18', level: 'National' }),
  ]);
  assert.deepEqual(mismatches.map((row) => [row.ageGroup, row.time, row.cutoff]), [
    [8, '12:31', '12:30'],
    [11, '11:18', '11:17'],
  ]);
});

test('sample payload has ageGroup but no sex, birthdate, or raw age', () => {
  const payload = JSON.parse(readFileSync(samplePath, 'utf8'));
  assert.equal(payload.sample, true);
  assert.equal('sex' in payload, false);
  for (const row of payload.rows) {
    assert.deepEqual(forbiddenPublicFields(row), []);
    assert.equal(typeof row.ageGroup, 'number');
    assert.equal('age' in row, false);
    assert.equal('olderAgeStandard' in row, false);
    assert.match(row.name, /^.+ [A-Z]\.$/);
  }
});

test('boards rank fastest first inside each age group and award level', () => {
  const boards = groupMileBoards([
    normalizeMileRow({ name: 'Milo B.', ageGroup: 9, homeroom: 'Patel', time: '8:10', level: 'Presidential' }),
    normalizeMileRow({ name: 'Ava B.', ageGroup: 9, homeroom: 'Cole', time: '7:40', level: 'Presidential' }),
    normalizeMileRow({ name: 'Nico G.', ageGroup: 9, homeroom: 'Patel', time: '10:05', level: 'National' }),
    normalizeMileRow({ name: 'Sage P.', ageGroup: 11, homeroom: 'Shaw', time: '8:20', level: 'National' }),
  ]);
  assert.deepEqual(boards[9].Presidential.map((row) => [row.place, row.name, row.time]), [
    [1, 'Ava B.', '7:40'],
    [2, 'Milo B.', '8:10'],
  ]);
  assert.equal(boards[9].National[0].name, 'Nico G.');
  assert.equal(boards[11].National[0].name, 'Sage P.');
  assert.equal(boards[8].Presidential.length, 0);
});

test('payloadFromJson keeps ageGroup and drops private fields', () => {
  const payload = payloadFromJson({
    sample: true,
    rows: [{ name: 'Ava B.', age_group: 8, homeroom: 'Cole', time: '8:01', level: 'Presidential', sex: 'hidden' }],
  });
  assert.equal(payload.sample, true);
  assert.equal(payload.rows[0].ageGroup, 8);
  assert.equal('sex' in payload.rows[0], false);
  assert.equal('age' in payload.rows[0], false);
  assert.deepEqual(
    Object.keys(payload.rows[0]).sort(),
    ['ageGroup', 'homeroom', 'level', 'name', 'time', 'timeSeconds'],
  );
});


test('official categories and events match benchmarks.csv and cover all six events', () => {
  const csv = readFileSync(path.join(here, 'source/benchmarks.csv'), 'utf8');
  const rows = csv.trim().split(/\n/).slice(1).map((line) => line.split(','));
  const byCategory = new Map();
  for (const [event, category] of rows) {
    if (!byCategory.has(category)) byCategory.set(category, new Set());
    byCategory.get(category).add(event);
  }
  assert.deepEqual(FITNESS_CATEGORIES.map((item) => item.label), [
    'Cardiorespiratory Fitness',
    'Upper Body Strength',
    'Core & Abdominal Strength',
  ]);
  for (const category of FITNESS_CATEGORIES) {
    const official = [...byCategory.get(category.label)].sort();
    const listed = category.eventIds.map((id) => FITNESS_EVENTS.find((event) => event.id === id).official).sort();
    assert.deepEqual(listed, official, category.label);
  }
  assert.deepEqual(FITNESS_EVENTS.map((event) => event.id), ['mile', 'pacer', 'push_ups', 'pull_ups', 'curl_ups', 'plank']);
  assert.equal(parseEventId('one-mile run'), 'mile');
  assert.equal(parseEventId('20m beep test'), 'pacer');
  assert.equal(parseEventId({ event: 'right-angle push-ups' }), 'push_ups');
});

test('the page keeps sample mile rows labeled and leaves the other events empty', () => {
  const raw = JSON.parse(readFileSync(samplePath, 'utf8'));
  const page = pagePayloadFromJson(raw);
  assert.equal(page.sample, true);
  assert.ok(page.events.mile.rows.length > 0);
  assert.equal(page.events.mile.sample, true);
  for (const event of FITNESS_EVENTS) {
    if (event.id === 'mile') continue;
    assert.deepEqual(page.events[event.id].rows, []);
  }
  const html = renderFitnessLeaderboardsHTML(page);
  assert.match(html, /These names and times are sample data/);
  assert.match(html, /Sample data/);
  assert.match(html, /Cardiorespiratory Fitness/);
  assert.match(html, /Upper Body Strength/);
  assert.match(html, /Core &amp; Abdominal Strength/);
  assert.match(html, /One-mile run/);
  assert.match(html, /20m beep test \(PACER\)/);
  assert.match(html, /Right-angle push-ups/);
  assert.match(html, /id="cardio"/);
  assert.match(html, /lb-cat-nav/);
  assert.equal((html.match(/Results coming after testing\./g) || []).length, 5);
  assert.match(html, new RegExp(BOARD_NOTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /Presidential Fitness Test · Grades 3–5 · Grouped by age on test day/);
  assert.doesNotMatch(html.split('mile-lb-head')[1].split('</div>')[0], /Mile run Oct/);
  assert.match(html, /<h2>Age 8<\/h2>/);
  assert.match(html, /<h2>Age 11<\/h2>/);
  assert.doesNotMatch(html, /olderAgeStandard|\bage11\b|\*/);
  assert.equal(EMPTY_EVENT_NOTE, 'Results coming after testing.');
});
