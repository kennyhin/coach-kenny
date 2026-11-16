// Shared helpers for the grades 3–5 mile award leaderboard.
// Public rows are first name + last initial, grade, homeroom, time, and level only.
// Never load or emit sex, age, birthdate, or full surnames.

export const MILE_GRADES = ['3', '4', '5'];
export const MILE_LEVELS = ['Presidential', 'National'];

/** Loosest official mile cutoff for each grade (M:SS, at or under still qualifies). */
export const LOOSEST_MILE_CUTOFF = {
  3: '12:30',
  4: '11:52',
  5: '11:22',
};

export const PUBLIC_ROW_FIELDS = ['name', 'grade', 'homeroom', 'time', 'timeSeconds', 'level'];

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

export function shortHomeroom(value) {
  return String(value ?? '').trim().replace(/^\d{3}-\d+\s+/, '').trim();
}

export function publicMileName(firstName, lastInitial) {
  const first = String(firstName ?? '').trim().replace(/\s+/g, ' ');
  const initial = String(lastInitial ?? '').trim().replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase();
  if (!first) return initial ? `${initial}.` : '';
  return initial ? `${first} ${initial}.` : first;
}

export function cutoffSecondsForGrade(grade) {
  const cutoff = LOOSEST_MILE_CUTOFF[String(grade)];
  return cutoff ? parseMileTime(cutoff) : null;
}

export function rowBeatsLoosestCutoff(row) {
  const limit = cutoffSecondsForGrade(row.grade);
  const time = row.timeSeconds ?? parseMileTime(row.time);
  if (limit == null || time == null) return false;
  return time <= limit;
}

export function normalizeMileRow(input) {
  const grade = String(input.grade ?? '').trim();
  const level = String(input.level ?? '').trim();
  const timeSeconds = input.timeSeconds ?? parseMileTime(input.time ?? input.mile_time);
  const name = input.name || publicMileName(input.first_name ?? input.firstName, input.last_initial ?? input.lastInitial);
  if (!name || !MILE_GRADES.includes(grade) || !MILE_LEVELS.includes(level) || timeSeconds == null) return null;
  return {
    name,
    grade,
    homeroom: shortHomeroom(input.homeroom),
    time: formatMileTime(timeSeconds),
    timeSeconds,
    level,
  };
}

export function forbiddenPublicFields(row) {
  const banned = ['sex', 'sex_check', 'gender', 'age', 'dob', 'birthdate', 'birth_date', 'last_name', 'lastName', 'studentId', 'student_id'];
  return banned.filter((key) => Object.prototype.hasOwnProperty.call(row, key));
}

/**
 * Sort fastest first and assign 1-based ranks inside each grade + level group.
 */
export function groupMileBoards(rows) {
  const boards = {};
  for (const grade of MILE_GRADES) {
    boards[grade] = {};
    for (const level of MILE_LEVELS) {
      const grouped = rows
        .filter((row) => row.grade === grade && row.level === level)
        .sort((a, b) => a.timeSeconds - b.timeSeconds || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        .map((row, index) => ({ ...row, place: index + 1 }));
      boards[grade][level] = grouped;
    }
  }
  return boards;
}

export function checkLoosestCutoffs(rows) {
  const mismatches = [];
  for (const row of rows) {
    if (!rowBeatsLoosestCutoff(row)) {
      mismatches.push({
        grade: row.grade,
        time: row.time ?? formatMileTime(row.timeSeconds),
        cutoff: LOOSEST_MILE_CUTOFF[String(row.grade)] ?? null,
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
    normalized.push(next);
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
          <td class="t">${esc(row.time)}</td>
        </tr>`).join('');
  return `<table>
        ${body}
      </table>`;
}

export function renderMileLeaderboardHTML(payload) {
  const boards = groupMileBoards(payload.rows ?? []);
  const sample = Boolean(payload.sample);
  const status = sample
    ? `<div class="mile-lb-status is-sample" data-mile-status>
        <p class="mile-lb-kicker">Sample data</p>
        <h2>These names and times are sample data</h2>
        <p>They are fictional scores so you can see the layout. Live class scores are not in this public repository.</p>
      </div>`
    : `<div class="mile-lb-status is-live" data-mile-status>
        <p class="mile-lb-kicker">Class mile times</p>
        <p>First name and last initial only. Only students who met a Presidential or National mile target are listed.</p>
      </div>`;
  const cols = MILE_GRADES.map((grade) => {
    const presidential = boards[grade].Presidential;
    const national = boards[grade].National;
    return `<div class="mile-lb-col">
      <h2>Grade ${esc(grade)}</h2>
      <h3 class="p">Presidential <span>${presidential.length}</span></h3>
      ${levelTable(presidential)}
      <h3 class="n">National <span>${national.length}</span></h3>
      ${levelTable(national)}
    </div>`;
  }).join('\n    ');
  const titleHtml = 'SLAM Mile Run <b>Leaderboard</b>';
  return `<section class="mile-lb" data-mile-board data-sample="${sample ? 'true' : 'false'}">
    <div class="mile-lb-inner">
      <div class="mile-lb-head">
        <h1>${titleHtml}</h1>
        <p>${esc(payload.subtitle ?? 'Presidential Fitness Test · Grades 3–5 · Fastest first')}</p>
      </div>
    </div>
    <div class="mile-lb-rule" aria-hidden="true"></div>
    <div class="mile-lb-inner">
      ${status}
      <div class="mile-lb-cols">
    ${cols}
      </div>
      <p class="mile-lb-foot">Only students who met a Presidential or National mile target are listed, as first name and last initial. Award levels follow the official Presidential Fitness Test. We never post full names, IDs, ages or birthdates.</p>
    </div>
  </section>`;
}
