// pe-fitness/tools/build-lessons.mjs — generates lessons/index.html, the 16 lessons/<slug>.html pages,
// and rollout.html (the family "Timeline" page).
//
// Purpose: FAMILY-FACING pages. Kenny (Nov 14, 2026): write it so parents, teachers and principals can
//   read it and think "I know what my kid is doing"; no teacher asides or mini-comments.
// Data sources:
//   - tools/source/lessons/index.md → lesson ORDER, group, "When" (week/day). Its tables are parsed below.
//   - tools/source/lessons/<slug>.md → only the header lines (Title, Grade band, When) are read.
//     The rest of each .md is the TEACHER plan (Planbook template); it stays in the repo but is not shown.
//   - tools/source/family-lessons.mjs → the public text for every lesson page (summary, in-class steps,
//     why it matters, try at home). Edit there to change what families read.
//   - Timeline/rollout copy is written directly in rollout() below, based on tools/source/rollout-plan.md
//     (dates are "planned", matching the plan's suggested window; backup window spring 2027).
// Follows: design-spec.md § 4 Lessons list, § 5 Lesson page, § 6 Rollout plan (layout/classes unchanged).
// Not public on purpose: Roll Call (private teacher tool), score sheets, form-check percentages,
//   equipment lists, Nevada standards, Planbook notes, box paths. No student names or scores.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { SECTION, SOURCE, page, esc, icon, iconTile, eyebrow } from './layout.mjs';
import { FAMILY } from './source/family-lessons.mjs';

const LDIR = path.join(SOURCE, 'lessons');

// ---- lesson order from index.md tables (keeps its groups) ----
const indexMd = readFileSync(path.join(LDIR, 'index.md'), 'utf8');
const groups = [];
for (const line of indexMd.split('\n')) {
  const h = line.match(/^## (.+)/);
  if (h) { if (!/Related files/.test(h[1])) groups.push({ name: h[1].trim(), items: [] }); else groups.push(null); continue; }
  const r = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*\[([^\]]+)\]\([^)]+\)\s*\|\s*([^|]+?)\s*\|/);
  if (r && groups.at(-1)) groups.at(-1).items.push({ order: +r[1], when: r[2], slug: r[3].replace(/\.md$/, ''), focus: r[4] });
}
const order = groups.filter(Boolean).flatMap((g) => g.items);
if (order.length !== 16) throw new Error('expected 16 lessons in index.md, got ' + order.length);
const mdFiles = readdirSync(LDIR).filter((f) => f.endsWith('.md') && f !== 'index.md');
if (mdFiles.length !== 16) throw new Error('expected 16 lesson .md files');

// Category inference from filename keywords (spec § 4). Mixed/stations/practice-test/makeup → all three.
function cats(slug) {
  if (/mixed|stations|practice-test|makeup/.test(slug)) return ['core', 'cardio', 'upper'];
  const c = [];
  if (/core|curl|plank/.test(slug)) c.push('core');
  if (/cardio|mile|beep/.test(slug)) c.push('cardio');
  if (/arms|push|pull|upper/.test(slug)) c.push('upper');
  return c;
}
const CAT_NAME = { core: 'Core', cardio: 'Cardio', upper: 'Upper body' };

// Header lines only (Title / Grade band / When) from the teacher .md.
function header(md) {
  const out = {};
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^(Title|Grade band|When):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const isK2 = (band) => /K-2/.test(band);
const GROUP_TAG = (band) => (isK2(band)
  ? '<span class="badge badge-preview">Grades K–2 · Just for fun</span>'
  : '<span class="badge badge-tested">Grades 3–5</span>');
// Family-friendly "when" label: "Week 1 Day 1" → "Week 1 · Class 1"; testing days stay as written.
const whenLabel = (w) => w.replace(/^Week (\d+) Day (\d+)$/, 'Week $1 · Class $2').replace(/^Testing Day 4 \(Makeup\)$/, 'Makeup day');

const lessons = order.map((o) => {
  const h = header(readFileSync(path.join(LDIR, o.slug + '.md'), 'utf8'));
  for (const k of ['Title', 'Grade band', 'When']) if (!h[k]) throw new Error(`${o.slug}: missing ${k}`);
  const fam = FAMILY[o.slug];
  if (!fam) throw new Error(`${o.slug}: no entry in source/family-lessons.mjs`);
  return { ...o, ...fam, band: h['Grade band'], whenLabel: whenLabel(o.when), cats: cats(o.slug) };
});
const shortTitle = (t) => t; // family titles are already short (kept for build-overview.mjs import)

// ---- one lesson page ----
function lessonPage(L, i) {
  const up = '../';
  const prev = lessons[i - 1]; const next = lessons[i + 1];
  const k2 = isK2(L.band);
  const pn = (L2, dir, cls) => L2
    ? `<a class="${cls}" href="${L2.slug}.html"><span class="dir">${dir === 'prev' ? '← Previous' : 'Next →'}</span><span class="t">${esc(L2.title)}</span></a>`
    : `<a class="${cls}" href="index.html"><span class="dir">${dir === 'prev' ? '← Back' : 'Done →'}</span><span class="t">All lessons</span></a>`;
  const toc = [['in-class', 'In class'], ['why', 'Why it matters'], ['home', 'Try it at home']]
    .map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('');
  const hero = `<p class="eyebrow">${eyebrow}</p>
          <p class="lede" style="margin-bottom:0">${k2 ? 'K–2 preview' : 'Grades 3–5'} · ${esc(L.whenLabel)}</p>`;
  const bodyHtml = `
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="../index.html">PE Fitness</a></li><li><a href="index.html">Lessons</a></li><li aria-current="page">${esc(L.title)}</li></ol></nav>
      <div class="lesson-layout">
        <div>
          <article class="lesson-head">
            <div class="chips">${GROUP_TAG(L.band)}</div>
            <h1>${esc(L.title)}</h1>
            <div class="meta-chips">
              <span class="meta-chip">${esc(L.whenLabel)}</span>
              ${L.cats.map((c) => iconTile(c, CAT_NAME[c])).join('')}
            </div>
            <p class="objective">${esc(L.summary)}</p>
          </article>
          <details class="toc toc-mobile"><summary>On this page</summary><ul>${toc}</ul></details>
          <div class="reading">
          <section aria-labelledby="in-class"><h2 id="in-class"><span class="diamond" aria-hidden="true"></span>What your child does in class</h2>
            <ol class="rounds">${L.steps.map(([lead, t]) => `<li><strong>${esc(lead)}:</strong> ${esc(t)}</li>`).join('')}</ol></section>
          <section aria-labelledby="why"><h2 id="why"><span class="diamond" aria-hidden="true"></span>Why it matters</h2><p>${esc(L.why)}</p></section>
          <section aria-labelledby="home"><h2 id="home"><span class="diamond" aria-hidden="true"></span>Try it at home</h2>
            <div class="callout green prose"><ul>${L.home.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></section>
          </div>
          <nav class="prevnext" aria-label="Lesson navigation">${pn(prev, 'prev', 'prev')}${pn(next, 'next', 'next')}</nav>
          <a class="more-link all-lessons" href="index.html">All lessons →</a>
        </div>
        <aside class="toc toc-desktop" aria-label="On this page"><h2>On this page</h2><ul>${toc}</ul></aside>
      </div>
    </div>
`;
  return page({
    title: `${L.title} — Presidential Fitness — Coach Kenny`,
    desc: `${k2 ? 'K–2 preview' : 'Grades 3–5'} PE, ${L.whenLabel}: ${L.summary}`,
    current: 'lessons', up, hero, body: bodyHtml,
    comment: `pe-fitness/lessons/${L.slug}.html — family-facing summary of lesson ${L.order} of 16 (${L.band}, ${L.when}).
Data: tools/source/family-lessons.mjs ("${L.slug}"); order/When from tools/source/lessons/index.md.
Design: design-spec.md § 5 Lesson page (teacher-only blocks removed for families, Nov 14).`,
  });
}

// ---- lessons index ----
function lessonsIndex() {
  const up = '../';
  const G = groups.filter(Boolean);
  const meta = {
    0: { key: '35', name: 'Grades 3–5: Practice weeks', desc: 'About four weeks of learning and practicing each event before the real test.', badge: '<span class="badge badge-tested">Grades 3–5</span>' },
    1: { key: '35', name: 'Grades 3–5: Test days', desc: 'The official test, one category per PE class, plus a makeup day for anyone who was absent.', badge: '<span class="badge badge-tested">Grades 3–5</span>' },
    2: { key: 'k2', name: 'Grades K–2: Fun preview', desc: 'Younger kids try mini versions of the events during the same weeks. No scores, no testing, no awards.', badge: '<span class="badge badge-preview">Grades K–2 · Just for fun</span>' },
  };
  const groupsHtml = G.map((g, gi) => {
    const m = meta[gi];
    const rows = g.items.map((o) => {
      const L = lessons.find((x) => x.slug === o.slug);
      return `<li><a class="lesson-row${m.key === 'k2' ? ' k2' : ''}" href="${o.slug}.html">
              <span class="ord" aria-hidden="true">${o.order}</span>
              <span><span class="ttl">${esc(L.title)}</span><span class="meta">${esc(L.whenLabel)} · ${esc(L.summary)}</span></span>
              <span class="icons">${L.cats.map((c) => iconTile(c, CAT_NAME[c])).join('')}<span class="chev" aria-hidden="true">→</span></span>
            </a></li>`;
    }).join('\n            ');
    return `<section class="lesson-group" data-band="${m.key}" aria-labelledby="g${gi}">
          <div class="chips" style="margin-bottom:8px">${m.badge}</div>
          <h2 id="g${gi}">${esc(m.name)}</h2>
          <p class="group-desc">${m.desc}</p>
          <ol class="lesson-list" start="${g.items[0].order}">
            ${rows}
          </ol>
        </section>`;
  }).join('\n        ');
  const hero = `<p class="eyebrow">${eyebrow}</p>
          <h1>Lessons</h1>
          <p class="lede" style="margin-bottom:0">What your child does in PE, class by class, from the first practice to test day.</p>`;
  const body = `
    <section class="section" aria-labelledby="about-h" style="padding-bottom:0">
      <div class="wrap">
        <h2 id="about-h" class="sr-only">About these lessons</h2>
        <div class="callout green prose">
          <p><strong>Grades 3–5</strong> spend about four weeks learning and practicing each event, then take the official test over three PE classes in early February.</p>
          <p><strong>Grades K–2</strong> get a fun preview of the same events during the practice weeks. They are not tested or scored.</p>
          <p>Tap any lesson to see what happens in class, why it matters, and an easy way to practice at home.</p>
        </div>
        <div class="filter-row" role="group" aria-label="Filter lessons" data-js-only hidden>
          <button type="button" class="filter-chip" data-filter="all" aria-pressed="true">All</button>
          <button type="button" class="filter-chip" data-filter="35" aria-pressed="false">Grades 3–5</button>
          <button type="button" class="filter-chip" data-filter="k2" aria-pressed="false">Grades K–2</button>
        </div>
        ${groupsHtml}
        <div class="callout navy" style="margin-top:36px"><span class="lead">See also</span><p><a href="../benchmarks.html">Benchmarks</a> (the award targets by age) · <a href="../rollout.html">Timeline</a> (what to expect and when)</p></div>
      </div>
    </section>
`;
  return page({
    title: 'Lessons — Presidential Fitness — Coach Kenny',
    desc: 'What your child does in PE for the Presidential Fitness Test, class by class: grades 3–5 practice and test days, and the K–2 fun preview.',
    current: 'lessons', up, hero, body,
    comment: `pe-fitness/lessons/index.html — family-facing list of the 16 lessons, grouped as in the source index.
Data: order/When from tools/source/lessons/index.md; titles + summaries from tools/source/family-lessons.mjs.
Design: design-spec.md § 4 Lessons list; design-direction.md "Lesson cards".`,
  });
}

// ---- Timeline page (rollout.html): what families can expect and when ----
// Dates follow tools/source/rollout-plan.md (suggested window, not locked) and are labeled "Planned".
function rollout() {
  const up = '';
  const timeline = [
    ['Planned: Jan. 5–29, 2027', 'Practice weeks', 'Grades 3–5 learn each event and practice it in PE, about three to four weeks. Grades K–2 get their fun preview during these same weeks.'],
    ['End of January', 'Practice test day', 'A dress rehearsal so test day feels familiar. Practice results do not count.'],
    ['Planned: Feb. 1–12, 2027', 'Official test days (grades 3–5)', 'One category per PE class: core one day, cardio another, upper body another.'],
    ['The week after', 'Makeup day', 'For anyone who was absent or had an attempt interrupted.'],
    ['After testing', 'Certificates come home', 'Award and participation certificates go home for grades 3–5, all at the same time.'],
  ];
  const events = [
    ['core', 'Core', [['Curl-ups', 'As many good curl-ups as possible in one minute, with a partner counting.'], ['Plank', 'Hold a straight-body plank on the forearms for as long as possible.']]],
    ['cardio', 'Cardio', [['One-mile run', 'Run one mile on a measured course. This is the only event where a lower number (a faster time) is better.'], ['20-meter beep test', 'Run between two lines 20 meters apart, reaching the line before each beep. The beeps slowly speed up.']]],
    ['upper', 'Upper body', [['Right-angle push-ups', 'Body straight, lower until the elbows make about a right angle, then push back up. Only good-form reps count.'], ['Pull-ups', 'Hang from a bar and pull the chin over it, then lower all the way down.']]],
  ];
  const hero = `<p class="eyebrow">${eyebrow}</p>
          <h1>Timeline</h1>
          <p class="lede" style="margin-bottom:0">What to expect, when it happens, and how you can help.</p>`;
  const body = `
    <section class="section" aria-labelledby="who-h">
      <div class="wrap">
        <p class="section-kicker">Who takes part</p>
        <h2 id="who-h">Who takes part</h2>
        <div class="two-up">
          <article class="card-box"><span class="badge badge-tested">Grades 3–5</span><h3>Grades 3–5 take the test</h3><p>Students pick one event in each of three categories: core, cardio and upper body. Targets are based on each child’s age on test day, not their grade.</p><p>Hitting the target in all three categories earns the <strong>Presidential Award</strong> (top tier) or the <strong>National Award</strong>. Every student who finishes the test can receive a <strong>Certificate of Participation</strong>.</p></article>
          <article class="card-box"><span class="badge badge-preview">Grades K–2 · Just for fun</span><h3>K–2 get a preview</h3><p>During the same weeks, younger kids try short, kid-sized versions of the events: a few curl-ups, a short plank, short runs and wall push-ups.</p><p>There is no testing, no scoring and no awards for K–2. It is all about having fun and getting excited for 3rd grade.</p><blockquote>“In 3rd grade you’ll get to try the Presidential Fitness Test!”</blockquote></article>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="when-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">When</p>
        <h2 id="when-h">When it happens</h2>
        <div class="prose"><p>The test happens during regular PE classes this winter. Dates are planned and can shift with the weather or the school calendar.</p></div>
        <ol class="timeline" aria-label="Planned timeline">
          ${timeline.map(([pill, h, t]) => `<li><span class="pill">${esc(pill)}</span><h3>${esc(h)}</h3><p>${esc(t)}</p></li>`).join('\n          ')}
          <li class="backup-branch"><span class="pill">Backup</span><h3>Spring 2027</h3><p>If winter weather or the school calendar gets in the way, testing moves to late March or April 2027.</p></li>
        </ol>
      </div>
    </section>

    <section class="section" aria-labelledby="ev-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">The six events</p>
        <h2 id="ev-h">What each event looks like</h2>
        <div class="prose"><p>Students choose one event from each pair. Classmates take turns as partners, cheering each other on and helping count.</p></div>
        ${events.map(([k, n, evs]) => `<div class="station-group ${k}">
          <h3>${iconTile(k)}${n}</h3>
          <div class="stations">${evs.map(([e, t]) => `<div class="station"><h4>${esc(e)}</h4><p>${esc(t)}</p></div>`).join('')}</div>
        </div>`).join('\n        ')}
      </div>
    </section>

    <section class="section" aria-labelledby="help-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">At home</p>
        <h2 id="help-h">How you can help</h2>
        <div class="callout green prose"><ul>
          <li>Send your child in sneakers and comfortable clothes on PE days, with a water bottle.</li>
          <li>A good night’s sleep and breakfast make a real difference, especially on test days.</li>
          <li>Get moving together: family walks, playground time, or a quick plank challenge.</li>
          <li>Praise effort, not numbers. Trying their best is what we celebrate.</li>
        </ul></div>
      </div>
    </section>

    <section class="section" aria-labelledby="after-h" style="padding-top:0">
      <div class="wrap">
        <div class="award-board" style="text-align:left">
          <h2 id="after-h">After testing</h2>
          <p>Coach Kenny checks each child’s results against the official targets for their age. Certificates for grades 3–5 then go home together. Results stay private: no student names or scores are ever posted on this site.</p>
          <a class="btn" href="index.html#docs-h">See the certificates</a>
        </div>
      </div>
    </section>
`;
  return page({
    title: 'Timeline — Presidential Fitness — Coach Kenny',
    desc: 'When the Presidential Fitness Test happens at SLAM, who takes part, what each event looks like and how families can help.',
    current: 'rollout', up, hero, body,
    comment: `pe-fitness/rollout.html — family-facing "Timeline": who takes part, when, the six events, how to help, after testing.
Data: copy written in tools/build-lessons.mjs rollout(), based on tools/source/rollout-plan.md (planned dates).
Design: design-spec.md § 6 Rollout plan; design-direction.md "Rollout timeline". Private teacher-tool card removed for the public page.`,
  });
}

writeFileSync(path.join(SECTION, 'lessons', 'index.html'), lessonsIndex());
lessons.forEach((L, i) => writeFileSync(path.join(SECTION, 'lessons', L.slug + '.html'), lessonPage(L, i)));
writeFileSync(path.join(SECTION, 'rollout.html'), rollout());
export { lessons, shortTitle, CAT_NAME };
console.log('lessons: index + %d pages; rollout.html', lessons.length);
