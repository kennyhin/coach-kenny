/**
 * Fun Friday shared lineup.
 *
 * Same idea as the Bible Transcript Saver: a web app on script.google.com.
 * doGet returns the schedule. doPost saves it only when the passcode matches.
 * The passcode and the schedule live in Script properties (PASSCODE, SCHEDULE).
 *
 * Deploy
 * 1. Go to https://script.google.com and click New project. Name it Fun Friday lineup.
 * 2. Replace Code.gs with this file.
 * 3. Project settings (gear) → Script properties → Add script property.
 *    Property: PASSCODE
 *    Value: the edit code. It is not stored in the website repo.
 * 4. Deploy → New deployment → gear → Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 *    Anyone is required. "Anyone with a Google account" blocks the page from loading the lineup.
 * 5. Authorize when Google asks. Copy the web app URL (it ends in /exec).
 * 6. Paste that URL into funfriday/config.js as FUNFRIDAY_WEB_APP_URL and push it.
 *    GitHub Pages publishes coachkenny.org about a minute later.
 *
 * Changing PASSCODE does not need a new deployment.
 * Changing this code does: Deploy → Manage deployments → Edit → New version → Deploy.
 * That keeps the same /exec URL.
 */

var DEFAULT_SESSIONS = [
  { name: "Session 1", start: "13:25", end: "13:35", kinder: ["2nd"], big: ["3rd"] },
  { name: "Session 2", start: "14:00", end: "14:10", kinder: ["K"], big: ["5th"] },
  { name: "Session 3", start: "14:15", end: "14:25", kinder: ["1st"], big: ["4th"] }
];

var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function doGet() {
  try {
    var stored = readStored_();
    return json_({
      ok: true,
      sessions: stored ? stored.sessions : DEFAULT_SESSIONS,
      updatedAt: stored ? stored.updatedAt : null
    });
  } catch (err) {
    return json_({ ok: false, error: "stored lineup could not be read" });
  }
}

function doPost(e) {
  var raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : "";
  if (raw.length > 20000) return json_({ ok: false, error: "bad lineup" });
  var body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (err) {
    return json_({ ok: false, error: "bad json" });
  }
  var gate = passcodeStatus_(body && body.passcode);
  if (gate === "missing") return json_({ ok: false, error: "no passcode" });
  if (gate !== "ok") return json_({ ok: false, error: "bad passcode" });
  if (body.check === true) return json_({ ok: true });

  var sessions = validateSessions_(body.sessions);
  if (!sessions) return json_({ ok: false, error: "bad lineup" });
  var doc = { sessions: sessions, updatedAt: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty("SCHEDULE", JSON.stringify(doc));
  return json_({ ok: true, sessions: doc.sessions, updatedAt: doc.updatedAt });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function passcodeStatus_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty("PASSCODE") || "";
  if (!expected) return "missing";
  if (typeof given !== "string" || given.length !== expected.length || given.length > 200) return "bad";
  var mismatch = 0;
  for (var i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return mismatch === 0 ? "ok" : "bad";
}

function readStored_() {
  var raw = PropertiesService.getScriptProperties().getProperty("SCHEDULE");
  if (!raw) return null;
  var doc = JSON.parse(raw);
  var sessions = validateSessions_(doc.sessions);
  if (!sessions) throw new Error("stored");
  return {
    sessions: sessions,
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null
  };
}

function cleanGrades_(value) {
  if (!Array.isArray(value) || value.length > 8) return null;
  var grades = [];
  for (var i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") return null;
    grades.push(String(value[i]).trim().slice(0, 16));
  }
  return grades;
}

function validateSessions_(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 12) return null;
  var sessions = [];
  for (var i = 0; i < input.length; i++) {
    var item = input[i];
    if (!item || typeof item !== "object") return null;
    if (typeof item.start !== "string" || !TIME_RE.test(item.start)) return null;
    if (typeof item.end !== "string" || !TIME_RE.test(item.end)) return null;
    var kinder = cleanGrades_(item.kinder);
    var big = cleanGrades_(item.big);
    if (!kinder || !big) return null;
    var name = typeof item.name === "string" && item.name.trim()
      ? item.name.trim().slice(0, 40)
      : "Session " + (i + 1);
    sessions.push({ name: name, start: item.start, end: item.end, kinder: kinder, big: big });
  }
  return sessions;
}
