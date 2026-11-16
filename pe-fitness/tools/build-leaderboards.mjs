// pe-fitness/tools/build-leaderboards.mjs — generates /pe-fitness/leaderboards.html.
//
// The committed page uses clearly labeled SAMPLE DATA from
// pe-fitness/data/mile-leaderboard.json. Do not point this builder at real
// class scores when writing into the public repo.
//
// Local real-data preview (stays outside the repo):
//   MILE_LEADERBOARD_DATA=/path/to/real.json \
//   MILE_LEADERBOARD_OUT_DIR=/path/to/preview \
//   node pe-fitness/tools/build-leaderboards.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { SECTION, page } from './layout.mjs';
import { payloadFromJson, renderMileLeaderboardHTML } from './mile-leaderboard.mjs';

const dataPath = process.env.MILE_LEADERBOARD_DATA || path.join(SECTION, 'data/mile-leaderboard.json');
const outDir = process.env.MILE_LEADERBOARD_OUT_DIR || SECTION;
const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const payload = payloadFromJson(raw);
if (!payload) throw new Error('Invalid mile leaderboard data: ' + dataPath);
if (!process.env.MILE_LEADERBOARD_DATA && payload.sample !== true) {
  throw new Error('Refusing to build the in-repo page from non-sample data. Pass MILE_LEADERBOARD_OUT_DIR to write a local preview instead.');
}

const body = `
    ${renderMileLeaderboardHTML(payload)}
    <script type="application/json" id="mile-lb-data">${JSON.stringify(payload)}</script>
`;

const html = page({
  title: 'Mile Run Leaderboard · Presidential Fitness PE',
  desc: 'Grades 3–5 mile run leaderboard: Presidential and National award groups, first name and last initial only. Fastest first.',
  current: 'leaderboards',
  omitHero: true,
  bodyClass: 'mile-lb-page',
  body,
  extraScripts: ['js/leaderboards.js'],
  footerNote: 'The mile leaderboard lists first name and last initial, grade, homeroom and time for students who met a Presidential or National target. We never post full names, IDs, ages or birthdates.',
  comment: `Mile leaderboard page. Edit pe-fitness/tools/build-leaderboards.mjs, pe-fitness/tools/mile-leaderboard.mjs, and pe-fitness/data/mile-leaderboard.json (sample data only), then re-run:
    node pe-fitness/tools/build-all.mjs`,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'leaderboards.html'), html);
console.log(`wrote ${path.join(outDir, 'leaderboards.html')} (sample=${payload.sample}, rows=${payload.rows.length})`);
