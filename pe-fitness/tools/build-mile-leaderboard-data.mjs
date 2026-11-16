// Build a public leaderboard JSON file from a CSV with:
//   first_name, last_initial, homeroom, level, age_group
//   event (optional; default one-mile run). Accepted names match benchmarks.csv
//     plus pacer / push_ups / pull_ups / curl_ups / plank aliases.
//   score in mile_time, time, value, or score
//   grade is optional row detail and is not used for grouping
//
// Never pass this script a file that includes sex, age, or birthdate.
// Do not write the result into this public repo unless it is sample data.
//
// Example (real file stays outside the repo):
//   node pe-fitness/tools/build-mile-leaderboard-data.mjs \
//     --in /path/to/mile_leaderboard_public_age_group.csv \
//     --out /tmp/mile-leaderboard.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FITNESS_EVENTS,
  checkLoosestCutoffs,
  normalizeEventRow,
  parseEventId,
  toPublicPayload,
} from './mile-leaderboard.mjs';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const head = lines.shift().split(',').map((cell) => cell.trim());
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(head.map((key, i) => [key, (cells[i] ?? '').trim()]));
  });
}

const input = arg('--in');
const output = arg('--out');
const sample = process.argv.includes('--sample');
if (!input || !output) {
  console.error('Usage: node pe-fitness/tools/build-mile-leaderboard-data.mjs --in <csv> --out <json> [--sample]');
  process.exit(1);
}

const raw = parseCsv(readFileSync(input, 'utf8'));
const banned = ['sex', 'sex_check', 'gender', 'age', 'dob', 'birthdate', 'birth_date'];
const present = Object.keys(raw[0] ?? {});
const leaked = present.filter((key) => banned.includes(key.toLowerCase()) || banned.includes(key));
if (leaked.length) {
  console.error(`Refusing to read ${input}: it includes private fields (${leaked.join(', ')}). Use a public CSV with name, grade, homeroom, time or score, level, event, and age_group only.`);
  process.exit(1);
}

const grouped = Object.fromEntries(FITNESS_EVENTS.map((event) => [event.id, []]));
const skipped = [];
for (const row of raw) {
  const eventId = parseEventId(row) || (row.event || row.event_id || row.eventId ? null : 'mile');
  const next = eventId ? normalizeEventRow(row, eventId) : null;
  if (!next) {
    skipped.push(row);
    continue;
  }
  grouped[next.eventId].push(next);
}

const mileRows = grouped.mile;
const onlyMile = FITNESS_EVENTS.every((event) => event.id === 'mile' || grouped[event.id].length === 0);
const payload = onlyMile
  ? toPublicPayload(mileRows, { sample, generatedAt: sample ? 'sample' : new Date().toISOString() })
  : {
      sample: Boolean(sample),
      title: 'Presidential Fitness Leaderboards',
      subtitle: 'Presidential Fitness Test · Grades 3–5 · Grouped by age on test day',
      generatedAt: sample ? 'sample' : new Date().toISOString(),
      events: Object.fromEntries(FITNESS_EVENTS.map((event) => [event.id, {
        rows: grouped[event.id],
        sample: Boolean(sample && grouped[event.id].length),
      }])),
    };

const cutoffRows = onlyMile ? payload.rows : payload.events.mile.rows;
const mismatches = checkLoosestCutoffs(cutoffRows);
if (mismatches.length) {
  console.error(`Warning: ${mismatches.length} row(s) are slower than the loosest cutoff for their age group:`);
  for (const row of mismatches) {
    console.error(`  age ${row.ageGroup} ${row.time} (cutoff ${row.cutoff}, ${row.level})`);
  }
}

const resolvedOut = path.resolve(output);
const repoData = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '../data'));
if (!sample && resolvedOut.startsWith(repoData + path.sep)) {
  console.error('Refusing to write live class scores into the public repo data folder. Use an out-of-repo path.');
  process.exit(1);
}

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
const counts = FITNESS_EVENTS.map((event) => `${event.id}=${grouped[event.id].length}`).join(', ');
console.log(`wrote ${path.basename(output)} (sample=${Boolean(payload.sample)}, ${counts})`);
if (skipped.length) console.error(`Skipped ${skipped.length} row(s) that were missing age_group, event, level, or score.`);
if (mismatches.length) process.exit(2);
