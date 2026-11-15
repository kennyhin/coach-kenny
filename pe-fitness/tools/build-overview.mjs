// pe-fitness/tools/build-overview.mjs — generates /pe-fitness/index.html (the section overview).
//
// Purpose: NEUTRAL-VOICE overview of Coach Kenny's PE class page (Kenny, Nov 14, 2026: kids, parents, teachers
//   and principals can all read it; short and clear for a 3rd-5th grader; never "your child").
//   What the test is, why it matters, who takes part (3–5 test, K–2 fun preview), the 3 categories,
//   what the awards mean, a lesson preview, the planned timeline, practice at home, official documents.
// Data source: award rules from tools/source/benchmarks.md ("How awards work", participation certificates),
//   paraphrased in plain words; planned dates from tools/source/rollout-plan.md; lesson titles/summaries
//   from tools/source/family-lessons.mjs (via build-lessons.mjs).
// Not public on purpose: Roll Call card/link (private teacher tool), teacher-facing asides.
// Follows: design-spec.md § 2 Overview page + § THEME; layout per design/overview.html mockup
//   and design-direction.md (stacked category boards, navy awards closer, stepper).

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { SECTION, page, esc, ext, icon, officialDocs, eyebrow, WH_FITNESS } from './layout.mjs';
import { lessons, shortTitle, CAT_NAME } from './build-lessons.mjs';

const board = (cls, num, cat, name, a, au, b, bu) => `          <article class="cat-board${cls}">
            <div class="cat-head"><h3><span class="num">${num}</span> ${icon(cat)}${name}</h3><span class="hint">Pick one</span></div>
            <div class="cat-choices">
              <div class="choice"><p class="label">Event</p><p class="name">${a}</p><p class="unit">${au}</p></div>
              <div class="rule-col" aria-hidden="true"></div>
              <div class="choice"><p class="label">Event</p><p class="name">${b}</p><p class="unit">${bu}</p></div>
              <span class="or">Or</span>
            </div>
          </article>`;

const lessonCards = lessons.slice(0, 4).map((L) => `<a class="lesson-card" href="lessons/${L.slug}.html"><p class="lesson-num">${String(L.order).padStart(2, '0')}</p><p class="when-line">${esc(L.whenLabel)}</p><h3>${esc(shortTitle(L.title))}</h3><div class="tags">${L.cats.map((c) => `<span class="tag ${c}">${CAT_NAME[c]}</span>`).join('')}<span class="tag">3–5</span></div></a>`).join('\n          ');

const hero = `<p class="eyebrow">SLAM! Nevada · K–5 PE</p>
          <h1>Presidential Fitness Test</h1>
          <p class="lede">A national fitness challenge from the White House. This winter, 3rd–5th graders practice and take the test in PE, and K–2 students get a fun preview. Here is what we learn in PE class.</p>
          <div class="hero-actions">
            <a class="btn" href="rollout.html">What to expect</a>
            <a class="btn-ghost" href="benchmarks.html">Award targets</a>
          </div>
          <div class="chips">
            <span class="badge badge-tested">Grades 3–5 · Take the test</span>
            <span class="badge badge-preview">Grades K–2 · Just for fun</span>
          </div>`;

const body = `
    <section class="section" aria-labelledby="why-h">
      <div class="wrap">
        <p class="section-kicker">Why we do it</p>
        <h2 id="why-h">Building healthy habits</h2>
        <p class="section-intro">The Presidential Fitness Test is a national program that helps students see how strong and fit they are, set goals and feel proud of their progress. It is about effort and growth, not comparing yourself to others.</p>
        <div class="two-up">
          <article class="card-box"><span class="badge badge-tested">Grades 3–5 · Take the test</span><h3>3rd–5th grade</h3><p>About four weeks of practice in PE, then the official test over three PE classes. Students can earn the Presidential Award, the National Award or a Certificate of Participation.</p></article>
          <article class="card-box"><span class="badge badge-preview">Grades K–2 · Just for fun</span><h3>Kindergarten–2nd grade</h3><p>Fun, kid-sized versions of the events during the same weeks. No testing, no scores and no awards.</p><blockquote>“In 3rd grade you’ll get to try the Presidential Fitness Test!”</blockquote></article>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="cat-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">About the test</p>
        <h2 id="cat-h">Three categories. Students pick one event in each.</h2>
        <p class="section-intro">Everyone gets a choice, so each student can pick the event that fits them best. Targets are based on age on test day. <a href="benchmarks.html#age-quick-look">Look up your targets →</a></p>
        <div class="cat-boards">
${board('', '01', 'core', 'Core', 'Curl-ups', 'As many as possible in 1 minute', 'Plank', 'Hold as long as possible')}
${board(' cardio', '02', 'cardio', 'Cardio', 'One-mile run', 'Finish time', '20m beep test (PACER)', 'Laps completed')}
${board(' upper', '03', 'upper', 'Upper body', 'Right-angle push-ups', 'Good-form reps', 'Pull-ups', 'Full reps')}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="award-h" style="padding-top:0">
      <div class="wrap">
        <div class="award-board">
          <p class="eyebrow">What the awards mean</p>
          <h2 id="award-h">Earning an award</h2>
          <p>Students who hit the target in all three categories earn an official award from the President’s Council on Sports, Fitness &amp; Nutrition. Every 3rd–5th grader who finishes the test can receive a Certificate of Participation.</p>
          <p>Targets go by <strong>age on test day</strong>, not grade.</p>
          <div class="award-grid">
            <article class="award top"><p class="label">Top tier</p><h3>Presidential</h3><p>Meets the Presidential target in all three categories.</p></article>
            <article class="award nat"><p class="label">Solid achievement</p><h3>National</h3><p>Meets the National target in all three categories.</p></article>
            <article class="award"><p class="label">Grades 3–5</p><h3>Participation</h3><p>For finishing the test with their best effort.</p></article>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="lessons" aria-labelledby="les-h">
      <div class="wrap">
        <p class="section-kicker">In PE class</p>
        <h2 id="les-h">What we do in PE</h2>
        <p class="section-intro">Each week focuses on one category: learn the event, practice good form, then try it with a partner. Here are the first few classes.</p>
        <div class="lesson-grid">
          ${lessonCards}
        </div>
        <a class="more-link" href="lessons/index.html">See every class →</a>
      </div>
    </section>

    <section class="section" id="rollout" aria-labelledby="ro-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">Timeline</p>
        <h2 id="ro-h">Practice first, then test</h2>
        <p class="section-intro">Planned dates for this school year. They can shift with the weather or the school calendar.</p>
        <ol class="stepper">
          <li class="step"><div class="step-index" aria-hidden="true">1</div><h3>Practice</h3><p class="when">Planned: Jan. 5–29, 2027</p><p>Learning and practicing each event in PE. K–2 get their fun preview.</p></li>
          <li class="step"><div class="step-index" aria-hidden="true">2</div><h3>Test days</h3><p class="when">Planned: Feb. 1–12, 2027</p><p>Grades 3–5 only. One category per PE class.</p></li>
          <li class="step"><div class="step-index" aria-hidden="true">3</div><h3>Makeup</h3><p class="when">The week after</p><p>For anyone who was absent or interrupted.</p></li>
          <li class="step"><div class="step-index" aria-hidden="true">4</div><h3>Certificates</h3><p class="when">After testing</p><p>Award and participation certificates are handed out.</p></li>
        </ol>
        <p class="backup">If needed, testing moves to late March–April 2027. <a href="rollout.html">Full timeline →</a></p>
      </div>
    </section>

    <section class="section" aria-labelledby="help-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker">At home</p>
        <h2 id="help-h">Practice at home</h2>
        <div class="callout green prose"><ul>
          <li>Wear sneakers and comfortable clothes, and bring a water bottle on PE days.</li>
          <li>Get a good night’s sleep and eat breakfast, especially on test days.</li>
          <li>Keep moving: walks, playground time, or a quick plank challenge.</li>
          <li>Pick your events, and remember that effort matters more than numbers.</li>
        </ul></div>
      </div>
    </section>

    <section class="section" aria-labelledby="ql-h" style="padding-top:0">
      <div class="wrap">
        <p class="section-kicker" id="ql-h">Learn more</p>
        <div class="quick-links">
          <a class="quick-link" href="benchmarks.html"><span class="icon-wrap" aria-hidden="true">${icon('core')}</span><strong>Benchmarks</strong><span class="sub">Award targets by age</span></a>
          <a class="quick-link" href="lessons/index.html"><span class="icon-wrap" aria-hidden="true">${icon('lessons')}</span><strong>Lessons</strong><span class="sub">What happens in each PE class</span></a>
          <a class="quick-link" href="rollout.html"><span class="icon-wrap" aria-hidden="true">${icon('timeline')}</span><strong>Timeline</strong><span class="sub">What to expect and when</span></a>
        </div>
      </div>
    </section>

${officialDocs('')}
`;

writeFileSync(path.join(SECTION, 'index.html'), page({
  title: 'Presidential Fitness Test — SLAM PE — Coach Kenny',
  desc: 'The Presidential Fitness Test at SLAM, explained for everyone: who takes part, the 3 categories, what the awards mean, and when it happens.',
  current: 'overview', up: '', hero, heroTall: true, body,
  comment: `pe-fitness/index.html — Presidential Fitness section overview (neutral voice, Nov 14 rewrite).
Data: award rules from tools/source/benchmarks.md (paraphrased); dates from tools/source/rollout-plan.md.
Design: design-spec.md § 2 Overview + § THEME; mockup design/overview.html.`,
}));
console.log('index.html (overview) written');
