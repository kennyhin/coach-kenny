// Shared helpers for the grades 3–5 Presidential Fitness leaderboards.
// Public rows are first name + last initial, homeroom, score/time, level, and ageGroup
// (integer age on test day). Never load or emit sex, birthdate, or a raw birth date.
// Categories and event names follow pe-fitness/tools/source/benchmarks.csv.

export const MILE_AGE_GROUPS = [8, 9, 10, 11];
export const FITNESS_AGE_GROUPS = MILE_AGE_GROUPS;
export const MILE_LEVELS = ['Presidential', 'National'];
export const FITNESS_LEVELS = MILE_LEVELS;

export const BOARD_NOTE = "Grouped by each runner's age on test day. Award levels follow the official Presidential standards for that age.";
export const EMPTY_EVENT_NOTE = 'Results coming after testing.';

/** Official categories and event order from benchmarks.csv, as shown on this page. */
export const FITNESS_CATEGORIES = [
  {
    id: 'cardio',
    label: 'Cardiorespiratory Fitness',
    shortLabel: 'Cardio',
    eventIds: ['mile', 'pacer'],
  },
  {
    id: 'upper',
    label: 'Upper Body Strength',
    shortLabel: 'Upper Body',
    eventIds: ['push_ups', 'pull_ups'],
  },
  {
    id: 'core',
    label: 'Core & Abdominal Strength',
    shortLabel: 'Core',
    eventIds: ['curl_ups', 'plank'],
  },
];

export const FITNESS_EVENTS = [
  {
    id: 'mile',
    label: 'One-mile run',
    official: 'one-mile run',
    categoryId: 'cardio',
    sort: 'lowest',
    unit: 'M:SS',
    aliases: ['mile', 'one-mile run', 'one_mile', 'mile run', 'mile-run', 'one mile run'],
  },
  {
    id: 'pacer',
    label: '20m beep test (PACER)',
    official: '20m beep test',
    categoryId: 'cardio',
    sort: 'highest',
    unit: 'laps',
    aliases: ['pacer', '20m beep test', 'beep test', 'beep-test', '20m beep test (pacer)'],
  },
  {
    id: 'push_ups',
    label: 'Right-angle push-ups',
    official: 'right-angle push-ups',
    categoryId: 'upper',
    sort: 'highest',
    unit: 'reps',
    aliases: ['push_ups', 'push-ups', 'push ups', 'right-angle push-ups', 'right angle push-ups'],
  },
  {
    id: 'pull_ups',
    label: 'Pull-ups',
    official: 'pull-ups',
    categoryId: 'upper',
    sort: 'highest',
    unit: 'reps',
    aliases: ['pull_ups', 'pull-ups', 'pull ups'],
  },
  {
    id: 'curl_ups',
    label: 'Curl-ups',
    official: 'curl-ups',
    categoryId: 'core',
    sort: 'highest',
    unit: 'reps',
    aliases: ['curl_ups', 'curl-ups', 'curl ups'],
  },
  {
    id: 'plank',
    label: 'Plank',
    official: 'plank',
    categoryId: 'core',
    sort: 'highest',
    unit: 'sec',
    aliases: ['plank'],
  },
];

const eventById = new Map(FITNESS_EVENTS.map((event) => [event.id, event]));
const eventByAlias = new Map();
for (const event of FITNESS_EVENTS) {
  eventByAlias.set(event.id, event);
  eventByAlias.set(event.official.toLowerCase(), event);
  eventByAlias.set(event.label.toLowerCase(), event);
  for (const alias of event.aliases) eventByAlias.set(alias.toLowerCase(), event);
}

export function fitnessEvent(id) {
  return eventById.get(id) ?? null;
}

export function parseEventId(input) {
  if (input && typeof input === 'object') {
    return parseEventId(input.event ?? input.eventId ?? input.event_id ?? 'mile');
  }
  const raw = String(input ?? 'mile').trim().toLowerCase();
  return eventByAlias.get(raw)?.id ?? null;
}

/** Loosest official mile cutoff for each age group (National / at or under). */
export const LOOSEST_MILE_CUTOFF = {
  8: '12:30',
  9: '11:52',
  10: '11:22',
  11: '11:17',
};

export function parseMileTime(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  return seconds > 0 ? seconds : null;
}

export function formatMileTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatEventValue(eventId, value) {
  if (eventId === 'mile') return formatMileTime(value);
  if (eventId === 'plank') {
    const total = Math.max(0, Math.round(Number(value) || 0));
    if (total < 60) return `${total}s`;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
  return String(Math.round(Number(value)));
}

export function parseEventValue(eventId, input) {
  const event = fitnessEvent(eventId);
  if (!event) return null;
  const raw = input?.time ?? input?.mile_time ?? input?.value ?? input?.score ?? input?.display ?? input;
  if (raw == null || raw === '') return null;
  if (eventId === 'mile' || (eventId === 'plank' && String(raw).includes(':'))) {
    const seconds = parseMileTime(raw);
    if (seconds != null) return seconds;
    if (eventId === 'mile') return null;
  }
  const number = Number(raw);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function shortHomeroom(value) {
  return String(value ?? '').trim().replace(/^\d{3}-\d+\s+/, '').trim();
}

export function publicMileName(firstName, lastInitial) {
  const first = String(firstName ?? '').trim().replace(/\s+/g, ' ');
  const initial = String(lastInitial ?? '').trim().replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase();
  if (!first) return initial ? `${initial}.` : '';
  return initial ? `${first} ${initial}.` : first;
}

/** Importer field only: age_group / ageGroup as an integer 8–11. Does not read birthdate or a raw age column. */
export function parseAgeGroup(input) {
  if (input == null || typeof input !== 'object') {
    const n = Number(input);
    return Number.isFinite(n) && MILE_AGE_GROUPS.includes(Math.floor(n)) ? Math.floor(n) : null;
  }
  const raw = input.ageGroup ?? input.age_group;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const group = Math.floor(n);
  return MILE_AGE_GROUPS.includes(group) ? group : null;
}

export function cutoffSecondsForAgeGroup(ageGroup) {
  const cutoff = LOOSEST_MILE_CUTOFF[String(ageGroup)];
  return cutoff ? parseMileTime(cutoff) : null;
}

export function rowBeatsLoosestCutoff(row) {
  const limit = cutoffSecondsForAgeGroup(row.ageGroup);
  const time = row.timeSeconds ?? parseMileTime(row.time);
  if (limit == null || time == null) return false;
  return time <= limit;
}

export function normalizeMileRow(input) {
  const ageGroup = parseAgeGroup(input);
  const level = String(input.level ?? '').trim();
  const timeSeconds = input.timeSeconds ?? parseMileTime(input.time ?? input.mile_time);
  const name = input.name || publicMileName(input.first_name ?? input.firstName, input.last_initial ?? input.lastInitial);
  if (!name || ageGroup == null || !MILE_LEVELS.includes(level) || timeSeconds == null) return null;
  const row = {
    name,
    ageGroup,
    homeroom: shortHomeroom(input.homeroom),
    time: formatMileTime(timeSeconds),
    timeSeconds,
    level,
    eventId: 'mile',
    value: timeSeconds,
    display: formatMileTime(timeSeconds),
  };
  const grade = String(input.grade ?? '').trim();
  if (grade) row.grade = grade;
  return row;
}

export function normalizeEventRow(input, eventId = parseEventId(input)) {
  const event = fitnessEvent(eventId);
  if (!event) return null;
  if (event.id === 'mile' && (input.level === 'Presidential' || input.level === 'National' || input.time || input.mile_time || input.timeSeconds)) {
    const mile = normalizeMileRow({ ...input, level: input.level || undefined });
    if (mile) return mile;
    if (input.level === 'Presidential' || input.level === 'National') return null;
  }
  const ageGroup = parseAgeGroup(input);
  const name = input.name || publicMileName(input.first_name ?? input.firstName, input.last_initial ?? input.lastInitial);
  const value = input.value ?? input.timeSeconds ?? parseEventValue(event.id, input);
  if (!name || ageGroup == null || value == null) return null;
  const level = String(input.level ?? '').trim();
  const row = {
    name,
    ageGroup,
    homeroom: shortHomeroom(input.homeroom),
    eventId: event.id,
    value,
    display: formatEventValue(event.id, value),
  };
  if (event.id === 'mile') {
    row.time = row.display;
    row.timeSeconds = value;
  }
  if (MILE_LEVELS.includes(level)) row.level = level;
  const grade = String(input.grade ?? '').trim();
  if (grade) row.grade = grade;
  return row;
}

export function forbiddenPublicFields(row) {
  const banned = ['sex', 'sex_check', 'gender', 'age', 'dob', 'birthdate', 'birth_date', 'last_name', 'lastName', 'studentId', 'student_id', 'olderAgeStandard', 'age11'];
  return banned.filter((key) => Object.prototype.hasOwnProperty.call(row, key));
}

/**
 * Sort fastest first (or highest score first) and assign 1-based ranks inside each age group + level.
 */
export function groupEventBoards(rows, eventId = 'mile') {
  const event = fitnessEvent(eventId) ?? { sort: 'lowest' };
  const boards = {};
  for (const ageGroup of MILE_AGE_GROUPS) {
    boards[ageGroup] = {};
    for (const level of [...MILE_LEVELS, 'Unawarded']) {
      const grouped = rows
        .filter((row) => {
          if (row.ageGroup !== ageGroup) return false;
          const awarded = row.level === 'Presidential' || row.level === 'National';
          if (level === 'Unawarded') return !awarded;
          return row.level === level;
        })
        .sort((a, b) => {
          const left = a.value ?? a.timeSeconds;
          const right = b.value ?? b.timeSeconds;
          const delta = event.sort === 'highest' ? right - left : left - right;
          if (delta !== 0) return delta;
          return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
        })
        .map((row, index) => ({ ...row, place: index + 1, display: row.display ?? row.time }));
      boards[ageGroup][level] = grouped;
    }
  }
  return boards;
}

export function groupMileBoards(rows) {
  const boards = groupEventBoards(rows, 'mile');
  for (const ageGroup of MILE_AGE_GROUPS) {
    delete boards[ageGroup].Unawarded;
  }
  return boards;
}

export function checkLoosestCutoffs(rows) {
  const mismatches = [];
  for (const row of rows) {
    if ((row.eventId ?? 'mile') !== 'mile') continue;
    if (!rowBeatsLoosestCutoff(row)) {
      mismatches.push({
        ageGroup: row.ageGroup,
        time: row.time ?? formatMileTime(row.timeSeconds ?? row.value),
        cutoff: LOOSEST_MILE_CUTOFF[String(row.ageGroup)] ?? null,
        level: row.level,
      });
    }
  }
  return mismatches;
}

export function toPublicPayload(rows, { sample = false, generatedAt = null } = {}) {
  const normalized = [];
  for (const row of rows) {
    const next = normalizeMileRow(row);
    if (!next) continue;
    const publicRow = {
      name: next.name,
      ageGroup: next.ageGroup,
      homeroom: next.homeroom,
      time: next.time,
      timeSeconds: next.timeSeconds,
      level: next.level,
    };
    if (next.grade) publicRow.grade = next.grade;
    normalized.push(publicRow);
  }
  return {
    sample: Boolean(sample),
    title: 'Mile Run Leaderboard',
    subtitle: 'Presidential Fitness Test · Grades 3–5 · Mile run Oct 5–16, 2026 · Fastest first',
    generatedAt: generatedAt ?? (sample ? 'sample' : new Date().toISOString()),
    rows: normalized,
  };
}

export function payloadFromJson(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.rows)) return null;
  const payload = toPublicPayload(data.rows, { sample: Boolean(data.sample), generatedAt: data.generatedAt ?? null });
  if (data.title) payload.title = data.title;
  if (data.subtitle) payload.subtitle = data.subtitle;
  return payload;
}

function emptyEventBucket(sample = false) {
  return { rows: [], sample: Boolean(sample) };
}

export function pagePayloadFromJson(data) {
  const events = {};
  for (const event of FITNESS_EVENTS) events[event.id] = emptyEventBucket(false);

  if (data && typeof data === 'object' && data.events && typeof data.events === 'object') {
    for (const event of FITNESS_EVENTS) {
      const raw = data.events[event.id] ?? data.events[event.official] ?? data.events[event.label];
      const list = Array.isArray(raw) ? raw : raw?.rows;
      const rows = Array.isArray(list)
        ? list.map((row) => normalizeEventRow({ ...row, eventId: event.id }, event.id)).filter(Boolean)
        : [];
      events[event.id] = {
        rows,
        sample: Boolean(raw && !Array.isArray(raw) ? raw.sample : data.sample && rows.length),
      };
    }
  } else if (data && typeof data === 'object' && Array.isArray(data.rows)) {
    const mile = payloadFromJson(data);
    if (mile) events.mile = { rows: mile.rows.map((row) => normalizeEventRow({ ...row, eventId: 'mile' }, 'mile')).filter(Boolean), sample: Boolean(mile.sample) };
  }

  const anyRows = FITNESS_EVENTS.some((event) => events[event.id].rows.length);
  const sample = Boolean(data?.sample) || FITNESS_EVENTS.some((event) => events[event.id].sample);
  const fromPage = Boolean(data && data.events);
  return {
    sample,
    title: (fromPage && data.title) ? data.title : 'Presidential Fitness Leaderboards',
    subtitle: (fromPage && data.subtitle) ? data.subtitle : 'Presidential Fitness Test · Grades 3–5 · Grouped by age on test day',
    generatedAt: data?.generatedAt ?? (sample ? 'sample' : null),
    events,
    hasResults: anyRows,
  };
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function levelTable(rows) {
  if (!rows.length) {
    return '<p class="mile-lb-empty">No times in this group yet.</p>';
  }
  const body = rows.map((row) => `<tr>
          <td class="rk">${esc(String(row.place))}</td>
          <td class="nm">${esc(row.name)}</td>
          <td class="hr">${esc(row.homeroom)}</td>
          <td class="t">${esc(row.display ?? row.time)}</td>
        </tr>`).join('');
  return `<table>
        ${body}
      </table>`;
}

function ageColumnsHtml(rows, eventId) {
  const boards = groupEventBoards(rows, eventId);
  return MILE_AGE_GROUPS.map((ageGroup) => {
    const presidential = boards[ageGroup].Presidential;
    const national = boards[ageGroup].National;
    const other = boards[ageGroup].Unawarded;
    const hasAwarded = presidential.length || national.length;
    let body = `<h2>Age ${esc(String(ageGroup))}</h2>`;
    if (hasAwarded) {
      body += `
      <h3 class="p">Presidential <span>${presidential.length}</span></h3>
      ${levelTable(presidential)}
      <h3 class="n">National <span>${national.length}</span></h3>
      ${levelTable(national)}`;
    }
    if (other.length) {
      body += `
      <h3 class="u">Recorded times <span>${other.length}</span></h3>
      ${levelTable(other)}`;
    }
    if (!hasAwarded && !other.length) {
      body += `
      <p class="mile-lb-empty">No times in this group yet.</p>`;
    }
    return `<div class="mile-lb-col">
      ${body}
    </div>`;
  }).join('\n    ');
}

export function renderEventBoardHTML(event, bucket = { rows: [], sample: false }) {
  const rows = bucket.rows ?? [];
  const sample = Boolean(bucket.sample);
  const empty = !rows.length;
  const sampleMark = sample && !empty ? ' <span class="lb-sample-tag">Sample data</span>' : '';
  const intro = event.id === 'mile' && !empty
    ? '<p class="lb-event-lede">Mile run Oct 5–16, 2026 · Fastest first. Only students who met a Presidential or National target are listed.</p>'
    : '';
  const body = empty
    ? `<p class="lb-event-empty">${esc(EMPTY_EVENT_NOTE)}</p>`
    : `${intro}
      <div class="mile-lb-cols">
    ${ageColumnsHtml(rows, event.id)}
      </div>`;
  return `<article class="lb-event" id="event-${esc(event.id)}" data-lb-event="${esc(event.id)}" data-sample="${sample ? 'true' : 'false'}">
      <h3>${esc(event.label)}${sampleMark}</h3>
      ${body}
    </article>`;
}

function categoryNavHtml() {
  const links = FITNESS_CATEGORIES.map((category) => `<a href="#${esc(category.id)}" data-cat-link="${esc(category.id)}"><span class="lb-cat-full">${esc(category.label)}</span><span class="lb-cat-short">${esc(category.shortLabel)}</span></a>`).join('');
  return `<nav class="lb-cat-nav" aria-label="Fitness categories">
        <div class="lb-cat-nav-list">
          ${links}
        </div>
      </nav>`;
}

export function renderFitnessLeaderboardsHTML(pagePayload) {
  const payload = pagePayload?.events ? pagePayload : pagePayloadFromJson(pagePayload);
  const sample = Boolean(payload.sample);
  const status = sample
    ? `<div class="mile-lb-status is-sample" data-mile-status>
        <p class="mile-lb-kicker">Sample data</p>
        <h2>These names and times are sample data</h2>
        <p>They are fictional scores so you can see the layout. Live class scores are not in this public repository. Events still waiting on testing show an empty state, not made-up results.</p>
      </div>`
    : `<div class="mile-lb-status is-live" data-mile-status>
        <p class="mile-lb-kicker">Class results</p>
        <p>First name and last initial only. Boards list students who met a Presidential or National target. Events that have not been tested yet say so below.</p>
      </div>`;

  const categories = FITNESS_CATEGORIES.map((category) => {
    const events = category.eventIds.map((id) => renderEventBoardHTML(fitnessEvent(id), payload.events[id] ?? emptyEventBucket())).join('\n    ');
    return `<section class="lb-category" id="${esc(category.id)}">
      <h2>${esc(category.label)}</h2>
      ${events}
    </section>`;
  }).join('\n    ');

  return `<section class="mile-lb" data-mile-board data-sample="${sample ? 'true' : 'false'}">
    <div class="mile-lb-inner">
      <div class="mile-lb-head">
        <h1>SLAM Presidential Fitness <b>Leaderboards</b></h1>
        <p>${esc(payload.subtitle ?? 'Presidential Fitness Test · Grades 3–5 · Grouped by age on test day')}</p>
      </div>
    </div>
    <div class="mile-lb-rule" aria-hidden="true"></div>
    <div class="mile-lb-inner">
      ${status}
      <p class="mile-lb-note">${esc(BOARD_NOTE)}</p>
      <div class="lb-cat-nav-wrap">${categoryNavHtml()}</div>
      ${categories}
      <p class="mile-lb-foot">Boards are grouped by the official Presidential Fitness categories and by each student's age on test day. We list first name and last initial, homeroom, score or time, and age group. We never post full names, IDs, or birthdates.</p>
    </div>
  </section>`;
}

export function renderMileLeaderboardHTML(payload) {
  return renderFitnessLeaderboardsHTML(pagePayloadFromJson(payload));
}
