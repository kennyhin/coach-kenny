import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import test from "node:test";

const {
  DEFAULT_SESSIONS,
  findConflicts,
  formatPacific,
  validateSessions,
} = await import("./schedule.mjs");
const { FUNFRIDAY_WEB_APP_URL } = await import("./config.js");
const {
  parseScheduleResponse,
  scheduleGetRequest,
  schedulePostRequest,
} = await import("./remote.js");

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

test("validateSessions keeps the default lineup and rejects a bad time", () => {
  const ok = validateSessions(cloneDefaults());
  assert.equal(ok.ok, true);
  assert.equal(ok.sessions[0].kinder[0], "2nd");
  assert.equal(validateSessions([{ ...cloneDefaults()[0], start: "25:00" }]).ok, false);
});

test("the page has one empty web app URL until the script is deployed", () => {
  assert.equal(FUNFRIDAY_WEB_APP_URL, "");
  const page = readFileSync(new URL("./board.js", import.meta.url), "utf8");
  assert.match(page, /FUNFRIDAY_WEB_APP_URL/);
  assert.doesNotMatch(page, /\/api\/funfriday|vercel|localStorage\.setItem\(LOCAL_KEY/);
});

test("posts use text/plain and send the passcode in the body", () => {
  const check = schedulePostRequest("https://script.google.com/macros/s/abc/exec", "4242");
  assert.equal(check.method, "POST");
  assert.equal(check.headers["Content-Type"], "text/plain");
  assert.equal(check.redirect, "follow");
  assert.deepEqual(JSON.parse(check.body), { passcode: "4242", check: true });
  assert.equal(check.headers["x-funfriday-passcode"], undefined);

  const save = schedulePostRequest("https://script.google.com/macros/s/abc/exec", "4242", cloneDefaults());
  const body = JSON.parse(save.body);
  assert.equal(body.passcode, "4242");
  assert.equal(body.sessions[2].big[0], "4th");

  const get = scheduleGetRequest("https://script.google.com/macros/s/abc/exec");
  assert.equal(get.method, "GET");
  assert.match(get.url, /^https:\/\/script\.google\.com\/macros\/s\/abc\/exec\?ts=\d+$/);
});

test("parseScheduleResponse maps Apps Script errors", () => {
  const saved = parseScheduleResponse('{"ok":true,"sessions":[{"name":"Session 1"}],"updatedAt":"2026-10-21T21:41:00.000Z"}');
  assert.equal(saved.ok, true);
  assert.equal(saved.updatedAt, "2026-10-21T21:41:00.000Z");
  assert.equal(parseScheduleResponse('{"ok":false,"error":"bad passcode"}').error, "That code is not right.");
  assert.match(parseScheduleResponse('{"ok":false,"error":"no passcode"}').error, /PASSCODE/);
  assert.equal(parseScheduleResponse("<html>login</html>").ok, false);
});

test("the Apps Script file is the doGet and doPost backend", () => {
  const gs = readFileSync(new URL("./apps-script/Code.gs", import.meta.url), "utf8");
  assert.match(gs, /function doGet\(/);
  assert.match(gs, /function doPost\(/);
  assert.match(gs, /getProperty\("PASSCODE"\)/);
  assert.match(gs, /getProperty\("SCHEDULE"\)/);
  assert.match(gs, /setProperty\("SCHEDULE"/);
  assert.doesNotMatch(gs, /vercel|BLOB_READ_WRITE_TOKEN/i);
  for (const session of DEFAULT_SESSIONS) {
    assert.ok(gs.includes(session.start), session.start);
    assert.ok(gs.includes(session.end), session.end);
    assert.ok(gs.includes(session.kinder[0]), session.kinder[0]);
    assert.ok(gs.includes(session.big[0]), session.big[0]);
  }
});

test("a web app saves only when the passcode matches, and the next read sees it", async () => {
  const state = { passcode: "4242", schedule: null };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let status = 200;
      let payload;
      if (req.method === "GET") {
        payload = state.schedule
          ? { ok: true, sessions: state.schedule.sessions, updatedAt: state.schedule.updatedAt }
          : { ok: true, sessions: cloneDefaults(), updatedAt: null };
      } else {
        const body = JSON.parse(raw);
        if (body.passcode !== state.passcode) {
          payload = { ok: false, error: "bad passcode" };
        } else if (body.check === true) {
          payload = { ok: true };
        } else {
          const valid = validateSessions(body.sessions);
          if (!valid.ok) payload = { ok: false, error: "bad lineup" };
          else {
            state.schedule = { sessions: valid.sessions, updatedAt: "2026-10-21T22:10:00.000Z" };
            payload = { ok: true, sessions: state.schedule.sessions, updatedAt: state.schedule.updatedAt };
          }
        }
      }
      res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port + "/exec";
  try {
    const firstReq = scheduleGetRequest(url);
    const first = parseScheduleResponse(await (await fetch(firstReq.url)).text());
    assert.equal(first.ok, true);
    assert.equal(first.sessions[0].start, "13:25");
    assert.equal(first.updatedAt, null);

    const deniedReq = schedulePostRequest(url, "nope", cloneDefaults());
    const denied = parseScheduleResponse(await (await fetch(deniedReq.url, {
      method: deniedReq.method,
      headers: deniedReq.headers,
      body: deniedReq.body,
      redirect: deniedReq.redirect,
    })).text());
    assert.equal(denied.error, "That code is not right.");
    assert.equal(state.schedule, null);

    const next = cloneDefaults();
    next[2].end = "14:22";
    const saveReq = schedulePostRequest(url, "4242", next);
    const saved = parseScheduleResponse(await (await fetch(saveReq.url, {
      method: saveReq.method,
      headers: saveReq.headers,
      body: saveReq.body,
      redirect: saveReq.redirect,
    })).text());
    assert.equal(saved.ok, true);
    assert.equal(saved.sessions[2].end, "14:22");

    const againReq = scheduleGetRequest(url);
    const again = parseScheduleResponse(await (await fetch(againReq.url, { cache: "no-store" })).text());
    assert.equal(again.sessions[2].end, "14:22");
    assert.equal(again.updatedAt, "2026-10-21T22:10:00.000Z");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
