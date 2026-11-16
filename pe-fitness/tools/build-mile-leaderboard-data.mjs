// Build a public mile-leaderboard JSON file from a CSV with only:
//   first_name, last_initial, grade, homeroom, mile_time, level
//
// Never pass this script a file that includes sex, age, or birthdate.
// Do not write the result into this public repo unless it is sample data.
//
// Example (real file stays outside the repo):
//   node pe-fitness/tools/build-mile-leaderboard-data.mjs \
//     --in /path/to/mile_leaderboard_public.csv \
//     --out /tmp/mile-leaderboard.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLoosestCutoffs, toPublicPayload } from './mile-leaderboard.mjs';

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
  console.error(`Refusing to read ${input}: it includes private fields (${leaked.join(', ')}). Use a public CSV with name, grade, homeroom, time, and level only.`);
  process.exit(1);
}

const payload = toPublicPayload(raw, { sample, generatedAt: sample ? 'sample' : new Date().toISOString() });
const mismatches = checkLoosestCutoffs(payload.rows);
if (mismatches.length) {
  console.error(`Warning: ${mismatches.length} row(s) are slower than the loosest cutoff for their grade:`);
  for (const row of mismatches) {
    console.error(`  grade ${row.grade} ${row.time} (cutoff ${row.cutoff}, ${row.level})`);
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
console.log(`wrote ${payload.rows.length} rows to ${output} (sample=${payload.sample})`);
if (mismatches.length) process.exit(2);
