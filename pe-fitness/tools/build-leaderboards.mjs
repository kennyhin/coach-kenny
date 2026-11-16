// pe-fitness/tools/build-leaderboards.mjs — generates /pe-fitness/leaderboards.html.
//
// The committed page uses clearly labeled SAMPLE DATA from
// pe-fitness/data/mile-leaderboard.json for the one-mile run. The other five
// official events render an empty "Results coming after testing" state.
// Do not point this builder at real class scores when writing into the public repo.
//
// Local real-data preview (stays outside the repo):
//   MILE_LEADERBOARD_DATA=/path/to/real.json \
//   MILE_LEADERBOARD_OUT_DIR=/path/to/preview \
//   node pe-fitness/tools/build-leaderboards.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SECTION, page } from './layout.mjs';
import { pagePayloadFromJson, renderFitnessLeaderboardsHTML } from './mile-leaderboard.mjs';

const dataPath = process.env.MILE_LEADERBOARD_DATA || path.join(SECTION, 'data/mile-leaderboard.json');
const outDir = process.env.MILE_LEADERBOARD_OUT_DIR || SECTION;
const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const payload = pagePayloadFromJson(raw);
if (!payload) throw new Error('Invalid leaderboard data: ' + dataPath);
if (!process.env.MILE_LEADERBOARD_DATA && payload.sample !== true) {
  throw new Error('Refusing to build the in-repo page from non-sample data. Pass MILE_LEADERBOARD_OUT_DIR to write a local preview instead.');
}

const body = `
    ${renderFitnessLeaderboardsHTML(payload)}
    <script type="application/json" id="mile-lb-data">${JSON.stringify(payload)}</script>
`;

const html = page({
  title: 'Presidential Fitness Leaderboards · PE',
  desc: 'Grades 3–5 Presidential Fitness leaderboards, grouped by official category and by age on test day. First name and last initial only.',
  current: 'leaderboards',
  omitHero: true,
  bodyClass: 'mile-lb-page',
  body,
  extraScripts: [
    ...(existsSync(path.join(SECTION, 'js/leaderboard-config.js')) ? ['js/leaderboard-config.js'] : []),
    'js/leaderboards.js',
  ],
  footerNote: 'Leaderboards are grouped by the official Presidential Fitness categories and by each student\'s age on test day. We list first name and last initial, homeroom, score or time, and age group. We never post full names, IDs, or birthdates. Boards show each runner\'s age group on test day.',
  comment: `Leaderboards page. Edit pe-fitness/tools/build-leaderboards.mjs, pe-fitness/tools/mile-leaderboard.mjs, and pe-fitness/data/mile-leaderboard.json (sample data only), then re-run:
    node pe-fitness/tools/build-all.mjs`,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'leaderboards.html'), html);
const mileCount = payload.events?.mile?.rows?.length ?? 0;
console.log(`wrote ${path.join(outDir, 'leaderboards.html')} (sample=${payload.sample}, mileRows=${mileCount})`);
