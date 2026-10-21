import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.FUNFRIDAY_STORE = "memory";
process.env.FUNFRIDAY_PASSCODE = "4242";

const {
  DEFAULT_SESSIONS,
  findConflicts,
  formatPacific,
  validateSessions,
} = await import("./schedule.mjs");
const { passcodeMatches } = await import("../api/passcode.mjs");
const { resetScheduleStore } = await import("../api/schedule-store.mjs");
const { GET, POST, PUT } = await import("../api/funfriday.js");

function cloneDefaults() {
  return structuredClone(DEFAULT_SESSIONS);
}

test("default lineup has no time-slot conflict", () => {
  assert.deepEqual(findConflicts(cloneDefaults()), []);
});

test("overlapping sessions warn that grades share a time slot", () => {
  const sessions = cloneDefaults();
  sessions[1].start = "13:30";
  sessions[1].end = "13:40";
  const lines = findConflicts(sessions);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Session 1/);
  assert.match(lines[0], /Session 2/);
  assert.match(lines[0], /same time slot/);
  assert.match(lines[0], /2nd/);
  assert.match(lines[0], /K/);
});

test("a session that starts when the previous one ends is not a conflict", () => {
  const sessions = cloneDefaults();
  sessions[1].start = "13:35";
  sessions[1].end = "13:45";
  assert.deepEqual(findConflicts(sessions), []);
});

test("the same grade on both yards is a conflict", () => {
  const sessions = cloneDefaults();
  sessions[0].big = ["2nd"];
  const lines = findConflicts(sessions);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /2nd is booked on both yards/);
});

test("Pacific timestamp uses America/Los_Angeles", () => {
  assert.equal(formatPacific("2026-10-21T21:41:00.000Z"), "Oct 21, 2026, 2:41 PM Pacific");
  assert.equal(formatPacific(null), null);
});

test("passcode check rejects a different length and a wrong code", () => {
  assert.equal(passcodeMatches("4242", "4242"), true);
  assert.equal(passcodeMatches("4243", "4242"), false);
  assert.equal(passcodeMatches("42421", "4242"), false);
  assert.equal(passcodeMatches("4242", ""), false);
});

test("validateSessions keeps the default lineup and rejects a bad time", () => {
  const ok = validateSessions(cloneDefaults());
  assert.equal(ok.ok, true);
  assert.equal(ok.sessions.length, 3);
  assert.equal(ok.sessions[0].kinder[0], "2nd");
  const bad = validateSessions([{ ...cloneDefaults()[0], start: "25:00" }]);
  assert.equal(bad.ok, false);
});

test("the shared store is what every visitor reads", async () => {
  resetScheduleStore();
  const first = await GET();
  assert.equal(first.status, 200);
  const seeded = await first.json();
  assert.equal(seeded.sessions[0].start, "13:25");
  assert.equal(seeded.sessions[2].big[0], "4th");
  assert.equal(typeof seeded.updatedAt, "string");

  const visitor = await GET();
  const again = await visitor.json();
  assert.equal(again.updatedAt, seeded.updatedAt);
  assert.equal(again.sessions[1].kinder[0], "K");

  const denied = await PUT(new Request("http://local/api/funfriday", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-funfriday-passcode": "nope" },
    body: JSON.stringify({ sessions: cloneDefaults() }),
  }));
  assert.equal(denied.status, 401);
  assert.equal((await GET().then((r) => r.json())).updatedAt, seeded.updatedAt);

  const next = cloneDefaults();
  next[0].start = "13:20";
  next[0].end = "13:30";
  const saved = await PUT(new Request("http://local/api/funfriday", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-funfriday-passcode": "4242" },
    body: JSON.stringify({ sessions: next }),
  }));
  assert.equal(saved.status, 200);
  const body = await saved.json();
  assert.equal(body.sessions[0].start, "13:20");
  assert.notEqual(body.updatedAt, seeded.updatedAt);

  const otherTeacher = await (await GET()).json();
  assert.equal(otherTeacher.sessions[0].start, "13:20");
  assert.equal(otherTeacher.sessions[0].kinder[0], "2nd");

  const unlock = await POST(new Request("http://local/api/funfriday", {
    method: "POST",
    headers: { "x-funfriday-passcode": "4242" },
  }));
  assert.equal(unlock.status, 200);

  const dir = await mkdtemp(path.join(tmpdir(), "funfriday-"));
  process.env.FUNFRIDAY_STORE = "file";
  process.env.FUNFRIDAY_STORE_PATH = path.join(dir, "schedule.json");
  const fromFile = await (await GET()).json();
  assert.equal(fromFile.storage, "file");
  assert.equal(fromFile.sessions[2].big[0], "4th");
  const edited = cloneDefaults();
  edited[2].end = "14:20";
  const putFile = await PUT(new Request("http://local/api/funfriday", {
    method: "PUT",
    headers: { "content-type": "application/json", "x-funfriday-passcode": "4242" },
    body: JSON.stringify({ sessions: edited }),
  }));
  assert.equal(putFile.status, 200);
  const reread = await (await GET()).json();
  assert.equal(reread.sessions[2].end, "14:20");
  await rm(dir, { recursive: true, force: true });
  process.env.FUNFRIDAY_STORE = "memory";

  const previous = process.env.FUNFRIDAY_PASSCODE;
  process.env.FUNFRIDAY_PASSCODE = "";
  const unconfigured = await POST(new Request("http://local/api/funfriday", { method: "POST" }));
  assert.equal(unconfigured.status, 503);
  process.env.FUNFRIDAY_PASSCODE = previous;
});
