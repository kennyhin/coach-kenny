// pe-fitness/tools/build-benchmarks.mjs — generates /pe-fitness/benchmarks.html from the official CSV.
//
// Purpose: every benchmark number on the site comes from here; nothing is hand-typed.
// Data source: tools/source/benchmarks.csv (copy of /workspace/presidential-fitness/benchmarks.csv,
//   extracted Nov 14, 2026 from whitehouse.gov/fitness + the Presidential Award PDF) and the notes in
//   tools/source/benchmarks.md. "missing" (age 5 only) renders as "No official number".
// Follows: design-spec.md § 3 Benchmarks page + § THEME → Tables; layout per design-direction.md
//   "Benchmark tables" and design/benchmarks.html (pick level / group / age → status banner → 3 boards).
// Copy (Nov 14 update): neutral voice for students, parents and teachers (no "your child"); numbers/table markup unchanged.
// Output: the 4 full tables live between <!-- BENCHMARKS:START --> and <!-- BENCHMARKS:END --> and the same
//   rows are embedded as <script type="application/json" id="pf-data"> for the quick look (js/fitness.js).

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SECTION, SOURCE, page, esc, ext, icon, officialDocs, eyebrow, WH_FITNESS } from './layout.mjs';

// ---- Parse CSV (simple: no quoted commas in this file) ----
const lines = readFileSync(path.join(SOURCE, 'benchmarks.csv'), 'utf8').trim().split(/\r?\n/);
const head = lines.shift().split(',');
const rows = lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], v.trim()])));

// Column order and short labels. `cat` drives the colored group headers.
export const EVENTS = [
  { id: 'curl-ups', label: 'Curl-ups', col: 'Curl-ups', unit: 'In 1 minute', cat: 'core' },
  { id: 'plank', label: 'Plank', col: 'Plank (sec)', unit: 'Seconds held', cat: 'core' },
  { id: 'one-mile run', label: 'One-mile run', col: 'Mile (min:sec)', unit: 'Minutes : seconds', cat: 'cardio' },
  { id: '20m beep test', label: '20m beep test', col: 'Beep test (laps)', unit: 'Laps completed', cat: 'cardio' },
  { id: 'right-angle push-ups', label: 'Right-angle push-ups', col: 'Push-ups', unit: 'Total reps', cat: 'upper' },
  { id: 'pull-ups', label: 'Pull-ups', col: 'Pull-ups', unit: 'Total reps', cat: 'upper' },
];
for (const e of EVENTS) if (!rows.some((r) => r.event === e.id)) throw new Error('CSV missing event ' + e.id);
const ages = [...new Set(rows.map((r) => r.age))];           // CSV order: 5, 6, … 17+
const dirWords = (d) => (d === 'at most' ? 'at or under' : 'at least');

// data[sex][level][age][event] = target string (exact CSV text)
const data = {};
const direction = {};
for (const r of rows) {
  ((((data[r.sex] ??= {})[r.level] ??= {})[r.age] ??= {}))[r.event] = r.target;
  direction[r.event] = r.direction;
}
const SEXES = ['Boys', 'Girls'];
const LEVELS = ['Presidential', 'National'];
for (const s of SEXES) for (const l of LEVELS) for (const a of ages) for (const e of EVENTS)
  if (data[s]?.[l]?.[a]?.[e.id] === undefined) throw new Error(`CSV gap ${s} ${l} ${a} ${e.id}`);

const TYPICAL = new Set(['8', '9', '10', '11']); // typical 3rd–5th grade ages → shaded rows
const MISSING = '<span class="badge badge-missing" aria-label="No official number"><span class="diamond" aria-hidden="true"></span>No official number</span>';

function table(sex, level) {
  const id = `${level}-${sex}`.toLowerCase();
  const src = level === 'National' ? 'official White House website; not in the one-page PDF' : 'official PDF and White House website';
  const body = ages.map((a) => {
    const vals = EVENTS.map((e) => data[sex][level][a][e.id]);
    const cls = TYPICAL.has(a) ? ' class="typical"' : '';
    const cells = vals.every((v) => v === 'missing')
      ? `<td colspan="${EVENTS.length}" class="missing">${MISSING}</td>`
      : vals.map((v) => (v === 'missing' ? `<td class="missing">${MISSING}</td>` : `<td>${esc(v)}</td>`)).join('');
    return `          <tr${cls}><th scope="row">${esc(a)}</th>${cells}</tr>`;
  }).join('\n');
  return `    <div class="chart-block" id="tbl-${id}" data-table="${id}">
      <div class="table-panel">
        <div class="table-banner${level === 'National' ? ' national' : ''}">${level} targets · ${sex}</div>
        <div class="table-scroll" tabindex="0" role="region" aria-label="${level} Award, ${sex} table (scrolls sideways)">
        <table class="age-chart${level === 'National' ? ' national' : ''}">
          <caption>${level} Award — ${sex} (${src}). Units: curl-ups = reps in 1 minute; plank = seconds; mile = minutes:seconds (lower is better); beep test = laps; push-ups and pull-ups = reps.</caption>
          <colgroup><col /><col span="2" /><col span="2" /><col span="2" /></colgroup>
          <thead>
            <tr class="groups"><th scope="col" rowspan="2">Age</th><th scope="colgroup" colspan="2" class="g-core">${icon('core')}Core</th><th scope="colgroup" colspan="2" class="g-cardio">${icon('cardio')}Cardio</th><th scope="colgroup" colspan="2" class="g-upper">${icon('upper')}Upper body</th></tr>
            <tr class="events">${EVENTS.map((e) => `<th scope="col">${esc(e.col)}</th>`).join('')}</tr>
          </thead>
          <tbody>
${body}
          </tbody>
        </table>
        </div>
      </div>
      <p class="chart-note"><span class="legend-swatch" aria-hidden="true"></span>Shaded rows = typical ages for grades 3–5. Every target is “at least” except the one-mile run, where you need that time or faster.</p>
    </div>`;
}

// ---- Quick look boards: server-render the default state (Presidential, Boys, age 10) ----
const DEF = { sex: 'Boys', level: 'Presidential', age: '10' };
const CATS = [
  ['core', '01', 'Core', ''], ['cardio', '02', 'Cardio', ' cardio'], ['upper', '03', 'Upper body', ' upper'],
];
const boards = CATS.map(([cat, num, name, cls]) => {
  const [a, b] = EVENTS.filter((e) => e.cat === cat);
  const choice = (e) => `<div class="choice"><p class="label">${e.label}</p><p class="score" data-event="${e.id}">${esc(data[DEF.sex][DEF.level][DEF.age][e.id])}</p><p class="unit">${e.unit} · ${dirWords(direction[e.id])}</p></div>`;
  return `          <article class="cat-board${cls}">
            <div class="cat-head"><h3><span class="num">${num}</span> ${icon(cat)}${name}</h3><span class="hint">Pick one</span></div>
            <div class="cat-choices">
              ${choice(a)}
              <div class="rule-col" aria-hidden="true"></div>
              ${choice(b)}
              <span class="or tier-p">Or</span>
            </div>
          </article>`;
}).join('\n');

const ageButtons = ['5', '6', '7', '8', '9', '10', '11', '12'].map((a) =>
  `<button type="button" class="age${a === DEF.age ? ' is-on' : ''}" data-age="${a}" aria-pressed="${a === DEF.age}">${a}</button>`).join('');
const olderOpts = ages.filter((a) => Number.parseInt(a, 10) >= 13).map((a) => `<option value="${a}">Age ${a}</option>`).join('');

const generated = `<!-- BENCHMARKS:START (generated from tools/source/benchmarks.csv — do not hand-edit numbers) -->
${SEXES.flatMap((s) => LEVELS.map((l) => table(s, l))).join('\n')}
    <script type="application/json" id="pf-data">${JSON.stringify({ events: EVENTS.map(({ id, label }) => ({ id, label })), direction, data })}</script>
    <!-- BENCHMARKS:END -->`;

const body = `
    <div class="wrap">
      <div class="callout-row">
        <div class="callout green"><span class="lead">Age on test day</span><p>Targets go by <strong>age on test day</strong>, not grade.</p></div>
        <div class="callout red"><span class="lead"><span class="diamond" aria-hidden="true"></span> Age 5 has no official numbers</span><p>The official chart starts at age 6. Five-year-olds take part in the fun K–2 preview instead, so their row says “No official number.”</p></div>
        <div class="callout navy"><span class="lead">Where the numbers come from</span><p>Every number is copied exactly from the official White House chart. Presidential targets are on the ${ext('official/Presidential-Physical-Fitness-Test.pdf', 'official PDF')}; National targets are on the ${ext(WH_FITNESS, 'White House fitness page')}.</p></div>
      </div>
    </div>

    <section class="section" id="age-quick-look" aria-labelledby="ql-h" hidden data-js-only>
      <div class="wrap">
        <p class="section-kicker">Quick look by age</p>
        <h2 id="ql-h">Look up your targets</h2>
        <p class="section-intro">Pick an award level, boys or girls, and an age. To earn the award, a student needs to hit one target in each category (not every event).</p>
        <div class="pick">
          <p class="pick-label" id="lvl-l"><span class="diamond" aria-hidden="true"></span> Award level</p>
          <div class="level-row" role="group" aria-labelledby="lvl-l">
            <button type="button" class="level is-on" data-level="Presidential" aria-pressed="true"><span class="ttl">Presidential</span><span class="sub">Top tier</span></button>
            <button type="button" class="level tier-n" data-level="National" aria-pressed="false"><span class="ttl">National</span><span class="sub">Solid achievement</span></button>
          </div>
        </div>
        <div class="pick">
          <p class="pick-label" id="grp-l"><span class="diamond" aria-hidden="true"></span> Boys or girls</p>
          <div class="group-row" role="group" aria-labelledby="grp-l">
            <button type="button" class="group boys is-on" data-sex="Boys" aria-pressed="true"><span class="ttl">Boys</span></button>
            <button type="button" class="group girls" data-sex="Girls" aria-pressed="false"><span class="ttl">Girls</span></button>
          </div>
        </div>
        <div class="pick">
          <p class="pick-label" id="age-l"><span class="diamond" aria-hidden="true"></span> Age on test day</p>
          <div class="age-grid" role="group" aria-labelledby="age-l">
            ${ageButtons}
            <label class="sr-only" for="age-older">Older ages</label>
            <select id="age-older" class="age-select"><option value="">Older… (13–17+)</option>${olderOpts}</select>
          </div>
        </div>
        <div class="status-banner" aria-live="polite">
          <p id="ql-status">Showing Presidential targets for Boys, age 10</p>
          <span class="code" id="ql-code">B-10</span>
        </div>
        <div class="callout red" id="ql-missing" hidden><span class="lead"><span class="diamond" aria-hidden="true"></span> No official number</span><p>The official chart starts at age 6. Five-year-olds take part in the fun K–2 preview instead.</p></div>
        <div class="cat-boards" id="ql-boards">
${boards}
        </div>
      </div>
    </section>

    <section class="section" id="full-tables" aria-labelledby="ft-h">
      <div class="wrap">
        <p class="section-kicker">Full tables</p>
        <h2 id="ft-h">All ages, 5 to 17+</h2>
        <p class="section-intro">One table for each award level, for boys and for girls. On a phone, swipe the table sideways; the Age column stays put. <span data-js-only hidden>The choices you made above pick which table shows. Jump to: <a href="#presidential-boys">Presidential · Boys</a>, <a href="#presidential-girls">Presidential · Girls</a>, <a href="#national-boys">National · Boys</a>, <a href="#national-girls">National · Girls</a>.</span></p>
${generated}
        <p class="chart-note">Source: ${ext(WH_FITNESS, 'whitehouse.gov/fitness')} and the official Presidential Award PDF. Numbers copied exactly from the official chart (checked November 14, 2026).</p>
      </div>
    </section>

${officialDocs('')}
`;

const hero = `<p class="eyebrow">${eyebrow}</p>
          <h1>Benchmarks</h1>
          <p class="lede">The official award targets by age, for boys and girls. A student needs to hit one target in each category to earn an award.</p>
          <div class="chips">
            <span class="badge badge-tier-p">Presidential · Top tier</span>
            <span class="badge badge-tier-n">National · Solid achievement</span>
          </div>`;

writeFileSync(path.join(SECTION, 'benchmarks.html'), page({
  title: 'Benchmarks — Presidential Fitness — Coach Kenny',
  desc: 'Official Presidential Physical Fitness Test targets by age and sex, Presidential and National awards.',
  current: 'benchmarks', up: '', hero, body,
  comment: `pe-fitness/benchmarks.html — official Presidential & National targets by age and sex.
Data: tools/source/benchmarks.csv (whitehouse.gov/fitness + Presidential Award PDF, Nov 14, 2026).
Design: design-spec.md § 3 + § THEME → Tables; mockup design/benchmarks.html.`,
}));
console.log('benchmarks.html: %d CSV rows, ages %s', rows.length, ages.join(' '));
