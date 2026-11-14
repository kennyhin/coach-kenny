// pe-fitness/tools/layout.mjs — shared page chrome for every generated /pe-fitness/ page.
//
// Purpose: one place for <head>, the sticky SLAM! PE header + pill nav, the navy hero,
//   the stripe row, the official-documents block and the footer, so all pages match.
// Data source: none (static strings); PDF list comes from source/benchmarks.md "Sources" table.
// Follows: design-spec.md § THEME (type update Nov 14: Montserrat headings, Anton only for .score) (Hero, Section nav, Icons, Buttons) and § 1 Accessibility;
//   markup classes mirror the SLAM Design Bot mockups (design/overview.html, benchmarks.html).
// Audience (Nov 14 update): families, teachers and principals. Roll Call is a private teacher tool and is
//   intentionally NOT linked from these public pages (removed from the header nav).
// Used by: build-overview.mjs, build-benchmarks.mjs, build-lessons.mjs (run tools/build-all.mjs).

import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const TOOLS = path.dirname(fileURLToPath(import.meta.url));
export const SECTION = path.resolve(TOOLS, '..');   // /pe-fitness
export const SOURCE = path.join(TOOLS, 'source');   // committed copies of the source markdown/CSV

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Inline SVG icons (design/icons/*.svg, Lucide style). Inlined so they inherit currentColor.
const ICON_FILES = { core: 'icon-core', cardio: 'icon-cardio', upper: 'icon-upper-body',
  lessons: 'icon-lessons', timeline: 'icon-timeline', rollcall: 'icon-roll-call' };
const ICONS = {};
for (const [k, f] of Object.entries(ICON_FILES)) {
  ICONS[k] = readFileSync(path.join(TOOLS, 'icons', f + '.svg'), 'utf8').trim()
    .replace(/<svg /, '<svg focusable="false" ');
}
export const icon = (k) => ICONS[k];
export const iconTile = (k, label) =>
  `<span class="icon-tile ${k}"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${ICONS[k]}</span>`;

export const WH_FITNESS = 'https://www.whitehouse.gov/fitness/';

// External link helper: visible ↗ plus screen-reader "(opens in a new tab)" (spec § 1).
export const ext = (href, text, cls = '') =>
  `<a${cls ? ` class="${cls}"` : ''} href="${href}" target="_blank" rel="noopener">${text} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`;

// The 4 official PDFs (copied into /pe-fitness/official/). URLs from source/benchmarks.md.
const DOCS = [
  ['Presidential-Physical-Fitness-Test.pdf', 'Test chart (Presidential Award benchmarks)', 'https://www.whitehouse.gov/wp-content/uploads/2026/05/Presidential-Physical-Fitness-Test.pdf'],
  ['Fitness-Council-Certification-Presidential-Award-1.pdf', 'Presidential Award certificate', 'https://www.whitehouse.gov/wp-content/uploads/2026/05/Fitness-Council-Certification-Presidential-Award-1.pdf'],
  ['Fitness-Council-Certification-National-Award.pdf', 'National Award certificate', 'https://www.whitehouse.gov/wp-content/uploads/2026/05/Fitness-Council-Certification-National-Award.pdf'],
  ['Fitness-Council-Certification-Participation-1.pdf', 'Certificate of Participation', 'https://www.whitehouse.gov/wp-content/uploads/2026/05/Fitness-Council-Certification-Participation-1.pdf'],
];
const size = (f) => {
  const b = statSync(path.join(SECTION, 'official', f)).size;
  return b > 1e6 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
};

/** Official documents navy callout (overview § 6, benchmarks § 5). `up` = path prefix to /pe-fitness/. */
export function officialDocs(up = '') {
  return `<section class="section" aria-labelledby="docs-h">
      <div class="wrap">
        <div class="callout navy">
          <h2 id="docs-h" class="lead">Official documents</h2>
          <ul class="docs">
${DOCS.map(([f, t, u]) => `            <li><a href="${up}official/${f}">${esc(t)}</a> <span class="meta">PDF · ${size(f)}</span> <span class="orig">${ext(u, 'Original on whitehouse.gov')}</span></li>`).join('\n')}
            <li>${ext(WH_FITNESS, 'White House fitness page (whitehouse.gov/fitness)')}</li>
          </ul>
        </div>
      </div>
    </section>`;
}

/**
 * Full page wrapper.
 * opts: { title, desc, current: 'overview'|'benchmarks'|'lessons'|'rollout', up: '' | '../',
 *         hero: html (inside .hero-board), heroTall: bool, body: html, scripts: bool, header comment }
 */
export function page({ title, desc, current, up = '', hero, heroTall = false, body, comment }) {
  const nav = [
    ['overview', 'Overview', `${up}index.html`],
    ['benchmarks', 'Benchmarks', `${up}benchmarks.html`],
    ['lessons', 'Lessons', `${up}lessons/index.html`],
    ['rollout', 'Timeline', `${up}rollout.html`],
  ].map(([k, t, h]) => `<a href="${h}"${k === current ? ' class="is-current" aria-current="page"' : ''}>${t}</a>`).join('\n        ');
  return `<!DOCTYPE html>
<!--
  ${comment.trim().split('\n').join('\n  ')}
  GENERATED by pe-fitness/tools/build-all.mjs — edit the tools/ scripts or tools/source/, then re-run:
    node pe-fitness/tools/build-all.mjs
-->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="icon" type="image/png" href="${up}../favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <!-- THEME fonts (type update Nov 14): Montserrat 700–900 (headings + UI), Open Sans (body), Anton only for big benchmark figures -->
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@700;800;900&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${up}css/fitness.css" />
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="pf-stripe-thin" aria-hidden="true"></div>
    <div class="wrap wrap-wide header-row">
      <a class="brand" href="${up}index.html" aria-label="SLAM PE Presidential Fitness, section home">
        <span class="brand-slam">SLAM!</span>
        <span class="brand-pe">PE</span>
        <span class="brand-sub">Presidential<br>Fitness</span>
      </a>
      <nav class="section-nav" aria-label="Presidential Fitness section">
        ${nav}
        <a href="${up}../index.html">Home</a>
      </nav>
    </div>
  </header>

  <main id="main">
    <div class="wrap">
      <div class="hero-stack">
        <section class="hero-board${heroTall ? ' tall' : ''}">
          <img class="hero-logo" src="${up}img/slam-script-green-nevada.png" alt="SLAM! Nevada logo" width="120" height="82" />
          ${hero.trim()}
        </section>
        <div class="pf-stripe" aria-hidden="true"></div>
      </div>
    </div>
${body}
  </main>

  <div class="wrap"><div class="pf-divider" aria-hidden="true"></div></div>
  <footer class="site-footer">
    <div class="wrap">
      <p>Coach K. Hin · SLAM Academy · K–5 Physical Education</p>
      <p>Benchmarks from the official White House Presidential Physical Fitness Test · ${ext(WH_FITNESS, 'whitehouse.gov/fitness')}</p>
      <p>We never post student names or scores on this site. <a href="${up}../index.html">coachkenny.org home</a></p>
    </div>
  </footer>
  <script src="${up}js/fitness.js" defer></script>
</body>
</html>
`;
}

export const eyebrow = 'SLAM! Nevada · K–5 PE · Presidential Physical Fitness Test';
