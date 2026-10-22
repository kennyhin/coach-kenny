/** Shared Fun Friday lineup rules. Safe to import from the browser. */

export const DEFAULT_SESSIONS = [
  { name: "Session 1", start: "13:25", end: "13:35", kinder: ["2nd"], big: ["3rd"] },
  { name: "Session 2", start: "14:00", end: "14:10", kinder: ["K"], big: ["5th"] },
  { name: "Session 3", start: "14:15", end: "14:25", kinder: ["1st"], big: ["4th"] },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SESSIONS = 12;
const MAX_GRADES = 8;
const MAX_GRADE_LEN = 16;
const MAX_NAME_LEN = 40;

export function toMinutes(hhmm) {
  if (typeof hhmm !== "string" || !TIME_RE.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes from midnight on the afternoon clock the page shows.
 *  Stored times are 24-hour (13:25). The labels are 12-hour with no AM/PM
 *  (1:25, 2:00). 1:25 and 01:25 are 1:25 PM, the same instant as 13:25,
 *  and that sorts before 2:00 PM. 12:50 is noon, so it sorts before 1:25,
 *  not after it the way a morning reading of "1:25" would.
 */
export function afternoonMinutes(hhmm) {
  if (typeof hhmm !== "string") return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23) return null;
  if (hour >= 1 && hour <= 11) hour += 12;
  return hour * 60 + minute;
}

/** Earliest start first. Labels become Session 1, 2, 3… in that order.
 *  End time (and the walk-back that follows it) stays on the same session.
 *  Equal starts keep their previous order.
 */
export function orderSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  const decorated = [];
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    if (!session || typeof session !== "object") continue;
    decorated.push({ session, index: i });
  }
  decorated.sort((a, b) => {
    const am = afternoonMinutes(a.session.start);
    const bm = afternoonMinutes(b.session.start);
    const aKey = am == null ? 100000 : am;
    const bKey = bm == null ? 100000 : bm;
    if (aKey !== bKey) return aKey - bKey;
    return a.index - b.index;
  });
  return decorated.map(({ session }, i) => ({
    name: "Session " + (i + 1),
    start: session.start,
    end: session.end,
    kinder: Array.isArray(session.kinder) ? session.kinder.slice() : [],
    big: Array.isArray(session.big) ? session.big.slice() : [],
  }));
}

export function prettyTime(hhmm) {
  const mins = toMinutes(hhmm);
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hour = ((h + 11) % 12) + 1;
  return hour + ":" + String(m).padStart(2, "0");
}

export function addMinutes(hhmm, delta) {
  const base = toMinutes(hhmm);
  if (base == null) return hhmm;
  const wrapped = ((base + delta) % 1440 + 1440) % 1440;
  return String(Math.floor(wrapped / 60)).padStart(2, "0") + ":" + String(wrapped % 60).padStart(2, "0");
}

export function formatPacific(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return formatted + " Pacific";
}

function cleanGrades(value, label) {
  if (!Array.isArray(value)) return { ok: false, error: label + " must be a list of grades." };
  if (value.length > MAX_GRADES) return { ok: false, error: "Too many grades in one yard." };
  const grades = [];
  for (const grade of value) {
    if (typeof grade !== "string") return { ok: false, error: "Grade names have to be text." };
    const trimmed = grade.trim().slice(0, MAX_GRADE_LEN);
    grades.push(trimmed);
  }
  return { ok: true, grades };
}

export function validateSessions(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "The lineup needs at least one session." };
  }
  if (input.length > MAX_SESSIONS) {
    return { ok: false, error: "Too many sessions." };
  }
  const sessions = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!item || typeof item !== "object") {
      return { ok: false, error: "A session is missing." };
    }
    if (typeof item.start !== "string" || !TIME_RE.test(item.start) || typeof item.end !== "string" || !TIME_RE.test(item.end)) {
      return { ok: false, error: "Use a real start and end time for every session." };
    }
    const kinder = cleanGrades(item.kinder, "Kinder playground");
    if (!kinder.ok) return kinder;
    const big = cleanGrades(item.big, "Big playground");
    if (!big.ok) return big;
    const name = typeof item.name === "string" && item.name.trim()
      ? item.name.trim().slice(0, MAX_NAME_LEN)
      : "Session " + (i + 1);
    sessions.push({ name, start: item.start, end: item.end, kinder: kinder.grades, big: big.grades });
  }
  return { ok: true, sessions: orderSessions(sessions) };
}

function gradeList(grades) {
  const clean = grades.map((g) => String(g).trim()).filter(Boolean);
  if (clean.length === 0) return "Grades";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return clean[0] + " and " + clean[1];
  return clean.slice(0, -1).join(", ") + ", and " + clean[clean.length - 1];
}

function rangesOverlap(a, b) {
  const as = toMinutes(a.start);
  const ae = toMinutes(a.end);
  const bs = toMinutes(b.start);
  const be = toMinutes(b.end);
  if (as == null || ae == null || bs == null || be == null) return false;
  if (ae <= as || be <= bs) return false;
  return as < be && bs < ae;
}

/** Warnings only. Overlapping sessions are still saved. */
export function findConflicts(sessions) {
  if (!Array.isArray(sessions)) return [];
  const lines = [];
  for (const session of sessions) {
    const kinder = Array.isArray(session.kinder) ? session.kinder : [];
    const big = Array.isArray(session.big) ? session.big : [];
    const seen = new Set();
    for (const grade of [...kinder, ...big]) {
      const key = String(grade).trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        lines.push(String(grade).trim() + " is booked on both yards in " + (session.name || "a session") + ".");
        break;
      }
      seen.add(key);
    }
    const start = toMinutes(session.start);
    const end = toMinutes(session.end);
    if (start != null && end != null && end <= start) {
      lines.push((session.name || "A session") + " ends before it starts.");
    }
  }
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (!rangesOverlap(a, b)) continue;
      const grades = [
        ...(Array.isArray(a.kinder) ? a.kinder : []),
        ...(Array.isArray(a.big) ? a.big : []),
        ...(Array.isArray(b.kinder) ? b.kinder : []),
        ...(Array.isArray(b.big) ? b.big : []),
      ];
      const listed = gradeList(grades);
      const verb = grades.map((g) => String(g).trim()).filter(Boolean).length === 1 ? "is" : "are";
      lines.push(
        (a.name || "Session") + " (" + prettyTime(a.start) + "–" + prettyTime(a.end) + ") and " +
        (b.name || "Session") + " (" + prettyTime(b.start) + "–" + prettyTime(b.end) + ") overlap, so " +
        listed + " " + verb + " booked in the same time slot."
      );
    }
  }
  return lines;
}
