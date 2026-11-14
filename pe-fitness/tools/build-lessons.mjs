// pe-fitness/tools/build-lessons.mjs — generates lessons/index.html, the 16 lessons/<slug>.html pages,
// and rollout.html from the drafted markdown.
//
// Purpose: faithful, word-for-word conversion of the lesson plans and rollout plan into themed HTML.
// Data source: tools/source/lessons/*.md + tools/source/lessons/index.md (order, When, Focus) and
//   tools/source/rollout-plan.md (copies of /workspace/presidential-fitness/...). No npm deps.
// Follows: design-spec.md § 4 Lessons list, § 5 Lesson page (parsing rule + layout), § 6 Rollout plan;
//   lesson cards/tags per design-direction.md "Lesson cards"; stepper per "Rollout timeline".
// Content rule: text stays word for word. The ONLY edits: box paths (/workspace/presidential-fitness/…)
//   and bare "benchmarks.md" / "rollout-plan.md" / "official/" mentions become links to site pages.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { SECTION, SOURCE, page, esc, ext, icon, iconTile, eyebrow, ROLLCALL } from './layout.mjs';

const LDIR = path.join(SOURCE, 'lessons');

// ---- inline markdown → HTML (only what the sources use: **bold**, *em*, `code`, [t](u)) ----
// `up` is the prefix from the output page back to /pe-fitness/.
function inline(text, up) {
  let s = esc(text);
  // Box paths and bare file mentions → site links (the only allowed wording change).
  s = s.replace(/`?\/workspace\/presidential-fitness\/benchmarks\.md`?|`benchmarks\.md`|\bbenchmarks\.md\b/g,
    `<a href="${up}benchmarks.html">the Benchmarks page</a>`);
  s = s.replace(/`?\/workspace\/presidential-fitness\/rollout-plan\.md`?|`rollout-plan\.md`/g,
    `<a href="${up}rollout.html">the Rollout plan</a>`);
  s = s.replace(/`?\/workspace\/presidential-fitness\/official\/`?|`official\/`(?: PDFs)?/g,
    (m) => `<a href="${up}index.html#docs-h">the official PDFs</a>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

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

// ---- lesson .md parser: "Label: value" blocks; only template labels start sections (spec § 5) ----
const SECTIONS = ['Unit Objective', 'Unit Essential Question', 'Lesson Objective', 'Equipment', 'Bell Ringer/Warm-up',
  'Direct Instruction (TW)', 'Guided Practice (SW)', 'Cool-down', 'Kagan/SLAMified', 'Exit Ticket', 'Reminders', 'Nevada State Standards'];
const HEADER = ['Title', 'Grade band', 'When'];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const LABEL_RE = new RegExp(`^(${[...HEADER, ...SECTIONS].map(escRe).join('|')})( — [^:]+)?:\\s*(.*)$`);

function parseLesson(md) {
  const out = { header: {}, sections: [] };
  let cur = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const m = line.match(LABEL_RE);
    if (m) {
      if (HEADER.includes(m[1])) { out.header[m[1]] = m[3]; cur = null; continue; }
      cur = { label: m[1], sub: (m[2] || '').replace(/^ — /, ''), lines: [] };
      if (m[3]) cur.lines.push(m[3]);
      out.sections.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  return out;
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Bold a short lead phrase ending in ": " (e.g. "Safety:", "Option B (more time):") — spec § 5.
function leadBold(text, up) {
  const m = text.match(/^([^.:"“]{1,48}?):\s(.*)$/);
  return m ? `<strong>${inline(m[1], up)}:</strong> ${inline(m[2], up)}` : inline(text, up);
}
const STEP_RE = /^(Round \d+|Station [A-Z0-9]+)\b/; // step lines → ordered list (Guided Practice rounds)

function renderLines(lines, up, { standards = false } = {}) {
  const paras = lines.map((l) => l.trim()).filter(Boolean);
  if (standards) {
    return `<ul class="standards">${paras.map((p) => {
      const m = p.match(/^(\S+ \([^)]+\))\s—\s(.*)$/);
      return `<li>${m ? `<strong>${esc(m[1])}</strong> — ${inline(m[2], up)}` : inline(p, up)}</li>`;
    }).join('')}</ul>`;
  }
  let html = ''; let list = [];
  const flush = () => { if (list.length) { html += `<ol class="rounds">${list.map((x) => `<li>${leadBold(x, up)}</li>`).join('')}</ol>`; list = []; } };
  for (const p of paras) {
    if (STEP_RE.test(p)) { list.push(p); continue; }
    flush();
    html += `<p>${leadBold(p, up)}</p>`;
  }
  flush();
  return html;
}

const GROUP_TAG = (band) => (/K-2/.test(band)
  ? '<span class="badge badge-preview">Grades K–2 · Preview only</span>'
  : '<span class="badge badge-tested">Grades 3–5 · Tested</span>');
const shortTitle = (t) => t.replace(/^Presidential Fitness Test — /, '');

const lessons = order.map((o) => {
  const md = readFileSync(path.join(LDIR, o.slug + '.md'), 'utf8');
  const p = parseLesson(md);
  for (const h of HEADER) if (!p.header[h]) throw new Error(`${o.slug}: missing ${h}`);
  return { ...o, ...p, title: p.header.Title, band: p.header['Grade band'], cats: cats(o.slug) };
});

// ---- one lesson page ----
function lessonPage(L, i) {
  const up = '../';
  const prev = lessons[i - 1]; const next = lessons[i + 1];
  const sec = (name) => L.sections.find((s) => s.label === name);
  const objective = sec('Lesson Objective');
  const equipment = sec('Equipment');
  const body = L.sections.filter((s) => s !== objective && s !== equipment);
  const heading = (s) => esc(s.label + (s.sub ? ` — ${s.sub}` : ''));
  const toc = body.map((s) => `<li><a href="#${slugify(s.label)}">${heading(s)}</a></li>`).join('');
  const sections = body.map((s) => {
    const id = slugify(s.label);
    const tag = /\(TW\)/.test(s.label) ? ' <span class="tw-badge">Teacher</span>' : /\(SW\)/.test(s.label) ? ' <span class="sw-badge">Students</span>' : '';
    const h = `<h2 id="${id}"><span class="diamond" aria-hidden="true"></span>${heading(s)}${tag}</h2>`;
    if (s.label === 'Reminders') return `<section aria-labelledby="${id}">${h}<div class="callout red">${renderLines(s.lines, up)}</div></section>`;
    if (s.label === 'Nevada State Standards') return `<section aria-labelledby="${id}">${h}<div class="callout navy">${renderLines(s.lines, up, { standards: true })}</div></section>`;
    return `<section aria-labelledby="${id}">${h}${renderLines(s.lines, up)}</section>`;
  }).join('\n          ');
  // Equipment checklist: split on commas that are not inside parentheses.
  const eqText = equipment.lines.join(' ').trim();
  const items = []; let depth = 0; let buf = '';
  for (const ch of eqText) {
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { items.push(buf.trim()); buf = ''; } else buf += ch;
  }
  if (buf.trim()) items.push(buf.trim());
  const pn = (L2, dir, cls) => L2
    ? `<a class="${cls}" href="${L2.slug}.html"><span class="dir">${dir === 'prev' ? '← Previous' : 'Next →'}</span><span class="t">Lesson ${L2.order}: ${esc(shortTitle(L2.title))}</span></a>`
    : `<a class="${cls}" href="index.html"><span class="dir">${dir === 'prev' ? '← Back' : 'Done →'}</span><span class="t">All lessons</span></a>`;
  // Compact hero (no H1 here: the one visible H1 is in the lesson header card, spec § 5.3).
  const hero = `<p class="eyebrow">${eyebrow}</p>
          <p class="lede" style="margin-bottom:0">Lesson ${L.order} of 16 · ${esc(L.when)} · ${esc(L.band.replace('-', '–'))}</p>`;
  const bodyHtml = `
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="../index.html">PE Fitness</a></li><li><a href="index.html">Lessons</a></li><li aria-current="page">Lesson ${L.order}</li></ol></nav>
      <div class="lesson-layout">
        <div>
          <article class="lesson-head">
            <div class="chips">${GROUP_TAG(L.band)}</div>
            <h1>${esc(shortTitle(L.title))}</h1>
            <div class="meta-chips">
              <span class="meta-chip">When: ${esc(L.when)}</span>
              <span class="meta-chip">${esc(L.band)}</span>
              ${L.cats.map((c) => iconTile(c, CAT_NAME[c])).join('')}
            </div>
            <div class="equip"><h2>Equipment</h2><ul>${items.map((x) => `<li>${inline(x, up)}</li>`).join('')}</ul></div>
            <button type="button" class="btn-ghost" data-print>Print lesson</button>
          </article>
          <details class="toc toc-mobile"><summary>On this page</summary><ul>${toc}</ul></details>
          <p class="label-row"><span class="diamond" aria-hidden="true"></span> Today we will</p>
          <div class="callout gold"><span class="lead">Lesson Objective</span><p class="objective">${inline(objective.lines.join(' ').trim(), up)}</p></div>
          <div class="reading">
          ${sections}
          </div>
          <nav class="prevnext" aria-label="Lesson navigation">${pn(prev, 'prev', 'prev')}${pn(next, 'next', 'next')}</nav>
          <a class="more-link all-lessons" href="index.html">All lessons →</a>
        </div>
        <aside class="toc toc-desktop" aria-label="On this page"><h2>On this page</h2><ul>${toc}</ul></aside>
      </div>
    </div>
`;
  return page({
    title: `${L.title} — Lesson ${L.order} — Coach Kenny`,
    desc: `${L.band} PE lesson, ${L.when}: ${shortTitle(L.title)}.`,
    current: 'lessons', up, hero, body: bodyHtml,
    comment: `pe-fitness/lessons/${L.slug}.html — Lesson ${L.order} of 16 (${L.band}, ${L.when}).
Data: tools/source/lessons/${L.slug}.md (word for word; box paths → site links).
Design: design-spec.md § 5 Lesson page.`,
  });
}

// ---- lessons index ----
function lessonsIndex() {
  const up = '../';
  const intro = indexMd.split('\n').filter((l) => l && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('- ')).slice(1); // skip the "Suggested window" line (shown in hero)
  const window = indexMd.split('\n').find((l) => l.startsWith('Suggested window'));
  const G = groups.filter(Boolean);
  const meta = {
    0: { key: '35', desc: 'Teach form, then short tries of each event. Lessons 1–8.', badge: '<span class="badge badge-tested">Grades 3–5 · Tested</span>' },
    1: { key: '35', desc: 'The real test. Lessons 9–12.', badge: '<span class="badge badge-tested">Grades 3–5 · Tested</span>', callout: '<div class="callout gold"><span class="lead">Testing days</span><p>One category per PE period, plus a makeup day.</p></div>' },
    2: { key: 'k2', desc: 'Kid-friendly mini stations. No scores, no awards. Lessons 13–16.', badge: '<span class="badge badge-preview">Grades K–2 · Preview only</span>' },
  };
  const groupsHtml = G.map((g, gi) => {
    const m = meta[gi];
    const rows = g.items.map((o) => {
      const L = lessons.find((x) => x.slug === o.slug);
      return `<li><a class="lesson-row${m.key === 'k2' ? ' k2' : ''}" href="${o.slug}.html">
              <span class="ord" aria-hidden="true">${o.order}</span>
              <span><span class="ttl"><span class="sr-only">Lesson ${o.order}: </span>${esc(shortTitle(L.title))}</span><span class="meta">${esc(o.when)} · ${inline(o.focus, up)}</span></span>
              <span class="icons">${L.cats.map((c) => iconTile(c, CAT_NAME[c])).join('')}<span class="chev" aria-hidden="true">→</span></span>
            </a></li>`;
    }).join('\n            ');
    return `<section class="lesson-group" data-band="${m.key}" aria-labelledby="g${gi}">
          <div class="chips" style="margin-bottom:8px">${m.badge}</div>
          <h2 id="g${gi}">${esc(g.name)}</h2>
          <p class="group-desc">${m.desc}</p>
          ${m.callout || ''}
          <ol class="lesson-list" start="${g.items[0].order}">
            ${rows}
          </ol>
        </section>`;
  }).join('\n        ');
  const hero = `<p class="eyebrow">${eyebrow}</p>
          <h1>Lessons</h1>
          <p class="lede">16 ready-to-teach PE lessons. A substitute can run any of them.</p>
          <p class="lede" style="margin-bottom:0">${inline(window, up)}</p>`;
  const body = `
    <section class="section" aria-labelledby="about-h" style="padding-bottom:0">
      <div class="wrap">
        <h2 id="about-h" class="sr-only">About these lessons</h2>
        <div class="callout green prose">${intro.map((l) => `<p>${inline(l, up)}</p>`).join('')}</div>
        <div class="filter-row" role="group" aria-label="Filter lessons" data-js-only hidden>
          <button type="button" class="filter-chip" data-filter="all" aria-pressed="true">All</button>
          <button type="button" class="filter-chip" data-filter="35" aria-pressed="false">Grades 3–5</button>
          <button type="button" class="filter-chip" data-filter="k2" aria-pressed="false">Grades K–2</button>
        </div>
        ${groupsHtml}
        <div class="callout navy" style="margin-top:36px"><span class="lead">Related</span><p><a href="../benchmarks.html">Benchmarks</a> (official numbers) · <a href="../rollout.html">Rollout plan</a> (who tests, calendar, big-class setup) · <a href="../index.html#docs-h">Official PDFs</a></p></div>
      </div>
    </section>
`;
  return page({
    title: 'Lessons — Presidential Fitness — Coach Kenny',
    desc: '16 Presidential Fitness Test PE lessons for grades 3–5 (practice and testing) and K–2 (preview only).',
    current: 'lessons', up, hero, body,
    comment: `pe-fitness/lessons/index.html — list of the 16 lessons, grouped as in the source index.
Data: tools/source/lessons/index.md (order, When, Focus) + each lesson's Title line.
Design: design-spec.md § 4 Lessons list; design-direction.md "Lesson cards".`,
  });
}

// ---- rollout plan ----
function rollout() {
  const up = '';
  const md = readFileSync(path.join(SOURCE, 'rollout-plan.md'), 'utf8');
  const parts = {}; let cur = '_intro';
  for (const line of md.split('\n')) {
    const h = line.match(/^## (.+)/);
    if (h) { cur = h[1].trim(); parts[cur] = []; continue; }
    if (line.startsWith('# ')) continue;
    (parts[cur] ??= []).push(line);
  }
  const paras = (key) => parts[key].map((l) => l.trim()).filter(Boolean);
  const who = paras('Who tests');
  const when = paras('When');
  const practiceKey = Object.keys(parts).find((k) => k.startsWith('Practice'));
  const big = paras('How to run a big 3–5 class');
  const bigIntro = big.filter((l) => !l.startsWith('- ') && !l.startsWith('**After'));
  const bullets = big.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
  const after = big.find((l) => l.startsWith('**After'));
  const bullet = (name) => { const b = bullets.find((x) => x.startsWith(`**${name}:**`)); if (!b) throw new Error('rollout bullet ' + name); return b.replace(`**${name}:**`, '').trim(); };
  const stationGroups = [
    ['core', 'Core', ['Curl-ups', 'Plank']],
    ['cardio', 'Cardio', ['One-mile run', '20m beep test']],
    ['upper', 'Upper body', ['Right-angle push-ups', 'Pull-ups']],
  ];
  const whenBullets = when.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
  const whenParas = when.filter((l) => !l.startsWith('- '));
  // Timeline phases: labels from design-spec § 6; the text in each card is quoted from the source.
  const timeline = [
    ['Practice · 3–4 weeks', 'Practice', 'Example: practice Jan. 5–29, 2027. Run the K–2 preview during the practice weeks, not during the 3–5 testing window if that helps the gym schedule.'],
    ['End of practice', 'Practice test day', 'End practice with a practice-test day, then official testing.'],
    ['Example: Feb. 1–12, 2027', 'Official testing · grades 3–5', 'One category per PE period (three days + a makeup day).'],
    ['About 1 week', 'Makeup week', 'Plus one makeup week.'],
    ['After testing', 'Certificates go home', 'Pick one window schoolwide so 3–5 certificates can go out together.'],
  ];
  const hero = `<p class="eyebrow">${eyebrow}</p>
          <h1>Rollout plan</h1>
          <p class="lede" style="margin-bottom:0">Who tests, when, and how to run a big class.</p>`;
  const body = `
    <section class="section" aria-labelledby="src-h" style="padding-bottom:0">
      <div class="wrap">
        <h2 id="src-h" class="sr-only">Where scores come from</h2>
        <div class="callout navy prose"><span class="lead">Official scores</span>${paras('_intro').map((l) => `<p>${inline(l, up)}</p>`).join('')}</div>
      </div>
    </section>

    <section class="section" aria-labelledby="who-h">
      <div class="wrap">
        <p class="section-kicker">Who tests</p>
        <h2 id="who-h">Who tests</h2>
        <div class="two-up">
          <article class="card-box"><span class="badge badge-tested">Grades 3–5 · Tested</span><h3>Grades 3–5 take the test</h3>${who.slice(0, 2).map((l) => `<p>${inline(l, up)}</p>`).join('')}</article>
          <article class="card-box"><span class="badge badge-preview">Grades K–2 · Preview only</span><h3>K–2 get a preview</h3>${who.slice(2).map((l) => `<p>${inline(l, up)}</p>`).join('')}</article>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="when-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">When</p>
        <h2 id="when-h">When</h2>
        <div class="prose">${whenParas.slice(0, 1).map((l) => `<p>${inline(l, up)}</p>`).join('')}
          <ul>${whenBullets.map((l) => `<li>${inline(l, up)}</li>`).join('')}</ul>
          ${whenParas.slice(1).map((l) => `<p>${inline(l, up)}</p>`).join('')}</div>
        <ol class="timeline" aria-label="Example timeline (dates are examples, not locked)">
          ${timeline.map(([pill, h, t]) => `<li><span class="pill">${esc(pill)}</span><h3>${esc(h)}</h3><p>${inline(t, up)}</p></li>`).join('\n          ')}
          <li class="backup-branch"><span class="pill">Backup</span><h3>Spring 2027</h3><p>Spring 2027 (late March–April) if winter weather or the PE calendar gets in the way.</p></li>
        </ol>
      </div>
    </section>

    <section class="section" aria-labelledby="prac-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">Practice</p>
        <h2 id="prac-h">${esc(practiceKey)}</h2>
        <div class="prose">${paras(practiceKey).map((l) => `<p>${inline(l, up)}</p>`).join('')}</div>
      </div>
    </section>

    <section class="section" aria-labelledby="big-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">Stations and partners</p>
        <h2 id="big-h">How to run a big 3–5 class</h2>
        <div class="prose">${bigIntro.map((l) => `<p>${inline(l, up)}</p>`).join('')}</div>
        ${stationGroups.map(([k, n, evs]) => `<div class="station-group ${k}">
          <h3>${iconTile(k)}${n}</h3>
          <div class="stations">${evs.map((e) => `<div class="station"><h4>${esc(e)}</h4><p>${inline(bullet(e), up)}</p></div>`).join('')}</div>
        </div>`).join('\n        ')}
      </div>
    </section>

    <section class="section" aria-labelledby="after-h" style="padding-top:0">
      <div class="wrap">
        <div class="award-board" style="text-align:left">
          <h2 id="after-h">After testing</h2>
          <p>${inline(after.replace(/^\*\*After 3–5 testing:\*\*\s*/, ''), up)}</p>
          <a class="btn" href="index.html#docs-h">Official certificates</a>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="wrap">
        <div class="rollcall">
          <div>
            <div class="icon-wrap" aria-hidden="true">${icon('rollcall')}</div>
            <p class="eyebrow" style="margin:0;">For teachers</p>
            <h3>Record scores in Roll Call</h3>
            <p>Use Roll Call for attendance and official 3–5 scores. Do not post student names or scores on this site.</p>
          </div>
          ${ext(ROLLCALL, 'Open Roll Call', 'btn')}
        </div>
      </div>
    </section>
`;
  return page({
    title: 'Rollout plan — Presidential Fitness — Coach Kenny',
    desc: 'Who takes the Presidential Fitness Test at SLAM, when, and how to run a big class.',
    current: 'rollout', up, hero, body,
    comment: `pe-fitness/rollout.html — who tests, when, practice, big-class stations, after testing.
Data: tools/source/rollout-plan.md (word for word; timeline card text quoted from it).
Design: design-spec.md § 6 Rollout plan; design-direction.md "Rollout timeline" + "Roll Call link card".`,
  });
}

writeFileSync(path.join(SECTION, 'lessons', 'index.html'), lessonsIndex());
lessons.forEach((L, i) => writeFileSync(path.join(SECTION, 'lessons', L.slug + '.html'), lessonPage(L, i)));
writeFileSync(path.join(SECTION, 'rollout.html'), rollout());
export { lessons, shortTitle, CAT_NAME };
console.log('lessons: index + %d pages; rollout.html', lessons.length);
