# Presidential Fitness PE section: handoff for Claude Code

Built Saturday, Nov 14, 2026 (PT) by Grok Bot (executor) on branch `feat/pe-presidential-fitness`. Kenny asked to "build using grok for now" while his Claude limit reset, so Claude Code was not used. This file is here so Claude Code can pick up the work.

**Status:** the first version is live (PRs #39 and #40, merged on Kenny's "Go live").

## Update, Nov 14, 2026 (PT): family-facing rewrite (branch `feat/pe-fitness-parent-friendly`, not pushed)
Kenny asked that the section read for **parents, teachers and principals** ("I know what my kid is doing"), with no
teacher-style mini-comments. He loves the look, so **design, CSS and JS are unchanged**; only the words and some blocks changed.
- **Lesson pages are no longer word-for-word teacher plans.** Public text now lives in `tools/source/family-lessons.mjs`
  (per slug: `title`, `summary`, `steps` = what your child does in class, `why`, `home` = try it at home).
  `tools/source/lessons/*.md` stay in the repo as the teacher plans (Planbook template) and still supply order, group,
  "When" and grade band, but their body text is not rendered. Removed from public lesson pages: equipment checklist,
  Print button, objective with form-check percentages, Teacher/Students badges, Kagan, exit ticket, reminders, Nevada standards.
- **Overview, Lessons list, Benchmarks and Timeline copy** rewritten in plain, warm language (why we do it, what the
  awards mean, how you can help at home). Dates are labeled "Planned" (from rollout-plan.md's suggested window).
- **`rollout.html` is now the family "Timeline" page** (nav label "Timeline"): who takes part, when (planned timeline +
  spring backup), what each of the six events looks like, how to help, after testing. Big-class station logistics removed.
- **Roll Call removed from the public section** (header nav link, overview quick link and both Roll Call cards). It is a
  private teacher tool; it is still on the coachkenny.org homepage grid.
- **Benchmark tables untouched**: the BENCHMARKS:START/END block is byte-identical to main; 312/312 cells re-checked against benchmarks.csv.
- Root `index.html`: **Bible Study card removed** from the homepage grid (Kenny: it might conflict with some people's beliefs).
  The `/bible-study/` pages themselves are unchanged and still reachable by URL.
- Screenshots: `/workspace/pe-fitness-preview/screenshots-v2/` (script `/workspace/pe-fitness-preview/shoot-v2.mjs`, static server on 8793).

## What was built (original Nov 14 build; see the update above for what changed)
The static section `/pe-fitness/` (plain HTML, CSS and vanilla JS, no build step needed to serve) has these pages:
- `index.html` is the overview. It covers who tests (grades 3–5) versus preview only (K–2), the 3 categories as stacked boards with an OR chip, how awards work (official wording), a preview of 4 lessons, the 4-step timeline, how to help at home, quick links and the official documents.
- `benchmarks.html` has a quick look (pick award level, group and age; JS only) above 4 full tables (Presidential/National × Boys/Girls, ages 5–17+). The picker chooses which table shows, and the URL hash keeps the choice (`#national-girls`). Without JS, all 4 tables show stacked.
- `lessons/index.html` lists the 16 lessons in 3 groups, with filter chips (JS only).
- `lessons/<slug>.html` holds the 16 lesson pages. Each has a breadcrumb, a header card with a one-line summary, "What your child does in class", "Why it matters", "Try it at home", a table of contents (sticky at 900px and wider, `<details>` below that) and prev/next links.
- `rollout.html` ("Timeline") covers who takes part, when (vertical timeline with a dashed backup branch), the six events (station grid, 2 per category), how to help and after testing.
- `official/` holds the 4 official PDFs, copied as-is: the test chart and 3 certificates.
- Root `index.html` gets one homepage card ("PE Program / Presidential Fitness") right after the Roll Call card. Nothing else changed there.

## File map
```
pe-fitness/
  index.html, benchmarks.html, rollout.html        GENERATED
  lessons/index.html, lessons/<16 slugs>.html       GENERATED
  css/fitness.css     the only stylesheet. Part 1 = SLAM Design Bot mockup CSS (copied); Part 2 = additions
  js/fitness.js       picker/tables/hash, lesson filter, print, reveals [data-js-only]; no numbers inside
  img/slam-script-green-nevada.png   official SLAM logo for the navy hero (copied as-is, not redrawn)
  official/*.pdf      4 official PDFs (public US government documents)
  tools/
    build-all.mjs        run this:  node pe-fitness/tools/build-all.mjs   (from repo root)
    layout.mjs           shared <head>, header + pill nav, hero, footer, official-docs block, icons, ext links
    build-overview.mjs   → index.html
    build-benchmarks.mjs → benchmarks.html (tables between <!-- BENCHMARKS:START/END -->, plus #pf-data JSON)
    build-lessons.mjs    → lessons/index.html, 16 lesson pages, rollout.html (Timeline)
    icons/*.svg          Lucide-style icons from design/icons (inlined into pages at build time)
    source/              content sources; family-lessons.mjs = public lesson text (see below)
  HANDOFF.md
```
**Edit the tools or the source files, then re-run `build-all.mjs`.** Don't hand-edit the generated HTML; every generated file starts with a comment that says this.

## Where the content and data come from
- `tools/source/benchmarks.csv` is a byte-identical copy of `/workspace/presidential-fitness/benchmarks.csv` (extracted Nov 14, 2026 from whitehouse.gov/fitness and the Presidential Award PDF). Every table cell and quick-look number comes from it. A check on Nov 14 matched all 312 cells with 0 mismatches.
- `tools/source/benchmarks.md` holds the official award wording, the note that National comes from the website only (not in the PDF), and the PDF URLs.
- `tools/source/family-lessons.mjs` is the public lesson text (see the Nov 14 update above).
- `tools/source/lessons/*.md` (16 lessons plus `index.md`) are the teacher plans: only order, group, When and grade band are read.
- `tools/source/rollout-plan.md` is the teacher rollout plan; the Timeline page copy in `build-lessons.mjs` `rollout()` is a plain-language version of it.
- **Age 5 has no official benchmarks** (the CSV says `missing`). The tables show "No official number" across the age-5 row, and the quick look shows a red "No official number" callout when age 5 is picked. Kindergarteners who are 5 do preview stations only.
- Design sources: `/workspace/pe-fitness-preview/design/design-spec.md` (its THEME section wins on color and type), `design-direction.md`, the mockups `overview.html`, `benchmarks.html` and `homepage-card.html`, and `pe-fitness-mock.css`.

## Theme tokens and fonts (current, after the Nov 14 type update)
- **Palette:**
  - Page and paper: `--bg #FCFAF7` (page), `--paper #F7F4EB`, `--paper-2 #EEE9DC`, `--white #FFF`.
  - Text: `--ink #231F20` (SLAM black), `--gray #4B4647`.
  - Blues and reds: `--navy #0A2B4D`, `--red #EE2526` (trim and icons only, never small text), `--red-deep #B82A2E` (red behind text).
  - Greens: `--green #50CF33` (buttons, current nav, top and footer bars, eyebrows on navy; never as text on paper), `--green-ink #1E7A12` (green as text and kickers).
  - Award tiers: `--gold #D4A537` (Presidential only), `--silver #B8BDC4` (National only).
- **Type:**
  - Montserrat 800/900 for all headings.
  - Montserrat 700/800 for UI, labels, nav, badges, tags, age chips and banners.
  - Open Sans 400/600/700 for body text.
  - **Anton only for the big benchmark figures** (`.score`).
  - **Bowlby One SC is removed** and is not loaded.
- **Poster style:** 3px ink borders, hard shadows (`6px 6px 0 ink`, 4px on phones), a red/cream stripe under each hero, a green 4px bar at the top and above the footer, a quiet pinstripe, and the green SLAM logo on the navy hero. There is **no White House seal or emblem anywhere.**
- **Breakpoints:**
  - 900px: the lesson TOC becomes a `<details>` and the two-up and callout rows stack.
  - 860px (mockup): grids go to 1 column and the age chips go to 4 per row.
  - 600px: the header stacks, buttons go full width and the station grid becomes 1 column.

## Done
- All pages above, the homepage card, the 4 PDFs and the generator scripts. Header comments are in every new HTML, CSS, JS and MJS file.
- Accessibility:
  - A skip link and one `<h1>` per page.
  - Focus ring: ink outline plus a green halo.
  - Pickers are `<button>`s with `aria-pressed`.
  - External links show ↗ and carry "(opens in a new tab)" for screen readers.
  - Tables have a `<caption>`, `scope` on headers, a sticky Age column and a scroll region with a label.
  - Reduced-motion support and print styles.
- Verified Nov 14:
  - 0 broken internal links (710 checked).
  - No horizontal overflow at 390px.
  - The picker works: National, Girls, age 8 shows 29, 60, 12:30, 15, 9, 1 and the national-girls table.
  - Desktop (1280) and mobile (390) screenshots are in `/workspace/pe-fitness-preview/screenshots/`.

## Stubbed, TODO or judgment calls
- **Quick-look age chips** run 5–12, plus an "Older… (13–17+)" select. The design direction suggested 6–12; age 5 was kept so families can see "No official number".
- **Full tables stay visible on phones** and scroll sideways with a sticky Age column. The mockup hid them on phones, but the brief requires tables by age and sex, so they were kept.
- **Homepage card** uses the 🏅 emoji and the markup from spec § 7. The design-direction mockup used an inline target SVG instead; swap it if Kenny prefers.
- **Lesson-list group descriptions** are short new UI lines, for example "Teach form, then short tries of each event. Lessons 1–8." Lesson text itself is unchanged.
- **Timeline card text on `rollout.html`** quotes the source, but the "Makeup week" card is thin ("Plus one makeup week.").
- **Overview stepper copy** follows the mockup's wording, with every date labeled "Example".
- The lessons have **not** been posted to Planbook, as the source says.

## Known issues
- `npm test` has **1 failure that already exists on `origin/main`** without this change: "Bible Study links to the PIN-locked transcriber". It's unrelated to `/pe-fitness/` and was left alone. The other 18 tests pass.
- Port 8765 on the box is used by another agent's server. Local preview here used `python3 -m http.server 8792`.
- No hosting or preview URL is set up. The site is plain static files with a CNAME, so a preview depends on how coachkenny.org is hosted (GitHub Pages or similar).

## Next steps for Claude
1. Review the visuals against the mockups (`/workspace/pe-fitness-preview/design/*.png`) and adjust `css/fitness.css` Part 2 if needed.
2. If Kenny wants copy changes, edit `tools/*.mjs` or `tools/source/*`, then run `node pe-fitness/tools/build-all.mjs`.
3. Re-run the link check (`node /workspace/pe-fitness-preview/linkcheck.mjs`) and the screenshots (`node /workspace/pe-fitness-preview/shoot.mjs`, which needs a static server on 8792).
4. Push the branch and open a **draft** PR (body at `/workspace/pe-fitness-preview/PR_BODY.md`). No merge or deploy without Kenny's OK.
5. No student names or scores, ever. Scores live in Roll Call (private teacher tool, deliberately not linked from these public pages).
6. Keep public copy family-facing: no teacher asides, box paths, score-sheet or Roll Call details.
