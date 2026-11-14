// pe-fitness/tools/build-overview.mjs — generates /pe-fitness/index.html (the section overview).
//
// Purpose: what the program is, who tests (3–5) vs preview (K–2), the 3 categories, how awards work,
//   lesson preview, rollout steps, quick links incl. Roll Call, official documents.
// Data source: award wording quoted from tools/source/benchmarks.md ("How awards work", "Participation
//   certificates"); K–2 quote from tools/source/rollout-plan.md; lesson titles from tools/source/lessons/.
// Follows: design-spec.md § 2 Overview page + § THEME; layout per design/overview.html mockup
//   and design-direction.md (stacked category boards, navy awards closer, stepper, Roll Call card).

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { SECTION, page, esc, ext, icon, officialDocs, eyebrow, WH_FITNESS, ROLLCALL } from './layout.mjs';
import { lessons, shortTitle, CAT_NAME } from './build-lessons.mjs';

const board = (cls, num, cat, name, a, au, b, bu) => `          <article class="cat-board${cls}">
            <div class="cat-head"><h3><span class="num">${num}</span> ${icon(cat)}${name}</h3><span class="hint">Pick one — hit it</span></div>
            <div class="cat-choices">
              <div class="choice"><p class="label">Event</p><p class="name">${a}</p><p class="unit">${au}</p></div>
              <div class="rule-col" aria-hidden="true"></div>
              <div class="choice"><p class="label">Event</p><p class="name">${b}</p><p class="unit">${bu}</p></div>
              <span class="or">Or</span>
            </div>
          </article>`;

const lessonCards = lessons.slice(0, 4).map((L) => `<a class="lesson-card" href="lessons/${L.slug}.html"><p class="lesson-num">${String(L.order).padStart(2, '0')}</p><p class="when-line">${esc(L.when)}</p><h3>${esc(shortTitle(L.title))}</h3><div class="tags">${L.cats.map((c) => `<span class="tag ${c}">${CAT_NAME[c]}</span>`).join('')}<span class="tag">3–5</span></div></a>`).join('\n          ');

const hero = `<p class="eyebrow">SLAM! Nevada · K–5 PE</p>
          <h1>Presidential Fitness Test</h1>
          <p class="lede">A national fitness challenge from the White House. Our 3rd–5th graders take the test. K–2 get a fun preview. Learn more on the ${ext(WH_FITNESS, 'White House fitness page')}.</p>
          <div class="hero-actions">
            <a class="btn" href="benchmarks.html">See the benchmarks</a>
            <a class="btn-ghost" href="lessons/index.html">Lessons</a>
          </div>
          <div class="chips">
            <span class="badge badge-tested">Grades 3–5 · Tested</span>
            <span class="badge badge-preview">Grades K–2 · Preview only</span>
          </div>`;

const body = `
    <section class="section" aria-labelledby="who-h">
      <div class="wrap">
        <p class="section-kicker">Who does what</p>
        <h2 id="who-h">Who takes the test</h2>
        <div class="two-up">
          <article class="card-box"><span class="badge badge-tested">Grades 3–5 · Tested</span><h3>3rd–5th grade test</h3><p>Practice for 3–4 weeks, then take the official test. Students can earn the Presidential Award, the National Award or a Certificate of Participation.</p></article>
          <article class="card-box"><span class="badge badge-preview">Grades K–2 · Preview only</span><h3>K–2 preview</h3><p>Mini stations during the practice weeks. No scores and no awards.</p><blockquote>“In 3rd grade you’ll get to try the Presidential Fitness Test!”</blockquote></article>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="cat-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">About the test</p>
        <h2 id="cat-h">Three categories. Pick one event in each.</h2>
        <p class="section-intro">To earn an award, a student hits one target from every category — not every event. Use age on test day. <a href="benchmarks.html#age-quick-look">See the numbers →</a></p>
        <div class="cat-boards">
${board('', '01', 'core', 'Core', 'Curl-ups', 'In 1 minute', 'Plank', 'Seconds held')}
${board(' cardio', '02', 'cardio', 'Cardio', 'One-mile run', 'Minutes : seconds', '20m beep test (PACER)', 'Laps completed')}
${board(' upper', '03', 'upper', 'Upper body', 'Right-angle push-ups', 'Total reps', 'Pull-ups', 'Total reps')}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="award-h" style="padding-top:0">
      <div class="wrap">
        <div class="award-board">
          <p class="eyebrow">How awards work</p>
          <h2 id="award-h">Earn the award</h2>
          <p>“Hit at least one target from every category and you’ll earn the Presidential or National Physical Fitness Award.” All students who complete the test may receive a Certificate of Participation.</p>
          <p>Targets go by <strong>age on test day</strong>, not grade.</p>
          <div class="award-grid">
            <article class="award top"><p class="label">Top tier</p><h3>Presidential</h3><p>Meet the Presidential target in all three categories.</p></article>
            <article class="award nat"><p class="label">Solid achievement</p><h3>National</h3><p>Meet the National target in all three, but not all Presidential.</p></article>
            <article class="award"><p class="label">Grades 3–5</p><h3>Participation</h3><p>For finishing the test. No benchmark is required.</p></article>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="lessons" aria-labelledby="les-h">
      <div class="wrap">
        <p class="section-kicker">Lessons</p>
        <h2 id="les-h">16 PE lessons, ready to teach</h2>
        <p class="section-intro">Eight practice lessons and four testing days for grades 3–5, plus four preview lessons for K–2.</p>
        <div class="lesson-grid">
          ${lessonCards}
        </div>
        <a class="more-link" href="lessons/index.html">See all 16 lessons →</a>
      </div>
    </section>

    <section class="section" id="rollout" aria-labelledby="ro-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">Rollout plan</p>
        <h2 id="ro-h">Practice first, then test</h2>
        <p class="section-intro">The official PDF does not set a testing window. This is SLAM Academy’s example calendar. Run the K–2 preview during the practice weeks.</p>
        <ol class="stepper">
          <li class="step"><div class="step-index" aria-hidden="true">1</div><h3>Practice</h3><p class="when">Example: Jan 5–29, 2027</p><p>Three to four weeks. Teach form, then short tries of each event. K–2 preview happens here.</p></li>
          <li class="step"><div class="step-index" aria-hidden="true">2</div><h3>Official test</h3><p class="when">Example: Feb 1–12, 2027</p><p>Grades 3–5 only. One category per PE period.</p></li>
          <li class="step"><div class="step-index" aria-hidden="true">3</div><h3>Makeup</h3><p class="when">The following week</p><p>Only for missed or unfairly interrupted official attempts.</p></li>
          <li class="step"><div class="step-index" aria-hidden="true">4</div><h3>Certificates</h3><p class="when">After scores are checked</p><p>Print the matching official certificates and send them home.</p></li>
        </ol>
        <p class="backup">Backup window: late March–April 2027, if weather or the PE calendar requires it. <a href="rollout.html">Full rollout plan →</a></p>
      </div>
    </section>

    <section class="section" aria-labelledby="ql-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker" id="ql-h">Quick links</p>
        <div class="quick-links">
          <a class="quick-link" href="benchmarks.html"><span class="icon-wrap" aria-hidden="true">${icon('core')}</span><strong>Benchmarks</strong><span class="sub">Official targets by age and sex</span></a>
          <a class="quick-link" href="lessons/index.html"><span class="icon-wrap" aria-hidden="true">${icon('lessons')}</span><strong>Lessons (16)</strong><span class="sub">Practice, testing and K–2 preview</span></a>
          <a class="quick-link" href="rollout.html"><span class="icon-wrap" aria-hidden="true">${icon('timeline')}</span><strong>Rollout plan</strong><span class="sub">Who tests, when, big classes</span></a>
          <a class="quick-link" href="${ROLLCALL}" target="_blank" rel="noopener"><span class="icon-wrap" aria-hidden="true">${icon('rollcall')}</span><strong>Roll Call <span aria-hidden="true">↗</span></strong><span class="sub">Private Coach K tool · attendance</span><span class="sr-only"> (opens in a new tab)</span></a>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0" aria-labelledby="rc-h">
      <div class="wrap">
        <div class="rollcall">
          <div>
            <div class="icon-wrap" aria-hidden="true">${icon('rollcall')}</div>
            <p class="eyebrow" style="margin:0;">For teachers</p>
            <h3 id="rc-h">Record scores in Roll Call</h3>
            <p>Use Roll Call for attendance and official 3–5 scores. Do not post student names or scores on this site.</p>
          </div>
          ${ext(ROLLCALL, 'Open Roll Call', 'btn')}
        </div>
      </div>
    </section>

${officialDocs('')}
`;

writeFileSync(path.join(SECTION, 'index.html'), page({
  title: 'Presidential Fitness Test — SLAM PE — Coach Kenny',
  desc: 'The Presidential Physical Fitness Test at SLAM: who tests, the 3 categories, awards, lessons and rollout plan.',
  current: 'overview', up: '', hero, heroTall: true, body,
  comment: `pe-fitness/index.html — Presidential Fitness section overview.
Data: award wording from tools/source/benchmarks.md; K–2 line from tools/source/rollout-plan.md.
Design: design-spec.md § 2 Overview + § THEME; mockup design/overview.html.`,
}));
console.log('index.html (overview) written');
